import { AudioPlayer } from "./AudioPlayer";
import type { Message } from "../types";

interface Props {
  message: Message;
}

export function MessageBubble({ message }: Props) {
  const isUser = message.role === "user";
  const isAudio = message.kind === "audio";
  const canPlayAudio = Boolean(message.audioUrl);

  return (
    <article className={`message ${isUser ? "message--user" : "message--assistant"}`}>
      <div className="message__avatar" aria-hidden="true">
        {isUser ? "V" : "n8"}
      </div>
      <div className="message__body">
        <span className="message__label">{isUser ? "Você" : "Assistente n8n"}</span>

        {canPlayAudio && message.audioUrl ? (
          <AudioPlayer src={message.audioUrl} />
        ) : (
          <p className="message__text">
            {isAudio && (
              <span className="message__voice-badge" aria-hidden="true">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <rect x="9" y="3" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="2" />
                  <path d="M6 11a6 6 0 0012 0" stroke="currentColor" strokeWidth="2" />
                </svg>
              </span>
            )}
            {message.content}
          </p>
        )}
      </div>
    </article>
  );
}
