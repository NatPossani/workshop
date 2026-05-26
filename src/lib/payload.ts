import type { AudioPayload, ChatRequest } from "../types";

/** Payload alinhado ao Switch do n8n (messageType + content) */
export function buildTextPayload(message: string, sessionId: string): ChatRequest {
  return {
    messageType: "text",
    type: "text",
    content: message,
    message,
    sessionId,
  };
}

export function buildAudioPayload(
  sessionId: string,
  audio: AudioPayload
): ChatRequest {
  return {
    messageType: "audio",
    type: "audio",
    content: "",
    message: "",
    sessionId,
    audio,
  };
}
