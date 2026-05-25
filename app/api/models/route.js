// app/api/models/route.js
// Fetches live model lists from every configured AI provider

const GROQ_FALLBACK = [
  { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B Versatile' },
  { id: 'llama-3.1-70b-versatile', name: 'Llama 3.1 70B Versatile' },
  { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B Instant' },
  { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B' },
  { id: 'gemma2-9b-it', name: 'Gemma 2 9B' },
  { id: 'deepseek-r1-distill-llama-70b', name: 'DeepSeek R1 Llama 70B' },
  { id: 'llama-3.2-90b-vision-preview', name: 'Llama 3.2 90B Vision' },
]

const CEREBRAS_MODELS = [
  { id: 'llama3.1-8b', name: 'Llama 3.1 8B' },
  { id: 'llama3.1-70b', name: 'Llama 3.1 70B' },
  { id: 'llama3.3-70b', name: 'Llama 3.3 70B' },
  { id: 'llama-4-scout-17b-16e-instruct', name: 'Llama 4 Scout 17B' },
]

const GEMINI_MODELS = [
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
  { id: 'gemini-2.0-flash-lite', name: 'Gemini 2.0 Flash Lite' },
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
  { id: 'gemini-1.5-flash-8b', name: 'Gemini 1.5 Flash 8B' },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
  { id: 'gemini-2.5-flash-preview-04-17', name: 'Gemini 2.5 Flash Preview' },
]

const FIREWORKS_MODELS = [
  { id: 'accounts/fireworks/models/llama-v3p3-70b-instruct', name: 'Llama 3.3 70B' },
  { id: 'accounts/fireworks/models/llama-v3p1-8b-instruct', name: 'Llama 3.1 8B' },
  { id: 'accounts/fireworks/models/mixtral-8x22b-instruct', name: 'Mixtral 8x22B' },
  { id: 'accounts/fireworks/models/qwen2p5-72b-instruct', name: 'Qwen 2.5 72B' },
  { id: 'accounts/fireworks/models/deepseek-r1', name: 'DeepSeek R1' },
  { id: 'accounts/fireworks/models/deepseek-v3', name: 'DeepSeek V3' },
  { id: 'accounts/fireworks/models/phi-3-vision-128k-instruct', name: 'Phi 3 Vision 128K' },
]

const NVIDIA_MODELS = [
  { id: 'meta/llama-3.3-70b-instruct', name: 'Llama 3.3 70B' },
  { id: 'meta/llama-3.1-8b-instruct', name: 'Llama 3.1 8B' },
  { id: 'mistralai/mistral-7b-instruct-v0.3', name: 'Mistral 7B' },
  { id: 'mistralai/mixtral-8x7b-instruct-v0.1', name: 'Mixtral 8x7B' },
  { id: 'microsoft/phi-3-medium-128k-instruct', name: 'Phi 3 Medium 128K' },
  { id: 'google/gemma-2-27b-it', name: 'Gemma 2 27B' },
  { id: 'deepseek-ai/deepseek-r1', name: 'DeepSeek R1' },
  { id: 'qwen/qwen2.5-72b-instruct', name: 'Qwen 2.5 72B' },
]

const DEEPSEEK_MODELS = [
  { id: 'deepseek-chat', name: 'DeepSeek Chat (V3)' },
  { id: 'deepseek-reasoner', name: 'DeepSeek Reasoner (R1)' },
]

async function fetchWithKey(url, apiKey, extraHeaders = {}) {
  const res = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...extraHeaders,
    },
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

async function getGroqModels() {
  const key = process.env.GROQ_1 || process.env.GROQ_2 || process.env.GROQ_3 ||
              process.env.GROQ_4 || process.env.GROQ_5 || process.env.GROQ_6 ||
              process.env.GROQ_7 || process.env.GROQ_
  if (!key) return []
  try {
    const data = await fetchWithKey('https://api.groq.com/openai/v1/models', key)
    return (data.data || [])
      .filter(m => !m.id.includes('whisper') && !m.id.includes('guard') && m.active !== false)
      .map(m => ({ id: m.id, name: m.id, provider: 'groq' }))
  } catch {
    return GROQ_FALLBACK.map(m => ({ ...m, provider: 'groq' }))
  }
}

async function getOpenRouterModels() {
  const key = process.env.OPENROUTER || process.env.OPEN_ROUTER ||
              process.env.OPENROUTER_ || process.env.OPEN_R || process.env.OPEN_ROUTER_ETI
  if (!key) return []
  try {
    const data = await fetchWithKey('https://openrouter.ai/api/v1/models', key, {
      'HTTP-Referer': 'https://reemme.vercel.app',
      'X-Title': 'REEMme',
    })
    return (data.data || [])
      .filter(m => m.id && !m.id.includes(':extended'))
      .slice(0, 80) // cap at 80 to avoid overload
      .map(m => ({
        id: m.id,
        name: m.name || m.id,
        provider: 'openrouter',
        context: m.context_length,
      }))
  } catch {
    return []
  }
}

async function getMistralModels() {
  const key = process.env.MINSTRAL_1 || process.env.MINSTRAL_API || process.env.MISTRAL_2
  if (!key) return []
  try {
    const data = await fetchWithKey('https://api.mistral.ai/v1/models', key)
    return (data.data || [])
      .filter(m => m.capabilities?.completion_chat)
      .map(m => ({ id: m.id, name: m.id, provider: 'mistral' }))
  } catch {
    return []
  }
}

async function getGeminiModels() {
  const key = process.env.GEMINI_1 || process.env.GEMINI_2 || process.env.GEMINI_3 ||
              process.env.GEMINI_4 || process.env.GEMINI_5 || process.env.GEMINI_6 ||
              process.env.GEMINI_API_KEY || process.env.CODESPACE_GEMINI
  if (!key) return []
  return GEMINI_MODELS.map(m => ({ ...m, provider: 'gemini' }))
}

async function getCerebrasModels() {
  const key = process.env.CEREBRAS_1 || process.env.CEREBRAS_2 || process.env.CEREBRAS_3 ||
              process.env.CEREBRAS_4 || process.env.CEREBRAS_5 || process.env.CEREBRAS_6 ||
              process.env.CEREBRAS_7
  if (!key) return []
  try {
    const data = await fetchWithKey('https://api.cerebras.ai/v1/models', key)
    return (data.data || CEREBRAS_MODELS).map(m => ({
      id: m.id, name: m.id, provider: 'cerebras'
    }))
  } catch {
    return CEREBRAS_MODELS.map(m => ({ ...m, provider: 'cerebras' }))
  }
}

async function getFireworksModels() {
  const key = process.env.FIREWORKS_1 || process.env.FIREWORKS_2 || process.env.FIREWORKS_3 ||
              process.env.FIREWORKS_4 || process.env.FIREWORKS_5 || process.env.FIREWORKS_6 ||
              process.env.FIREWORKS_7
  if (!key) return []
  return FIREWORKS_MODELS.map(m => ({ ...m, provider: 'fireworks' }))
}

async function getNvidiaModels() {
  const key = process.env.NVIDIA_1 || process.env.NVIDIA_2 || process.env.NVIDIA_3 ||
              process.env.NVIDIA_4 || process.env.NVIDIA_5 || process.env.NVIDIA_BUILD_API_KEY ||
              process.env.NVIDIA_REEM_API_KEY || process.env.CODESPACE_NVIDIA
  if (!key) return []
  try {
    const data = await fetchWithKey('https://integrate.api.nvidia.com/v1/models', key)
    return (data.data || NVIDIA_MODELS).map(m => ({
      id: m.id, name: m.id, provider: 'nvidia'
    }))
  } catch {
    return NVIDIA_MODELS.map(m => ({ ...m, provider: 'nvidia' }))
  }
}

async function getHuggingFaceModels() {
  const key = process.env.HUGGING_FACE
  if (!key) return []
  return [
    { id: 'mistralai/Mistral-7B-Instruct-v0.3', name: 'Mistral 7B Instruct', provider: 'huggingface' },
    { id: 'meta-llama/Meta-Llama-3-8B-Instruct', name: 'Llama 3 8B Instruct', provider: 'huggingface' },
    { id: 'microsoft/Phi-3-mini-4k-instruct', name: 'Phi 3 Mini 4K', provider: 'huggingface' },
    { id: 'HuggingFaceH4/zephyr-7b-beta', name: 'Zephyr 7B Beta', provider: 'huggingface' },
    { id: 'Qwen/Qwen2.5-72B-Instruct', name: 'Qwen 2.5 72B', provider: 'huggingface' },
    { id: 'deepseek-ai/DeepSeek-R1-Distill-Qwen-32B', name: 'DeepSeek R1 Qwen 32B', provider: 'huggingface' },
  ]
}

async function getOpenAIModels() {
  const key = process.env.OPENAI
  if (!key) return []
  try {
    const data = await fetchWithKey('https://api.openai.com/v1/models', key)
    return (data.data || [])
      .filter(m => m.id.includes('gpt') || m.id.includes('o1') || m.id.includes('o3') || m.id.includes('o4'))
      .sort((a, b) => b.created - a.created)
      .slice(0, 15)
      .map(m => ({ id: m.id, name: m.id, provider: 'openai' }))
  } catch {
    return []
  }
}

async function getDeepSeekModels() {
  const key = process.env.DEEP || process.env.DEEPSEEKV4_OPENAI_NVIDIA
  if (!key) return []
  return DEEPSEEK_MODELS.map(m => ({ ...m, provider: 'deepseek' }))
}

export async function GET() {
  try {
    // Fetch all providers in parallel
    const results = await Promise.allSettled([
      getGroqModels(),
      getOpenRouterModels(),
      getGeminiModels(),
      getCerebrasModels(),
      getFireworksModels(),
      getNvidiaModels(),
      getMistralModels(),
      getHuggingFaceModels(),
      getOpenAIModels(),
      getDeepSeekModels(),
    ])

    const models = results
      .filter(r => r.status === 'fulfilled')
      .flatMap(r => r.value)

    // Friendly name cleanup - remove provider prefix noise
    const cleaned = models.map(m => ({
      ...m,
      name: m.name
        .replace(/^accounts\/fireworks\/models\//, '')
        .replace(/^meta\//, '')
        .replace(/^mistralai\//, '')
        .replace(/^microsoft\//, '')
        .replace(/^google\//, '')
        .replace(/^deepseek-ai\//, '')
        .replace(/^qwen\//, '')
        .replace(/-/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase())
        .trim()
    }))

    return Response.json({
      models: cleaned,
      count: cleaned.length,
    })
  } catch (e) {
    return Response.json({ error: e.message, models: [] }, { status: 500 })
  }
}
