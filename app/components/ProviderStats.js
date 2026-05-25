'use client'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const COLORS = {
  groq: '#f97316', openrouter: '#8b5cf6', gemini: '#3b82f6',
  fireworks: '#ec4899', cerebras: '#10b981', nvidia: '#76b900',
  mistral: '#f59e0b', huggingface: '#fbbf24', openai: '#10a37f',
  deepseek: '#6366f1', claude: '#d97706',
}

export default function ProviderStats({ models, messages }) {
  const providerCounts = models.reduce((acc, m) => {
    acc[m.provider] = (acc[m.provider] || 0) + 1
    return acc
  }, {})

  const usageCounts = messages.reduce((acc, m) => {
    if (m.providerUsed) acc[m.providerUsed] = (acc[m.providerUsed] || 0) + 1
    return acc
  }, {})

  const chartData = Object.entries(providerCounts)
    .map(([provider, count]) => ({ provider: provider.slice(0, 6), fullName: provider, count, used: usageCounts[provider] || 0 }))
    .sort((a, b) => b.count - a.count)

  return (
    <div style={{ padding: '8px 0' }}>
      <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-mono)', marginBottom: 8, padding: '0 4px' }}>
        {models.length} models · {Object.keys(providerCounts).length} providers
      </div>
      <ResponsiveContainer width="100%" height={100}>
        <BarChart data={chartData} margin={{ top: 0, right: 4, left: -20, bottom: 0 }}>
          <XAxis dataKey="provider" tick={{ fontSize: 9, fill: 'var(--text3)', fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 9, fill: 'var(--text3)' }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ background: 'var(--bg3)', border: '1px solid var(--border)', fontSize: 11, borderRadius: 6 }}
            formatter={(value, name, props) => [value, props.payload.fullName]}
            labelFormatter={() => 'models'}
          />
          <Bar dataKey="count" radius={[3, 3, 0, 0]}>
            {chartData.map((entry, i) => (
              <Cell key={i} fill={COLORS[entry.fullName] || '#888'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      {Object.keys(usageCounts).length > 0 && (
        <div style={{ marginTop: 8, padding: '0 4px' }}>
          <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--font-mono)', marginBottom: 4 }}>SESSION USAGE</div>
          {Object.entries(usageCounts).map(([p, count]) => (
            <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: COLORS[p] || '#888', flexShrink: 0 }} />
              <span style={{ fontSize: 10, color: 'var(--text2)', fontFamily: 'var(--font-mono)', flex: 1 }}>{p}</span>
              <span style={{ fontSize: 10, color: 'var(--gold)', fontFamily: 'var(--font-mono)' }}>{count} msg</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
