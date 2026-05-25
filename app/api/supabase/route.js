// Lightweight Supabase REST helper — no SDK dependency
function getSupabaseConfig() {
  // Support multiple env var naming conventions
  const url = process.env.SUPABASE_URL ||
    (process.env.SUPABASE_REEM ? `https://qsaeyffmehxxknsmfmzj.supabase.co` : null) ||
    (process.env.SUPABASEDEFAULT ? `https://mffiiobunqpxmewvoqhp.supabase.co` : null)
  const key = process.env.SUPABASEPUBLISHABLE || process.env.SUPABASES || process.env.SUPABASE_REEM || process.env.SUPABASEDEFAULT
  return { url, key }
}

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const table = searchParams.get('table') || 'chats'
  const userId = searchParams.get('userId')

  const { url, key } = getSupabaseConfig()
  if (!url || !key) return Response.json({ data: [], error: 'Supabase not configured' })

  try {
    const query = userId ? `?user_id=eq.${userId}&order=updated_at.desc&limit=50` : `?order=updated_at.desc&limit=50`
    const res = await fetch(`${url}/rest/v1/${table}${query}`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) throw new Error(`Supabase error: ${res.status}`)
    const data = await res.json()
    return Response.json({ data })
  } catch (e) {
    return Response.json({ data: [], error: e.message })
  }
}

export async function POST(req) {
  const body = await req.json()
  const { table = 'chats', record } = body

  const { url, key } = getSupabaseConfig()
  if (!url || !key) return Response.json({ error: 'Supabase not configured' }, { status: 503 })

  try {
    const res = await fetch(`${url}/rest/v1/${table}`, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(record),
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) throw new Error(`Supabase error: ${res.status}`)
    return Response.json({ success: true })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(req) {
  const { searchParams } = new URL(req.url)
  const table = searchParams.get('table') || 'chats'
  const id = searchParams.get('id')

  const { url, key } = getSupabaseConfig()
  if (!url || !key) return Response.json({ error: 'Supabase not configured' }, { status: 503 })
  if (!id) return Response.json({ error: 'id required' }, { status: 400 })

  try {
    const res = await fetch(`${url}/rest/v1/${table}?id=eq.${id}`, {
      method: 'DELETE',
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) throw new Error(`Supabase error: ${res.status}`)
    return Response.json({ success: true })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
