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
  /** URL pública HTTPS para o n8n baixar o ficheiro */
  url: string;
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
  /** Áudio publicado temporariamente (URL acessível pelo n8n) */
  audio?: AudioPayload;
}

export interface ChatResponse {
  reply?: string;
  message?: string;
  output?: string;
  text?: string;
}
