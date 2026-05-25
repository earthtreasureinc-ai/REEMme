export async function GET() {
  const results = await Promise.allSettled([
    fetchNetlify(),
    fetchRailway(),
    fetchVercelProjects(),
  ])

  return Response.json({
    netlify: results[0].status === 'fulfilled' ? results[0].value : { error: results[0].reason?.message },
    railway: results[1].status === 'fulfilled' ? results[1].value : { error: results[1].reason?.message },
    vercel: results[2].status === 'fulfilled' ? results[2].value : { error: results[2].reason?.message },
  })
}

async function fetchNetlify() {
  const key = process.env.NETLIFY
  if (!key) return { error: 'NETLIFY not configured' }
  const res = await fetch('https://api.netlify.com/api/v1/sites?per_page=10', {
    headers: { Authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(10000),
  })
  if (!res.ok) throw new Error(`Netlify: ${res.status}`)
  const sites = await res.json()
  return {
    sites: (Array.isArray(sites) ? sites : []).slice(0, 10).map(s => ({
      id: s.id,
      name: s.name,
      url: s.url || s.ssl_url,
      state: s.state,
      updated: s.updated_at,
      buildStatus: s.published_deploy?.state,
    })),
  }
}

async function fetchRailway() {
  const token = process.env.RAILWAY
  if (!token) return { error: 'RAILWAY not configured' }
  const res = await fetch('https://backboard.railway.app/graphql/v2', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `{ me { projects { edges { node { id name createdAt updatedAt services { edges { node { id name } } } } } } } }`,
    }),
    signal: AbortSignal.timeout(10000),
  })
  if (!res.ok) throw new Error(`Railway: ${res.status}`)
  const data = await res.json()
  const projects = data.data?.me?.projects?.edges?.map(e => ({
    id: e.node.id,
    name: e.node.name,
    updated: e.node.updatedAt,
    services: e.node.services?.edges?.map(s => s.node.name) || [],
  })) || []
  return { projects }
}

async function fetchVercelProjects() {
  const token = process.env.VERCEL
  if (!token) return { error: 'VERCEL not configured' }
  const res = await fetch('https://api.vercel.com/v9/projects?limit=10', {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(10000),
  })
  if (!res.ok) throw new Error(`Vercel: ${res.status}`)
  const data = await res.json()
  return {
    projects: (data.projects || []).slice(0, 10).map(p => ({
      id: p.id,
      name: p.name,
      framework: p.framework,
      updated: p.updatedAt,
      latestDeployment: p.latestDeployments?.[0]?.readyState,
    })),
  }
}
