'use client'
import { useState, useEffect, useRef } from 'react'
import Fuse from 'fuse.js'

export default function ChatSearch({ chats, onSelect, onClose }) {
  const [query, setQuery] = useState('')
  const inputRef = useRef(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const allMessages = chats.flatMap(chat =>
    chat.messages.map(msg => ({ chatId: chat.id, chatTitle: chat.title, role: msg.role, content: msg.content, ts: chat.ts }))
  )

  const results = query.trim()
    ? new Fuse(allMessages, { keys: ['content', 'chatTitle'], threshold: 0.35, includeMatches: true }).search(query).slice(0, 15)
    : []

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 80 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 12, width: '100%', maxWidth: 600, overflow: 'hidden', boxShadow: '0 30px 80px rgba(0,0,0,0.6)' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search all chats…"
            style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: 'var(--text)', fontSize: 15, fontFamily: 'var(--font)' }}
          />
          <kbd style={{ fontSize: 11, color: 'var(--text3)', background: 'var(--bg4)', padding: '2px 6px', borderRadius: 4, border: '1px solid var(--border)' }}>Esc</kbd>
        </div>
        <div style={{ maxHeight: 400, overflowY: 'auto' }}>
          {results.length === 0 && query.trim() && (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>No results for &quot;{query}&quot;</div>
          )}
          {results.length === 0 && !query.trim() && (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>Type to search across all conversations</div>
          )}
          {results.map((r, i) => (
            <button
              key={i}
              onClick={() => { onSelect(r.item.chatId); onClose() }}
              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 16px', borderBottom: '1px solid var(--border)', transition: 'background .1s', background: 'none', color: 'var(--text)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg4)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-mono)', marginBottom: 3 }}>
                {r.item.role === 'user' ? 'You' : 'AI'} · {r.item.chatTitle}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {r.item.content?.slice(0, 120)}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
