'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'

const PROVIDER_COLORS = {
  groq: '#f97316',
  openrouter: '#8b5cf6',
  gemini: '#3b82f6',
  fireworks: '#ec4899',
  cerebras: '#10b981',
  nvidia: '#76b900',
  mistral: '#f59e0b',
  huggingface: '#fbbf24',
  openai: '#10a37f',
  deepseek: '#6366f1',
  claude: '#d97706',
}

const PROVIDER_LABELS = {
  groq: 'Groq', openrouter: 'OpenRouter', gemini: 'Gemini',
  fireworks: 'Fireworks', cerebras: 'Cerebras', nvidia: 'NVIDIA',
  mistral: 'Mistral', huggingface: 'HuggingFace', openai: 'OpenAI', deepseek: 'DeepSeek',
  claude: 'Claude',
}

function timeAgo(ts) {
  const diff = (Date.now() - ts) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function getFirstLine(text) {
  return text?.split('\n')[0]?.slice(0, 50) || 'New Chat'
}

export default function REEMme() {
  const [chats, setChats] = useState([{ id: '1', title: 'New Chat', messages: [], ts: Date.now() }])
  const [activeChatId, setActiveChatId] = useState('1')
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [models, setModels] = useState([])
  const [selectedModel, setSelectedModel] = useState(null)
  const [repos, setRepos] = useState([])
  const [reposLoading, setReposLoading] = useState(false)
  const [modelsLoading, setModelsLoading] = useState(true)
  const [error, setError] = useState('')
  const [sidebarTab, setSidebarTab] = useState('chats')
  const [modelSearch, setModelSearch] = useState('')
  const [providerFilter, setProviderFilter] = useState('all')
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false)
  const [systemPrompt, setSystemPrompt] = useState('You are REEMme, a powerful AI assistant with access to multiple AI models, GitHub repositories, and various APIs. Be concise, helpful, and technical when needed.')
  const [showSettings, setShowSettings] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [imagePrompt, setImagePrompt] = useState('')
  const [generatingImage, setGeneratingImage] = useState(false)
  const [webSearch, setWebSearch] = useState(false)

  const bottomRef = useRef(null)
  const textareaRef = useRef(null)
  const dropdownRef = useRef(null)
  const abortRef = useRef(null)

  const activeChat = chats.find(c => c.id === activeChatId)
  const messages = activeChat?.messages || []

  useEffect(() => { fetchModels() }, [])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, isStreaming])

  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setModelDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const fetchModels = async () => {
    setModelsLoading(true)
    try {
      const res = await fetch('/api/models')
      const data = await res.json()
      const list = data.models || []
      setModels(list)
      if (list.length > 0) setSelectedModel(list[0])
    } catch (e) {
      setError('Could not load models. Check your API keys in Vercel.')
    } finally {
      setModelsLoading(false)
    }
  }

  const fetchRepos = async () => {
    if (repos.length > 0) return
    setReposLoading(true)
    try {
      const res = await fetch('/api/repos')
      const data = await res.json()
      setRepos(data.repos || [])
    } catch (e) {
      console.error('Repos error:', e)
    } finally {
      setReposLoading(false)
    }
  }

  const newChat = () => {
    const id = Date.now().toString()
    const chat = { id, title: 'New Chat', messages: [], ts: Date.now() }
    setChats(prev => [chat, ...prev])
    setActiveChatId(id)
    setError('')
    setInput('')
  }

  const deleteChat = (id, e) => {
    e.stopPropagation()
    setChats(prev => prev.filter(c => c.id !== id))
    if (activeChatId === id) {
      const remaining = chats.filter(c => c.id !== id)
      if (remaining.length > 0) setActiveChatId(remaining[0].id)
      else newChat()
    }
  }

  const updateMessages = useCallback((chatId, updater) => {
    setChats(prev => prev.map(c =>
      c.id === chatId ? { ...c, messages: typeof updater === 'function' ? updater(c.messages) : updater } : c
    ))
  }, [])

  const updateChatTitle = useCallback((chatId, title) => {
    setChats(prev => prev.map(c => c.id === chatId ? { ...c, title } : c))
  }, [])

  const sendMessage = async () => {
    if (!input.trim() || isStreaming || !selectedModel) return
    const chatId = activeChatId
    const userMsg = { role: 'user', content: input.trim() }
    const currentMessages = activeChat?.messages || []
    const newMessages = [...currentMessages, userMsg]
    updateMessages(chatId, newMessages)
    if (currentMessages.length === 0) updateChatTitle(chatId, getFirstLine(input))
    setInput('')
    setIsStreaming(true)
    setError('')

    // placeholder assistant msg
    const placeholderMessages = [...newMessages, { role: 'assistant', content: '' }]
    updateMessages(chatId, placeholderMessages)

    const controller = new AbortController()
    abortRef.current = controller

    try {
      let finalMessages = activeChat.messages
      if (webSearch && input.trim()) {
        try {
          const sr = await fetch('/api/search', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ query: input }) })
          const sd = await sr.json()
          if (sd.results?.length > 0) {
            const searchContext = sd.results.map(r => `[${r.title}](${r.url}): ${r.text?.slice(0,300)}`).join('\n\n')
            finalMessages = [...activeChat.messages, { role: 'user', content: `Web search results for "${input}":\n\n${searchContext}\n\nUser question: ${input}` }]
          }
        } catch {}
      }

      const msgsToSend = systemPrompt
        ? [{ role: 'system', content: systemPrompt }, ...(webSearch && finalMessages !== activeChat.messages ? finalMessages : newMessages)]
        : (webSearch && finalMessages !== activeChat.messages ? finalMessages : newMessages)

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          messages: msgsToSend,
          model: selectedModel.id,
          provider: selectedModel.provider,
        }),
      })

      const providerUsed = response.headers.get('X-Provider-Used') || selectedModel.provider

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.error || `HTTP ${response.status}`)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let fullContent = ''
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6).trim()
          if (data === '[DONE]') continue
          try {
            const parsed = JSON.parse(data)
            const delta = parsed.choices?.[0]?.delta?.content || ''
            fullContent += delta
            updateMessages(chatId, prev => {
              const updated = [...prev]
              updated[updated.length - 1] = { role: 'assistant', content: fullContent, providerUsed }
              return updated
            })
          } catch {}
        }
      }
    } catch (e) {
      if (e.name === 'AbortError') {
        // stopped by user — keep whatever was streamed
      } else {
        setError(e.message)
        updateMessages(chatId, prev => prev.slice(0, -1))
      }
    } finally {
      setIsStreaming(false)
      abortRef.current = null
    }
  }

  const stopStreaming = () => abortRef.current?.abort()

  const speakText = async (text) => {
    if (isSpeaking) { window.speechSynthesis?.cancel(); setIsSpeaking(false); return; }
    // Try ElevenLabs first
    try {
      const res = await fetch('/api/tts', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ text: text.slice(0, 2000) }) })
      if (res.ok) {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const audio = new Audio(url)
        setIsSpeaking(true)
        audio.onended = () => { setIsSpeaking(false); URL.revokeObjectURL(url) }
        audio.play()
        return
      }
    } catch {}
    // Fallback to Web Speech API
    if ('speechSynthesis' in window) {
      const utt = new SpeechSynthesisUtterance(text.slice(0, 2000))
      utt.rate = 0.9; utt.pitch = 1
      utt.onend = () => setIsSpeaking(false)
      setIsSpeaking(true)
      window.speechSynthesis.speak(utt)
    }
  }

  const generateImage = async () => {
    const prompt = input || imagePrompt
    if (!prompt) return
    setGeneratingImage(true)
    try {
      const res = await fetch('/api/image', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ prompt }) })
      const data = await res.json()
      if (data.image) {
        const imgMsg = { role: 'assistant', content: `![Generated Image](${data.image})\n\n*Generated via ${data.provider}*` }
        updateMessages(activeChatId, prev => [...prev, imgMsg])
      } else {
        setError('Image generation failed — check STABILITY_AI or REPLICATE keys')
      }
    } catch { setError('Image generation error') }
    setGeneratingImage(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const autoResize = (e) => {
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px'
  }

  const filteredModels = models.filter(m => {
    const matchSearch = m.name.toLowerCase().includes(modelSearch.toLowerCase()) || m.provider.toLowerCase().includes(modelSearch.toLowerCase())
    const matchProvider = providerFilter === 'all' || m.provider === providerFilter
    return matchSearch && matchProvider
  })

  const providers = ['all', ...new Set(models.map(m => m.provider))]

  return (
    <div style={S.root}>
      {/* ── Sidebar ── */}
      {sidebarOpen && (
        <aside style={S.sidebar}>
          <div style={S.sidebarHeader}>
            <div style={S.logo}>
              <span style={S.logoIcon}>⬡</span>
              <span style={S.logoText}>REEMme</span>
            </div>
            <button style={S.newChatBtn} onClick={newChat}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              New Chat
            </button>
          </div>

          <div style={S.tabRow}>
            <button style={{ ...S.tab, ...(sidebarTab === 'chats' ? S.tabOn : {}) }} onClick={() => setSidebarTab('chats')}>Chats</button>
            <button style={{ ...S.tab, ...(sidebarTab === 'repos' ? S.tabOn : {}) }} onClick={() => { setSidebarTab('repos'); fetchRepos() }}>Repos</button>
          </div>

          {sidebarTab === 'chats' && (
            <div style={S.chatList}>
              {chats.map(chat => (
                <div
                  key={chat.id}
                  style={{ ...S.chatItem, ...(activeChatId === chat.id ? S.chatItemOn : {}) }}
                  onClick={() => setActiveChatId(chat.id)}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, opacity: 0.5 }}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  <div style={S.chatItemInner}>
                    <span style={S.chatItemTitle}>{chat.title}</span>
                    <span style={S.chatItemTime}>{timeAgo(chat.ts)}</span>
                  </div>
                  <button style={S.chatDeleteBtn} onClick={(e) => deleteChat(chat.id, e)}>✕</button>
                </div>
              ))}
            </div>
          )}

          {sidebarTab === 'repos' && (
            <div style={S.repoList}>
              {reposLoading && <div style={S.sidebarEmpty}><div className="spinner" /></div>}
              {!reposLoading && repos.length === 0 && (
                <div style={S.sidebarEmpty}>
                  <p style={{ color: 'var(--text3)', fontSize: 13 }}>No repos found.<br/>Check your GitHub tokens.</p>
                </div>
              )}
              {repos.map(repo => (
                <a key={repo.full_name} href={repo.html_url} target="_blank" rel="noreferrer" style={S.repoItem}>
                  <div style={S.repoName}>{repo.name}</div>
                  <div style={S.repoMeta}>
                    <span style={S.repoAccount}>{repo.owner?.login}</span>
                    {repo.private && <span style={S.repoPrivate}>private</span>}
                    {repo.language && <span style={S.repoLang}>{repo.language}</span>}
                  </div>
                  {repo.description && <div style={S.repoDesc}>{repo.description.slice(0, 60)}</div>}
                </a>
              ))}
            </div>
          )}

          <div style={S.sidebarBottom}>
            <button style={S.settingsBtn} onClick={() => setShowSettings(s => !s)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
              Settings
            </button>
            <div style={S.modelCount}>{models.length} models loaded</div>
          </div>
        </aside>
      )}

      {/* ── Main ── */}
      <main style={S.main}>
        {/* Top bar */}
        <div style={S.topBar}>
          <button style={S.toggleSidebarBtn} onClick={() => setSidebarOpen(s => !s)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>

          {/* Model selector */}
          <div style={S.modelSelector} ref={dropdownRef}>
            <button style={S.modelSelectorBtn} onClick={() => setModelDropdownOpen(o => !o)}>
              {modelsLoading ? (
                <><div className="spinner" /><span style={{ color: 'var(--text3)' }}>Loading models…</span></>
              ) : selectedModel ? (
                <>
                  <span style={{ ...S.providerDot, background: PROVIDER_COLORS[selectedModel.provider] || '#888' }} />
                  <span style={S.selectedModelName}>{selectedModel.name}</span>
                  <span style={S.selectedModelProvider}>{PROVIDER_LABELS[selectedModel.provider] || selectedModel.provider}</span>
                </>
              ) : (
                <span style={{ color: 'var(--text3)' }}>No models — check API keys</span>
              )}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginLeft: 'auto', opacity: 0.4, transform: modelDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}><polyline points="6 9 12 15 18 9"/></svg>
            </button>

            {modelDropdownOpen && (
              <div style={S.modelDropdown}>
                <div style={S.modelDropdownSearch}>
                  <input
                    style={S.modelSearchInput}
                    placeholder="Search models…"
                    value={modelSearch}
                    onChange={e => setModelSearch(e.target.value)}
                    autoFocus
                  />
                </div>
                <div style={S.providerChips}>
                  {providers.map(p => (
                    <button
                      key={p}
                      style={{ ...S.providerChip, ...(providerFilter === p ? S.providerChipOn : {}) }}
                      onClick={() => setProviderFilter(p)}
                    >
                      {p === 'all' ? 'All' : PROVIDER_LABELS[p] || p}
                    </button>
                  ))}
                </div>
                <div style={S.modelDropdownList}>
                  {filteredModels.length === 0 && (
                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>No models found</div>
                  )}
                  {filteredModels.map(m => (
                    <button
                      key={`${m.provider}-${m.id}`}
                      style={{ ...S.modelOption, ...(selectedModel?.id === m.id && selectedModel?.provider === m.provider ? S.modelOptionOn : {}) }}
                      onClick={() => { setSelectedModel(m); setModelDropdownOpen(false); setModelSearch('') }}
                    >
                      <span style={{ ...S.providerDot, background: PROVIDER_COLORS[m.provider] || '#888', width: 8, height: 8 }} />
                      <div style={S.modelOptionInner}>
                        <span style={S.modelOptionName}>{m.name}</span>
                        <span style={S.modelOptionProvider}>{PROVIDER_LABELS[m.provider] || m.provider}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Settings panel */}
        {showSettings && (
          <div style={S.settingsPanel} className="fade-in">
            <div style={S.settingsPanelHeader}>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>System Prompt</span>
              <button style={{ color: 'var(--text3)', fontSize: 13 }} onClick={() => setShowSettings(false)}>✕</button>
            </div>
            <textarea
              style={S.systemPromptInput}
              value={systemPrompt}
              onChange={e => setSystemPrompt(e.target.value)}
              placeholder="Set a system prompt for your AI…"
              rows={3}
            />
          </div>
        )}

        {/* Messages */}
        <div style={S.messages}>
          {messages.length === 0 && (
            <div style={S.welcome} className="fade-in">
              <div style={S.welcomeIcon}>⬡</div>
              <h1 style={S.welcomeTitle}>REEMme</h1>
              <p style={S.welcomeSub}>Your personal AI command center. {models.length} models ready.</p>
              <div style={S.welcomeHints}>
                {['Review my GitHub repo code', 'Search the web for latest AI news', 'Generate an image of...', 'Help me debug this error'].map(hint => (
                  <button key={hint} style={S.hintBtn} onClick={() => setInput(hint)}>
                    {hint}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} style={{ ...S.messageRow, ...(msg.role === 'user' ? S.userRow : {}) }} className="fade-in">
              <div style={{ ...S.avatar, ...(msg.role === 'user' ? S.userAvatar : S.aiAvatar) }}>
                {msg.role === 'user' ? 'U' : '⬡'}
              </div>
              <div style={S.messageContent}>
                <div style={S.messageRole}>
                  {msg.role === 'user' ? 'You' : (selectedModel?.name || 'Assistant')}
                </div>
                <div style={S.messageBody}>
                  {msg.role === 'assistant' ? (
                    <div className={`prose${isStreaming && i === messages.length - 1 && msg.content ? ' cursor-blink' : ''}`}>
                      <ReactMarkdown>{msg.content || ''}</ReactMarkdown>
                      {isStreaming && i === messages.length - 1 && !msg.content && (
                        <div style={{ display: 'flex', gap: 4, alignItems: 'center', height: 24 }}>
                          {[0, 1, 2].map(j => (
                            <div key={j} style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--text3)', animation: `pulse 1.2s ease-in-out ${j * 0.2}s infinite` }} />
                          ))}
                        </div>
                      )}
                      {msg.content && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                          <button onClick={() => speakText(msg.content)} style={{ padding: '2px 8px', fontSize: 11, background: 'var(--bg4)', border: '1px solid var(--border2)', borderRadius: 4, color: isSpeaking ? 'var(--gold)' : 'var(--text3)', cursor: 'pointer' }}>
                            {isSpeaking ? '🔊 Stop' : '🔊'}
                          </button>
                          {msg.providerUsed && (
                            <span style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--font-mono)', background: 'var(--bg4)', padding: '2px 6px', borderRadius: 4, border: '1px solid var(--border)' }}>
                              via {PROVIDER_LABELS[msg.providerUsed] || msg.providerUsed}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{msg.content}</div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {error && (
            <div style={S.errorBanner} className="fade-in">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {error}
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={S.inputArea}>
          <div style={S.inputBox}>
            <textarea
              ref={textareaRef}
              style={S.textarea}
              placeholder={selectedModel ? `Message ${selectedModel.name}…` : 'Select a model to start…'}
              value={input}
              onChange={e => { setInput(e.target.value); autoResize(e) }}
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={!selectedModel}
            />
            <div style={S.inputActions}>
              <button onClick={() => setWebSearch(w => !w)} style={{ padding: '6px 10px', borderRadius: 6, background: webSearch ? 'var(--gold-dim)' : 'var(--bg4)', border: `1px solid ${webSearch ? 'var(--gold)' : 'var(--border2)'}`, color: webSearch ? 'var(--gold)' : 'var(--text3)', fontSize: 11, cursor: 'pointer', marginRight: 4 }} title="Web search">
                🔍
              </button>
              <button onClick={generateImage} disabled={generatingImage || !input} style={{ padding: '6px 10px', borderRadius: 6, background: 'var(--bg4)', border: '1px solid var(--border2)', color: generatingImage ? 'var(--gold)' : 'var(--text3)', fontSize: 11, cursor: 'pointer', marginRight: 4, opacity: input ? 1 : 0.4 }} title="Generate image from prompt">
                {generatingImage ? '⏳' : '🖼️'}
              </button>
              {isStreaming ? (
                <button style={S.stopBtn} onClick={stopStreaming}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="1"/></svg>
                  Stop
                </button>
              ) : (
                <button
                  style={{ ...S.sendBtn, opacity: input.trim() && selectedModel ? 1 : 0.3 }}
                  onClick={sendMessage}
                  disabled={!input.trim() || !selectedModel}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
                </button>
              )}
            </div>
          </div>
          <div style={S.inputFooter}>
            Enter to send · Shift+Enter for new line ·&nbsp;
            <span style={{ color: 'var(--gold)', opacity: 0.7 }}>{selectedModel?.name || 'no model selected'}</span>
          </div>
        </div>
      </main>
    </div>
  )
}

// ── Styles ──────────────────────────────────────────────────────────
const S = {
  root: { display: 'flex', height: '100vh', background: 'var(--bg)', overflow: 'hidden' },

  // Sidebar
  sidebar: { width: 260, background: 'var(--bg2)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', flexShrink: 0 },
  sidebarHeader: { padding: '16px 14px 12px', borderBottom: '1px solid var(--border)' },
  logo: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 },
  logoIcon: { fontSize: 22, color: 'var(--gold)' },
  logoText: { fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18, letterSpacing: '-0.02em', color: 'var(--text)' },
  newChatBtn: { display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '7px 10px', background: 'var(--gold-dim)', border: '1px solid rgba(212,168,83,0.25)', borderRadius: 7, color: 'var(--gold)', fontSize: 13, fontWeight: 500, transition: 'all .15s' },
  tabRow: { display: 'flex', padding: '8px 10px 4px', gap: 4 },
  tab: { flex: 1, padding: '5px 0', borderRadius: 6, fontSize: 12, fontWeight: 500, color: 'var(--text3)', transition: 'all .15s', letterSpacing: '0.02em' },
  tabOn: { background: 'var(--bg4)', color: 'var(--text)' },
  chatList: { flex: 1, overflowY: 'auto', padding: '4px 8px' },
  chatItem: { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 8px', borderRadius: 7, cursor: 'pointer', transition: 'background .1s', marginBottom: 1 },
  chatItemOn: { background: 'var(--bg4)' },
  chatItemInner: { flex: 1, minWidth: 0 },
  chatItemTitle: { display: 'block', fontSize: 13, color: 'var(--text2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  chatItemTime: { display: 'block', fontSize: 10, color: 'var(--text3)', marginTop: 1 },
  chatDeleteBtn: { opacity: 0, fontSize: 11, color: 'var(--text3)', padding: '2px 4px', borderRadius: 4, transition: 'opacity .15s', background: 'none', border: 'none', cursor: 'pointer' },
  repoList: { flex: 1, overflowY: 'auto', padding: '6px 8px' },
  repoItem: { display: 'block', padding: '8px 9px', borderRadius: 7, marginBottom: 2, transition: 'background .1s', cursor: 'pointer' },
  repoName: { fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 3 },
  repoMeta: { display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' },
  repoAccount: { fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--font-mono)' },
  repoPrivate: { fontSize: 10, color: 'var(--gold)', background: 'var(--gold-dim)', padding: '1px 5px', borderRadius: 3 },
  repoLang: { fontSize: 10, color: 'var(--text3)' },
  repoDesc: { fontSize: 11, color: 'var(--text3)', marginTop: 3, lineHeight: 1.4 },
  sidebarEmpty: { display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, padding: 24, textAlign: 'center' },
  sidebarBottom: { padding: '10px 12px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  settingsBtn: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text3)', padding: '5px 7px', borderRadius: 5, transition: 'all .15s' },
  modelCount: { fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--font-mono)' },

  // Main
  main: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' },
  topBar: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg2)', zIndex: 10 },
  toggleSidebarBtn: { padding: 6, borderRadius: 6, color: 'var(--text3)', transition: 'all .15s', flexShrink: 0 },

  // Model selector
  modelSelector: { position: 'relative', flex: 1, maxWidth: 420 },
  modelSelectorBtn: { display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '7px 10px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 13, transition: 'border-color .15s' },
  providerDot: { width: 8, height: 8, borderRadius: '50%', flexShrink: 0, display: 'inline-block' },
  selectedModelName: { fontWeight: 500, flex: 1 },
  selectedModelProvider: { fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-mono)' },
  modelDropdown: { position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 10, zIndex: 100, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' },
  modelDropdownSearch: { padding: '10px 10px 6px' },
  modelSearchInput: { width: '100%', background: 'var(--bg4)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', padding: '7px 10px', fontSize: 13, outline: 'none' },
  providerChips: { display: 'flex', gap: 4, padding: '4px 10px 8px', flexWrap: 'wrap' },
  providerChip: { fontSize: 10, padding: '2px 8px', borderRadius: 20, border: '1px solid var(--border)', color: 'var(--text3)', background: 'none', transition: 'all .12s', fontFamily: 'var(--font-mono)' },
  providerChipOn: { background: 'var(--gold)', borderColor: 'var(--gold)', color: '#000' },
  modelDropdownList: { maxHeight: 320, overflowY: 'auto', padding: '4px 6px 8px' },
  modelOption: { display: 'flex', alignItems: 'center', gap: 9, width: '100%', padding: '7px 8px', borderRadius: 6, transition: 'background .1s', textAlign: 'left', color: 'var(--text2)' },
  modelOptionOn: { background: 'var(--bg4)', color: 'var(--text)' },
  modelOptionInner: { display: 'flex', flexDirection: 'column', gap: 1 },
  modelOptionName: { fontSize: 13, fontWeight: 500 },
  modelOptionProvider: { fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--font-mono)' },

  // Settings
  settingsPanel: { padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg2)' },
  settingsPanelHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, fontSize: 13 },
  systemPromptInput: { width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 7, color: 'var(--text)', padding: '8px 12px', fontSize: 13, resize: 'none', outline: 'none', lineHeight: 1.5, fontFamily: 'var(--font)' },

  // Messages
  messages: { flex: 1, overflowY: 'auto', padding: '24px 0', display: 'flex', flexDirection: 'column' },
  welcome: { margin: 'auto', textAlign: 'center', padding: '0 24px', maxWidth: 540 },
  welcomeIcon: { fontSize: 44, color: 'var(--gold)', marginBottom: 16, display: 'block' },
  welcomeTitle: { fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 36, letterSpacing: '-0.03em', color: 'var(--text)', marginBottom: 8 },
  welcomeSub: { color: 'var(--text3)', fontSize: 15, marginBottom: 28 },
  welcomeHints: { display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  hintBtn: { padding: '7px 14px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 20, color: 'var(--text2)', fontSize: 13, transition: 'all .15s', cursor: 'pointer' },

  messageRow: { display: 'flex', gap: 14, padding: '12px 24px', maxWidth: 820, width: '100%', alignSelf: 'center', alignItems: 'flex-start' },
  userRow: { flexDirection: 'row-reverse' },
  avatar: { width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0, marginTop: 2 },
  userAvatar: { background: 'var(--gold-dim)', color: 'var(--gold)', border: '1px solid rgba(212,168,83,0.3)', fontFamily: 'var(--font-display)' },
  aiAvatar: { background: 'var(--bg4)', color: 'var(--text2)', border: '1px solid var(--border)', fontSize: 16 },
  messageContent: { flex: 1, minWidth: 0 },
  messageRole: { fontSize: 11, fontWeight: 600, color: 'var(--text3)', marginBottom: 6, letterSpacing: '0.05em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' },
  messageBody: { fontSize: 15, lineHeight: 1.7, color: 'var(--text)', wordBreak: 'break-word' },
  errorBanner: { display: 'flex', alignItems: 'center', gap: 8, margin: '8px 24px', padding: '10px 14px', background: '#1f0a0a', border: '1px solid #5a1a1a', borderRadius: 8, color: 'var(--red)', fontSize: 13 },

  // Input
  inputArea: { padding: '12px 16px 14px', background: 'var(--bg2)', borderTop: '1px solid var(--border)' },
  inputBox: { display: 'flex', gap: 0, background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 12, overflow: 'hidden', alignItems: 'flex-end', maxWidth: 820, margin: '0 auto', transition: 'border-color .2s' },
  textarea: { flex: 1, background: 'none', border: 'none', color: 'var(--text)', padding: '12px 16px', fontSize: 15, resize: 'none', outline: 'none', fontFamily: 'var(--font)', lineHeight: 1.6, maxHeight: 200, minHeight: 48 },
  inputActions: { padding: '8px 10px', display: 'flex', alignItems: 'flex-end' },
  sendBtn: { width: 36, height: 36, borderRadius: 8, background: 'var(--gold)', border: 'none', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'opacity .15s', flexShrink: 0 },
  stopBtn: { display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, background: 'var(--bg4)', border: '1px solid var(--border2)', color: 'var(--text2)', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font)' },
  inputFooter: { textAlign: 'center', fontSize: 11, color: 'var(--text3)', marginTop: 7, fontFamily: 'var(--font-mono)', maxWidth: 820, margin: '7px auto 0' },
}
