import { useEffect, useRef } from "react";
import { useChat } from "../hooks/useChat";
import { ChatInput } from "./ChatInput";
import { MessageBubble } from "./MessageBubble";

export function Chat() {
  const { messages, isLoading, error, sendMessage, sendAudio, clearChat } = useChat();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  return (
    <div className="chat-layout">
      <aside className="sidebar">
        <div className="sidebar__brand">
          <span className="sidebar__logo" />
          <div>
            <h1 className="sidebar__title">Workshop</h1>
            <p className="sidebar__subtitle">Demo n8n + Chat</p>
          </div>
        </div>

        <button type="button" className="sidebar__new" onClick={clearChat}>
          <span aria-hidden="true">+</span>
          Nova conversa
        </button>

        <div className="sidebar__info">
          <p className="sidebar__label">Fluxo</p>
          <ol className="sidebar__steps">
            <li>Webhook (POST)</li>
            <li>Transcrição (áudio)</li>
            <li>Agente / IA</li>
            <li>Respond to Webhook</li>
          </ol>
        </div>

        <footer className="sidebar__footer">
          <span className="status-dot" data-active={!error} />
          {error ? "Erro na ligação" : "Pronto para enviar"}
        </footer>
      </aside>

      <main className="chat-main">
        <header className="chat-header">
          <h2>Assistente n8n</h2>
          <p>Mensagens processadas pelo teu workflow publicado</p>
        </header>

        <div className="messages" role="log" aria-live="polite" aria-relevant="additions">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}

          {isLoading && (
            <div className="typing" aria-label="A gerar resposta">
              <span />
              <span />
              <span />
            </div>
          )}

          {error && (
            <div className="error-banner" role="alert">
              {error}
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        <div className="chat-footer">
          <ChatInput onSend={sendMessage} onSendAudio={sendAudio} disabled={isLoading} />
        </div>
      </main>
    </div>
  );
}
