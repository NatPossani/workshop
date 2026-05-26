// Cole APÓS o nó HTTP Request (GET audio.url) e ANTES do OpenAI Transcribe
// Garante fileName .wav no binário — o nó LangChain OpenAI usa isso na API
const item = $input.first();
const binaryKeys = Object.keys(item.binary ?? {});

if (!binaryKeys.length) {
  throw new Error(
    "Sem binário. No HTTP Request: Response Format = File, URL = {{ $json.body.audio.url }}"
  );
}

const sourceKey = binaryKeys[0];
const buffer = await this.helpers.getBinaryDataBuffer(0, sourceKey);

const fileName = String(item.json.audioFileName ?? item.json.audio?.fileName ?? "voice.wav")
  .replace(/\.(webm|weba|mp4|m4a)$/i, ".wav");

const binary = await this.helpers.prepareBinaryData(buffer, fileName, "audio/wav");

return [
  {
    json: {
      ...item.json,
      audioFileName: fileName,
      audioBytes: buffer.length,
    },
    binary: { data: binary },
  },
];
