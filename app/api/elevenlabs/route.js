const VOICE_ID = '21m00Tcm4TlvDq8ikWAM' // Rachel — natural female voice
const BASE = 'https://api.elevenlabs.io/v1'

export async function POST(req) {
  const { text, voiceId, stability, similarity } = await req.json()
  if (!text) return Response.json({ error: 'text required' }, { status: 400 })
  const key = process.env.ELEVENLABS_API_KEY || process.env.ELEVEN_LABS
  if (!key) return Response.json({ error: 'ELEVENLABS_API_KEY not configured' }, { status: 503 })

  try {
    const res = await fetch(`${BASE}/text-to-speech/${voiceId || VOICE_ID}/stream`, {
      method: 'POST',
      headers: { 'xi-api-key': key, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
      body: JSON.stringify({
        text: text.slice(0, 5000),
        model_id: 'eleven_turbo_v2',
        voice_settings: { stability: stability ?? 0.5, similarity_boost: similarity ?? 0.75 },
      }),
      signal: AbortSignal.timeout(30000),
    })
    if (!res.ok) {
      const err = await res.text()
      throw new Error(`ElevenLabs: ${res.status} — ${err}`)
    }
    const buffer = await res.arrayBuffer()
    return new Response(buffer, { headers: { 'Content-Type': 'audio/mpeg', 'Content-Length': buffer.byteLength.toString() } })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}

export async function GET() {
  const key = process.env.ELEVENLABS_API_KEY || process.env.ELEVEN_LABS
  if (!key) return Response.json({ error: 'ELEVENLABS_API_KEY not configured' }, { status: 503 })
  try {
    const res = await fetch(`${BASE}/voices`, {
      headers: { 'xi-api-key': key },
      signal: AbortSignal.timeout(10000),
    })
    const data = await res.json()
    return Response.json({ voices: (data.voices || []).map(v => ({ id: v.voice_id, name: v.name, category: v.category })) })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
