/** MIME canónico para armazenamento e resposta HTTP (sem parâmetros como codecs=opus). */
export function normalizeAudioMime(mime: string | null | undefined): string {
  const raw = (mime ?? "").split(";")[0].trim().toLowerCase();
  if (!raw) return "audio/webm";
  if (raw === "audio/weba" || raw === "audio/x-weba") return "audio/webm";
  if (raw === "audio/webm" || raw === "audio/wav" || raw === "audio/x-wav") {
    return raw === "audio/x-wav" ? "audio/wav" : raw;
  }
  if (raw === "audio/mp4" || raw === "audio/x-m4a") return "audio/mp4";
  if (raw.startsWith("audio/")) return raw;
  return "audio/webm";
}

export function extensionForAudioMime(mime: string): string {
  const n = normalizeAudioMime(mime);
  if (n === "audio/wav" || n === "audio/x-wav") return "wav";
  if (n === "audio/mp4") return "m4a";
  if (n === "audio/ogg") return "ogg";
  return "webm";
}

/** EBML / WebM — magic 1A 45 DF A3 */
export function isWebmContainer(data: ArrayBuffer | Uint8Array): boolean {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  return (
    bytes.length >= 4 &&
    bytes[0] === 0x1a &&
    bytes[1] === 0x45 &&
    bytes[2] === 0xdf &&
    bytes[3] === 0xa3
  );
}

export function isWavContainer(data: ArrayBuffer | Uint8Array): boolean {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  return (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x41 &&
    bytes[10] === 0x56 &&
    bytes[11] === 0x45
  );
}

/** Extrai o ID do path /api/audio/{id} ou /api/audio/{id}.webm */
export function parseAudioIdFromPath(pathname: string): string | null {
  const match = pathname.match(/\/api\/audio\/([^/]+?)(?:\.webm|\.wav|\.m4a)?$/i);
  if (!match) return null;
  const id = match[1];
  if (id === "upload") return null;
  return id;
}

export function audioFileNameWithExtension(
  baseName: string,
  mimeType: string
): string {
  const ext = extensionForAudioMime(mimeType);
  const withoutExt = baseName.replace(/\.(webm|weba|wav|m4a|mp4|ogg)$/i, "");
  return `${withoutExt}.${ext}`;
}

export function buildPublicAudioUrl(base: string, id: string, mimeType: string): string {
  const ext = extensionForAudioMime(mimeType);
  const cleanBase = base.replace(/\/$/, "");
  return `${cleanBase}/api/audio/${id}.${ext}`;
}

export function serveAudioHeaders(
  mimeType: string,
  fileName: string,
  byteLength: number
): Record<string, string> {
  const canonical = normalizeAudioMime(mimeType);
  const safeName = audioFileNameWithExtension(fileName, canonical);
  return {
    "Content-Type": canonical,
    "Content-Length": String(byteLength),
    "Content-Disposition": `inline; filename="${safeName}"`,
    "Cache-Control": "public, max-age=3600",
    "X-Content-Type-Options": "nosniff",
  };
}
