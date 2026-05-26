import type { Config } from "@netlify/functions";
import { getStore } from "@netlify/blobs";
import {
  audioFileNameWithExtension,
  normalizeAudioMime,
  parseAudioAssetPath,
  serveAudioHeaders,
} from "./audio-media";

const STORE_NAME = "workshop-audio-temp";
const TTL_MS =
  (Number(process.env.AUDIO_TTL_HOURS) || 24) * 60 * 60 * 1000;

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "GET") {
    return Response.json({ error: "Use GET" }, { status: 405 });
  }

  const pathname = new URL(req.url).pathname;
  const id = parseAudioAssetPath(pathname);
  if (!id) {
    return Response.json({ error: "ID inválido." }, { status: 400 });
  }

  const store = getStore({ name: STORE_NAME, consistency: "strong" });
  const entry = await store.getWithMetadata(id, { type: "arrayBuffer" });

  if (!entry?.data) {
    return Response.json({ error: "Áudio não encontrado." }, { status: 404 });
  }

  const createdAt = Number(entry.metadata?.createdAt ?? 0);
  const mimeType = normalizeAudioMime(
    String(entry.metadata?.mimeType ?? "audio/wav")
  );
  const fileName = audioFileNameWithExtension(
    String(entry.metadata?.fileName ?? "voice.wav"),
    mimeType
  );

  if (Date.now() - createdAt > TTL_MS) {
    await store.delete(id);
    return Response.json({ error: "Áudio expirado." }, { status: 410 });
  }

  const data = entry.data as ArrayBuffer;
  return new Response(data, {
    status: 200,
    headers: serveAudioHeaders(mimeType, fileName, data.byteLength),
  });
}

/** :file captura "uuid.wav", "uuid.webm", etc. */
export const config: Config = {
  path: "/api/audio/:file",
};
