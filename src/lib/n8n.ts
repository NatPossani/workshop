import type { ChatRequest, ChatResponse } from "../types";

/** Resposta imediata do n8n quando o Webhook não espera o nó Respond to Webhook */
const WEBHOOK_STARTED_ACK = "Workflow was started";

function extractReply(data: ChatResponse): string {
  if (
    typeof data.message === "string" &&
    data.message.trim() === WEBHOOK_STARTED_ACK
  ) {
    throw new Error(
      'O n8n respondeu cedo demais. No nó Webhook: Response Mode → "Using Respond to Webhook Node". No fim do fluxo, ligue o nó Respond to Webhook com { "reply": "..." }.'
    );
  }

  if (typeof data.reply === "string" && data.reply.trim()) return data.reply;
  if (typeof data.message === "string" && data.message.trim()) return data.message;
  if (typeof data.output === "string" && data.output.trim()) return data.output;
  if (typeof data.text === "string" && data.text.trim()) return data.text;

  if (typeof data === "object" && data !== null) {
    const nested = (data as Record<string, unknown>).data;
    if (nested && typeof nested === "object") {
      return extractReply(nested as ChatResponse);
    }
  }

  return "Resposta recebida, mas o formato não foi reconhecido. Verifique o nó Respond to Webhook.";
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

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `n8n respondeu com ${response.status}${text ? `: ${text.slice(0, 120)}` : ""}`
    );
  }

  const data = (await response.json()) as ChatResponse;
  return extractReply(data);
}
