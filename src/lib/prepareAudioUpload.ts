import {
  extensionForAudioMime,
  isWebmContainer,
  isWavContainer,
  normalizeAudioMime,
} from "../../shared/audioMedia";
import { blobToWav } from "./audioWav";

export interface PreparedAudio {
  blob: Blob;
  mimeType: string;
  fileName: string;
}

/**
 * Garante container válido, MIME canónico e extensão aceite pela OpenAI (webm/wav/m4a).
 * Converte para WAV se o WebM gravado estiver incompleto ou ilegível.
 */
export async function prepareAudioForUpload(
  rawBlob: Blob
): Promise<PreparedAudio> {
  const initialMime = normalizeAudioMime(rawBlob.type);
  const buffer = await rawBlob.arrayBuffer();

  if (isWavContainer(buffer)) {
    const mimeType = "audio/wav";
    return {
      blob: new Blob([buffer], { type: mimeType }),
      mimeType,
      fileName: `voice-${Date.now()}.${extensionForAudioMime(mimeType)}`,
    };
  }

  if (isWebmContainer(buffer)) {
    const mimeType = "audio/webm";
    return {
      blob: new Blob([buffer], { type: mimeType }),
      mimeType,
      fileName: `voice-${Date.now()}.${extensionForAudioMime(mimeType)}`,
    };
  }

  if (initialMime === "audio/mp4" || initialMime.includes("mp4")) {
    const mimeType = "audio/mp4";
    return {
      blob: new Blob([buffer], { type: mimeType }),
      mimeType,
      fileName: `voice-${Date.now()}.${extensionForAudioMime(mimeType)}`,
    };
  }

  try {
    const wavBlob = await blobToWav(rawBlob);
    const mimeType = "audio/wav";
    return {
      blob: wavBlob,
      mimeType,
      fileName: `voice-${Date.now()}.${extensionForAudioMime(mimeType)}`,
    };
  } catch {
    throw new Error(
      "Gravação inválida ou incompleta. Grave novamente (mín. 1 segundo)."
    );
  }
}
