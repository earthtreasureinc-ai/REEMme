'use client'
import { useState, useRef } from 'react'

export default function VoiceInput({ onTranscript, disabled }) {
  const [listening, setListening] = useState(false)
  const recognitionRef = useRef(null)

  const toggle = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return

    if (listening) {
      recognitionRef.current?.abort()
      setListening(false)
      return
    }

    const r = new SR()
    recognitionRef.current = r
    r.continuous = false
    r.interimResults = false
    r.lang = 'en-US'
    r.onstart = () => setListening(true)
    r.onend   = () => setListening(false)
    r.onerror = () => setListening(false)
    r.onresult = (e) => {
      const text = Array.from(e.results)
        .map(r => r[0].transcript)
        .join(' ')
      onTranscript?.(text)
    }
    r.start()
  }

  return (
    <button
      onClick={toggle}
      disabled={disabled}
      title={listening ? 'Stop recording' : 'Voice input'}
      style={{
        width: 34,
        height: 34,
        borderRadius: 8,
        background: listening ? 'rgba(224,80,80,0.15)' : 'var(--bg4)',
        border: `1px solid ${listening ? 'rgba(224,80,80,0.4)' : 'var(--border2)'}`,
        color: listening ? '#e05050' : 'var(--text3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 14,
        flexShrink: 0,
        transition: 'all 0.15s',
        animation: listening ? 'goldPulse 1.4s ease-in-out infinite' : 'none',
      }}
    >
      {listening ? '⏹' : '🎤'}
    </button>
  )
}
