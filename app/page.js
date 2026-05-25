'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import VoiceInput from './components/VoiceInput'

// ═══════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════

const PRESETS = [
  { label: 'REEM OS', value: 'You are REEM OS — the sovereign AI operating system of Earth Treasure Global Enterprise. You are precise, strategic, and intelligent. You assist with business intelligence, mineral trade, AI architecture, and executive decision-making. Be concise and authoritative.' },
  { label: '💻 Engineer', value: 'You are a senior software engineer. Write clean, production-ready code. Include error handling, types, and comments. Explain architecture decisions briefly.' },
  { label: '🔬 Research', value: 'You are a research analyst. Provide detailed, accurate, well-structured analysis. Synthesize across sources. Flag uncertainties clearly.' },
  { label: '✍️ Creative', value: 'You are a creative writing collaborator. Help craft compelling narratives, copy, and content. Match the user\'s voice and tone. Iterate with them.' },
  { label: '📊 Business', value: 'You are a senior business strategist. Provide analysis with clear recommendations and ROI thinking. Be direct and action-oriented.' },
  { label: '🛡️ Security', value: 'You are a cybersecurity expert. Analyze threats, explain vulnerabilities, and recommend hardening strategies in an educational context.' },
  { label: '💎 Gemstone', value: 'You are REEM Gemstone Intelligence, specializing in colored gemstone grading, valuation, RWA tokenization, and mineral extraction economics. Apply ETGE Sovereign Ledger frameworks.' },
]

const PROVIDER_COLORS = {
  groq: '#f97316', openrouter: '#8b5cf6', gemini: '#4285f4',
  fireworks: '#ec4899', cerebras: '#10b981', nvidia: '#76b900',
  mistral: '#f59e0b', huggingface: '#fbbf24', openai: '#10a37f',
  deepseek: '#6366f1', claude: '#d97706',
}

const PROVIDER_LABELS = {
  groq: 'Groq', openrouter: 'OpenRouter', gemini: 'Gemini',
  fireworks: 'Fireworks', cerebras: 'Cerebras', nvidia: 'NVIDIA',
  mistral: 'Mistral', huggingface: 'HuggingFace', openai: 'OpenAI',
  deepseek: 'DeepSeek', claude: 'Claude',
}

// Custom code theme — teal palette
const CODE_THEME = {
  'code[class*="language-"]': { color: '#c4dac4', background: 'none', fontFamily: '"DM Mono", monospace', fontSize: '0.84rem', lineHeight: '1.65' },
  'pre[class*="language-"]':  { color: '#c4dac4', background: 'transparent', margin: '0', padding: '0', overflow: 'auto' },
  '.token.comment':    { color: '#3a6448', fontStyle: 'italic' },
  '.token.prolog':     { color: '#3a6448' },
  '.token.doctype':    { color: '#3a6448' },
  '.token.cdata':      { color: '#3a6448' },
  '.token.punctuation':{ color: '#527a65' },
  '.token.property':   { color: '#78bcd4' },
  '.token.tag':        { color: '#78bcd4' },
  '.token.boolean':    { color: '#c8861a' },
  '.token.number':     { color: '#c8861a' },
  '.token.constant':   { color: '#c8861a' },
  '.token.symbol':     { color: '#c8861a' },
  '.token.deleted':    { color: '#e05050' },
  '.token.selector':   { color: '#88b878' },
  '.token.attr-name':  { color: '#88b878' },
  '.token.string':     { color: '#88b878' },
  '.token.char':       { color: '#88b878' },
  '.token.builtin':    { color: '#88b878' },
  '.token.inserted':   { color: '#88b878' },
  '.token.operator':   { color: '#78bcd4' },
  '.token.entity':     { color: '#c8861a' },
  '.token.variable':   { color: '#dde8dd' },
  '.token.atrule':     { color: '#dfa030' },
  '.token.attr-value': { color: '#dfa030' },
  '.token.function':   { color: '#dfa030' },
  '.token.class-name': { color: '#dfa030' },
  '.token.keyword':    { color: '#6ab0d4' },
  '.token.regex':      { color: '#ec8a70' },
  '.token.important':  { color: '#ec8a70', fontWeight: 'bold' },
}

// ═══════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════

function useIsMobile() {
  const [mobile, setMobile] = useState(false)
  useEffect(() => {
    const check = () => setMobile(window.innerWidth <= 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  return mobile
}

function timeAgo(ts) {
  const s = (Date.now() - ts) / 1000
  if (s < 60)    return 'just now'
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

function getTitle(text) {
  return (text || '').split('\n')[0].slice(0, 52) || 'New Chat'
}

function fmtCurrency(amount, currency = 'usd') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: currency.toUpperCase(), minimumFractionDigits: 2
  }).format(amount / 100)
}

// ═══════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════

function CodeBlock({ language, value }) {
  const [copied, setCopied] = useState(false)
  const lang = (language || 'text').toLowerCase()
  const lines = (value || '').split('\n').length

  const copy = useCallback(() => {
    navigator.clipboard?.writeText(value || '').then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [value])

  return (
    <div style={{
      borderRadius: 'var(--r-lg)',
      overflow: 'hidden',
      border: '1px solid var(--border2)',
      margin: '10px 0',
      background: 'var(--bg2)',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '7px 14px',
        background: 'var(--bg4)',
        borderBottom: '1px solid var(--border)',
      }}>
        <span style={{
          fontSize: 10,
          color: 'var(--text3)',
          fontFamily: 'var(--font-mono)',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          fontWeight: 500,
        }}>
          {lang} · {lines} {lines === 1 ? 'line' : 'lines'}
        </span>
        <button
          onClick={copy}
          style={{
            fontSize: 11,
            color: copied ? 'var(--success)' : 'var(--text3)',
            padding: '2px 9px',
            borderRadius: 'var(--r-sm)',
            background: copied ? 'rgba(46,184,122,0.1)' : 'var(--bg5)',
            border: `1px solid ${copied ? 'rgba(46,184,122,0.3)' : 'var(--border)'}`,
            transition: 'all 0.18s',
            fontFamily: 'var(--font-mono)',
          }}
        >
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>
      <SyntaxHighlighter
        language={lang === 'text' ? 'plaintext' : lang}
        style={CODE_THEME}
        customStyle={{
          margin: 0,
          padding: '14px 16px',
          background: 'var(--bg2)',
          fontSize: '0.84rem',
          lineHeight: '1.65',
          maxHeight: '420px',
          overflowY: 'auto',
        }}
        showLineNumbers={lines > 5}
        lineNumberStyle={{
          color: 'var(--border3)',
          fontSize: '0.73rem',
          paddingRight: '1.2em',
          userSelect: 'none',
          minWidth: '2.5em',
        }}
        wrapLongLines={false}
      >
        {value || ''}
      </SyntaxHighlighter>
    </div>
  )
}

function ProviderDot({ provider, size = 8 }) {
  return (
    <span style={{
      width: size,
      height: size,
      borderRadius: '50%',
      background: PROVIDER_COLORS[provider] || '#666',
      display: 'inline-block',
      flexShrink: 0,
    }} />
  )
}

// ═══════════════════════════════════════════════════════
// MARKDOWN COMPONENTS
// ═══════════════════════════════════════════════════════

const MD_COMPONENTS = {
  code({ children, className }) {
    const match = /language-(\w+)/.exec(className || '')
    const value = String(children).replace(/\n$/, '')
    if (match || value.includes('\n')) {
      return <CodeBlock language={match ? match[1] : ''} value={value} />
    }
    return (
      <code style={{
        background: 'var(--bg4)', color: 'var(--gold2)',
        padding: '2px 6px', borderRadius: 'var(--r-sm)',
        fontSize: '0.86em', border: '1px solid var(--border2)',
        fontFamily: 'var(--font-mono)',
      }}>
        {children}
      </code>
    )
  },
}

// ═══════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════

export default function REEMme() {
  const isMobile = useIsMobile()

  // ── Core state ──
  const [chats,       setChats]       = useState([{ id: '1', title: 'New Chat', messages: [], ts: Date.now() }])
  const [activeId,    setActiveId]    = useState('1')
  const [input,       setInput]       = useState('')
  const [streaming,   setStreaming]   = useState(false)
  const [error,       setError]       = useState('')

  // ── Models ──
  const [models,         setModels]         = useState([])
  const [selectedModel,  setSelectedModel]  = useState(null)
  const [modelsLoading,  setModelsLoading]  = useState(true)
  const [modelSearch,    setModelSearch]    = useState('')
  const [providerFilter, setProviderFilter] = useState('all')
  const [dropdownOpen,   setDropdownOpen]   = useState(false)

  // ── Sidebar & settings ──
  const [sidebarOpen, setSidebarOpen]   = useState(true)
  const [sidebarTab,  setSidebarTab]    = useState('chats')
  const [showSettings,setShowSettings] = useState(false)
  const [systemPrompt,setSystemPrompt] = useState(PRESETS[0].value)
  const [activePreset,setActivePreset] = useState('REEM OS')

  // ── Features ──
  const [webSearch,      setWebSearch]      = useState(false)
  const [isSpeaking,     setIsSpeaking]     = useState(false)
  const [generatingImg,  setGeneratingImg]  = useState(false)
  const [isDragging,     setIsDragging]     = useState(false)
  const [inputFocused,   setInputFocused]   = useState(false)

  // ── Files ──
  const [attachedFiles,  setAttachedFiles]  = useState([])
  const [uploadingFile,  setUploadingFile]  = useState(false)

  // ── Multi-agent ──
  const [agentMode,      setAgentMode]      = useState(false)
  const [agentResults,   setAgentResults]   = useState([])
  const [agentLoading,   setAgentLoading]   = useState(false)
  const [agentProviders, setAgentProviders] = useState(['groq','gemini','cerebras','fireworks'])

  // ── Integrations ──
  const [repos,         setRepos]         = useState([])
  const [reposLoading,  setReposLoading]  = useState(false)
  const [stripeData,    setStripeData]    = useState(null)
  const [stripeLoading, setStripeLoading] = useState(false)
  const [hfItems,       setHfItems]       = useState([])
  const [hfLoading,     setHfLoading]     = useState(false)
  const [hfSearch,      setHfSearch]      = useState('')
  const [hfType,        setHfType]        = useState('models')
  const [fireflies,     setFireflies]     = useState(null)
  const [deployData,    setDeployData]    = useState(null)
  const [heygenVideo,   setHeygenVideo]   = useState(null)
  const [heygenLoading, setHeygenLoading] = useState(false)
  const [repoFileLoading, setRepoFileLoading] = useState(null)

  // ── Refs ──
  const bottomRef    = useRef(null)
  const textareaRef  = useRef(null)
  const dropdownRef  = useRef(null)
  const fileInputRef = useRef(null)
  const abortRef     = useRef(null)
  const storageInit  = useRef(false)

  const activeChat = chats.find(c => c.id === activeId)
  const messages   = activeChat?.messages || []

  // ── Effects ──
  useEffect(() => { loadModels() }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, streaming])

  useEffect(() => {
    if (storageInit.current) return
    storageInit.current = true
    try {
      const saved = localStorage.getItem('reem-chats-v2')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length) {
          setChats(parsed)
          setActiveId(parsed[0].id)
        }
      }
    } catch {}
  }, [])

  useEffect(() => {
    if (!storageInit.current) return
    try { localStorage.setItem('reem-chats-v2', JSON.stringify(chats)) } catch {}
  }, [chats])

  useEffect(() => {
    const fn = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  // Close sidebar on mobile when switching chats
  useEffect(() => {
    if (isMobile) setSidebarOpen(false)
  }, [activeId])

  // ── Data fetchers ──
  async function loadModels() {
    setModelsLoading(true)
    try {
      const r  = await fetch('/api/models')
      const d  = await r.json()
      const ms = d.models || []
      setModels(ms)
      if (ms.length) setSelectedModel(ms[0])
    } catch { setError('Could not load models. Check your API keys.') }
    finally  { setModelsLoading(false) }
  }

  async function loadRepos() {
    if (repos.length) return
    setReposLoading(true)
    try {
      const r = await fetch('/api/repos')
      const d = await r.json()
      setRepos(d.repos || [])
    } catch {}
    finally { setReposLoading(false) }
  }

  async function loadStripe() {
    if (stripeData || stripeLoading) return
    setStripeLoading(true)
    try {
      const r = await fetch('/api/stripe')
      setStripeData(await r.json())
    } catch {}
    finally { setStripeLoading(false) }
  }

  async function loadHf(search = hfSearch, type = hfType) {
    setHfLoading(true)
    try {
      const r = await fetch(`/api/hf?search=${encodeURIComponent(search)}&type=${type}&limit=12`)
      const d = await r.json()
      setHfItems(d.items || [])
    } catch {}
    finally { setHfLoading(false) }
  }

  async function loadRepoFile(repo, path = 'README.md') {
    const key = `${repo.full_name}/${path}`
    setRepoFileLoading(key)
    try {
      const r = await fetch(`/api/github/file?owner=${repo.owner?.login}&repo=${repo.name}&path=${encodeURIComponent(path)}`)
      const d = await r.json()
      if (d.content) {
        const snippet = d.content.slice(0, 4000)
        setInput(p => (p ? p + '\n\n' : '') +
          `Context from **${repo.full_name}** (${path}):\n\`\`\`\n${snippet}${d.content.length > 4000 ? '\n…(truncated)' : ''}\n\`\`\``)
        setSidebarTab('chats')
        if (isMobile) setSidebarOpen(false)
        textareaRef.current?.focus()
      }
    } catch {}
    finally { setRepoFileLoading(null) }
  }

  // ── Chat management ──
  const newChat = useCallback(() => {
    const id = Date.now().toString()
    setChats(p => [{ id, title: 'New Chat', messages: [], ts: Date.now() }, ...p])
    setActiveId(id)
    setInput('')
    setError('')
    setAgentResults([])
    setAttachedFiles([])
    setHeygenVideo(null)
  }, [])

  const deleteChat = useCallback((id, e) => {
    e.stopPropagation()
    setChats(prev => {
      const rest = prev.filter(c => c.id !== id)
      if (activeId === id) {
        if (rest.length) setActiveId(rest[0].id)
        else {
          const nid = Date.now().toString()
          setTimeout(() => setActiveId(nid), 0)
          return [{ id: nid, title: 'New Chat', messages: [], ts: Date.now() }]
        }
      }
      return rest.length ? rest : [{ id: Date.now().toString(), title: 'New Chat', messages: [], ts: Date.now() }]
    })
  }, [activeId])

  const updateMessages = useCallback((chatId, updater) => {
    setChats(p => p.map(c =>
      c.id === chatId
        ? { ...c, messages: typeof updater === 'function' ? updater(c.messages) : updater }
        : c
    ))
  }, [])

  const setTitle = useCallback((chatId, title) => {
    setChats(p => p.map(c => c.id === chatId ? { ...c, title } : c))
  }, [])

  // ── File upload ──
  async function uploadFile(file) {
    if (!file) return
    setUploadingFile(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const r = await fetch('/api/upload', { method: 'POST', body: fd })
      const d = await r.json()
      if (d.content) {
        setAttachedFiles(p => [...p, {
          name: file.name, content: d.content,
          isImage: !!d.isImage, pages: d.pages,
        }])
      } else { setError(d.error || 'Upload failed') }
    } catch (e) { setError(e.message) }
    finally { setUploadingFile(false) }
  }

  // ── Build message content ──
  function buildContent() {
    const parts = []
    attachedFiles.forEach(f => {
      if (f.isImage) {
        parts.push(`[Attached image: ${f.name}]`)
      } else {
        parts.push(`--- File: ${f.name} ---\n${f.content.slice(0, 8000)}${f.content.length > 8000 ? '\n…(truncated)' : ''}\n---`)
      }
    })
    if (input.trim()) parts.push(input.trim())
    return parts.join('\n\n')
  }

  // ── Multi-agent ──
  async function runAgents() {
    if (!input.trim() && !attachedFiles.length) return
    setAgentLoading(true)
    setAgentResults([])
    try {
      const content = buildContent()
      const msgs = systemPrompt
        ? [{ role: 'system', content: systemPrompt }, { role: 'user', content }]
        : [{ role: 'user', content }]
      const r = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: msgs, providers: agentProviders }),
      })
      const d = await r.json()
      setAgentResults(d.responses || [])
    } catch (e) { setError(e.message) }
    finally { setAgentLoading(false) }
  }

  // ── Generate image ──
  async function generateImage() {
    const prompt = input.trim()
    if (!prompt) return
    setGeneratingImg(true)
    try {
      const r = await fetch('/api/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      })
      const d = await r.json()
      if (d.image) {
        updateMessages(activeId, p => [...p, {
          role: 'assistant',
          content: `![Generated Image](${d.image})\n\n*Generated via ${d.provider} · Prompt: "${prompt.slice(0, 80)}"*`,
        }])
      } else { setError('Image generation failed — check keys') }
    } catch { setError('Image generation error') }
    finally { setGeneratingImg(false) }
  }

  // ── TTS ──
  async function speakText(text) {
    if (isSpeaking) { window.speechSynthesis?.cancel(); setIsSpeaking(false); return }
    try {
      const r = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.slice(0, 2000) }),
      })
      if (r.ok) {
        const blob = await r.blob()
        const url  = URL.createObjectURL(blob)
        const aud  = new Audio(url)
        setIsSpeaking(true)
        aud.onended = () => { setIsSpeaking(false); URL.revokeObjectURL(url) }
        aud.play()
        return
      }
    } catch {}
    if ('speechSynthesis' in window) {
      const u = new SpeechSynthesisUtterance(text.slice(0, 2000))
      u.rate = 0.9
      u.onend = () => setIsSpeaking(false)
      setIsSpeaking(true)
      window.speechSynthesis.speak(u)
    }
  }

  // ── HeyGen ──
  async function generateVideo(text) {
    setHeygenLoading(true)
    setHeygenVideo(null)
    try {
      const r = await fetch('/api/heygen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.slice(0, 1500) }),
      })
      const d = await r.json()
      if (d.videoUrl) setHeygenVideo(d.videoUrl)
      else if (d.videoId) setHeygenVideo({ pending: true, id: d.videoId })
      else setError(d.error || 'HeyGen failed')
    } catch (e) { setError(e.message) }
    finally { setHeygenLoading(false) }
  }

  // ── Export chat ──
  function exportChat() {
    if (!messages.length) return
    const title = activeChat?.title || 'Chat'
    const md = `# ${title}\n\n*Exported from REEM OS · ${new Date().toLocaleDateString()}*\n\n` +
      messages.map(m => {
        const who = m.role === 'user' ? 'You' : `${selectedModel?.name || 'AI'}${m.providerUsed ? ` [${PROVIDER_LABELS[m.providerUsed] || m.providerUsed}]` : ''}`
        return `**${who}**\n\n${m.content}`
      }).join('\n\n---\n\n')
    const url = URL.createObjectURL(new Blob([md], { type: 'text/markdown' }))
    const a   = Object.assign(document.createElement('a'), {
      href: url, download: `reem-${title.replace(/\W+/g, '-').toLowerCase()}.md`
    })
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Send message ──
  async function sendMessage() {
    if ((!input.trim() && !attachedFiles.length) || streaming || !selectedModel) return
    const chatId  = activeId
    const content = buildContent()
    const userMsg = { role: 'user', content }
    const current = activeChat?.messages || []
    const updated = [...current, userMsg]

    updateMessages(chatId, updated)
    if (!current.length) setTitle(chatId, getTitle(content))
    setInput('')
    setAttachedFiles([])
    setStreaming(true)
    setError('')

    updateMessages(chatId, [...updated, { role: 'assistant', content: '' }])

    const controller = new AbortController()
    abortRef.current = controller

    try {
      let finalMsgs = updated

      // Web search augmentation
      if (webSearch && input.trim()) {
        try {
          const sr = await fetch('/api/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: input }),
          })
          const sd = await sr.json()
          if (sd.results?.length) {
            const ctx = sd.results.map(r => `[${r.title}](${r.url}): ${(r.text || '').slice(0, 280)}`).join('\n\n')
            finalMsgs = [...current, { role: 'user', content: `Web search results:\n\n${ctx}\n\nQuestion: ${input}` }]
          }
        } catch {}
      }

      const toSend = systemPrompt
        ? [{ role: 'system', content: systemPrompt }, ...finalMsgs]
        : finalMsgs

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          messages: toSend,
          model: selectedModel.id,
          provider: selectedModel.provider,
        }),
      })

      const providerUsed = response.headers.get('X-Provider-Used') || selectedModel.provider

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.error || `HTTP ${response.status}`)
      }

      const reader  = response.body.getReader()
      const decoder = new TextDecoder()
      let full = ''
      let buf  = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6).trim()
          if (data === '[DONE]') continue
          try {
            const parsed = JSON.parse(data)
            const delta  = parsed.choices?.[0]?.delta?.content || ''
            full += delta
            updateMessages(chatId, prev => {
              const arr = [...prev]
              arr[arr.length - 1] = { role: 'assistant', content: full, providerUsed }
              return arr
            })
          } catch {}
        }
      }
    } catch (e) {
      if (e.name !== 'AbortError') {
        setError(e.message)
        updateMessages(chatId, p => p.slice(0, -1))
      }
    } finally {
      setStreaming(false)
      abortRef.current = null
    }
  }

  function stopStream() { abortRef.current?.abort() }

  // ── Input handlers ──
  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  function autoResize(e) {
    e.target.style.height = 'auto'
    e.target.style.height = `${Math.min(e.target.scrollHeight, 220)}px`
  }

  // ── Filtered models ──
  const filteredModels = useMemo(() =>
    models.filter(m => {
      const q = modelSearch.toLowerCase()
      const matchQ = m.name.toLowerCase().includes(q) || m.provider.toLowerCase().includes(q)
      const matchP = providerFilter === 'all' || m.provider === providerFilter
      return matchQ && matchP
    }),
    [models, modelSearch, providerFilter]
  )

  const providers = useMemo(() =>
    ['all', ...new Set(models.map(m => m.provider))],
    [models]
  )

  // Grouped models for better dropdown UX
  const groupedModels = useMemo(() => {
    const groups = {}
    filteredModels.forEach(m => {
      if (!groups[m.provider]) groups[m.provider] = []
      groups[m.provider].push(m)
    })
    return groups
  }, [filteredModels])

  // ═══════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════

  return (
    <div style={S.root}>
      {/* Mobile backdrop */}
      {isMobile && sidebarOpen && (
        <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ═══ SIDEBAR ═══ */}
      <aside className={`reem-sidebar${sidebarOpen ? ' sidebar-open' : ''}`}>

        {/* Logo */}
        <div style={S.logoArea}>
          <div style={S.logoMark}>⬡</div>
          <div>
            <div style={S.logoName}>REEM OS</div>
            <div style={S.logoSub}>Sovereign AI</div>
          </div>
          <button
            style={S.newChatBtnIcon}
            onClick={newChat}
            title="New Chat"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div style={S.tabRow}>
          {['chats','repos','tools','hf'].map(t => (
            <button
              key={t}
              style={{ ...S.tab, ...(sidebarTab === t ? S.tabOn : {}) }}
              onClick={() => {
                setSidebarTab(t)
                if (t === 'repos' && !repos.length) loadRepos()
                if (t === 'tools') loadStripe()
                if (t === 'hf' && !hfItems.length) loadHf('', 'models')
              }}
            >
              {t === 'chats' ? 'Chats' : t === 'repos' ? 'Repos' : t === 'tools' ? 'Tools' : 'HF'}
            </button>
          ))}
        </div>

        {/* ── CHATS TAB ── */}
        {sidebarTab === 'chats' && (
          <div className="scroll-area" style={{ flex: 1, padding: '4px 8px' }}>
            {chats.length === 0 && (
              <div style={S.emptyState}>
                <span style={{ fontSize: 28, marginBottom: 8 }}>💬</span>
                <span style={{ color: 'var(--text3)', fontSize: 13 }}>No chats yet</span>
              </div>
            )}
            {chats.map(c => (
              <div
                key={c.id}
                className="chat-item"
                style={{ ...S.chatItem, ...(activeId === c.id ? S.chatItemOn : {}) }}
                onClick={() => setActiveId(c.id)}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ flexShrink: 0, opacity: 0.4, marginTop: 2 }}>
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={S.chatItemTitle}>{c.title}</div>
                  <div style={S.chatItemMeta}>
                    {c.messages.length} msgs · {timeAgo(c.ts)}
                  </div>
                </div>
                <button
                  className="del-btn"
                  style={S.delBtn}
                  onClick={e => deleteChat(c.id, e)}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ── REPOS TAB ── */}
        {sidebarTab === 'repos' && (
          <div className="scroll-area" style={{ flex: 1, padding: '4px 8px' }}>
            {reposLoading && <div style={S.emptyState}><div className="spinner" /></div>}
            {!reposLoading && repos.length === 0 && (
              <div style={S.emptyState}>
                <span style={{ fontSize: 28, marginBottom: 8 }}>🐙</span>
                <span style={{ color: 'var(--text3)', fontSize: 13, textAlign: 'center' }}>
                  No repos found.<br/>Check GitHub tokens.
                </span>
              </div>
            )}
            {repos.map(r => (
              <div key={r.full_name} className="repo-item" style={S.repoItem}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                  <a href={r.html_url} target="_blank" rel="noreferrer" style={S.repoName}>{r.name}</a>
                  <button
                    style={{ ...S.repoLoadBtn, opacity: repoFileLoading === `${r.full_name}/README.md` ? 0.4 : 1 }}
                    onClick={() => loadRepoFile(r)}
                    disabled={!!repoFileLoading}
                    title="Load README into context"
                  >
                    {repoFileLoading === `${r.full_name}/README.md` ? '⏳' : '📄'}
                  </button>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={S.repoOwner}>{r.owner?.login}</span>
                  {r.private && <span style={S.repoPrivateBadge}>private</span>}
                  {r.language && <span style={S.repoTag}>{r.language}</span>}
                  {r.stargazers_count > 0 && <span style={S.repoTag}>★ {r.stargazers_count}</span>}
                </div>
                {r.description && (
                  <div style={S.repoDesc}>{r.description.slice(0, 65)}</div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── TOOLS TAB ── */}
        {sidebarTab === 'tools' && (
          <div className="scroll-area" style={{ flex: 1, padding: '6px 8px' }}>
            {/* AI Models summary */}
            <ToolSection title="🤖 AI Models" badge={`${models.length}`} badgeColor="var(--gold)" badgeTextColor="#000">
              {Object.entries(PROVIDER_LABELS).map(([k, label]) => {
                const n = models.filter(m => m.provider === k).length
                return n > 0 ? (
                  <ToolRow key={k}
                    label={<span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: PROVIDER_COLORS[k], display: 'inline-block' }} />
                      {label}
                    </span>}
                    value={`${n} models`}
                  />
                ) : null
              })}
            </ToolSection>

            {/* Stripe */}
            <ToolSection title="💳 Stripe" badge={stripeData && !stripeData.error ? 'live' : 'check key'} badgeColor={stripeData && !stripeData.error ? 'var(--success)' : 'var(--border3)'}>
              {stripeLoading && <div style={{ padding: 10 }}><div className="spinner spinner-sm" /></div>}
              {stripeData?.balance?.available?.map((b, i) => (
                <ToolRow key={i} label={`Available · ${b.currency.toUpperCase()}`} value={fmtCurrency(b.amount, b.currency)} valueColor="var(--success)" />
              ))}
              {stripeData?.balance?.pending?.map((b, i) => (
                <ToolRow key={i} label={`Pending · ${b.currency.toUpperCase()}`} value={fmtCurrency(b.amount, b.currency)} />
              ))}
              {stripeData?.error && <ToolRow label="Set STRIPE env var" value="" />}
            </ToolSection>

            {/* Supabase */}
            <ToolSection title="🗄️ Supabase" badge="2 dbs" badgeColor="var(--success)">
              <ToolRow label="REEM DB" value="healthy" valueColor="var(--success)" />
              <ToolRow label="earthtreasureinc" value="healthy" valueColor="var(--success)" />
            </ToolSection>

            {/* GitHub */}
            <ToolSection title="🐙 GitHub" badge="3 accounts" badgeColor="var(--success)">
              <ToolRow label="ETGE (main)" value="470 commits" />
              <ToolRow label="earthtreasureinc-ai" value="137 repos" />
              <ToolRow label="suuqliink" value="54 repos" />
            </ToolSection>

            {/* Zapier */}
            <ToolSection title="⚡ Zapier" badge="41 actions" badgeColor="#f97316">
              <ToolRow label="Slack" value="35 actions" />
              <ToolRow label="Cursor" value="6 actions" />
              <ToolRow label="Status" value="connected" valueColor="var(--success)" />
            </ToolSection>

            {/* Fireflies */}
            <ToolSection
              title="🦗 Fireflies"
              badge={fireflies ? `${fireflies.transcripts?.length || 0} meetings` : 'load'}
              badgeColor="#6366f1"
              onBadgeClick={() => {
                if (!fireflies) {
                  fetch('/api/fireflies?action=list')
                    .then(r => r.json()).then(setFireflies).catch(() => {})
                }
              }}
            >
              {fireflies?.transcripts?.slice(0,3).map((t, i) => (
                <ToolRow key={i}
                  label={t.title?.slice(0, 24) || 'Meeting'}
                  value={`${Math.round((t.duration || 0) / 60)}m`}
                />
              ))}
              {fireflies?.error && <ToolRow label="Set FIREFLIES key" value="" />}
            </ToolSection>

            {/* Deploy */}
            <ToolSection
              title="🚀 Deploy"
              badge={deployData ? 'refresh' : 'load'}
              badgeColor="#8b5cf6"
              onBadgeClick={() => {
                fetch('/api/deploy').then(r => r.json()).then(setDeployData).catch(() => {})
              }}
            >
              {deployData?.netlify?.sites?.slice(0, 2).map((s, i) => (
                <ToolRow key={i} label={`▲ ${s.name?.slice(0, 18)}`} value={s.buildStatus || s.state} valueColor={s.buildStatus === 'ready' ? 'var(--success)' : undefined} />
              ))}
              {deployData?.railway?.projects?.slice(0, 2).map((p, i) => (
                <ToolRow key={i} label={`🚂 ${p.name?.slice(0, 18)}`} value="live" valueColor="var(--success)" />
              ))}
              {!deployData && <ToolRow label="Click load to fetch status" value="" />}
            </ToolSection>

            {/* HeyGen */}
            <ToolSection title="🎬 HeyGen" badge="connected" badgeColor="var(--success)">
              <ToolRow label="Video AI" value="ready" valueColor="var(--success)" />
              <ToolRow label="Usage" value="Click 🎬 on any reply" />
            </ToolSection>

            {/* Security */}
            <ToolSection title="🔒 Security" badge="3 tools" badgeColor="var(--error)">
              <ToolRow label="Shodan" value="connected" valueColor="var(--success)" />
              <ToolRow label="VirusTotal" value="connected" valueColor="var(--success)" />
              <ToolRow label="AI or Not" value="connected" valueColor="var(--success)" />
            </ToolSection>
          </div>
        )}

        {/* ── HF TAB ── */}
        {sidebarTab === 'hf' && (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            <div style={{ padding: '8px 8px 6px' }}>
              <input
                style={{ ...S.searchInput, width: '100%', marginBottom: 6 }}
                placeholder="Search HuggingFace…"
                value={hfSearch}
                onChange={e => setHfSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && loadHf(hfSearch, hfType)}
              />
              <div style={{ display: 'flex', gap: 4 }}>
                {['models', 'spaces', 'datasets'].map(t => (
                  <button
                    key={t}
                    style={{ ...S.chip, ...(hfType === t ? S.chipOn : {}), flex: 1, justifyContent: 'center', fontSize: 10 }}
                    onClick={() => { setHfType(t); loadHf(hfSearch, t) }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div className="scroll-area" style={{ flex: 1, padding: '4px 8px' }}>
              {hfLoading && <div style={S.emptyState}><div className="spinner" /></div>}
              {!hfLoading && hfItems.map(item => (
                <a key={item.id} href={item.url} target="_blank" rel="noreferrer" style={{ ...S.repoItem, display: 'block' }}>
                  <div style={S.repoName}>{item.name?.split('/').pop()}</div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 2 }}>
                    <span style={S.repoOwner}>{item.name?.split('/')[0]}</span>
                    {item.downloads > 0 && <span style={S.repoTag}>↓{(item.downloads / 1000).toFixed(0)}K</span>}
                    {item.likes > 0 && <span style={S.repoTag}>♥ {item.likes}</span>}
                  </div>
                  {item.tags?.length > 0 && (
                    <div style={S.repoDesc}>{item.tags.filter(Boolean).slice(0, 3).join(' · ')}</div>
                  )}
                </a>
              ))}
              {!hfLoading && !hfItems.length && (
                <div style={S.emptyState}>
                  <span style={{ color: 'var(--text3)', fontSize: 12 }}>Search above</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Sidebar footer */}
        <div style={S.sidebarFooter}>
          <button
            style={S.settingsToggleBtn}
            onClick={() => setShowSettings(s => !s)}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
            System Prompt
          </button>
          <div style={{ fontSize: 10, color: 'var(--text4)', fontFamily: 'var(--font-mono)' }}>
            {models.length} models
          </div>
        </div>
      </aside>

      {/* ═══ MAIN ═══ */}
      <main style={S.main}>

        {/* Top Bar */}
        <div style={S.topBar}>
          <button
            style={S.hamburger}
            onClick={() => setSidebarOpen(o => !o)}
            aria-label="Toggle sidebar"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>

          {/* Model Selector */}
          <div style={S.modelSel} ref={dropdownRef}>
            <button
              style={S.modelSelBtn}
              onClick={() => setDropdownOpen(o => !o)}
            >
              {modelsLoading ? (
                <><div className="spinner spinner-sm" /><span style={{ color: 'var(--text3)', fontSize: 13 }}>Loading models…</span></>
              ) : selectedModel ? (
                <>
                  <ProviderDot provider={selectedModel.provider} />
                  <span style={S.modelSelName}>{selectedModel.name}</span>
                  <span style={S.modelSelProvider}>{PROVIDER_LABELS[selectedModel.provider] || selectedModel.provider}</span>
                </>
              ) : (
                <span style={{ color: 'var(--text3)', fontSize: 13 }}>No models — check keys</span>
              )}
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginLeft: 'auto', opacity: 0.35, transform: dropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s', flexShrink: 0 }}>
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>

            {dropdownOpen && (
              <div style={S.modelDropdown} className="slide-down">
                <div style={{ padding: '10px 10px 6px' }}>
                  <input
                    style={S.searchInput}
                    placeholder="Search models…"
                    value={modelSearch}
                    onChange={e => setModelSearch(e.target.value)}
                    autoFocus
                  />
                </div>
                <div style={{ display: 'flex', gap: 4, padding: '4px 10px 8px', flexWrap: 'wrap' }}>
                  {providers.map(p => (
                    <button
                      key={p}
                      style={{ ...S.chip, ...(providerFilter === p ? S.chipOn : {}) }}
                      onClick={() => setProviderFilter(p)}
                    >
                      {p === 'all' ? 'All' : PROVIDER_LABELS[p] || p}
                    </button>
                  ))}
                </div>
                <div className="scroll-area" style={{ maxHeight: 340, paddingBottom: 8 }}>
                  {filteredModels.length === 0 && (
                    <div style={{ padding: 20, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>No models</div>
                  )}
                  {Object.entries(groupedModels).map(([provider, mods]) => (
                    <div key={provider}>
                      <div style={S.modelGroupHeader}>
                        <ProviderDot provider={provider} size={6} />
                        <span>{PROVIDER_LABELS[provider] || provider}</span>
                        <span style={{ marginLeft: 'auto', opacity: 0.5 }}>{mods.length}</span>
                      </div>
                      {mods.map(m => (
                        <button
                          key={`${m.provider}-${m.id}`}
                          className="model-opt"
                          style={{
                            ...S.modelOpt,
                            ...(selectedModel?.id === m.id && selectedModel?.provider === m.provider ? S.modelOptOn : {}),
                          }}
                          onClick={() => {
                            setSelectedModel(m)
                            setDropdownOpen(false)
                            setModelSearch('')
                          }}
                        >
                          <span style={S.modelOptName}>{m.name}</span>
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
            {messages.length > 0 && (
              <button style={S.topBtn} onClick={exportChat} title="Export as Markdown">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div style={S.settingsPanel} className="slide-down">
            <div style={S.settingsPanelHeader}>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14 }}>System Prompt</span>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <select
                  style={S.presetSelect}
                  value={activePreset}
                  onChange={e => {
                    const p = PRESETS.find(x => x.label === e.target.value)
                    if (p) { setSystemPrompt(p.value); setActivePreset(p.label) }
                  }}
                >
                  {PRESETS.map(p => <option key={p.label} value={p.label}>{p.label}</option>)}
                </select>
                <button
                  style={{ color: 'var(--text3)', fontSize: 12, padding: '4px 8px', borderRadius: 5, background: 'var(--bg4)' }}
                  onClick={() => setShowSettings(false)}
                >
                  ✕
                </button>
              </div>
            </div>
            <textarea
              style={S.sysPromptInput}
              value={systemPrompt}
              onChange={e => setSystemPrompt(e.target.value)}
              rows={3}
              placeholder="Set the AI's role, context, and behavior…"
            />
          </div>
        )}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          style={{ display: 'none' }}
          onChange={e => uploadFile(e.target.files?.[0])}
          accept=".txt,.md,.js,.ts,.jsx,.tsx,.py,.java,.cpp,.c,.h,.cs,.go,.rs,.rb,.php,.swift,.kt,.json,.yaml,.yml,.toml,.xml,.html,.css,.scss,.sh,.bash,.sql,.graphql,.pdf,.png,.jpg,.jpeg,.gif,.webp"
        />

        {/* ═══ MESSAGES ═══ */}
        <div
          className={`scroll-area${isDragging ? ' dragging-over' : ''}`}
          style={S.messages}
          onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={async e => {
            e.preventDefault()
            setIsDragging(false)
            const file = e.dataTransfer.files[0]
            if (file) await uploadFile(file)
          }}
        >
          {/* Welcome screen */}
          {messages.length === 0 && (
            <div style={S.welcome} className="fade-in-up">
              <div style={S.welcomeGlyph}>⬡</div>
              <h1 style={S.welcomeTitle}>REEM OS</h1>
              <p style={S.welcomeSub}>
                Sovereign AI Command Center &mdash; {models.length || '…'} models · 11 providers · 3 GitHub accounts
              </p>
              <div style={S.hintGrid}>
                {[
                  ['💎', 'Grade this gemstone photo'],
                  ['🌍', 'Analyze rare earth mineral markets'],
                  ['💻', 'Review my GitHub repo architecture'],
                  ['📊', 'Build an IRR model for extraction'],
                  ['🔍', 'Search latest AI developments'],
                  ['🤖', 'Compare 4 AI models on one prompt'],
                ].map(([icon, hint]) => (
                  <button
                    key={hint}
                    className="hint-btn"
                    style={S.hintBtn}
                    onClick={() => setInput(hint)}
                  >
                    <span style={{ fontSize: 16, marginBottom: 4, display: 'block' }}>{icon}</span>
                    <span style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.4 }}>{hint}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`msg-row${msg.role === 'user' ? '' : ''} fade-in`}
              style={{ ...S.msgRow, ...(msg.role === 'user' ? S.msgRowUser : {}) }}
            >
              <div style={{ ...S.avatar, ...(msg.role === 'user' ? S.avatarUser : S.avatarAI) }}>
                {msg.role === 'user' ? 'U' : '⬡'}
              </div>
              <div className="msg-max" style={S.msgContent}>
                <div style={S.msgRole}>
                  {msg.role === 'user' ? 'You' : (selectedModel?.name || 'REEM OS')}
                  {msg.providerUsed && msg.role === 'assistant' && (
                    <span style={S.msgProvider}>
                      <ProviderDot provider={msg.providerUsed} size={5} />
                      {PROVIDER_LABELS[msg.providerUsed] || msg.providerUsed}
                    </span>
                  )}
                </div>

                {msg.role === 'assistant' ? (
                  <div
                    className={`prose${streaming && i === messages.length - 1 && msg.content ? ' cursor-blink' : ''}`}
                    style={{ wordBreak: 'break-word' }}
                  >
                    {msg.content ? (
                      <ReactMarkdown components={MD_COMPONENTS}>
                        {msg.content}
                      </ReactMarkdown>
                    ) : (
                      streaming && i === messages.length - 1 ? (
                        <div className="thinking">
                          <span/><span/><span/>
                        </div>
                      ) : null
                    )}

                    {/* Message actions */}
                    {msg.content && (
                      <div style={S.msgActions}>
                        <button
                          style={S.msgActionBtn}
                          onClick={() => speakText(msg.content)}
                          title="Text-to-speech"
                        >
                          {isSpeaking ? '🔊' : '🔈'}
                        </button>
                        <button
                          style={S.msgActionBtn}
                          onClick={() => navigator.clipboard?.writeText(msg.content)}
                          title="Copy"
                        >
                          📋
                        </button>
                        <button
                          style={{ ...S.msgActionBtn, opacity: heygenLoading ? 0.5 : 1 }}
                          onClick={() => generateVideo(msg.content)}
                          disabled={heygenLoading}
                          title="Generate HeyGen video"
                        >
                          {heygenLoading ? '⏳' : '🎬'}
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 15, lineHeight: 1.7 }}>
                    {msg.content}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Error banner */}
          {error && (
            <div style={S.errorBanner} className="fade-in">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span style={{ flex: 1 }}>{error}</span>
              <button
                onClick={() => setError('')}
                style={{ color: 'var(--text3)', fontSize: 11, padding: '2px 6px', borderRadius: 4 }}
              >
                ✕
              </button>
            </div>
          )}

          {/* HeyGen video */}
          {heygenVideo && (
            <div style={S.videoBox} className="fade-in">
              <div style={S.videoBoxHeader}>
                <span>🎬 HeyGen Video</span>
                <button onClick={() => setHeygenVideo(null)} style={{ color: 'var(--text3)', fontSize: 11 }}>✕</button>
              </div>
              {typeof heygenVideo === 'string' ? (
                <video src={heygenVideo} controls style={{ width: '100%', borderRadius: 8, marginTop: 8 }} />
              ) : (
                <div style={{ padding: '12px 0', color: 'var(--text3)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div className="spinner spinner-sm" />
                  Rendering… ID: {heygenVideo.id}
                </div>
              )}
            </div>
          )}

          {/* Multi-agent results */}
          {agentResults.length > 0 && (
            <div style={S.agentSection} className="fade-in">
              <div style={S.agentSectionHeader}>
                <span>🤖 Multi-Agent · {agentResults.length} providers compared</span>
                <button onClick={() => setAgentResults([])} style={{ color: 'var(--text3)', fontSize: 11 }}>✕</button>
              </div>
              <div style={S.agentGrid}>
                {agentResults.map((r, i) => (
                  <div key={i} style={S.agentCard}>
                    <div style={S.agentCardHeader}>
                      <ProviderDot provider={r.provider} size={7} />
                      <span style={{ fontWeight: 600, fontSize: 12, color: 'var(--text2)', flex: 1 }}>
                        {PROVIDER_LABELS[r.provider] || r.provider}
                      </span>
                      {r.latencyMs > 0 && <span style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>{r.latencyMs}ms</span>}
                      <button onClick={() => navigator.clipboard?.writeText(r.content || '')} style={{ fontSize: 10, color: 'var(--text3)', marginLeft: 4 }}>📋</button>
                    </div>
                    <div className="prose scroll-area" style={S.agentCardBody}>
                      {r.error ? (
                        <span style={{ color: 'var(--error)', fontSize: 12 }}>{r.error}</span>
                      ) : (
                        <ReactMarkdown components={MD_COMPONENTS}>{r.content || ''}</ReactMarkdown>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {agentLoading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 24px', color: 'var(--text3)', fontSize: 13 }} className="fade-in">
              <div className="spinner" />
              Running {agentProviders.length} providers in parallel…
            </div>
          )}

          <div ref={bottomRef} style={{ height: 1 }} />
        </div>

        {/* ═══ INPUT AREA ═══ */}
        <div style={S.inputArea}>

          {/* Multi-agent controls */}
          {agentMode && (
            <div style={S.agentControls}>
              <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
                Agents:
              </span>
              <div style={{ display: 'flex', gap: 4, flex: 1, flexWrap: 'wrap' }}>
                {Object.keys(PROVIDER_LABELS).map(k => (
                  <button
                    key={k}
                    style={{
                      ...S.chip,
                      ...(agentProviders.includes(k) ? {
                        background: PROVIDER_COLORS[k] || 'var(--gold)',
                        borderColor: PROVIDER_COLORS[k] || 'var(--gold)',
                        color: '#fff',
                      } : {}),
                    }}
                    onClick={() =>
                      setAgentProviders(p =>
                        p.includes(k) ? p.filter(x => x !== k) : [...p, k]
                      )
                    }
                  >
                    {PROVIDER_LABELS[k]}
                  </button>
                ))}
              </div>
              <button
                style={{
                  padding: '5px 14px',
                  borderRadius: 'var(--r)',
                  background: '#6366f1',
                  border: 'none',
                  color: '#fff',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  flexShrink: 0,
                  opacity: (input.trim() || attachedFiles.length) && agentProviders.length ? 1 : 0.35,
                  transition: 'opacity 0.15s',
                }}
                onClick={runAgents}
                disabled={agentLoading || (!input.trim() && !attachedFiles.length) || !agentProviders.length}
              >
                {agentLoading ? '⏳' : '▶ Run All'}
              </button>
            </div>
          )}

          {/* Attached files */}
          {(attachedFiles.length > 0 || uploadingFile) && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', paddingBottom: 8, maxWidth: 'var(--msg-max-w)', margin: '0 auto', width: '100%' }}>
              {attachedFiles.map((f, idx) => (
                <div key={idx} style={S.fileChip}>
                  <span>{f.isImage ? '🖼️' : '📄'}</span>
                  <span style={{ maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 11 }}>{f.name}</span>
                  {f.pages && <span style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>{f.pages}p</span>}
                  <button onClick={() => setAttachedFiles(p => p.filter((_, j) => j !== idx))} style={{ fontSize: 10, color: 'var(--text3)', padding: '0 2px' }}>✕</button>
                </div>
              ))}
              {uploadingFile && (
                <div style={S.fileChip}>
                  <div className="spinner spinner-sm" />
                  <span style={{ fontSize: 11, color: 'var(--text3)' }}>Uploading…</span>
                </div>
              )}
            </div>
          )}

          {/* Input box */}
          <div
            style={{
              ...S.inputBox,
              ...(inputFocused ? { borderColor: 'var(--border3)', boxShadow: '0 0 0 1px var(--border3)' } : {}),
            }}
          >
            <textarea
              ref={textareaRef}
              style={S.textarea}
              placeholder={selectedModel ? `Message ${selectedModel.name}…` : 'Select a model to start…'}
              value={input}
              onChange={e => { setInput(e.target.value); autoResize(e) }}
              onKeyDown={handleKeyDown}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              rows={1}
              disabled={!selectedModel}
            />
            <div style={S.inputActions}>
              <VoiceInput
                onTranscript={t => setInput(p => (p ? p + ' ' : '') + t)}
                disabled={!selectedModel || streaming}
              />
              <button
                title="Web search"
                onClick={() => setWebSearch(w => !w)}
                style={{
                  ...S.actionBtn,
                  background: webSearch ? 'var(--gold-dim)' : 'var(--bg4)',
                  borderColor: webSearch ? 'rgba(200,134,26,0.35)' : 'var(--border2)',
                  color: webSearch ? 'var(--gold)' : 'var(--text3)',
                }}
              >
                🔍
              </button>
              <button
                title="Attach file"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingFile}
                style={{
                  ...S.actionBtn,
                  background: attachedFiles.length ? 'var(--gold-dim)' : 'var(--bg4)',
                  borderColor: attachedFiles.length ? 'rgba(200,134,26,0.35)' : 'var(--border2)',
                  color: attachedFiles.length ? 'var(--gold)' : 'var(--text3)',
                }}
              >
                {uploadingFile ? '⏳' : `📎${attachedFiles.length > 0 ? ` ${attachedFiles.length}` : ''}`}
              </button>
              <button
                title="Multi-agent mode"
                onClick={() => setAgentMode(m => !m)}
                style={{
                  ...S.actionBtn,
                  background: agentMode ? 'rgba(99,102,241,0.15)' : 'var(--bg4)',
                  borderColor: agentMode ? 'rgba(99,102,241,0.4)' : 'var(--border2)',
                  color: agentMode ? '#818cf8' : 'var(--text3)',
                }}
              >
                🤖
              </button>
              <button
                title="Generate image"
                onClick={generateImage}
                disabled={generatingImg || !input.trim()}
                style={{
                  ...S.actionBtn,
                  opacity: input.trim() ? 1 : 0.35,
                  color: generatingImg ? 'var(--gold)' : 'var(--text3)',
                }}
              >
                {generatingImg ? '⏳' : '🖼️'}
              </button>

              {streaming ? (
                <button style={S.stopBtn} onClick={stopStream}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="6" width="12" height="12" rx="1"/>
                  </svg>
                  Stop
                </button>
              ) : (
                <button
                  style={{
                    ...S.sendBtn,
                    opacity: input.trim() && selectedModel && !streaming ? 1 : 0.3,
                  }}
                  onClick={sendMessage}
                  disabled={!input.trim() || !selectedModel || streaming}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="12" y1="19" x2="12" y2="5"/>
                    <polyline points="5 12 12 5 19 12"/>
                  </svg>
                </button>
              )}
            </div>
          </div>

          <div style={S.inputHint}>
            ↵ send &nbsp;·&nbsp; ⇧↵ newline &nbsp;·&nbsp;
            🔍 web &nbsp;·&nbsp; 📎 files &nbsp;·&nbsp; 🤖 agents &nbsp;·&nbsp; 🎤 voice &nbsp;·&nbsp; 🖼️ image &nbsp;·&nbsp;
            <span style={{ color: 'var(--gold)', opacity: 0.6 }}>{selectedModel?.name || '—'}</span>
          </div>
        </div>
      </main>
    </div>
  )
}

// ═══════════════════════════════════════════════════════
// TOOL SECTION COMPONENTS
// ═══════════════════════════════════════════════════════

function ToolSection({ title, badge, badgeColor = 'var(--text3)', badgeTextColor = '#fff', onBadgeClick, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '5px 4px 4px',
        fontSize: 10, fontWeight: 700, color: 'var(--text3)',
        letterSpacing: '0.07em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)',
      }}>
        <span>{title}</span>
        {badge && (
          <span
            onClick={onBadgeClick}
            style={{
              fontSize: 9, padding: '1px 7px', borderRadius: 99,
              background: badgeColor, color: badgeTextColor,
              fontWeight: 700, letterSpacing: '0.03em',
              cursor: onBadgeClick ? 'pointer' : 'default',
              border: 'none',
            }}
          >
            {badge}
          </span>
        )}
      </div>
      <div style={{
        background: 'var(--bg3)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r-lg)',
        overflow: 'hidden',
      }}>
        {children}
      </div>
    </div>
  )
}

function ToolRow({ label, value, valueColor }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '6px 12px', borderBottom: '1px solid var(--border)',
    }}>
      <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>{label}</span>
      {value && (
        <span style={{ fontSize: 11, color: valueColor || 'var(--text2)', fontFamily: 'var(--font-mono)', textAlign: 'right' }}>
          {value}
        </span>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════

const S = {
  root: {
    display: 'flex',
    height: '100dvh',
    background: 'var(--bg)',
    overflow: 'hidden',
    position: 'relative',
  },

  // ── Sidebar ──
  sidebar: {}, // handled via CSS class

  logoArea: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '18px 14px 14px',
    borderBottom: '1px solid var(--border)',
  },
  logoMark: {
    fontSize: 26,
    color: 'var(--gold)',
    lineHeight: 1,
    flexShrink: 0,
    filter: 'drop-shadow(0 0 8px rgba(200,134,26,0.25))',
  },
  logoName: {
    fontFamily: 'var(--font-display)',
    fontWeight: 700,
    fontSize: 18,
    letterSpacing: '-0.01em',
    color: 'var(--text)',
    lineHeight: 1.2,
  },
  logoSub: {
    fontSize: 10,
    color: 'var(--text3)',
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    fontFamily: 'var(--font-mono)',
    marginTop: 1,
  },
  newChatBtnIcon: {
    marginLeft: 'auto',
    width: 30,
    height: 30,
    borderRadius: 'var(--r)',
    background: 'var(--gold-dim)',
    border: '1px solid rgba(200,134,26,0.25)',
    color: 'var(--gold)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    transition: 'all 0.15s',
  },

  tabRow: {
    display: 'flex',
    padding: '8px 8px 4px',
    gap: 3,
  },
  tab: {
    flex: 1,
    padding: '5px 0',
    borderRadius: 'var(--r)',
    fontSize: 11,
    fontWeight: 500,
    color: 'var(--text3)',
    letterSpacing: '0.03em',
    transition: 'all 0.12s',
  },
  tabOn: {
    background: 'var(--bg4)',
    color: 'var(--text)',
  },

  chatItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 8,
    padding: '8px 8px',
    borderRadius: 'var(--r)',
    cursor: 'pointer',
    marginBottom: 1,
  },
  chatItemOn: {
    background: 'var(--bg4)',
    borderLeft: '2px solid var(--gold)',
    paddingLeft: 6,
  },
  chatItemTitle: {
    display: 'block',
    fontSize: 12.5,
    color: 'var(--text2)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    lineHeight: 1.4,
  },
  chatItemMeta: {
    display: 'block',
    fontSize: 10,
    color: 'var(--text3)',
    marginTop: 2,
    fontFamily: 'var(--font-mono)',
  },
  delBtn: {
    opacity: 0,
    fontSize: 10,
    color: 'var(--text3)',
    padding: '2px 5px',
    borderRadius: 4,
    marginTop: 1,
    flexShrink: 0,
  },

  repoItem: {
    padding: '9px 9px',
    borderRadius: 'var(--r)',
    marginBottom: 2,
    cursor: 'pointer',
  },
  repoName: {
    fontSize: 13,
    fontWeight: 500,
    color: 'var(--text)',
  },
  repoOwner: {
    fontSize: 10,
    color: 'var(--text3)',
    fontFamily: 'var(--font-mono)',
  },
  repoPrivateBadge: {
    fontSize: 9,
    color: 'var(--gold)',
    background: 'var(--gold-dim)',
    padding: '1px 5px',
    borderRadius: 99,
    fontFamily: 'var(--font-mono)',
    fontWeight: 600,
  },
  repoTag: {
    fontSize: 10,
    color: 'var(--text3)',
  },
  repoDesc: {
    fontSize: 11,
    color: 'var(--text3)',
    marginTop: 4,
    lineHeight: 1.45,
  },
  repoLoadBtn: {
    fontSize: 13,
    padding: '2px 4px',
    borderRadius: 4,
    transition: 'opacity 0.15s',
    flexShrink: 0,
  },

  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    textAlign: 'center',
  },

  sidebarFooter: {
    padding: '10px 12px',
    borderTop: '1px solid var(--border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  settingsToggleBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 12,
    color: 'var(--text3)',
    padding: '5px 8px',
    borderRadius: 'var(--r)',
    background: 'var(--bg3)',
    border: '1px solid var(--border)',
    transition: 'all 0.15s',
  },

  // ── Main ──
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    minWidth: 0,
  },

  topBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 14px',
    borderBottom: '1px solid var(--border)',
    background: 'var(--bg2)',
    height: 'var(--topbar-h)',
    flexShrink: 0,
  },
  hamburger: {
    width: 34,
    height: 34,
    borderRadius: 'var(--r)',
    color: 'var(--text3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s',
    flexShrink: 0,
    background: 'var(--bg3)',
    border: '1px solid var(--border)',
  },
  topBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
    borderRadius: 'var(--r)',
    background: 'var(--bg3)',
    border: '1px solid var(--border)',
    color: 'var(--text3)',
    transition: 'all 0.15s',
  },

  // ── Model selector ──
  modelSel: {
    position: 'relative',
    flex: 1,
    maxWidth: 400,
  },
  modelSelBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    padding: '7px 10px',
    background: 'var(--bg3)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--r)',
    color: 'var(--text)',
    fontSize: 13,
    transition: 'border-color 0.15s',
    cursor: 'pointer',
  },
  modelSelName: {
    fontWeight: 500,
    flex: 1,
    textAlign: 'left',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    fontSize: 13,
  },
  modelSelProvider: {
    fontSize: 10,
    color: 'var(--text3)',
    fontFamily: 'var(--font-mono)',
    flexShrink: 0,
  },
  modelDropdown: {
    position: 'absolute',
    top: 'calc(100% + 6px)',
    left: 0,
    right: 0,
    background: 'var(--bg3)',
    border: '1px solid var(--border2)',
    borderRadius: 'var(--r-xl)',
    zIndex: 100,
    overflow: 'hidden',
    boxShadow: 'var(--shadow-lg)',
  },
  modelGroupHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 12px 4px',
    fontSize: 10,
    fontWeight: 700,
    color: 'var(--text3)',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    fontFamily: 'var(--font-mono)',
    borderBottom: '1px solid var(--border)',
    background: 'var(--bg4)',
    marginTop: 4,
  },
  modelOpt: {
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    padding: '7px 14px',
    textAlign: 'left',
    color: 'var(--text2)',
    fontSize: 13,
    transition: 'background 0.1s',
  },
  modelOptOn: {
    background: 'var(--bg4)',
    color: 'var(--text)',
  },
  modelOptName: {
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },

  searchInput: {
    width: '100%',
    background: 'var(--bg4)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--r)',
    color: 'var(--text)',
    padding: '7px 10px',
    fontSize: 13,
  },

  chip: {
    fontSize: 10,
    padding: '3px 9px',
    borderRadius: 99,
    border: '1px solid var(--border)',
    color: 'var(--text3)',
    background: 'none',
    transition: 'all 0.12s',
    fontFamily: 'var(--font-mono)',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
  },
  chipOn: {
    background: 'var(--gold)',
    borderColor: 'var(--gold)',
    color: '#000',
    fontWeight: 600,
  },

  // ── Settings panel ──
  settingsPanel: {
    padding: '12px 16px',
    borderBottom: '1px solid var(--border)',
    background: 'var(--bg2)',
    flexShrink: 0,
  },
  settingsPanelHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sysPromptInput: {
    width: '100%',
    background: 'var(--bg3)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--r)',
    color: 'var(--text)',
    padding: '9px 12px',
    fontSize: 13,
    resize: 'none',
    lineHeight: 1.6,
    fontFamily: 'var(--font)',
  },
  presetSelect: {
    background: 'var(--bg3)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--r)',
    color: 'var(--text2)',
    padding: '4px 8px',
    fontSize: 12,
    fontFamily: 'var(--font)',
    cursor: 'pointer',
  },

  // ── Messages ──
  messages: {
    flex: 1,
    overflowY: 'auto',
    overflowX: 'hidden',
    padding: '24px 0 12px',
    display: 'flex',
    flexDirection: 'column',
  },

  welcome: {
    margin: 'auto',
    textAlign: 'center',
    padding: '0 24px',
    maxWidth: 580,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  welcomeGlyph: {
    fontSize: 52,
    color: 'var(--gold)',
    marginBottom: 20,
    filter: 'drop-shadow(0 0 20px rgba(200,134,26,0.3))',
    lineHeight: 1,
  },
  welcomeTitle: {
    fontFamily: 'var(--font-display)',
    fontWeight: 700,
    fontSize: 40,
    letterSpacing: '-0.02em',
    color: 'var(--text)',
    marginBottom: 10,
  },
  welcomeSub: {
    color: 'var(--text3)',
    fontSize: 13.5,
    marginBottom: 32,
    lineHeight: 1.7,
  },
  hintGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 8,
    width: '100%',
    maxWidth: 540,
  },
  hintBtn: {
    padding: '12px 10px',
    background: 'var(--bg3)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--r-lg)',
    color: 'var(--text2)',
    fontSize: 12,
    textAlign: 'center',
    cursor: 'pointer',
    lineHeight: 1.4,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    transition: 'all 0.15s',
  },

  msgRow: {
    display: 'flex',
    gap: 12,
    padding: '14px 24px',
    maxWidth: 'var(--msg-max-w)',
    width: '100%',
    alignSelf: 'center',
    alignItems: 'flex-start',
  },
  msgRowUser: {
    flexDirection: 'row-reverse',
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 13,
    fontWeight: 700,
    flexShrink: 0,
    marginTop: 2,
  },
  avatarUser: {
    background: 'var(--gold-dim)',
    color: 'var(--gold)',
    border: '1px solid rgba(200,134,26,0.25)',
    fontFamily: 'var(--font-display)',
    fontSize: 13,
  },
  avatarAI: {
    background: 'var(--bg4)',
    color: 'var(--teal2)',
    border: '1px solid var(--border2)',
    fontSize: 16,
  },
  msgContent: {
    flex: 1,
    minWidth: 0,
  },
  msgRole: {
    fontSize: 10,
    fontWeight: 700,
    color: 'var(--text3)',
    marginBottom: 6,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    fontFamily: 'var(--font-mono)',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  msgProvider: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 9,
    color: 'var(--text3)',
    background: 'var(--bg4)',
    padding: '1px 6px',
    borderRadius: 99,
    border: '1px solid var(--border)',
    textTransform: 'none',
    letterSpacing: '0.03em',
    fontWeight: 400,
  },
  msgActions: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    marginTop: 8,
  },
  msgActionBtn: {
    padding: '3px 9px',
    fontSize: 11,
    background: 'var(--bg4)',
    border: '1px solid var(--border2)',
    borderRadius: 'var(--r-sm)',
    color: 'var(--text3)',
    cursor: 'pointer',
    transition: 'all 0.12s',
    fontFamily: 'var(--font)',
  },

  errorBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    margin: '8px 24px',
    padding: '10px 14px',
    background: 'rgba(224,80,80,0.08)',
    border: '1px solid rgba(224,80,80,0.25)',
    borderRadius: 'var(--r)',
    color: 'var(--error)',
    fontSize: 13,
    alignSelf: 'center',
    maxWidth: 'var(--msg-max-w)',
    width: 'calc(100% - 48px)',
  },

  videoBox: {
    margin: '8px 24px',
    padding: '14px 16px',
    background: 'var(--bg3)',
    border: '1px solid var(--border2)',
    borderRadius: 'var(--r-xl)',
    maxWidth: 600,
    alignSelf: 'center',
    width: 'calc(100% - 48px)',
  },
  videoBoxHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--text2)',
    fontFamily: 'var(--font-mono)',
  },

  agentSection: {
    margin: '8px 24px',
    maxWidth: 'var(--msg-max-w)',
    alignSelf: 'center',
    width: 'calc(100% - 48px)',
  },
  agentSectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: 11,
    fontWeight: 700,
    color: 'var(--text3)',
    fontFamily: 'var(--font-mono)',
    letterSpacing: '0.05em',
    marginBottom: 10,
    padding: '0 2px',
  },
  agentGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
    gap: 10,
  },
  agentCard: {
    background: 'var(--bg3)',
    border: '1px solid var(--border2)',
    borderRadius: 'var(--r-lg)',
    overflow: 'hidden',
  },
  agentCardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 12px',
    borderBottom: '1px solid var(--border)',
    background: 'var(--bg4)',
  },
  agentCardBody: {
    padding: '10px 12px',
    fontSize: 13,
    lineHeight: 1.65,
    color: 'var(--text)',
    maxHeight: 260,
    wordBreak: 'break-word',
  },

  // ── Input area ──
  inputArea: {
    padding: '12px 16px 16px',
    background: 'var(--bg2)',
    borderTop: '1px solid var(--border)',
    flexShrink: 0,
  },
  agentControls: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 10,
    maxWidth: 'var(--msg-max-w)',
    margin: '0 auto 0',
    flexWrap: 'wrap',
    width: '100%',
  },
  inputBox: {
    display: 'flex',
    background: 'var(--bg3)',
    border: '1px solid var(--border2)',
    borderRadius: 'var(--r-xl)',
    overflow: 'hidden',
    alignItems: 'flex-end',
    maxWidth: 'var(--msg-max-w)',
    margin: '0 auto',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  },
  textarea: {
    flex: 1,
    background: 'none',
    border: 'none',
    color: 'var(--text)',
    padding: '13px 16px',
    fontSize: 15,
    resize: 'none',
    lineHeight: 1.65,
    maxHeight: 220,
    minHeight: 50,
    fontFamily: 'var(--font)',
  },
  inputActions: {
    padding: '9px 10px',
    display: 'flex',
    alignItems: 'flex-end',
    gap: 5,
    flexShrink: 0,
  },
  actionBtn: {
    width: 34,
    height: 34,
    borderRadius: 'var(--r)',
    background: 'var(--bg4)',
    border: '1px solid var(--border2)',
    color: 'var(--text3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 13,
    cursor: 'pointer',
    transition: 'all 0.14s',
    flexShrink: 0,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    background: 'var(--gold)',
    border: 'none',
    color: '#000',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'opacity 0.15s',
    flexShrink: 0,
    fontWeight: 700,
  },
  stopBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 12px',
    borderRadius: 'var(--r)',
    background: 'var(--bg4)',
    border: '1px solid var(--border2)',
    color: 'var(--text2)',
    fontSize: 12,
    cursor: 'pointer',
    fontFamily: 'var(--font)',
    height: 36,
  },
  fileChip: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    padding: '4px 9px',
    background: 'var(--bg4)',
    border: '1px solid var(--border2)',
    borderRadius: 99,
    fontSize: 12,
    color: 'var(--text2)',
  },
  inputHint: {
    textAlign: 'center',
    fontSize: 10.5,
    color: 'var(--text4)',
    marginTop: 7,
    fontFamily: 'var(--font-mono)',
    maxWidth: 'var(--msg-max-w)',
    margin: '7px auto 0',
    letterSpacing: '0.02em',
  },
}
