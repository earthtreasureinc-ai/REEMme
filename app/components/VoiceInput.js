import { useState, useRef } from 'react'

export default function VoiceInput({ onTranscript, disabled }) {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const recognitionRef = useRef(null)

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      alert('Speech Recognition not supported in your browser')
      return
    }
    
    recognitionRef.current = new SpeechRecognition()
    recognitionRef.current.continuous = false
    recognitionRef.current.interimResults = true
    
    recognitionRef.current.onstart = () => setIsListening(true)
    recognitionRef.current.onend = () => setIsListening(false)
    recognitionRef.current.onresult = (event) => {
      let interimTranscript = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          setTranscript(prev => prev + transcript + ' ')
          onTranscript(transcript)
        } else {
          interimTranscript += transcript
        }
      }
    }
    recognitionRef.current.start()
  }

  const stopListening = () => {
    if (recognitionRef.current) recognitionRef.current.abort()
    setIsListening(false)
  }

  return (
    <button
      onClick={isListening ? stopListening : startListening}
      disabled={disabled}
      style={{
        padding: '6px 12px',
        borderRadius: 8,
        background: isListening ? '#f87171' : 'var(--bg4)',
        border: '1px solid var(--border2)',
        color: isListening ? '#fff' : 'var(--text2)',
        fontSize: 12,
        cursor: 'pointer',
        fontFamily: 'var(--font)',
        transition: 'all .15s',
      }}
    >
      {isListening ? '🎤 Stop' : '🎤 Voice'}
    </button>
  )
}
