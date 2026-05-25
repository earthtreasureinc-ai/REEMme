// Multi-agent parallel: same prompt → multiple providers simultaneously → compare results

const PROVIDER_ENDPOINTS = {
  groq: {
    url: 'https://api.groq.com/openai/v1/chat/completions',
    getKey: () => process.env.GROQ_1 || process.env.GROQ_2 || process.env.GROQ_3,
    defaultModel: 'llama-3.3-70b-versatile',
  },
  cerebras: {
    url: 'https://api.cerebras.ai/v1/chat/completions',
    getKey: () => process.env.CEREBRAS_1 || process.env.CEREBRAS_2,
    defaultModel: 'llama3.3-70b',
  },
  gemini: {
    url: null, // special handling
    getKey: () => process.env.GEMINI_1 || process.env.GEMINI_API_KEY || process.env.CODESPACE_GEMINI,
    defaultModel: 'gemini-2.0-flash',
  },
  fireworks: {
    url: 'https://api.fireworks.ai/inference/v1/chat/completions',
    getKey: () => process.env.FIREWORKS_1 || process.env.FIREWORKS_2,
    defaultModel: 'accounts/fireworks/models/llama-v3p3-70b-instruct',
  },
  nvidia: {
    url: 'https://integrate.api.nvidia.com/v1/chat/completions',
    getKey: () => process.env.NVIDIA_REEM_API_KEY || process.env.NVIDIA_1 || process.env.CODESPACE_NVIDIA,
    defaultModel: 'meta/llama-3.3-70b-instruct',
  },
  mistral: {
    url: 'https://api.mistral.ai/v1/chat/completions',
    getKey: () => process.env.MINSTRAL_API || process.env.MINSTRAL_1,
    defaultModel: 'mistral-small-latest',
  },
  openai: {
    url: 'https://api.openai.com/v1/chat/completions',
    getKey: () => process.env.OPENAI,
    defaultModel: 'gpt-4o-mini',
  },
  deepseek: {
    url: 'https://api.deepseek.com/v1/chat/completions',
    getKey: () => process.env.DEEP,
    defaultModel: 'deepseek-chat',
  },
}

async function callOpenAICompat(def, messages) {
  const key = def.getKey()
  if (!key) throw new Error('No key')
  const res = await fetch(def.url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: def.defaultModel, messages, stream: false, max_tokens: 2048 }),
    signal: AbortSignal.timeout(45000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()
  return data.choices?.[0]?.message?.content || ''
}

async function callGemini(def, messages) {
  const key = def.getKey()
  if (!key) throw new Error('No key')
  const system = messages.filter(m => m.role === 'system').map(m => m.content).join('\n')
  const convo = messages.filter(m => m.role !== 'system').map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))
  const body = { contents: convo, generationConfig: { maxOutputTokens: 2048 } }
  if (system) body.systemInstruction = { parts: [{ text: system }] }
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${def.defaultModel}:generateContent?key=${key}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(45000) }
  )
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
}

export async function POST(req) {
  const { messages, providers = ['groq', 'gemini', 'cerebras'] } = await req.json()
  if (!messages?.length) return Response.json({ error: 'messages required' }, { status: 400 })

  const startTime = Date.now()

  const { default: pLimit } = await import('p-limit')
  const limit = pLimit(6)

  const results = await Promise.allSettled(
    providers.map(async (providerName) => limit(async () => {
      const def = PROVIDER_ENDPOINTS[providerName]
      if (!def) throw new Error(`Unknown provider: ${providerName}`)
      const t0 = Date.now()
      let content
      if (providerName === 'gemini') {
        content = await callGemini(def, messages)
      } else {
        content = await callOpenAICompat(def, messages)
      }
      return { provider: providerName, content, latencyMs: Date.now() - t0 }
    })
  )

  const responses = results.map((r, i) => {
    if (r.status === 'fulfilled') return r.value
    return { provider: providers[i], content: null, error: r.reason?.message || 'Failed', latencyMs: 0 }
  })

  return Response.json({
    responses,
    totalMs: Date.now() - startTime,
    count: responses.filter(r => r.content).length,
  })
}
