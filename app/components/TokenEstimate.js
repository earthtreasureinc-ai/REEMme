'use client'

function estimateTokens(text) {
  if (!text) return 0
  return Math.ceil(text.split(/\s+/).length * 1.35)
}

function estimateCost(tokens, provider) {
  const rates = {
    claude: 0.000015, openai: 0.00001, gemini: 0.000001,
    groq: 0.0000001, cerebras: 0.0000001, fireworks: 0.0000009,
  }
  const rate = rates[provider] || 0.000003
  return (tokens * rate).toFixed(6)
}

export default function TokenEstimate({ messages, input, attachedFiles, provider }) {
  const msgTokens = messages.reduce((sum, m) => sum + estimateTokens(m.content), 0)
  const inputTokens = estimateTokens(input)
  const fileTokens = attachedFiles.reduce((sum, f) => sum + estimateTokens(f.content || ''), 0)
  const total = msgTokens + inputTokens + fileTokens

  if (total < 10) return null

  const cost = estimateCost(total, provider)

  return (
    <span style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--font-mono)', padding: '2px 6px', background: 'var(--bg4)', borderRadius: 4, border: '1px solid var(--border)', whiteSpace: 'nowrap' }}>
      ~{total.toLocaleString()} tokens · ${cost}
    </span>
  )
}
