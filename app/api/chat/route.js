// app/api/chat/route.js
// Handles streaming chat completions from all AI providers

const PROVIDERS = {
  groq: {
    baseUrl: 'https://api.groq.com/openai/v1',
    getKey: () => process.env.GROQ_1 || process.env.GROQ_2 || process.env.GROQ_3 ||
                   process.env.GROQ_4 || process.env.GROQ_5 || process.env.GROQ_6 ||
                   process.env.GROQ_7 || process.env.GROQ_,
  },
  openrouter: {
    baseUrl: 'https://openrouter.ai/api/v1',
    getKey: () => process.env.OPENROUTER || process.env.OPEN_ROUTER ||
                   process.env.OPENROUTER_ || process.env.OPEN_R || process.env.OPEN_ROUTER_ETI,
    extraHeaders: {
      'HTTP-Referer': 'https://reemme.vercel.app',
      'X-Title': 'REEMme',
    },
  },
  gemini: {
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    getKey: () => process.env.GEMINI_1 || process.env.GEMINI_2 || process.env.GEMINI_3 ||
                   process.env.GEMINI_4 || process.env.GEMINI_5 || process.env.GEMINI_6 ||
                   process.env.GEMINI_API_KEY || process.env.CODESPACE_GEMINI,
  },
  fireworks: {
    baseUrl: 'https://api.fireworks.ai/inference/v1',
    getKey: () => process.env.FIREWORKS_1 || process.env.FIREWORKS_2 || process.env.FIREWORKS_3 ||
                   process.env.FIREWORKS_4 || process.env.FIREWORKS_5 || process.env.FIREWORKS_6 ||
                   process.env.FIREWORKS_7,
  },
  cerebras: {
    baseUrl: 'https://api.cerebras.ai/v1',
    getKey: () => process.env.CEREBRAS_1 || process.env.CEREBRAS_2 || process.env.CEREBRAS_3 ||
                   process.env.CEREBRAS_4 || process.env.CEREBRAS_5 || process.env.CEREBRAS_6 ||
                   process.env.CEREBRAS_7,
  },
  nvidia: {
    baseUrl: 'https://integrate.api.nvidia.com/v1',
    getKey: () => process.env.NVIDIA_1 || process.env.NVIDIA_2 || process.env.NVIDIA_3 ||
                   process.env.NVIDIA_4 || process.env.NVIDIA_5 || process.env.NVIDIA_BUILD_API_KEY ||
                   process.env.NVIDIA_REEM_API_KEY || process.env.CODESPACE_NVIDIA,
  },
  mistral: {
    baseUrl: 'https://api.mistral.ai/v1',
    getKey: () => process.env.MINSTRAL_1 || process.env.MINSTRAL_API || process.env.MISTRAL_2,
  },
  huggingface: {
    baseUrl: 'https://api-inference.huggingface.co/v1',
    getKey: () => process.env.HUGGING_FACE,
  },
  openai: {
    baseUrl: 'https://api.openai.com/v1',
    getKey: () => process.env.OPENAI,
  },
  deepseek: {
    baseUrl: 'https://api.deepseek.com/v1',
    getKey: () => process.env.DEEP || process.env.DEEPSEEKV4_OPENAI_NVIDIA,
  },
}

export async function POST(req) {
  try {
    const { messages, model, provider } = await req.json()

    if (!messages || !model || !provider) {
      return Response.json({ error: 'Missing messages, model, or provider' }, { status: 400 })
    }

    const config = PROVIDERS[provider]
    if (!config) {
      return Response.json({ error: `Unknown provider: ${provider}` }, { status: 400 })
    }

    const apiKey = config.getKey()
    if (!apiKey) {
      return Response.json({
        error: `No API key found for ${provider}. Add your key to Vercel environment variables.`
      }, { status: 400 })
    }

    const upstream = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        ...(config.extraHeaders || {}),
      },
      body: JSON.stringify({
        model,
        messages,
        stream: true,
        max_tokens: 4096,
        temperature: 0.7,
      }),
    })

    if (!upstream.ok) {
      const errText = await upstream.text()
      let errMsg = errText
      try {
        const errJson = JSON.parse(errText)
        errMsg = errJson?.error?.message || errJson?.message || errText
      } catch {}
      return Response.json({ error: errMsg }, { status: upstream.status })
    }

    // Stream directly back to client
    return new Response(upstream.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'X-Accel-Buffering': 'no',
      },
    })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
