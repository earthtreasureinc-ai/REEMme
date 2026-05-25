const NOTION_BASE = 'https://api.notion.com/v1'
const NOTION_VERSION = '2022-06-28'

function notionHeaders() {
  const token = process.env.NOTION_API_KEY || process.env.NOTION_TOKEN
  if (!token) throw new Error('NOTION_API_KEY not configured')
  return { Authorization: `Bearer ${token}`, 'Notion-Version': NOTION_VERSION, 'Content-Type': 'application/json' }
}

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action') || 'search'
  const q = searchParams.get('q') || ''

  try {
    const headers = notionHeaders()

    if (action === 'search') {
      const res = await fetch(`${NOTION_BASE}/search`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ query: q, page_size: 10 }),
        signal: AbortSignal.timeout(10000),
      })
      if (!res.ok) throw new Error(`Notion: ${res.status}`)
      const data = await res.json()
      return Response.json({
        results: (data.results || []).map(p => ({
          id: p.id,
          title: p.properties?.title?.title?.[0]?.plain_text || p.properties?.Name?.title?.[0]?.plain_text || 'Untitled',
          type: p.object,
          url: p.url,
          lastEdited: p.last_edited_time,
        }))
      })
    }

    if (action === 'page') {
      const id = searchParams.get('id')
      if (!id) return Response.json({ error: 'id required' }, { status: 400 })
      const [pageRes, blocksRes] = await Promise.all([
        fetch(`${NOTION_BASE}/pages/${id}`, { headers, signal: AbortSignal.timeout(10000) }),
        fetch(`${NOTION_BASE}/blocks/${id}/children?page_size=50`, { headers, signal: AbortSignal.timeout(10000) }),
      ])
      const page = await pageRes.json()
      const blocks = await blocksRes.json()
      return Response.json({ page, blocks: blocks.results || [] })
    }

    return Response.json({ error: 'Unknown action (search|page)' }, { status: 400 })
  } catch (e) {
    return Response.json({ error: e.message }, { status: e.message.includes('not configured') ? 503 : 500 })
  }
}

export async function POST(req) {
  const { parentId, title, content } = await req.json()
  if (!parentId || !title) return Response.json({ error: 'parentId and title required' }, { status: 400 })

  try {
    const headers = notionHeaders()
    const res = await fetch(`${NOTION_BASE}/pages`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        parent: { page_id: parentId },
        properties: { title: { title: [{ text: { content: title } }] } },
        children: content ? [{
          object: 'block', type: 'paragraph',
          paragraph: { rich_text: [{ text: { content: content.slice(0, 2000) } }] }
        }] : [],
      }),
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) throw new Error(`Notion create: ${res.status}`)
    const data = await res.json()
    return Response.json({ id: data.id, url: data.url })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
