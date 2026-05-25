'use client'
import { Command } from 'cmdk'
import { useEffect } from 'react'

export default function CommandPalette({ open, onClose, chats, models, onNewChat, onSelectChat, onSelectModel, onExport, onSearch }) {
  useEffect(() => {
    const down = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [onClose])

  if (!open) return null

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 2000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 100 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <Command
        style={{ background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 14, width: '100%', maxWidth: 560, overflow: 'hidden', boxShadow: '0 40px 100px rgba(0,0,0,0.7)', fontFamily: 'var(--font)' }}
        label="Command Menu"
      >
        <Command.Input
          placeholder="Type a command or search…"
          style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: 'var(--text)', fontSize: 16, padding: '16px 18px', borderBottom: '1px solid var(--border)', fontFamily: 'var(--font)' }}
        />
        <Command.List style={{ maxHeight: 380, overflowY: 'auto', padding: '8px 6px' }}>
          <Command.Empty style={{ padding: '20px', textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
            No results found.
          </Command.Empty>

          <Command.Group heading="Actions" style={{ '& [cmdk-group-heading]': { color: 'var(--text3)' } }}>
            <CmdItem icon="💬" label="New Chat" shortcut="⌘N" onSelect={() => { onNewChat(); onClose() }} />
            <CmdItem icon="🔍" label="Search Chats" shortcut="⌘F" onSelect={() => { onSearch(); onClose() }} />
            <CmdItem icon="📥" label="Export Chat" onSelect={() => { onExport(); onClose() }} />
          </Command.Group>

          {models.length > 0 && (
            <Command.Group heading="Switch Model">
              {models.slice(0, 8).map(m => (
                <CmdItem key={`${m.provider}-${m.id}`} icon="🤖" label={m.name} sub={m.provider}
                  onSelect={() => { onSelectModel(m); onClose() }} />
              ))}
            </Command.Group>
          )}

          {chats.length > 0 && (
            <Command.Group heading="Recent Chats">
              {chats.slice(0, 6).map(c => (
                <CmdItem key={c.id} icon="💬" label={c.title} onSelect={() => { onSelectChat(c.id); onClose() }} />
              ))}
            </Command.Group>
          )}
        </Command.List>
        <div style={{ padding: '8px 14px', borderTop: '1px solid var(--border)', display: 'flex', gap: 12, alignItems: 'center' }}>
          <kbd style={kbdStyle}>↑↓</kbd><span style={hintStyle}>navigate</span>
          <kbd style={kbdStyle}>↵</kbd><span style={hintStyle}>select</span>
          <kbd style={kbdStyle}>Esc</kbd><span style={hintStyle}>close</span>
        </div>
      </Command>
    </div>
  )
}

function CmdItem({ icon, label, sub, shortcut, onSelect }) {
  return (
    <Command.Item
      onSelect={onSelect}
      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 7, cursor: 'pointer', color: 'var(--text)', fontSize: 14 }}
    >
      <span style={{ fontSize: 15, flexShrink: 0 }}>{icon}</span>
      <span style={{ flex: 1 }}>{label}</span>
      {sub && <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>{sub}</span>}
      {shortcut && <kbd style={kbdStyle}>{shortcut}</kbd>}
    </Command.Item>
  )
}

const kbdStyle = { fontSize: 10, color: 'var(--text3)', background: 'var(--bg4)', padding: '2px 5px', borderRadius: 4, border: '1px solid var(--border)', fontFamily: 'var(--font-mono)' }
const hintStyle = { fontSize: 11, color: 'var(--text3)' }
