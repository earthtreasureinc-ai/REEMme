# REEMme

Your personal AI command center — a Next.js chat app that aggregates models from 10+ AI providers and your GitHub repos in one sleek interface.

## Features

- **Multi-provider AI**: Groq, OpenRouter, Gemini, Cerebras, Fireworks, NVIDIA, Mistral, HuggingFace, OpenAI, DeepSeek
- **Live model discovery**: Fetches available models from each provider on load
- **Streaming responses**: Real-time token streaming with stop support
- **GitHub integration**: Browse your repos from the sidebar
- **System prompt**: Customize AI behavior per session
- **Multi-chat**: Multiple simultaneous conversations

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy `.env.example` to `.env.local` and fill in your API keys:

```bash
cp .env.example .env.local
```

You only need keys for the providers you want to use — the app auto-detects which providers are available.

### 3. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deployment (Vercel)

1. Push to GitHub
2. Import into [Vercel](https://vercel.com)
3. Add your API keys as environment variables in the Vercel dashboard
4. Deploy

## File Structure

```
app/
├── page.js                  # Main chat UI
├── layout.js                # Root layout + fonts
├── globals.css              # Design tokens + base styles
└── api/
    ├── chat/route.js        # Streaming chat completions
    ├── models/route.js      # Live model list from all providers
    └── repos/route.js       # GitHub repository listing
next.config.mjs
package.json
.env.example
```

## Provider Keys

| Provider    | Env var(s)              |
|-------------|-------------------------|
| Groq        | `GROQ_1` … `GROQ_7`    |
| OpenRouter  | `OPENROUTER`            |
| Gemini      | `GEMINI_1` … `GEMINI_6` |
| Cerebras    | `CEREBRAS_1` … `CEREBRAS_7` |
| Fireworks   | `FIREWORKS_1` … `FIREWORKS_7` |
| NVIDIA      | `NVIDIA_1` … `NVIDIA_5` |
| Mistral     | `MINSTRAL_1`, `MINSTRAL_API` |
| HuggingFace | `HUGGING_FACE`          |
| OpenAI      | `OPENAI`                |
| DeepSeek    | `DEEP`                  |
| GitHub      | `ETGE_GH`, `ETI_GH`, `SL_GH` (+ `*1` variants) |
