import fs from "node:fs";
import path from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";
import { randomUUID } from "node:crypto";
import {
  audioFileNameWithExtension,
  buildPublicAudioUrl,
  isWebmContainer,
  isWavContainer,
  normalizeAudioMime,
  parseAudioIdFromPath,
  serveAudioHeaders,
} from "./shared/audioMedia";

const CACHE_DIR = path.resolve(".audio-cache");
const TTL_MS =
  (Number(process.env.AUDIO_TTL_HOURS) || 24) * 60 * 60 * 1000;

interface AudioMeta {
  mimeType: string;
  fileName: string;
  createdAt: number;
}

function ensureCache() {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

function metaPath(id: string) {
  return path.join(CACHE_DIR, `${id}.json`);
}

function dataPath(id: string) {
  return path.join(CACHE_DIR, id);
}

function publicBaseUrl(req: IncomingMessage): string {
  const fromEnv = process.env.VITE_PUBLIC_BASE_URL?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;

  const host = req.headers.host ?? "localhost:5173";
  const proto =
    (req.headers["x-forwarded-proto"] as string | undefined) ?? "http";
  return `${proto}://${host}`;
}

function readBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function sendJson(res: ServerResponse, status: number, data: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(data));
}

function isExpired(meta: AudioMeta): boolean {
  return Date.now() - meta.createdAt > TTL_MS;
}

function validateUploadBody(body: Buffer, mimeType: string): string | null {
  if (!body.length) return "Corpo vazio.";
  const canonical = normalizeAudioMime(mimeType);
  if (canonical === "audio/webm" && !isWebmContainer(body)) {
    return "Ficheiro não é WebM válido (cabeçalho EBML em falta).";
  }
  if (canonical === "audio/wav" && !isWavContainer(body)) {
    return "Ficheiro não é WAV válido.";
  }
  return null;
}

function purgeExpired() {
  if (!fs.existsSync(CACHE_DIR)) return;
  for (const file of fs.readdirSync(CACHE_DIR)) {
    if (!file.endsWith(".json")) continue;
    const id = file.replace(/\.json$/, "");
    try {
      const meta = JSON.parse(
        fs.readFileSync(metaPath(id), "utf8")
      ) as AudioMeta;
      if (isExpired(meta)) {
        fs.rmSync(metaPath(id), { force: true });
        fs.rmSync(dataPath(id), { force: true });
      }
    } catch {
      /* ignore corrupt entries */
    }
  }
}

async function handleUpload(req: IncomingMessage, res: ServerResponse) {
  const mimeType = normalizeAudioMime(
    req.headers["x-audio-mime-type"] as string | undefined
  );
  const rawName =
    (req.headers["x-audio-file-name"] as string | undefined) ??
    `voice-${Date.now()}.webm`;
  const fileName = audioFileNameWithExtension(rawName, mimeType);

  const body = await readBody(req);
  const validationError = validateUploadBody(body, mimeType);
  if (validationError) {
    sendJson(res, 400, { error: validationError });
    return;
  }

  purgeExpired();

  const id = randomUUID();
  const meta: AudioMeta = {
    mimeType,
    fileName,
    createdAt: Date.now(),
  };

  fs.writeFileSync(dataPath(id), body);
  fs.writeFileSync(metaPath(id), JSON.stringify(meta));

  const base = publicBaseUrl(req);
  sendJson(res, 200, {
    url: buildPublicAudioUrl(base, id, mimeType),
    id,
    mimeType,
    fileName,
  });
}

function handleGet(id: string, res: ServerResponse) {
  const metaFile = metaPath(id);
  const dataFile = dataPath(id);

  if (!fs.existsSync(metaFile) || !fs.existsSync(dataFile)) {
    sendJson(res, 404, { error: "Áudio não encontrado." });
    return;
  }

  const meta = JSON.parse(fs.readFileSync(metaFile, "utf8")) as AudioMeta;
  meta.mimeType = normalizeAudioMime(meta.mimeType);
  meta.fileName = audioFileNameWithExtension(meta.fileName, meta.mimeType);

  if (isExpired(meta)) {
    fs.rmSync(metaFile, { force: true });
    fs.rmSync(dataFile, { force: true });
    sendJson(res, 410, { error: "Áudio expirado." });
    return;
  }

  const data = fs.readFileSync(dataFile);
  const headers = serveAudioHeaders(
    meta.mimeType,
    meta.fileName,
    data.length
  );

  res.statusCode = 200;
  for (const [key, value] of Object.entries(headers)) {
    res.setHeader(key, value);
  }
  res.end(data);
}

export function audioApiPlugin(): Plugin {
  return {
    name: "workshop-audio-api",
    configureServer(server) {
      ensureCache();
      server.middlewares.use((req, res, next) => {
        const rawUrl = req.url ?? "";
        const pathname = rawUrl.split("?")[0] ?? "";

        if (!pathname.startsWith("/api/audio")) {
          next();
          return;
        }

        void (async () => {
          try {
            if (req.method === "POST" && pathname === "/api/audio/upload") {
              await handleUpload(req, res);
              return;
            }

            const id = parseAudioIdFromPath(pathname);
            if (req.method === "GET" && id) {
              handleGet(id, res);
              return;
            }

            sendJson(res, 405, { error: "Método não permitido." });
          } catch (err) {
            const message =
              err instanceof Error ? err.message : "Erro interno.";
            sendJson(res, 500, { error: message });
          }
        })();
      });
    },
  };
}
