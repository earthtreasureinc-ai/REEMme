// app/api/chat/route.js
// Handles streaming chat completions from all AI providers
// Features: multi-key round-robin, auto-cascade fallback, X-Provider-Used header

// ---------------------------------------------------------------------------
// Round-robin counter per provider (module-level, persists across requests)
// ---------------------------------------------------------------------------
const providerCounters = new Map()

function getNextKey(providerName, keys) {
  const available = keys.filter(Boolean)
  if (available.length === 0) return null
  const current = providerCounters.get(providerName) || 0
  const key = available[current % available.length]
  providerCounters.set(providerName, current + 1)
  return key
}

// ---------------------------------------------------------------------------
// Provider definitions
// ---------------------------------------------------------------------------
const PROVIDER_DEFS = {
  claude: {
    type: 'anthropic',
    getKey: () => getNextKey('claude', [
      process.env.CLAUDE_1,
      process.env.CLAUDE_2,
      process.env.CLAUDE_3,
    ]),
  },
  groq: {
    type: 'openai-compat',
    url: 'https://api.groq.com/openai/v1/chat/completions',
    defaultModel: 'llama-3.3-70b-versatile',
    getKey: () => getNextKey('groq', [
      process.env.GROQ_,
      process.env.GROQ_1,
      process.env.GROQ_2,
      process.env.GROQ_3,
      process.env.GROQ_4,
      process.env.GROQ_5,
      process.env.GROQ_6,
      process.env.GROQ_7,
    ]),
  },
  cerebras: {
    type: 'openai-compat',
    url: 'https://api.cerebras.ai/v1/chat/completions',
    defaultModel: 'llama-3.3-70b',
    getKey: () => getNextKey('cerebras', [
      process.env.CEREBRAS_1,
      process.env.CEREBRAS_2,
      process.env.CEREBRAS_3,
      process.env.CEREBRAS_4,
      process.env.CEREBRAS_5,
      process.env.CEREBRAS_6,
      process.env.CEREBRAS_7,
    ]),
  },
  fireworks: {
    type: 'openai-compat',
    url: 'https://api.fireworks.ai/inference/v1/chat/completions',
    defaultModel: 'accounts/fireworks/models/llama-v3p3-70b-instruct',
    getKey: () => getNextKey('fireworks', [
      process.env.FIREWORKS_1,
      process.env.FIREWORKS_2,
      process.env.FIREWORKS_3,
      process.env.FIREWORKS_4,
      process.env.FIREWORKS_5,
      process.env.FIREWORKS_6,
      process.env.FIREWORKS_7,
    ]),
  },
  gemini: {
    type: 'gemini',
    getKey: () => getNextKey('gemini', [
      process.env.GEMINI_API_KEY,
      process.env.GEMINI_1,
      process.env.GEMINI_2,
      process.env.GEMINI_3,
      process.env.GEMINI_4,
      process.env.GEMINI_5,
      process.env.GEMINI_6,
    ]),
  },
  nvidia: {
    type: 'openai-compat',
    url: 'https://integrate.api.nvidia.com/v1/chat/completions',
    defaultModel: 'meta/llama-3.3-70b-instruct',
    getKey: () => getNextKey('nvidia', [
      process.env.NVIDIA_REEM_API_KEY,
      process.env.NVIDIA_1,
      process.env.NVIDIA_2,
      process.env.NVIDIA_3,
      process.env.NVIDIA_4,
      process.env.NVIDIA_5,
    ]),
  },
  mistral: {
    type: 'openai-compat',
    url: 'https://api.mistral.ai/v1/chat/completions',
    defaultModel: 'mistral-small-latest',
    getKey: () => getNextKey('mistral', [
      process.env.MINSTRAL_API,
      process.env.MINSTRAL_1,
      process.env.MISTRAL_2,
    ]),
  },
  openrouter: {
    type: 'openai-compat',
    url: 'https://openrouter.ai/api/v1/chat/completions',
    extraHeaders: {
      'HTTP-Referer': 'https://reemme.vercel.app',
      'X-Title': 'REEMme',
    },
    getKey: () => getNextKey('openrouter', [
      process.env.OPEN_ROUTER,
      process.env.OPEN_ROUTER_ETI,
      process.env.OPENROUTER,
      process.env.OPENROUTER_,
      process.env.OPEN_R,
    ]),
  },
  openai: {
    type: 'openai-compat',
    url: 'https://api.openai.com/v1/chat/completions',
    defaultModel: 'gpt-4o-mini',
    getKey: () => getNextKey('openai', [
      process.env.OPENAI,
    ]),
  },
  deepseek: {
    type: 'openai-compat',
    url: 'https://api.deepseek.com/v1/chat/completions',
    defaultModel: 'deepseek-chat',
    getKey: () => getNextKey('deepseek', [
      process.env.DEEPSEEKV4_OPENAI_NVIDIA,
      process.env.DEEP,
    ]),
  },
  huggingface: {
    type: 'openai-compat',
    url: 'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3/v1/chat/completions',
    getKey: () => getNextKey('huggingface', [
      process.env.HUGGING_FACE,
    ]),
  },
}

// Cascade order: try these providers in sequence on failure
const CASCADE_ORDER = [
  'claude',
  'groq',
  'cerebras',
  'fireworks',
  'gemini',
  'nvidia',
  'mistral',
  'openrouter',
  'openai',
  'deepseek',
  'huggingface',
]

// ---------------------------------------------------------------------------
// Call helpers per provider type
// ---------------------------------------------------------------------------

async function callOpenAICompat(providerName, def, messages, model) {
  const apiKey = def.getKey()
  if (!apiKey) return null // no key available

  const resolvedModel = model || def.defaultModel || 'gpt-4o-mini'
  const url = def.url

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...(def.extraHeaders || {}),
    },
    body: JSON.stringify({
      model: resolvedModel,
      messages,
      stream: true,
      max_tokens: 4096,
      temperature: 0.7,
    }),
  })

  if (!res.ok) return null
  return res.body // ReadableStream of raw SSE
}

async function callAnthropic(def, messages, model) {
  const apiKey = def.getKey()
  if (!apiKey) return null

  // Separate system messages from conversation messages
  const systemMessages = messages.filter(m => m.role === 'system')
  const conversationMessages = messages.filter(m => m.role !== 'system')

  const systemText = systemMessages.map(m => m.content).join('\n').trim()
  const resolvedModel = model || 'claude-3-5-haiku-20241022'

  const body = {
    model: resolvedModel,
    max_tokens: 4096,
    messages: conversationMessages,
    stream: true,
  }
  if (systemText) body.system = systemText

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) return null
  return res.body // ReadableStream of raw Anthropic SSE
}

async function callGemini(def, messages, model) {
  const apiKey = def.getKey()
  if (!apiKey) return null

  // Convert messages to Gemini format
  const systemMessages = messages.filter(m => m.role === 'system')
  const conversationMessages = messages.filter(m => m.role !== 'system')

  const systemInstruction = systemMessages.length
    ? { parts: [{ text: systemMessages.map(m => m.content).join('\n') }] }
    : undefined

  const contents = conversationMessages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))

  const geminiModel = model || 'gemini-2.0-flash'
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:streamGenerateContent?key=${apiKey}&alt=sse`

  const geminiBody = { contents }
  if (systemInstruction) geminiBody.systemInstruction = systemInstruction
  geminiBody.generationConfig = { maxOutputTokens: 4096, temperature: 0.7 }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(geminiBody),
  })

  if (!res.ok) return null
  return res.body // ReadableStream of Gemini SSE
}

// ---------------------------------------------------------------------------
// Stream transformers
// ---------------------------------------------------------------------------

/**
 * Transform Anthropic SSE stream into OpenAI-compatible SSE stream.
 * Anthropic events: content_block_delta with delta.text
 */
function transformAnthropicStream(rawBody) {
  const decoder = new TextDecoder()
  const encoder = new TextEncoder()
  let buffer = ''

  const readable = new ReadableStream({
    async start(controller) {
      const reader = rawBody.getReader()
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })

          const lines = buffer.split('\n')
          buffer = lines.pop() // keep incomplete last line

          for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed.startsWith('data:')) continue
            const jsonStr = trimmed.slice(5).trim()
            if (!jsonStr || jsonStr === '[DONE]') continue

            let event
            try { event = JSON.parse(jsonStr) } catch { continue }

            if (
              event.type === 'content_block_delta' &&
              event.delta?.type === 'text_delta' &&
              event.delta?.text
            ) {
              // Emit as OpenAI-compatible SSE chunk
              const chunk = {
                id: `chatcmpl-anthropic-${Date.now()}`,
                object: 'chat.completion.chunk',
                created: Math.floor(Date.now() / 1000),
                model: 'claude',
                choices: [{
                  index: 0,
                  delta: { content: event.delta.text },
                  finish_reason: null,
                }],
              }
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`))
            } else if (event.type === 'message_stop') {
              controller.enqueue(encoder.encode('data: [DONE]\n\n'))
            }
          }
        }
        // Flush remaining buffer
        if (buffer.trim().startsWith('data:')) {
          const jsonStr = buffer.trim().slice(5).trim()
          if (jsonStr && jsonStr !== '[DONE]') {
            try {
              const event = JSON.parse(jsonStr)
              if (
                event.type === 'content_block_delta' &&
                event.delta?.type === 'text_delta' &&
                event.delta?.text
              ) {
                const chunk = {
                  id: `chatcmpl-anthropic-${Date.now()}`,
                  object: 'chat.completion.chunk',
                  created: Math.floor(Date.now() / 1000),
                  model: 'claude',
                  choices: [{
                    index: 0,
                    delta: { content: event.delta.text },
                    finish_reason: null,
                  }],
                }
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`))
              }
            } catch {}
          }
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      } catch (err) {
        controller.error(err)
      } finally {
        reader.releaseLock()
        controller.close()
      }
    },
  })

  return readable
}

/**
 * Transform Gemini SSE stream into OpenAI-compatible SSE stream.
 * Gemini events: candidates[0].content.parts[0].text
 */
function transformGeminiStream(rawBody) {
  const decoder = new TextDecoder()
  const encoder = new TextEncoder()
  let buffer = ''

  const readable = new ReadableStream({
    async start(controller) {
      const reader = rawBody.getReader()
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })

          const lines = buffer.split('\n')
          buffer = lines.pop()

          for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed.startsWith('data:')) continue
            const jsonStr = trimmed.slice(5).trim()
            if (!jsonStr || jsonStr === '[DONE]') continue

            let event
            try { event = JSON.parse(jsonStr) } catch { continue }

            const text = event?.candidates?.[0]?.content?.parts?.[0]?.text
            if (text) {
              const chunk = {
                id: `chatcmpl-gemini-${Date.now()}`,
                object: 'chat.completion.chunk',
                created: Math.floor(Date.now() / 1000),
                model: 'gemini',
                choices: [{
                  index: 0,
                  delta: { content: text },
                  finish_reason: null,
                }],
              }
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`))
            }

            const finishReason = event?.candidates?.[0]?.finishReason
            if (finishReason && finishReason !== 'STOP' && finishReason !== '') {
              // non-normal stop, still emit done
            }
          }
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      } catch (err) {
        controller.error(err)
      } finally {
        reader.releaseLock()
        controller.close()
      }
    },
  })

  return readable
}

// ---------------------------------------------------------------------------
// Try a single provider, return { stream, providerName } or null
// ---------------------------------------------------------------------------
async function tryProvider(providerName, messages, model) {
  const def = PROVIDER_DEFS[providerName]
  if (!def) return null

  try {
    if (def.type === 'anthropic') {
      const rawBody = await callAnthropic(def, messages, model)
      if (!rawBody) return null
      return { stream: transformAnthropicStream(rawBody), providerName }
    }

    if (def.type === 'gemini') {
      const rawBody = await callGemini(def, messages, model)
      if (!rawBody) return null
      return { stream: transformGeminiStream(rawBody), providerName }
    }

    // openai-compat: pass model through (use def.defaultModel if none supplied)
    const rawBody = await callOpenAICompat(providerName, def, messages, model)
    if (!rawBody) return null
    return { stream: rawBody, providerName }
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------
export async function POST(req) {
  try {
    const { messages, model, provider } = await req.json()

    if (!messages || !provider) {
      return Response.json({ error: 'Missing messages or provider' }, { status: 400 })
    }

    if (!PROVIDER_DEFS[provider]) {
      return Response.json({ error: `Unknown provider: ${provider}` }, { status: 400 })
    }

    // Build cascade: requested provider first, then rest of cascade order, deduped
    const cascade = [provider, ...CASCADE_ORDER.filter(p => p !== provider)]

    let result = null
    for (const p of cascade) {
      result = await tryProvider(p, messages, model)
      if (result) break
    }

    if (!result) {
      return Response.json(
        { error: 'All providers failed or have no API keys configured.' },
        { status: 502 }
      )
    }

    return new Response(result.stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'X-Accel-Buffering': 'no',
        'X-Provider-Used': result.providerName,
      },
    })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
