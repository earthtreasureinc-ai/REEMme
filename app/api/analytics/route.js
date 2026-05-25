export async function GET() {
  const results = await Promise.allSettled([
    fetchStripeStats(),
    fetchGitHubStats(),
    fetchHeyGenStats(),
  ])

  return Response.json({
    stripe: results[0].status === 'fulfilled' ? results[0].value : { error: results[0].reason?.message },
    github: results[1].status === 'fulfilled' ? results[1].value : { error: results[1].reason?.message },
    heygen: results[2].status === 'fulfilled' ? results[2].value : { error: results[2].reason?.message },
    timestamp: new Date().toISOString(),
  })
}

async function fetchStripeStats() {
  const key = process.env.STRIPE
  if (!key) return { error: 'STRIPE not configured' }
  const [balRes, chargeRes] = await Promise.all([
    fetch('https://api.stripe.com/v1/balance', { headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(8000) }),
    fetch('https://api.stripe.com/v1/charges?limit=100', { headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(8000) }),
  ])
  const balance = await balRes.json()
  const charges = await chargeRes.json()
  const succeeded = (charges.data || []).filter(c => c.status === 'succeeded')
  const totalRevenue = succeeded.reduce((sum, c) => sum + c.amount, 0)
  return {
    available: balance.available?.[0]?.amount || 0,
    currency: balance.available?.[0]?.currency || 'usd',
    totalCharges: charges.data?.length || 0,
    succeededCharges: succeeded.length,
    totalRevenue,
    recentCharges: succeeded.slice(0, 7).map(c => ({ amount: c.amount, date: new Date(c.created * 1000).toLocaleDateString(), desc: c.description })),
  }
}

async function fetchGitHubStats() {
  const tokens = [process.env.ETGE_GH, process.env.ETI_GH, process.env.SL_GH].filter(Boolean)
  if (!tokens.length) return { error: 'No GitHub tokens' }
  const results = await Promise.allSettled(tokens.map(token =>
    fetch('https://api.github.com/user/repos?per_page=100&type=all', {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
      signal: AbortSignal.timeout(8000),
    }).then(r => r.json())
  ))
  const allRepos = results.flatMap(r => r.status === 'fulfilled' ? (Array.isArray(r.value) ? r.value : []) : [])
  const totalStars = allRepos.reduce((s, r) => s + (r.stargazers_count || 0), 0)
  const languages = allRepos.reduce((acc, r) => { if (r.language) acc[r.language] = (acc[r.language] || 0) + 1; return acc }, {})
  return { totalRepos: allRepos.length, totalStars, topLanguages: Object.entries(languages).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([lang,count])=>({lang,count})) }
}

async function fetchHeyGenStats() {
  const key = process.env.HEYGEN
  if (!key) return { error: 'HEYGEN not configured' }
  try {
    const res = await fetch('https://api.heygen.com/v2/video.list?limit=10', {
      headers: { 'X-Api-Key': key },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return { error: `HeyGen: ${res.status}` }
    const data = await res.json()
    return { totalVideos: data.data?.total || 0, recentVideos: (data.data?.videos || []).slice(0, 5).map(v => ({ id: v.video_id, status: v.status, created: v.created_at })) }
  } catch (e) { return { error: e.message } }
}
