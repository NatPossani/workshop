// Cole no nó Code "Normalizar entrada" (Run Once for All Items)
const body = $json.body ?? $json;

const message = String(body.message ?? "").trim();
const sessionId = String(body.sessionId ?? "default");
const audio = body.audio;

const hasAudio = Boolean(audio?.data);

return [
  {
    json: {
      message,
      sessionId,
      hasAudio,
      audioMimeType: audio?.mimeType ?? "audio/webm",
      audioFileName: audio?.fileName ?? "voice.webm",
      audioBase64: audio?.data ?? null,
    },
  },
];
