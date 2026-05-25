export async function POST(req) {
  const { text, voiceId } = await req.json()
  if (!text) return Response.json({ error: 'text required' }, { status: 400 })

  const elevenKey = process.env.ELEVENLABS_API_KEY || process.env.ELEVEN_LABS
  if (elevenKey) {
    try {
      const vid = voiceId || '21m00Tcm4TlvDq8ikWAM'
      const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${vid}/stream`, {
        method: 'POST',
        headers: { 'xi-api-key': elevenKey, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
        body: JSON.stringify({ text: text.slice(0, 5000), model_id: 'eleven_turbo_v2', voice_settings: { stability: 0.5, similarity_boost: 0.75 } }),
        signal: AbortSignal.timeout(30000),
      })
      if (res.ok) {
        const buffer = await res.arrayBuffer()
        return new Response(buffer, { headers: { 'Content-Type': 'audio/mpeg', 'Content-Length': String(buffer.byteLength), 'X-TTS-Provider': 'elevenlabs' } })
      }
    } catch {}
  }

  // OpenAI TTS fallback
  const openaiKey = process.env.OPENAI_API_KEY || process.env.OPENAI
  if (openaiKey) {
    try {
      const res = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: { Authorization: `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'tts-1', input: text.slice(0, 4096), voice: 'nova' }),
        signal: AbortSignal.timeout(30000),
      })
      if (res.ok) {
        const buffer = await res.arrayBuffer()
        return new Response(buffer, { headers: { 'Content-Type': 'audio/mpeg', 'Content-Length': String(buffer.byteLength), 'X-TTS-Provider': 'openai' } })
      }
    } catch {}
  }

  return Response.json({ error: 'No TTS provider configured (ELEVENLABS_API_KEY or OPENAI_API_KEY)' }, { status: 503 })
}

export async function GET() {
  const elevenKey = process.env.ELEVENLABS_API_KEY || process.env.ELEVEN_LABS
  if (!elevenKey) return Response.json({ voices: [], provider: 'none' })
  try {
    const res = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: { 'xi-api-key': elevenKey },
      signal: AbortSignal.timeout(10000),
    })
    const data = await res.json()
    return Response.json({
      voices: (data.voices || []).slice(0, 20).map(v => ({ id: v.voice_id, name: v.name, category: v.category })),
      provider: 'elevenlabs',
    })
  } catch (e) {
    return Response.json({ voices: [], error: e.message })
  }
}
