/** Helpers só para Netlify Functions (sem imports fora de netlify/functions). */

export function normalizeAudioMime(mime: string | null | undefined): string {
  const raw = (mime ?? "").split(";")[0].trim().toLowerCase();
  if (!raw) return "audio/wav";
  if (raw === "audio/weba" || raw === "audio/x-weba") return "audio/webm";
  if (raw === "audio/webm" || raw === "audio/wav" || raw === "audio/x-wav") {
    return raw === "audio/x-wav" ? "audio/wav" : raw;
  }
  if (raw === "audio/mp4" || raw === "audio/x-m4a") return "audio/mp4";
  if (raw.startsWith("audio/")) return raw;
  return "audio/wav";
}

export function extensionForAudioMime(mime: string): string {
  const n = normalizeAudioMime(mime);
  if (n === "audio/wav" || n === "audio/x-wav") return "wav";
  if (n === "audio/mp4") return "m4a";
  if (n === "audio/ogg") return "ogg";
  return "webm";
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

export function parseAudioAssetPath(pathname: string): string | null {
  const match = pathname.match(/\/api\/audio\/([^/]+)$/i);
  if (!match) return null;
  const segment = match[1];
  if (segment === "upload") return null;
  return segment.replace(/\.(wav|webm|m4a|mp4|ogg)$/i, "");
}

export function audioFileNameWithExtension(
  baseName: string,
  mimeType: string
): string {
  const ext = extensionForAudioMime(mimeType);
  const withoutExt = baseName.replace(/\.(webm|weba|wav|m4a|mp4|ogg)$/i, "");
  return `${withoutExt}.${ext}`;
}

export function buildPublicAudioUrl(
  base: string,
  id: string,
  mimeType: string
): string {
  const ext = extensionForAudioMime(mimeType);
  return `${base.replace(/\/$/, "")}/api/audio/${id}.${ext}`;
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

export function publicBaseUrl(req: Request): string {
  const site = process.env.URL ?? process.env.DEPLOY_PRIME_URL;
  if (site) return site.replace(/\/$/, "");
  const host =
    req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "";
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}
