# Switch (texto vs áudio) — Workshop Chat

Guia para o **Switch** no n8n, alinhado ao JSON que **este chat** envia.

> O áudio é publicado pelo chat em `/api/audio/upload` e o webhook recebe **`audio.url`** (HTTPS). O ramo áudio no n8n precisa de **HTTP Request** (ou Code) para baixar o ficheiro antes da transcrição.

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
    "url": "https://worshopn8n.netlify.app/api/audio/550e8400-e29b-41d4-a716-446655440000",
    "mimeType": "audio/webm",
    "fileName": "voice-1716638400000.webm"
  }
}
```

No n8n Cloud, o Webhook costuma expor o payload **dentro de `body`**, não na raiz:

```json
{
  "body": {
    "messageType": "text",
    "type": "text",
    "content": "testar de novo",
    "message": "testar de novo",
    "sessionId": "..."
  }
}
```

Neste caso **`{{ $json.messageType }}` no Switch não existe** → o fluxo “trava” no Switch (nenhuma regra casa).

Há **duas** formas corretas (escolha uma):

| Abordagem | Switch | Edit Fields (`userMessage`) |
|-----------|--------|-----------------------------|
| **A — Code Normalizar** (recomendado) | `{{ $json.messageType }}` | `{{ $json.content }}` |
| **B — Sem Code** (direto no `body`) | `{{ $json.body.type }}` | `{{ $json.body.content }}` |

O chat envia `type` e `messageType` (ambos `text` ou `audio`). Pode usar só `{{ $json.body.type }}` na abordagem B.

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
└── Audio ──► HTTP Request (GET audio.url) ──► Transcribe ──► Edit Fields (userMessage) ─┘
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

let messageType = String(
  body.messageType ?? body.type ?? (body.audio?.url || body.audio?.data ? "audio" : "text")
).toLowerCase();

if (messageType !== "text" && messageType !== "audio") {
  messageType = body.audio?.url || body.audio?.data ? "audio" : "text";
}

const content = String(body.content ?? body.message ?? "").trim();
const sessionId = String(body.sessionId ?? "default");
const audio = body.audio ?? null;

return [
  {
    json: {
      messageType,
      type: messageType,
      content,
      sessionId,
      audio,
    },
  },
];
```

Depois disto, o Switch usa `{{ $json.type }}` ou `{{ $json.messageType }}` (iguais).

---

## Passo 3 — Switch

| Campo | Valor |
|-------|--------|
| **Mode** | Rules |
| **Rename Output** | Ativado |

### Se usou Code Normalizar (abordagem A)

### Routing Rule 1 — Texto

| Campo | Valor |
|-------|--------|
| Value 1 | `{{ $json.messageType }}` ou `{{ $json.type }}` |
| Operation | is equal to |
| Value 2 | `text` |
| Output name | `Texto` |

### Routing Rule 2 — Áudio

| Campo | Valor |
|-------|--------|
| Value 1 | `{{ $json.messageType }}` ou `{{ $json.type }}` |
| Operation | is equal to |
| Value 2 | `audio` |
| Output name | `Audio` |

### Se **não** usou Code (abordagem B — payload em `body`)

| Regra | Value 1 | Value 2 |
|-------|---------|---------|
| Texto | `{{ $json.body.type }}` | `text` |
| Áudio | `{{ $json.body.type }}` | `audio` |

Ative **Fallback Output** no Switch para ver no chat quando nenhuma regra casar.

Saídas:

```text
Switch
├─ Texto
└─ Audio
```

---

## Passo 4 — Ramo Texto → Edit Fields

Nó **Edit Fields** (ou Set) na saída **Texto**:

| Campo | Com Code Normalizar | Sem Code (só `body`) |
|-------|---------------------|----------------------|
| `userMessage` | `{{ $json.content }}` | `{{ $json.body.content }}` |
| `sessionId` | `{{ $json.sessionId }}` | `{{ $json.body.sessionId }}` |

Ligar à entrada **1** do **Merge**.

---

## Passo 5 — Ramo Áudio (baixar URL → transcrever)

### 5.1 HTTP Request — baixar o áudio

| Campo | Valor |
|-------|--------|
| Method | GET |
| URL | `{{ $json.audio.url }}` |
| Response Format | **File** |

> Alternativa: nó **Code** com o script em `n8n/code/download-audio-url.js`.

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
| Áudio | URL em `content` | `audio.url` (HTTPS) |
| Download | HTTP Request GET | **HTTP Request GET** em `audio.url` |

---

## Testar o Switch (curl)

**Texto:**

```bash
curl -X POST "https://SUA-URL/webhook/workshop-chat" \
  -H "Content-Type: application/json" \
  -d "{\"messageType\":\"text\",\"type\":\"text\",\"content\":\"Olá\",\"message\":\"Olá\",\"sessionId\":\"test-1\"}"
```

**Áudio:** use o chat com microfone (publica em `/api/audio` e envia `audio.url`).

---

## Checklist

- [ ] Switch e Edit Fields usam `$json.body.*` **ou** Code Normalizar + `$json.*` (não misturar)
- [ ] Switch: `type` / `messageType` = `text` | `audio`
- [ ] Ramo texto: `userMessage` = `content`
- [ ] Ramo áudio: Transcribe → `userMessage` = `text`
- [ ] Merge → AI Agent → Respond `{ "reply": "..." }`
- [ ] Workflow **publicado**
- [ ] `.env` com `VITE_N8N_WEBHOOK_URL`

Código dos nós também em `n8n/code/`.
