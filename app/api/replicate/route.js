export async function POST(req) {
  const { model, input, version } = await req.json()
  if (!model && !version) return Response.json({ error: 'model or version required' }, { status: 400 })
  const token = process.env.REPLICATE_API_TOKEN
  if (!token) return Response.json({ error: 'REPLICATE_API_TOKEN not configured' }, { status: 503 })

  try {
    // Create prediction
    const body = version ? { version, input } : { model, input }
    const createRes = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: { Authorization: `Token ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    })
    if (!createRes.ok) throw new Error(`Replicate: ${createRes.status}`)
    const prediction = await createRes.json()

    // Poll up to 60s
    let result = prediction
    const start = Date.now()
    while (['starting', 'processing'].includes(result.status) && Date.now() - start < 60000) {
      await new Promise(r => setTimeout(r, 2000))
      const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${result.id}`, {
        headers: { Authorization: `Token ${token}` },
        signal: AbortSignal.timeout(10000),
      })
      result = await pollRes.json()
    }
    return Response.json({ id: result.id, status: result.status, output: result.output, error: result.error })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}

export async function GET(req) {
  const token = process.env.REPLICATE_API_TOKEN
  if (!token) return Response.json({ error: 'REPLICATE_API_TOKEN not configured' }, { status: 503 })
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return Response.json({ error: 'id required' }, { status: 400 })
  try {
    const res = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
      headers: { Authorization: `Token ${token}` },
      signal: AbortSignal.timeout(10000),
    })
    return Response.json(await res.json())
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
