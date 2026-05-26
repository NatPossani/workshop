import type { Config } from "@netlify/functions";
import { getStore } from "@netlify/blobs";
import {
  audioFileNameWithExtension,
  buildPublicAudioUrl,
  isWebmContainer,
  isWavContainer,
  normalizeAudioMime,
  parseAudioIdFromPath,
  serveAudioHeaders,
} from "../../shared/audioMedia";

const STORE_NAME = "workshop-audio-temp";
const TTL_MS =
  (Number(process.env.AUDIO_TTL_HOURS) || 24) * 60 * 60 * 1000;

interface AudioMeta {
  mimeType: string;
  fileName: string;
  createdAt: number;
}

function publicBaseUrl(req: Request): string {
  const site = process.env.URL ?? process.env.DEPLOY_PRIME_URL;
  if (site) return site.replace(/\/$/, "");

  const host =
    req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "";
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

function isExpired(meta: AudioMeta): boolean {
  return Date.now() - meta.createdAt > TTL_MS;
}

function validateUploadBody(
  body: ArrayBuffer,
  mimeType: string
): string | null {
  if (!body.byteLength) return "Corpo vazio.";
  const canonical = normalizeAudioMime(mimeType);
  if (canonical === "audio/webm" && !isWebmContainer(body)) {
    return "Ficheiro não é WebM válido (cabeçalho EBML em falta).";
  }
  if (canonical === "audio/wav" && !isWavContainer(body)) {
    return "Ficheiro não é WAV válido.";
  }
  return null;
}

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const pathname = url.pathname;

  if (req.method === "POST" && pathname.endsWith("/upload")) {
    return handleUpload(req);
  }

  const id = parseAudioIdFromPath(pathname);
  if (req.method === "GET" && id) {
    return handleGet(id);
  }

  return Response.json({ error: "Método não permitido." }, { status: 405 });
}

async function handleUpload(req: Request): Promise<Response> {
  const mimeType = normalizeAudioMime(req.headers.get("x-audio-mime-type"));
  const rawName =
    req.headers.get("x-audio-file-name") ?? `voice-${Date.now()}.webm`;
  const fileName = audioFileNameWithExtension(rawName, mimeType);

  const body = await req.arrayBuffer();
  const validationError = validateUploadBody(body, mimeType);
  if (validationError) {
    return Response.json({ error: validationError }, { status: 400 });
  }

  const id = crypto.randomUUID();
  const meta: AudioMeta = {
    mimeType,
    fileName,
    createdAt: Date.now(),
  };

  const store = getStore({ name: STORE_NAME, consistency: "strong" });
  await store.set(id, body, {
    metadata: {
      mimeType: meta.mimeType,
      fileName: meta.fileName,
      createdAt: String(meta.createdAt),
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

async function handleGet(id: string): Promise<Response> {
  const store = getStore({ name: STORE_NAME, consistency: "strong" });
  const entry = await store.getWithMetadata(id, { type: "arrayBuffer" });

  if (!entry || !entry.data) {
    return Response.json({ error: "Áudio não encontrado." }, { status: 404 });
  }

  const createdAt = Number(entry.metadata?.createdAt ?? 0);
  const mimeType = normalizeAudioMime(
    String(entry.metadata?.mimeType ?? "audio/webm")
  );
  const meta: AudioMeta = {
    mimeType,
    fileName: audioFileNameWithExtension(
      String(entry.metadata?.fileName ?? "voice.webm"),
      mimeType
    ),
    createdAt,
  };

  if (isExpired(meta)) {
    await store.delete(id);
    return Response.json({ error: "Áudio expirado." }, { status: 410 });
  }

  const data = entry.data as ArrayBuffer;
  const headers = serveAudioHeaders(
    meta.mimeType,
    meta.fileName,
    data.byteLength
  );

  return new Response(data, { status: 200, headers });
}

export const config: Config = {
  path: [
    "/api/audio/upload",
    "/api/audio/:id",
    "/api/audio/:id.webm",
    "/api/audio/:id.wav",
    "/api/audio/:id.m4a",
  ],
};
