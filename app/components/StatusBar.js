'use client'

export default function StatusBar({ models, isStreaming, selectedModel, providerColors }) {
  const providers = [...new Set(models.map(m => m.provider))]
  if (providers.length === 0) return null

  return (
    <div style={{
      display: 'flex', gap: 6, padding: '3px 16px', background: 'var(--bg2)', borderBottom: '1px solid var(--border)',
      overflowX: 'auto', alignItems: 'center', flexShrink: 0,
    }}>
      <span style={{ fontSize: 9, color: 'var(--text3)', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em', flexShrink: 0 }}>LIVE:</span>
      {providers.map(p => (
        <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
          <div style={{
            width: 5, height: 5, borderRadius: '50%',
            background: isStreaming && selectedModel?.provider === p ? '#10b981' : (providerColors[p] || '#888'),
            boxShadow: isStreaming && selectedModel?.provider === p ? '0 0 6px #10b981' : 'none',
            transition: 'all .3s',
          }} />
          <span style={{ fontSize: 9, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>{p}</span>
        </div>
      ))}
      {isStreaming && (
        <span style={{ fontSize: 9, color: '#10b981', fontFamily: 'var(--font-mono)', marginLeft: 'auto', flexShrink: 0, animation: 'pulse 1s ease-in-out infinite' }}>
          ● streaming
        </span>
      )}
    </div>
  )
}
