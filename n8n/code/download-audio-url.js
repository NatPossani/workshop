// Ramo áudio (após Switch) — baixa o ficheiro pela URL pública
// Substitui o nó "base64-para-binario" quando o chat envia audio.url
const item = $input.first();
const { audio, sessionId } = item.json;

const audioUrl = audio?.url;
if (!audioUrl) {
  throw new Error("Áudio sem URL (esperado audio.url no payload)");
}

const response = await fetch(audioUrl);
if (!response.ok) {
  throw new Error(
    `Falha ao baixar áudio (${response.status}): ${audioUrl}`
  );
}

const buffer = Buffer.from(await response.arrayBuffer());

const binary = await this.helpers.prepareBinaryData(
  buffer,
  audio.fileName ?? "voice.webm",
  audio.mimeType ?? "audio/webm"
);

return [
  {
    json: { sessionId },
    binary: { data: binary },
  },
];
