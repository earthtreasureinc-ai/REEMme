export async function POST(req) {
  const { text, avatarId, voiceId, aspectRatio } = await req.json()
  if (!text) return Response.json({ error: 'text required' }, { status: 400 })

  const key = process.env.HEYGEN
  if (!key) return Response.json({ error: 'HEYGEN key not configured' }, { status: 503 })

  try {
    // Create video generation job
    const createRes = await fetch('https://api.heygen.com/v2/video/generate', {
      method: 'POST',
      headers: { 'X-Api-Key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        video_inputs: [{
          character: {
            type: 'avatar',
            avatar_id: avatarId || 'Abigail_expressive_2024112501',
            avatar_style: 'normal',
          },
          voice: {
            type: 'text',
            input_text: text.slice(0, 1500),
            voice_id: voiceId || '2d5b0e6cf36f460aa7fc47e3eee4ba54',
          },
          background: { type: 'color', value: '#1a1a2e' },
        }],
        dimension: aspectRatio === '9:16'
          ? { width: 720, height: 1280 }
          : { width: 1280, height: 720 },
        aspect_ratio: aspectRatio || '16:9',
      }),
      signal: AbortSignal.timeout(30000),
    })

    if (!createRes.ok) {
      const err = await createRes.text()
      return Response.json({ error: `HeyGen error: ${createRes.status} — ${err}` }, { status: createRes.status })
    }

    const createData = await createRes.json()
    const videoId = createData.data?.video_id

    if (!videoId) return Response.json({ error: 'No video_id returned', raw: createData }, { status: 500 })

    // Poll for completion (up to 90s)
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 3000))
      const statusRes = await fetch(`https://api.heygen.com/v1/video_status.get?video_id=${videoId}`, {
        headers: { 'X-Api-Key': key },
        signal: AbortSignal.timeout(10000),
      })
      if (!statusRes.ok) continue
      const status = await statusRes.json()
      const s = status.data?.status
      if (s === 'completed') {
        return Response.json({
          videoId,
          videoUrl: status.data.video_url,
          thumbnailUrl: status.data.thumbnail_url,
          duration: status.data.duration,
          status: 'completed',
        })
      }
      if (s === 'failed') {
        return Response.json({ error: 'HeyGen generation failed', videoId }, { status: 500 })
      }
    }

    return Response.json({ videoId, status: 'processing', message: 'Video is still generating. Poll /api/heygen/status?id=' + videoId })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const videoId = searchParams.get('id')
  if (!videoId) return Response.json({ error: 'id required' }, { status: 400 })

  const key = process.env.HEYGEN
  if (!key) return Response.json({ error: 'HEYGEN not configured' }, { status: 503 })

  const res = await fetch(`https://api.heygen.com/v1/video_status.get?video_id=${videoId}`, {
    headers: { 'X-Api-Key': key },
    signal: AbortSignal.timeout(10000),
  })
  if (!res.ok) return Response.json({ error: `${res.status}` }, { status: res.status })
  const data = await res.json()
  return Response.json(data.data || data)
}
