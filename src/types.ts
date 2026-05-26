export type Role = "user" | "assistant";
export type MessageKind = "text" | "audio";

export interface Message {
  id: string;
  role: Role;
  content: string;
  kind?: MessageKind;
  /** URL local para reproduzir áudio enviado pelo utilizador */
  audioUrl?: string;
  createdAt: number;
}

export interface AudioPayload {
  data: string;
  mimeType: string;
  fileName: string;
}

export interface ChatRequest {
  /** Para o Switch: "text" | "audio" */
  messageType: "text" | "audio";
  type: "text" | "audio";
  /** Texto da mensagem (ramo texto) */
  content: string;
  message: string;
  sessionId: string;
  /** Base64 — ramo áudio (sem URL; não precisa HTTP Request) */
  audio?: AudioPayload;
}

export interface ChatResponse {
  reply?: string;
  message?: string;
  output?: string;
  text?: string;
}
