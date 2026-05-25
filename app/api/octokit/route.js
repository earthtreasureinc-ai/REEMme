import { Octokit } from '@octokit/rest'

function getOctokit() {
  const token = process.env.ETGE_GH || process.env.ETI_GH || process.env.SL_GH
  if (!token) throw new Error('No GitHub token configured')
  return new Octokit({ auth: token })
}

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')
  const type = searchParams.get('type') || 'repos' // repos | code | users | issues
  const per_page = Math.min(Number(searchParams.get('limit') || 10), 30)

  if (!q) return Response.json({ error: 'q (query) required' }, { status: 400 })

  try {
    const octokit = getOctokit()

    if (type === 'code') {
      const { data } = await octokit.rest.search.code({ q, per_page })
      return Response.json({ items: data.items.map(i => ({ path: i.path, repo: i.repository.full_name, url: i.html_url, sha: i.sha })), total: data.total_count })
    }
    if (type === 'users') {
      const { data } = await octokit.rest.search.users({ q, per_page })
      return Response.json({ items: data.items.map(u => ({ login: u.login, url: u.html_url, avatar: u.avatar_url, type: u.type })), total: data.total_count })
    }
    if (type === 'issues') {
      const { data } = await octokit.rest.search.issuesAndPullRequests({ q, per_page })
      return Response.json({ items: data.items.map(i => ({ title: i.title, url: i.html_url, state: i.state, repo: i.repository_url?.split('/').slice(-2).join('/') })), total: data.total_count })
    }
    // default: repos
    const { data } = await octokit.rest.search.repos({ q, per_page, sort: 'stars' })
    return Response.json({ items: data.items.map(r => ({ name: r.full_name, url: r.html_url, description: r.description, stars: r.stargazers_count, language: r.language })), total: data.total_count })
  } catch (e) {
    return Response.json({ error: e.message }, { status: e.status || 500 })
  }
}
