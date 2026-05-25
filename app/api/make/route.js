const MAKE_BASE = 'https://us2.make.com/api/v2'
const TEAM_ID = 2084910
const ORG_ID = 7116044

function makeHeaders() {
  const token = process.env.MAKE_API_KEY || process.env.MAKE_TOKEN
  if (!token) throw new Error('MAKE_API_KEY not configured — add it to Vercel env vars')
  return { Authorization: `Token ${token}`, 'Content-Type': 'application/json' }
}

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action') || 'scenarios'

  try {
    const headers = makeHeaders()

    if (action === 'scenarios') {
      const res = await fetch(`${MAKE_BASE}/scenarios?teamId=${TEAM_ID}`, {
        headers, signal: AbortSignal.timeout(10000),
      })
      if (!res.ok) throw new Error(`Make.com: ${res.status}`)
      const data = await res.json()
      return Response.json({ scenarios: data.scenarios || [] })
    }

    if (action === 'connections') {
      const res = await fetch(`${MAKE_BASE}/connections?teamId=${TEAM_ID}`, {
        headers, signal: AbortSignal.timeout(10000),
      })
      if (!res.ok) throw new Error(`Make.com: ${res.status}`)
      const data = await res.json()
      return Response.json({ connections: data.connections || [] })
    }

    if (action === 'executions') {
      const scenarioId = searchParams.get('scenarioId')
      const url = scenarioId
        ? `${MAKE_BASE}/scenarios/${scenarioId}/logs`
        : `${MAKE_BASE}/executions?teamId=${TEAM_ID}&limit=10`
      const res = await fetch(url, { headers, signal: AbortSignal.timeout(10000) })
      if (!res.ok) throw new Error(`Make.com: ${res.status}`)
      const data = await res.json()
      return Response.json(data)
    }

    return Response.json({ error: 'Unknown action (scenarios|connections|executions)' }, { status: 400 })
  } catch (e) {
    return Response.json({ error: e.message }, { status: e.message.includes('not configured') ? 503 : 500 })
  }
}

export async function POST(req) {
  const { scenarioId, data: hookData } = await req.json()
  if (!scenarioId) return Response.json({ error: 'scenarioId required' }, { status: 400 })

  try {
    const headers = makeHeaders()
    const res = await fetch(`${MAKE_BASE}/scenarios/${scenarioId}/run`, {
      method: 'POST',
      headers,
      body: JSON.stringify(hookData || {}),
      signal: AbortSignal.timeout(30000),
    })
    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Make.com run failed: ${res.status} — ${err}`)
    }
    const result = await res.json()
    return Response.json({ success: true, result })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
