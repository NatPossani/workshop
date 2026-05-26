import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { AudioRecorder } from "../lib/audio";

interface Props {
  onSend: (text: string) => void;
  onSendAudio: (blob: Blob) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, onSendAudio, disabled }: Props) {
  const [value, setValue] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recorderRef = useRef(new AudioRecorder());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startTimer = () => {
    setSeconds(0);
    timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const submit = () => {
    if (!value.trim() || disabled) return;
    onSend(value);
    setValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    submit();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const handleInput = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  };

  const toggleRecording = async () => {
    if (disabled) return;

    const recorder = recorderRef.current;

    if (!isRecording) {
      try {
        await recorder.start();
        setIsRecording(true);
        startTimer();
      } catch {
        alert("Permita o acesso ao microfone no browser para gravar áudio.");
      }
      return;
    }

    setIsRecording(false);
    stopTimer();

    const blob = await recorder.stop();
    if (blob && blob.size > 0) {
      onSendAudio(blob);
    }
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <form className="chat-input" onSubmit={handleSubmit}>
      {isRecording && (
        <div className="recording-banner" role="status">
          <span className="recording-banner__dot" />
          A gravar {formatTime(seconds)} — clique no microfone para enviar
        </div>
      )}

      <div className={`chat-input__box ${isRecording ? "chat-input__box--recording" : ""}`}>
        <button
          type="button"
          className={`chat-input__mic ${isRecording ? "chat-input__mic--active" : ""}`}
          onClick={toggleRecording}
          disabled={disabled}
          aria-label={isRecording ? "Parar e enviar áudio" : "Gravar áudio"}
          title={isRecording ? "Parar e enviar" : "Gravar áudio"}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="9" y="3" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="2" />
            <path
              d="M6 11a6 6 0 0012 0M12 17v4M9 21h6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>

        <textarea
          ref={textareaRef}
          className="chat-input__field"
          rows={1}
          placeholder={
            isRecording
              ? "Gravando... clique no microfone para enviar"
              : "Mensagem de texto ou use o microfone..."
          }
          value={value}
          disabled={disabled || isRecording}
          onChange={(e) => setValue(e.target.value)}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
        />

        <button
          type="submit"
          className="chat-input__send"
          disabled={disabled || isRecording || !value.trim()}
          aria-label="Enviar mensagem"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M12 19V5M12 5L6 11M12 5L18 11"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      <p className="chat-input__hint">
        Enter para enviar · Microfone para gravar (pode ouvir depois de enviar)
      </p>
    </form>
  );
}
