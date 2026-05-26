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

Resumo: Webhook → normalizar → Switch/IF → transcrever áudio (base64) → Merge → AI Agent → `{ "reply": "..." }`.

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

Texto e áudio (base64). Ver exemplos em [n8n/FLUXO.md](./n8n/FLUXO.md).

O chat também grava voz pelo microfone (máx. 90s).

## Build para produção

```bash
npm run build
npm run preview
```
