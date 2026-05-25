export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search') || ''
  const type = searchParams.get('type') || 'models' // models | spaces | datasets
  const limit = parseInt(searchParams.get('limit') || '12', 10)

  const hfKey = process.env.HUGGING_FACE
  const headers = hfKey ? { Authorization: `Bearer ${hfKey}` } : {}

  try {
    let url
    if (type === 'spaces') {
      url = `https://huggingface.co/api/spaces?search=${encodeURIComponent(search)}&limit=${limit}&sort=likes&direction=-1`
    } else if (type === 'datasets') {
      url = `https://huggingface.co/api/datasets?search=${encodeURIComponent(search)}&limit=${limit}&sort=downloads&direction=-1`
    } else {
      url = `https://huggingface.co/api/models?search=${encodeURIComponent(search)}&limit=${limit}&sort=downloads&direction=-1&filter=text-generation`
    }

    const res = await fetch(url, { headers, signal: AbortSignal.timeout(8000) })
    if (!res.ok) throw new Error(`HuggingFace API error: ${res.status}`)

    const data = await res.json()

    const items = (Array.isArray(data) ? data : []).map(item => ({
      id: item.id || item.modelId,
      name: item.id || item.modelId,
      likes: item.likes || 0,
      downloads: item.downloads || 0,
      tags: (item.tags || item.pipeline_tag ? [item.pipeline_tag, ...(item.tags || [])].filter(Boolean) : []).slice(0, 3),
      url: `https://huggingface.co/${item.id || item.modelId}`,
    }))

    return Response.json({ items, type, count: items.length })
  } catch (e) {
    return Response.json({ error: e.message, items: [] }, { status: 500 })
  }
}
