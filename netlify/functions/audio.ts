import type { Config } from "@netlify/functions";
import { getStore } from "@netlify/blobs";

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

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const pathname = url.pathname;

  if (req.method === "POST" && pathname.endsWith("/upload")) {
    return handleUpload(req);
  }

  const match = pathname.match(/\/api\/audio\/([^/]+)$/);
  if (req.method === "GET" && match) {
    return handleGet(match[1]);
  }

  return Response.json({ error: "Método não permitido." }, { status: 405 });
}

async function handleUpload(req: Request): Promise<Response> {
  const mimeType = req.headers.get("x-audio-mime-type") ?? "audio/webm";
  const fileName =
    req.headers.get("x-audio-file-name") ?? `voice-${Date.now()}.webm`;

  const body = await req.arrayBuffer();
  if (!body.byteLength) {
    return Response.json({ error: "Corpo vazio." }, { status: 400 });
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
  return Response.json({ url: `${base}/api/audio/${id}`, id });
}

async function handleGet(id: string): Promise<Response> {
  const store = getStore({ name: STORE_NAME, consistency: "strong" });
  const entry = await store.getWithMetadata(id, { type: "arrayBuffer" });

  if (!entry || !entry.data) {
    return Response.json({ error: "Áudio não encontrado." }, { status: 404 });
  }

  const createdAt = Number(entry.metadata?.createdAt ?? 0);
  const mimeType = String(entry.metadata?.mimeType ?? "audio/webm");
  const meta: AudioMeta = {
    mimeType,
    fileName: String(entry.metadata?.fileName ?? "voice.webm"),
    createdAt,
  };

  if (isExpired(meta)) {
    await store.delete(id);
    return Response.json({ error: "Áudio expirado." }, { status: 410 });
  }

  return new Response(entry.data, {
    status: 200,
    headers: {
      "Content-Type": mimeType,
      "Cache-Control": "public, max-age=3600",
    },
  });
}

export const config: Config = {
  path: ["/api/audio/upload", "/api/audio/:id"],
};
