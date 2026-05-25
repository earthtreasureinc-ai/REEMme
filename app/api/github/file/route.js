export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const owner = searchParams.get('owner')
  const repo = searchParams.get('repo')
  const path = searchParams.get('path') || 'README.md'
  const ref = searchParams.get('ref') || 'main'

  if (!owner || !repo) {
    return Response.json({ error: 'owner and repo are required' }, { status: 400 })
  }

  const tokens = [
    process.env.ETGE_GH, process.env.ETGE_GH1,
    process.env.ETI_GH, process.env.ETI_GH1,
    process.env.SL_GH, process.env.SL_GH1,
  ].filter(Boolean)

  if (tokens.length === 0) {
    return Response.json({ error: 'No GitHub tokens configured' }, { status: 503 })
  }

  // Try each token until one works
  for (const token of tokens) {
    try {
      const res = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${ref}`,
        {
          headers: {
            Authorization: `token ${token}`,
            Accept: 'application/vnd.github.v3+json',
          },
          signal: AbortSignal.timeout(8000),
        }
      )

      if (res.status === 404) {
        // Try 'master' branch as fallback
        if (ref === 'main') {
          const res2 = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=master`,
            {
              headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' },
              signal: AbortSignal.timeout(5000),
            }
          )
          if (res2.ok) {
            const data = await res2.json()
            if (data.content) {
              const content = Buffer.from(data.content, 'base64').toString('utf-8')
              return Response.json({ content, path: data.path, size: data.size, sha: data.sha })
            }
          }
        }
        return Response.json({ error: 'File not found' }, { status: 404 })
      }

      if (!res.ok) continue

      const data = await res.json()
      if (!data.content) return Response.json({ error: 'No content' }, { status: 404 })

      const content = Buffer.from(data.content, 'base64').toString('utf-8')
      return Response.json({ content, path: data.path, size: data.size, sha: data.sha })
    } catch {
      continue
    }
  }

  return Response.json({ error: 'Could not fetch file' }, { status: 500 })
}
