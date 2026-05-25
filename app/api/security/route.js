export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const query = searchParams.get('q')
  const type = searchParams.get('type') || 'shodan' // shodan | virustotal | aiornot

  if (!query) return Response.json({ error: 'q parameter required' }, { status: 400 })

  if (type === 'shodan') {
    const key = process.env.SHODAN
    if (!key) return Response.json({ error: 'SHODAN not configured' }, { status: 503 })
    try {
      // Detect if query is an IP or a search term
      const isIp = /^\d{1,3}(\.\d{1,3}){3}$/.test(query.trim())
      const url = isIp
        ? `https://api.shodan.io/shodan/host/${encodeURIComponent(query)}?key=${key}`
        : `https://api.shodan.io/shodan/host/search?key=${key}&query=${encodeURIComponent(query)}&facets=country,port`
      const res = await fetch(url, { signal: AbortSignal.timeout(12000) })
      if (!res.ok) {
        const err = await res.text()
        return Response.json({ error: `Shodan: ${res.status}`, detail: err }, { status: res.status })
      }
      const data = await res.json()
      return Response.json({ provider: 'shodan', isIp, data })
    } catch (e) {
      return Response.json({ error: e.message }, { status: 500 })
    }
  }

  if (type === 'virustotal') {
    const key = process.env.VIRUSTOTAL
    if (!key) return Response.json({ error: 'VIRUSTOTAL not configured' }, { status: 503 })
    try {
      // URL scan
      const isUrl = query.startsWith('http') || query.includes('.')
      let analysisUrl

      if (isUrl) {
        // Submit URL for scanning
        const submitRes = await fetch('https://www.virustotal.com/api/v3/urls', {
          method: 'POST',
          headers: { 'x-apikey': key, 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `url=${encodeURIComponent(query)}`,
          signal: AbortSignal.timeout(15000),
        })
        if (!submitRes.ok) return Response.json({ error: `VT submit: ${submitRes.status}` }, { status: submitRes.status })
        const submitData = await submitRes.json()
        analysisUrl = `https://www.virustotal.com/api/v3/analyses/${submitData.data?.id}`
      } else {
        // File hash lookup
        analysisUrl = `https://www.virustotal.com/api/v3/files/${encodeURIComponent(query)}`
      }

      // Wait a moment then fetch result
      await new Promise(r => setTimeout(r, 2000))
      const resVt = await fetch(analysisUrl, {
        headers: { 'x-apikey': key },
        signal: AbortSignal.timeout(15000),
      })
      if (!resVt.ok) return Response.json({ error: `VT result: ${resVt.status}` }, { status: resVt.status })
      const vtData = await resVt.json()

      const stats = vtData.data?.attributes?.stats || vtData.data?.attributes?.last_analysis_stats
      return Response.json({ provider: 'virustotal', query, isUrl, stats, data: vtData.data })
    } catch (e) {
      return Response.json({ error: e.message }, { status: 500 })
    }
  }

  if (type === 'aiornot') {
    const key = process.env.AI_OR_NOT_API_KEY
    if (!key) return Response.json({ error: 'AI_OR_NOT_API_KEY not configured' }, { status: 503 })
    try {
      const res = await fetch('https://api.aiornot.com/v1/reports/text', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ object: query }),
        signal: AbortSignal.timeout(20000),
      })
      if (!res.ok) {
        const e = await res.text()
        return Response.json({ error: `AI or Not: ${res.status}`, detail: e }, { status: res.status })
      }
      const data = await res.json()
      return Response.json({ provider: 'aiornot', query, data })
    } catch (e) {
      return Response.json({ error: e.message }, { status: 500 })
    }
  }

  return Response.json({ error: 'Unknown type' }, { status: 400 })
}
