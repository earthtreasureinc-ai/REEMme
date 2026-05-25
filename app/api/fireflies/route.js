const FIREFLIES_GQL = 'https://api.fireflies.ai/graphql'

async function gql(query, variables = {}) {
  const key = process.env.FIREFLIES
  if (!key) throw new Error('FIREFLIES not configured')
  const res = await fetch(FIREFLIES_GQL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(15000),
  })
  if (!res.ok) throw new Error(`Fireflies error: ${res.status}`)
  return res.json()
}

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action') || 'list'
  const id = searchParams.get('id')

  if (!process.env.FIREFLIES) {
    return Response.json({ error: 'FIREFLIES not configured' }, { status: 503 })
  }

  try {
    if (action === 'list') {
      const data = await gql(`
        query {
          transcripts(limit: 10) {
            id
            title
            date
            duration
            summary {
              keywords
              action_items
              overview
            }
            participants
          }
        }
      `)
      return Response.json({ transcripts: data.data?.transcripts || [], error: data.errors?.[0]?.message })
    }

    if (action === 'get' && id) {
      const data = await gql(`
        query GetTranscript($transcriptId: String!) {
          transcript(id: $transcriptId) {
            id
            title
            date
            duration
            participants
            summary {
              keywords
              action_items
              overview
              shorthand_bullet
            }
            sentences {
              index
              text
              speaker_name
              start_time
              end_time
            }
          }
        }
      `, { transcriptId: id })
      return Response.json({ transcript: data.data?.transcript, error: data.errors?.[0]?.message })
    }

    if (action === 'user') {
      const data = await gql(`query { user { user_id name email num_transcripts minutes_logged } }`)
      return Response.json({ user: data.data?.user })
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
