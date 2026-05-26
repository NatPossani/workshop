const MAX_SECONDS = 90;

function pickMimeType(): string {
  if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
    return "audio/webm;codecs=opus";
  }
  if (MediaRecorder.isTypeSupported("audio/webm")) return "audio/webm";
  if (MediaRecorder.isTypeSupported("audio/mp4")) return "audio/mp4";
  return "";
}

export class AudioRecorder {
  private stream: MediaStream | null = null;
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private timeoutId: ReturnType<typeof setTimeout> | null = null;
  private mimeType = "audio/webm";

  async start(): Promise<void> {
    if (this.recorder?.state === "recording") return;

    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.mimeType = pickMimeType() || "audio/webm";
    this.chunks = [];

    this.recorder = new MediaRecorder(this.stream, { mimeType: this.mimeType });
    this.recorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data);
    };

    this.recorder.start(250);

    this.timeoutId = setTimeout(() => {
      void this.stop();
    }, MAX_SECONDS * 1000);
  }

  async stop(): Promise<Blob | null> {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }

    if (!this.recorder || this.recorder.state === "inactive") {
      this.cleanup();
      return null;
    }

    return new Promise((resolve) => {
      const recorder = this.recorder!;

      recorder.onstop = () => {
        const blob =
          this.chunks.length > 0
            ? new Blob(this.chunks, { type: this.mimeType.split(";")[0] })
            : null;
        this.cleanup();
        resolve(blob);
      };

      recorder.stop();
    });
  }

  isRecording(): boolean {
    return this.recorder?.state === "recording";
  }

  private cleanup() {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.recorder = null;
    this.chunks = [];
  }
}

export function extensionForMime(mimeType: string): string {
  if (mimeType.includes("mp4")) return "m4a";
  if (mimeType.includes("ogg")) return "ogg";
  return "webm";
}
