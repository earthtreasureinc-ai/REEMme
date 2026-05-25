'use client'
import { useEffect, useRef, useState } from 'react'

export default function MermaidDiagram({ chart }) {
  const ref = useRef(null)
  const [error, setError] = useState(null)
  const [svg, setSvg] = useState('')

  useEffect(() => {
    if (!chart) return
    let cancelled = false
    import('mermaid').then(({ default: mermaid }) => {
      mermaid.initialize({ startOnLoad: false, theme: 'dark', darkMode: true,
        themeVariables: { primaryColor: '#d4a853', primaryTextColor: '#e8e3d9', lineColor: '#555', background: '#1a1a1a' }
      })
      const id = `mermaid-${Math.random().toString(36).slice(2)}`
      mermaid.render(id, chart).then(({ svg: rendered }) => {
        if (!cancelled) setSvg(rendered)
      }).catch(e => {
        if (!cancelled) setError(e.message)
      })
    })
    return () => { cancelled = true }
  }, [chart])

  if (error) return (
    <div style={{ padding: '8px 12px', background: '#1f0a0a', border: '1px solid #5a1a1a', borderRadius: 8, fontSize: 12, color: '#ef4444' }}>
      Diagram error: {error}
    </div>
  )
  if (!svg) return <div style={{ padding: 8, color: 'var(--text3)', fontSize: 12 }}>Rendering diagram…</div>
  return (
    <div
      ref={ref}
      style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: 16, overflowX: 'auto', marginTop: 8 }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}
