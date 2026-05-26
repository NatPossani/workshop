import type { Config } from "@netlify/functions";
import { getStore } from "@netlify/blobs";
import {
  audioFileNameWithExtension,
  buildPublicAudioUrl,
  isWavContainer,
  normalizeAudioMime,
  publicBaseUrl,
} from "./audio-media";

const STORE_NAME = "workshop-audio-temp";

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return Response.json({ error: "Use POST" }, { status: 405 });
  }

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

export const config: Config = {
  path: "/api/audio/upload",
};
