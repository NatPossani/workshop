# Workshop Chat · n8n

Interface de chat estilo GPT/Gemini (tema preto e vermelho) para demonstrar um workflow n8n aos participantes.

## Início rápido

```bash
npm install
cp .env.example .env
# Edite .env com a URL do webhook n8n
npm run dev
```

Abra `http://localhost:5173`.

## Configurar o n8n

- **Com Switch (texto/áudio):** **[n8n/SWITCH.md](./n8n/SWITCH.md)** ← use este se está a montar o agente com Switch  
- **Com IF:** **[n8n/FLUXO.md](./n8n/FLUXO.md)**

Resumo: Webhook → normalizar → Switch/IF → baixar áudio (URL) → transcrever → Merge → AI Agent → `{ "reply": "..." }`.

## Variáveis de ambiente

| Variável | Descrição |
|----------|-----------|
| `VITE_N8N_WEBHOOK_URL` | URL de produção do webhook (obrigatório) |
| `VITE_N8N_PROXY_TARGET` | Base do n8n para proxy no dev (opcional, evita CORS) |

### Exemplo direto

```env
VITE_N8N_WEBHOOK_URL=https://seu-n8n.app/webhook/workshop-chat
```

### Exemplo com proxy (dev)

```env
VITE_N8N_PROXY_TARGET=https://seu-n8n.app
VITE_N8N_WEBHOOK_URL=/api/n8n/webhook/workshop-chat
```

## Body enviado pelo chat

- **Texto:** `messageType`, `type`, `content`, `message`, `sessionId`
- **Áudio:** o ficheiro é publicado em `/api/audio/upload` e o webhook recebe `audio.url` (HTTPS), não base64

Ver [n8n/SWITCH.md](./n8n/SWITCH.md) e [n8n/FLUXO.md](./n8n/FLUXO.md).

O chat grava voz pelo microfone (máx. 90s). Os áudios expiram após 24h (configurável com `AUDIO_TTL_HOURS`).

### Áudio em desenvolvimento local

O n8n cloud precisa de uma URL **pública**. Com `npm run dev`, use uma destas opções:

1. Testar áudio com o site no **Netlify** (recomendado), ou
2. Definir `VITE_PUBLIC_BASE_URL` no `.env` com um túnel (ex.: ngrok) para `http://localhost:5173`

## Build para produção

```bash
npm run build
npm run preview
```

## Deploy no Netlify

Site de exemplo: [worshopn8n.netlify.app](https://worshopn8n.netlify.app/)

O `netlify.toml` já define build, proxy `/api/n8n` → n8n cloud e fallback SPA.

### Variáveis no painel Netlify

**Site configuration → Environment variables** (scope *Build*):

| Variável | Valor (produção) |
|----------|------------------|
| `VITE_N8N_WEBHOOK_URL` | `/api/n8n/webhook/553deedb-f1a2-4b1f-8833-82a9e51096c5` |

Use o path `/api/n8n/webhook/...` (não a URL completa): o Netlify faz proxy para `https://nat11106.app.n8n.cloud` e evita CORS.

Depois de alterar variáveis, faça **Deploy → Trigger deploy** (o Vite só lê `VITE_*` no build).

### Checklist

- [ ] Workflow n8n **ativo** (URL de produção `webhook/`, não `webhook-test/`)
- [ ] `VITE_N8N_WEBHOOK_URL` definida no Netlify
- [ ] Novo deploy após mudar env
