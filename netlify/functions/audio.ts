import type { Config } from "@netlify/functions";
import { getStore } from "@netlify/blobs";
import {
  audioFileNameWithExtension,
  buildPublicAudioUrl,
  isWavContainer,
  normalizeAudioMime,
  parseAudioAssetPath,
  publicBaseUrl,
  serveAudioHeaders,
} from "./audio-media";

const STORE_NAME = "workshop-audio-temp";
const TTL_MS =
  (Number(process.env.AUDIO_TTL_HOURS) || 24) * 60 * 60 * 1000;

export default async function handler(req: Request): Promise<Response> {
  const pathname = new URL(req.url).pathname.replace(/\/$/, "");

  if (pathname === "/api/audio/upload") {
    if (req.method !== "POST") {
      return Response.json(
        { error: "Use POST para enviar áudio." },
        { status: 405 }
      );
    }
    return handleUpload(req);
  }

  if (req.method === "GET") {
    const id = parseAudioAssetPath(pathname);
    if (id) return handleServe(id);
  }

  return Response.json({ error: "Não encontrado." }, { status: 404 });
}

async function handleUpload(req: Request): Promise<Response> {
  const mimeType = normalizeAudioMime(req.headers.get("x-audio-mime-type"));
  const rawName =
    req.headers.get("x-audio-file-name") ?? `voice-${Date.now()}.wav`;
  const fileName = audioFileNameWithExtension(rawName, mimeType);

  const body = await req.arrayBuffer();
  if (!body.byteLength) {
    return Response.json({ error: "Corpo vazio." }, { status: 400 });
  }

  if (mimeType === "audio/wav" && !isWavContainer(body)) {
    return Response.json(
      { error: "Ficheiro não é WAV válido (cabeçalho RIFF em falta)." },
      { status: 400 }
    );
  }

  const id = crypto.randomUUID();
  const createdAt = Date.now();

  const store = getStore({ name: STORE_NAME, consistency: "strong" });
  await store.set(id, body, {
    metadata: {
      mimeType,
      fileName,
      createdAt: String(createdAt),
    },
  });

  const base = publicBaseUrl(req);
  return Response.json({
    url: buildPublicAudioUrl(base, id, mimeType),
    id,
    mimeType,
    fileName,
  });
}

async function handleServe(id: string): Promise<Response> {
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

export const config: Config = {
  path: ["/api/audio/upload", "/api/audio/*"],
};
