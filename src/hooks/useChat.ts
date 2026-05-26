import { useCallback, useEffect, useRef, useState } from "react";
import { blobToBase64, extensionForMime } from "../lib/audio";
import { sendToN8n } from "../lib/n8n";
import { buildAudioPayload, buildTextPayload } from "../lib/payload";
import { getSessionId, resetSessionId } from "../lib/session";
import type { Message, MessageKind } from "../types";

function createMessage(
  role: Message["role"],
  content: string,
  kind: MessageKind = "text",
  audioUrl?: string
): Message {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    kind,
    audioUrl,
    createdAt: Date.now(),
  };
}

function revokeUrls(urls: string[]) {
  urls.forEach((url) => URL.revokeObjectURL(url));
}

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([
    createMessage(
      "assistant",
      "Olá! Sou o assistente ligado ao n8n. Pode escrever ou gravar áudio — depois de enviar, pode ouvir a gravação de novo."
    ),
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionRef = useRef(getSessionId());
  const audioUrlsRef = useRef<string[]>([]);

  useEffect(() => {
    return () => revokeUrls(audioUrlsRef.current);
  }, []);

  const trackAudioUrl = (url: string) => {
    audioUrlsRef.current.push(url);
  };

  const handleReply = useCallback(
    async (
      payload: Parameters<typeof sendToN8n>[0],
      userContent: string,
      kind: MessageKind,
      audioUrl?: string
    ) => {
      setError(null);
      if (audioUrl) trackAudioUrl(audioUrl);
      setMessages((prev) => [
        ...prev,
        createMessage("user", userContent, kind, audioUrl),
      ]);
      setIsLoading(true);

      try {
        const reply = await sendToN8n(payload);
        setMessages((prev) => [...prev, createMessage("assistant", reply)]);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Erro ao contactar o n8n.";
        setError(message);
        setMessages((prev) => [
          ...prev,
          createMessage("assistant", message),
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isLoading) return;

      await handleReply(
        buildTextPayload(trimmed, sessionRef.current),
        trimmed,
        "text"
      );
    },
    [handleReply, isLoading]
  );

  const sendAudio = useCallback(
    async (blob: Blob) => {
      if (isLoading) return;

      const mimeType = blob.type || "audio/webm";
      const ext = extensionForMime(mimeType);
      const base64 = await blobToBase64(blob);
      const audioUrl = URL.createObjectURL(blob);

      await handleReply(
        buildAudioPayload(sessionRef.current, {
          data: base64,
          mimeType,
          fileName: `voice-${Date.now()}.${ext}`,
        }),
        "Áudio enviado",
        "audio",
        audioUrl
      );
    },
    [handleReply, isLoading]
  );

  const clearChat = useCallback(() => {
    revokeUrls(audioUrlsRef.current);
    audioUrlsRef.current = [];
    sessionRef.current = resetSessionId();
    setError(null);
    setMessages([
      createMessage(
        "assistant",
        "Conversa reiniciada. Pode enviar texto ou gravar outro áudio."
      ),
    ]);
  }, []);

  return { messages, isLoading, error, sendMessage, sendAudio, clearChat };
}
