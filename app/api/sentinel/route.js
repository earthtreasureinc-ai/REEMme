const SENTINEL_BASE = 'https://services.sentinel-hub.com'

async function getToken() {
  const clientId = process.env.SENTINEL_CLIENT_ID
  const clientSecret = process.env.SENTINEL_CLIENT_SECRET
  if (!clientId || !clientSecret) throw new Error('SENTINEL_CLIENT_ID and SENTINEL_CLIENT_SECRET not configured')

  const res = await fetch(`${SENTINEL_BASE}/auth/realms/main/protocol/openid-connect/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'client_credentials', client_id: clientId, client_secret: clientSecret }),
    signal: AbortSignal.timeout(10000),
  })
  if (!res.ok) throw new Error(`Sentinel auth: ${res.status}`)
  const data = await res.json()
  return data.access_token
}

export async function POST(req) {
  const { bbox, date, band = 'TRUE_COLOR', width = 512, height = 512 } = await req.json()
  if (!bbox || bbox.length !== 4) return Response.json({ error: 'bbox [minLon, minLat, maxLon, maxLat] required' }, { status: 400 })

  try {
    const token = await getToken()
    const dateStr = date || new Date().toISOString().split('T')[0]
    const body = {
      input: {
        bounds: { bbox, properties: { crs: 'http://www.opengis.net/def/crs/EPSG/0/4326' } },
        data: [{ type: 'sentinel-2-l2a', dataFilter: { timeRange: { from: `${dateStr}T00:00:00Z`, to: `${dateStr}T23:59:59Z` } } }],
      },
      output: { width, height, responses: [{ identifier: 'default', format: { type: 'image/jpeg' } }] },
      evalscript: band === 'NDVI'
        ? `//VERSION=3\nfunction setup(){return{input:["B04","B08"],output:{bands:3}}}\nfunction evaluatePixel(s){let ndvi=(s.B08-s.B04)/(s.B08+s.B04);let c=colorBlend(ndvi,[-0.2,0,0.2,0.4,0.6,0.8,1],[rgb(0.192,0.106,0.047),rgb(0.4,0.4,0.4),rgb(1,1,0.88),rgb(0.145,0.588,0.145),rgb(0,0.392,0),rgb(0,0.235,0),rgb(0,0.157,0)]);return[...c]}`
        : `//VERSION=3\nfunction setup(){return{input:["B04","B03","B02"],output:{bands:3}}}\nfunction evaluatePixel(s){return[2.5*s.B04,2.5*s.B03,2.5*s.B02]}`,
    }

    const res = await fetch(`${SENTINEL_BASE}/api/v1/process`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'image/jpeg' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    })
    if (!res.ok) throw new Error(`Sentinel process: ${res.status}`)
    const imgBuffer = await res.arrayBuffer()
    const b64 = Buffer.from(imgBuffer).toString('base64')
    return Response.json({ image: `data:image/jpeg;base64,${b64}`, band, bbox, date: dateStr })
  } catch (e) {
    return Response.json({ error: e.message }, { status: e.message.includes('not configured') ? 503 : 500 })
  }
}
