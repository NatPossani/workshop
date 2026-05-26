# Fluxo n8n — Workshop Chat (texto + áudio)

Guia passo a passo para montar o workflow que recebe mensagens do chat e responde com IA.

> **A usar Switch (como no teu guia)?** → Vai direto a **[SWITCH.md](./SWITCH.md)** — tem `messageType`, regras Texto/Áudio e expressões `{{ $json... }}` certas para este chat.

## Visão do fluxo (IF ou Switch)

```
Webhook (POST)
    ↓
Normalizar entrada (Code)
    ↓
Switch ou IF (messageType: text | audio)
    ├─ Texto → Edit Fields (userMessage)
    └─ Áudio → Base64 → binário → Transcribe → Edit Fields (userMessage)
    ↓
Merge
    ↓
AI Agent (+ memória por sessionId)
    ↓
Respond to Webhook  →  { "reply": "..." }
```

---

## Pré-requisitos

- n8n cloud ou self-hosted
- Credencial **OpenAI** (para transcrição Whisper + modelo do agente)
- Workflow **publicado** (toggle Active)

---

## Passo 1 — Webhook

1. Novo workflow → adicionar nó **Webhook**
2. Configuração:
   - **HTTP Method:** POST
   - **Path:** `workshop-chat`
   - **Authentication:** None (workshop)
   - **Respond:** `Using Respond to Webhook Node`
3. Copie a **Production URL** (ex.: `https://xxx.app.n8n.cloud/webhook/workshop-chat`)
4. Cole no `.env` do projeto:

```env
VITE_N8N_WEBHOOK_URL=https://SUA-URL/webhook/workshop-chat
```

---

## Passo 2 — Code: Normalizar entrada

Adicione um nó **Code** ligado ao Webhook.

**Mode:** Run Once for All Items  
**Language:** JavaScript

```javascript
const body = $json.body ?? $json;

const message = String(body.message ?? '').trim();
const sessionId = String(body.sessionId ?? 'default');
const audio = body.audio;

const hasAudio = Boolean(audio?.data);

return [{
  json: {
    message,
    sessionId,
    hasAudio,
    audioMimeType: audio?.mimeType ?? 'audio/webm',
    audioFileName: audio?.fileName ?? 'voice.webm',
    audioBase64: audio?.data ?? null,
  },
}];
```

---

## Passo 3 — IF: tem áudio?

1. Nó **IF** após o Code
2. Condição:
   - **Value 1:** `{{ $json.hasAudio }}`
   - **Operation:** is true

- Saída **true** → ramo áudio  
- Saída **false** → ramo texto

---

## Passo 4a — Ramo TEXTO (false)

Nó **Edit Fields (Set)**:

| Campo     | Valor                    |
|-----------|--------------------------|
| `message` | `{{ $json.message }}`    |
| `sessionId` | `{{ $json.sessionId }}` |

Ligue à entrada **1** do **Merge** (ver passo 6).

---

## Passo 4b — Ramo ÁUDIO (true)

### 4b.1 — Code: Base64 → binário

```javascript
const item = $input.first();
const { audioBase64, audioMimeType, audioFileName, message, sessionId } = item.json;

const buffer = Buffer.from(audioBase64, 'base64');

const binary = await this.helpers.prepareBinaryData(
  buffer,
  audioFileName,
  audioMimeType
);

return [{
  json: { message, sessionId },
  binary: { data: binary },
}];
```

### 4b.2 — OpenAI: Transcrever

- **Resource:** Audio  
- **Operation:** Transcribe a Recording  
- **Credential:** OpenAI  
- **Input Data Field Name:** `data` (binário do passo anterior)  
- **Language:** `pt` (opcional, melhora PT)

A saída traz o texto em `$json.text`.

### 4b.3 — Set: mensagem = transcrição

| Campo       | Valor              |
|-------------|--------------------|
| `message`   | `{{ $json.text }}` |
| `sessionId` | `{{ $('Code').item.json.sessionId }}` |

> Ajuste `$('Code')` para o **nome exato** do nó “Normalizar entrada” no teu canvas.

Ligue à entrada **2** do **Merge**.

---

## Passo 5 — Merge

- **Mode:** Append  
- Reúne ramo texto e ramo áudio (só um executa por pedido)

---

## Passo 6 — AI Agent

1. Nó **AI Agent**
2. **Chat Model:** OpenAI Chat Model (ex. `gpt-4o-mini`)
3. **Prompt / User Message:**

```
{{ $json.message }}
```

4. **System Message** (sugestão para workshop):

```
És um assistente num workshop sobre automação com n8n.
Responde em português, de forma clara e curta (2-4 frases).
Se a pergunta for sobre n8n, explica com um exemplo prático.
```

### Memória (opcional, recomendado)

- Adicione **Window Buffer Memory** ao Agent  
- **Session Key:** `{{ $json.sessionId }}`  
- Assim cada participante mantém contexto na conversa

---

## Passo 7 — Respond to Webhook

Último nó, ligado ao AI Agent.

**Response Body** → JSON:

```json
{
  "reply": "={{ $json.output }}"
}
```

> Se o Agent devolver noutro campo, use `{{ $json.text }}` ou o campo que aparecer no output do nó.

---

## Body que o chat envia

Ver JSON completo em **[SWITCH.md](./SWITCH.md)**.

Resumo: `messageType` + `content` + `sessionId`; áudio em `audio.data` (base64, sem URL).

---

## Testar sem o front

### Texto (curl)

```bash
curl -X POST "https://SUA-URL/webhook/workshop-chat" \
  -H "Content-Type: application/json" \
  -d "{\"message\":\"Olá\",\"sessionId\":\"test-1\",\"type\":\"text\"}"
```

Resposta esperada: `{"reply":"..."}`

---

## Checklist antes da demo

- [ ] Workflow **Active / Published**
- [ ] Credencial OpenAI válida
- [ ] Webhook em modo **Respond to Webhook**
- [ ] `.env` com `VITE_N8N_WEBHOOK_URL` correto
- [ ] `npm run dev` a correr
- [ ] Browser com permissão de **microfone**
- [ ] Teste texto → OK
- [ ] Teste áudio → transcrição → resposta OK

---

## Problemas comuns

| Problema | Solução |
|----------|---------|
| CORS no browser | Use proxy no `.env` (`VITE_N8N_PROXY_TARGET`) |
| Timeout | Transcrição + IA podem demorar; aumente timeout do webhook se self-hosted |
| `reply` vazio | Confirme expressão no Respond to Webhook (`output` vs `text`) |
| Áudio não transcreve | Verifique nó Code binário e campo `data` no OpenAI |
| Microfone bloqueado | HTTPS ou localhost; permitir microfone no browser |

---

## Alternativa: Gemini em vez de OpenAI

- Transcrição: use nó **Google Gemini** com áudio, ou mantenha OpenAI só para Whisper  
- Agent: troque Chat Model por **Google Gemini Chat Model**

A estrutura do fluxo (Webhook → IF áudio → Merge → Agent → Respond) mantém-se igual.
