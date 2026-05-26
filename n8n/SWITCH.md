# Switch (texto vs áudio) — Workshop Chat

Guia para o **Switch** no n8n, alinhado ao JSON que **este chat** envia.

> O guia de WhatsApp usa `phone` + `content` como URL. **Aqui o áudio vem em base64** no body — **não precisa de HTTP Request** para baixar ficheiro.

---

## JSON real que chega no Webhook

### Texto

```json
{
  "messageType": "text",
  "type": "text",
  "content": "Como funciona o n8n?",
  "message": "Como funciona o n8n?",
  "sessionId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

### Áudio

```json
{
  "messageType": "audio",
  "type": "audio",
  "content": "",
  "message": "",
  "sessionId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "audio": {
    "data": "BASE64_SEM_PREFIXO_data:audio/webm...",
    "mimeType": "audio/webm",
    "fileName": "voice-1716638400000.webm"
  }
}
```

No n8n, o body pode aparecer em `$json.body` (depende da versão). Por isso use primeiro um nó **Code** para normalizar.

---

## Fluxo completo (com Switch)

```text
Webhook
   ↓
Code — Normalizar
   ↓
Switch
├── Texto ──► Edit Fields (userMessage) ──┐
│                                         ├──► Merge ──► AI Agent ──► Respond to Webhook
└── Audio ──► Code (base64→binário) ──► Transcribe ──► Edit Fields (userMessage) ──┘
```

---

## Passo 1 — Webhook

- **POST**, path `workshop-chat`
- **Respond:** Using Respond to Webhook Node
- Teste uma vez com o chat ou curl e abra a execução para ver o JSON

---

## Passo 2 — Code: Normalizar (obrigatório antes do Switch)

**Mode:** Run Once for All Items

```javascript
const body = $json.body ?? $json;

const messageType =
  body.messageType ??
  body.type ??
  (body.audio?.data ? "audio" : "text");

const content = String(body.content ?? body.message ?? "").trim();
const sessionId = String(body.sessionId ?? "default");
const audio = body.audio ?? null;

return [
  {
    json: {
      messageType,
      content,
      sessionId,
      audio,
    },
  },
];
```

Depois disto, o Switch usa sempre `{{ $json.messageType }}`.

---

## Passo 3 — Switch

| Campo | Valor |
|-------|--------|
| **Mode** | Rules |
| **Rename Output** | Ativado |

### Routing Rule 1 — Texto

| Campo | Valor |
|-------|--------|
| Value 1 | `{{ $json.messageType }}` |
| Operation | is equal to |
| Value 2 | `text` |
| Output name | `Texto` |

### Routing Rule 2 — Áudio

| Campo | Valor |
|-------|--------|
| Value 1 | `{{ $json.messageType }}` |
| Operation | is equal to |
| Value 2 | `audio` |
| Output name | `Audio` |

Saídas:

```text
Switch
├─ Texto
└─ Audio
```

---

## Passo 4 — Ramo Texto → Edit Fields

Nó **Edit Fields** (ou Set) na saída **Texto**:

| Campo | Valor |
|-------|--------|
| `userMessage` | `{{ $json.content }}` |
| `sessionId` | `{{ $json.sessionId }}` |

Ligar à entrada **1** do **Merge**.

---

## Passo 5 — Ramo Áudio (sem HTTP Request)

### 5.1 Code: base64 → binário

```javascript
const item = $input.first();
const { audio, sessionId } = item.json;

if (!audio?.data) {
  throw new Error("Áudio sem dados base64");
}

const buffer = Buffer.from(audio.data, "base64");

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
```

### 5.2 OpenAI — Transcribe a Recording

| Campo | Valor |
|-------|--------|
| Resource | Audio |
| Operation | Transcribe a Recording |
| Input Data Field Name | `data` |
| Language | `pt` (opcional) |

### 5.3 Edit Fields (após transcrição)

| Campo | Valor |
|-------|--------|
| `userMessage` | `{{ $json.text }}` |
| `sessionId` | `{{ $('Code').item.json.sessionId }}` |

> Troque `$('Code')` pelo **nome exato** do nó de normalização/base64 no seu canvas.

Ligar à entrada **2** do **Merge**.

---

## Passo 6 — Merge

| Campo | Valor |
|-------|--------|
| Mode | Append |

Só um ramo executa por pedido; o Merge entrega um item com `userMessage` igual nos dois casos.

---

## Passo 7 — AI Agent

**User message / prompt:**

```text
És um assistente num workshop sobre n8n. Responde em português, de forma clara e curta.

Mensagem do utilizador:
{{ $json.userMessage }}
```

**Memória (opcional):**

- Window Buffer Memory
- Session Key: `{{ $json.sessionId }}`

---

## Passo 8 — Respond to Webhook

```json
{
  "reply": "={{ $json.output }}"
}
```

Se o Agent devolver noutro campo, use `text` ou o que aparecer no output do nó.

---

## Comparação: WhatsApp vs este chat

| Campo | WhatsApp (guia antigo) | Workshop Chat |
|--------|------------------------|---------------|
| Identificador | `phone` | `sessionId` |
| Tipo | `messageType` | `messageType` (igual) |
| Texto | `content` | `content` + `message` |
| Áudio | URL em `content` | `audio.data` (base64) |
| Download | HTTP Request GET | **Não precisa** |

---

## Testar o Switch (curl)

**Texto:**

```bash
curl -X POST "https://SUA-URL/webhook/workshop-chat" \
  -H "Content-Type: application/json" \
  -d "{\"messageType\":\"text\",\"type\":\"text\",\"content\":\"Olá\",\"message\":\"Olá\",\"sessionId\":\"test-1\"}"
```

**Áudio:** use o chat com microfone (envia base64 automaticamente).

---

## Checklist

- [ ] Code Normalizar antes do Switch
- [ ] Switch: `messageType` = `text` | `audio`
- [ ] Ramo texto: `userMessage` = `content`
- [ ] Ramo áudio: Transcribe → `userMessage` = `text`
- [ ] Merge → AI Agent → Respond `{ "reply": "..." }`
- [ ] Workflow **publicado**
- [ ] `.env` com `VITE_N8N_WEBHOOK_URL`

Código dos nós também em `n8n/code/`.
