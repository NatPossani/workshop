// Cole ANTES do Switch (Run Once for All Items)
// Aceita payload na raiz ou em $json.body (Webhook n8n Cloud)
const body = $json.body ?? $json;

let messageType = String(
  body.messageType ??
    body.type ??
    (body.audio?.url || body.audio?.data ? "audio" : "text")
).toLowerCase();

if (messageType !== "text" && messageType !== "audio") {
  messageType = body.audio?.url || body.audio?.data ? "audio" : "text";
}

const content = String(body.content ?? body.message ?? "").trim();
const sessionId = String(body.sessionId ?? "default");
const audio = body.audio ?? null;

return [
  {
    json: {
      messageType,
      type: messageType,
      content,
      sessionId,
      audio,
    },
  },
];
