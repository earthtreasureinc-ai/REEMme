// app/api/repos/route.js
// Fetches GitHub repositories from all configured GitHub tokens

async function fetchReposForToken(token) {
  const res = await fetch('https://api.github.com/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization_member', {
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json',
    },
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`)
  return res.json()
}

export async function GET() {
  const tokens = [
    process.env.ETGE_GH,
    process.env.ETGE_GH1,
    process.env.ETI_GH,
    process.env.ETI_GH1,
    process.env.SL_GH,
    process.env.SL_GH1,
  ].filter(Boolean)

  if (tokens.length === 0) {
    return Response.json({ repos: [], error: 'No GitHub tokens configured.' })
  }

  try {
    const results = await Promise.allSettled(tokens.map(fetchReposForToken))
    const seen = new Set()
    const repos = results
      .filter(r => r.status === 'fulfilled')
      .flatMap(r => r.value)
      .filter(repo => {
        if (seen.has(repo.full_name)) return false
        seen.add(repo.full_name)
        return true
      })
      .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))

    return Response.json({ repos, count: repos.length })
  } catch (e) {
    return Response.json({ repos: [], error: e.message }, { status: 500 })
  }
}
