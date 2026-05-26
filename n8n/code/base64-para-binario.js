// Cole no nó Code "Base64 para binário" (ramo áudio)
const item = $input.first();
const { audioBase64, audioMimeType, audioFileName, message, sessionId } = item.json;

const buffer = Buffer.from(audioBase64, "base64");

const binary = await this.helpers.prepareBinaryData(
  buffer,
  audioFileName,
  audioMimeType
);

return [
  {
    json: { message, sessionId },
    binary: { data: binary },
  },
];
