import type { ChatRequest, ChatResponse } from "../types";

/** Resposta imediata do n8n quando o Webhook não espera o nó Respond to Webhook */
const WEBHOOK_STARTED_ACK = "Workflow was started";

const N8N_ERROR_HINTS: Record<string, string> = {
  "No Respond to Webhook node found in the workflow":
    'Adicione o nó "Respond to Webhook" ligado ao AI Agent, com { "reply": "={{ $json.output }}" }. O Webhook deve estar em "Using Respond to Webhook Node".',
  "Workflow was started":
    'No Webhook: Response Mode → "Using Respond to Webhook Node". No fim: nó Respond to Webhook com { "reply": "..." }.',
};

function hintForN8nMessage(message: string): string | undefined {
  for (const [key, hint] of Object.entries(N8N_ERROR_HINTS)) {
    if (message.includes(key)) return hint;
  }
  return undefined;
}

function parseErrorBody(text: string, status: number): string {
  const trimmed = text.trim();
  if (!trimmed) return `n8n respondeu com ${status}.`;

  try {
    const data = JSON.parse(trimmed) as { message?: string; hint?: string };
    if (typeof data.message === "string") {
      const hint = hintForN8nMessage(data.message) ?? data.hint;
      return hint
        ? `n8n (${status}): ${data.message}\n\n${hint}`
        : `n8n (${status}): ${data.message}`;
    }
  } catch {
    /* HTML ou texto simples */
  }

  if (trimmed.startsWith("<!DOCTYPE") || trimmed.startsWith("<html")) {
    return `n8n respondeu com ${status} (erro interno). Veja Executions no n8n.`;
  }

  return `n8n respondeu com ${status}: ${trimmed.slice(0, 200)}`;
}

function unwrapResponse(data: unknown): ChatResponse {
  if (!data || typeof data !== "object") return {};

  const record = data as Record<string, unknown>;

  if (typeof record.reply === "string" && record.reply.trim()) {
    return record as ChatResponse;
  }

  const body = record.body;
  if (body && typeof body === "object") {
    return unwrapResponse(body);
  }

  return record as ChatResponse;
}

function extractReply(data: ChatResponse): string {
  const unwrapped = unwrapResponse(data);

  if (
    typeof unwrapped.message === "string" &&
    unwrapped.message.trim() === WEBHOOK_STARTED_ACK
  ) {
    throw new Error(N8N_ERROR_HINTS[WEBHOOK_STARTED_ACK]!);
  }

  if (typeof unwrapped.reply === "string" && unwrapped.reply.trim()) {
    return unwrapped.reply.trim();
  }

  if (typeof unwrapped.output === "string" && unwrapped.output.trim()) {
    return unwrapped.output.trim();
  }

  if (typeof unwrapped.text === "string" && unwrapped.text.trim()) {
    return unwrapped.text.trim();
  }

  if (typeof unwrapped.message === "string" && unwrapped.message.trim()) {
    const hint = hintForN8nMessage(unwrapped.message);
    if (hint) throw new Error(hint);
    return unwrapped.message.trim();
  }

  const nested = (unwrapped as Record<string, unknown>).data;
  if (nested && typeof nested === "object") {
    return extractReply(nested as ChatResponse);
  }

  return "Resposta recebida, mas o formato não foi reconhecido. No Respond to Webhook use: { \"reply\": \"={{ $json.output }}\" }.";
}

export async function sendToN8n(payload: ChatRequest): Promise<string> {
  const url = import.meta.env.VITE_N8N_WEBHOOK_URL;

  if (!url) {
    throw new Error(
      "Configure VITE_N8N_WEBHOOK_URL no arquivo .env (veja .env.example)."
    );
  }

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const text = await response.text().catch(() => "");

  if (!response.ok) {
    throw new Error(parseErrorBody(text, response.status));
  }

  if (!text.trim()) {
    throw new Error("n8n respondeu vazio. Confira o nó Respond to Webhook.");
  }

  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(
      `Resposta do n8n não é JSON: ${text.slice(0, 120)}`
    );
  }

  return extractReply(data as ChatResponse);
}
