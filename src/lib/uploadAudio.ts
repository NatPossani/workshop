const UPLOAD_PATH = "/api/audio/upload";

export async function uploadAudio(
  blob: Blob,
  fileName: string
): Promise<string> {
  const response = await fetch(UPLOAD_PATH, {
    method: "POST",
    headers: {
      "Content-Type": "application/octet-stream",
      "X-Audio-Mime-Type": blob.type || "audio/webm",
      "X-Audio-File-Name": fileName,
    },
    body: blob,
  });

  const text = await response.text().catch(() => "");

  if (!response.ok) {
    let detail = text.slice(0, 200);
    try {
      const data = JSON.parse(text) as { error?: string };
      if (data.error) detail = data.error;
    } catch {
      /* texto simples */
    }
    throw new Error(
      `Falha ao publicar áudio (${response.status}): ${detail || "erro desconhecido"}`
    );
  }

  let data: { url?: string };
  try {
    data = JSON.parse(text) as { url?: string };
  } catch {
    throw new Error("Resposta de upload inválida (não é JSON).");
  }

  const url = data.url?.trim();
  if (!url) {
    throw new Error("Upload concluído mas sem URL no servidor.");
  }

  return url;
}
