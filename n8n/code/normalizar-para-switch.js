// Cole ANTES do Switch (Run Once for All Items)
const body = $json.body ?? $json;

const messageType =
  body.messageType ??
  body.type ??
  (body.audio?.data ? "audio" : "text");

const content = String(body.content ?? body.message ?? "").trim();
const sessionId = String(body.sessionId ?? "default");
const audio = body.audio ?? null;

return [
  {
    json: {
      messageType,
      content,
      sessionId,
      audio,
    },
  },
];
