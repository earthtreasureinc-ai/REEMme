export async function GET() {
  const key = process.env.STRIPE
  if (!key) return Response.json({ error: 'STRIPE key not configured' }, { status: 503 })

  try {
    const [balanceRes, chargesRes, customersRes] = await Promise.allSettled([
      fetch('https://api.stripe.com/v1/balance', {
        headers: { Authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(8000),
      }),
      fetch('https://api.stripe.com/v1/charges?limit=5', {
        headers: { Authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(8000),
      }),
      fetch('https://api.stripe.com/v1/customers?limit=5', {
        headers: { Authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(8000),
      }),
    ])

    const balance = balanceRes.status === 'fulfilled' && balanceRes.value.ok
      ? await balanceRes.value.json() : null
    const charges = chargesRes.status === 'fulfilled' && chargesRes.value.ok
      ? await chargesRes.value.json() : null
    const customers = customersRes.status === 'fulfilled' && customersRes.value.ok
      ? await customersRes.value.json() : null

    return Response.json({
      balance,
      charges: charges?.data || [],
      customers: customers?.data || [],
    })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
