import { createMemo, createSignal, For, onCleanup, onMount, Show } from 'solid-js'
import type { UIMessage } from 'ai'
import { createVercelChat, getMessageText } from './lib/chat'
import {
  INITIAL_ECS_JOBS,
  type EcsJob,
  type JobStatus,
  type ModelConnectionConfig,
  type WorkflowCode,
} from './types/jobs'
import './App.css'

const STORAGE_KEY_CONNECTION = 'ecs_model_connection_v1'

const SEEDED_MESSAGES: UIMessage[] = [
  {
    id: 'seed-assistant-1',
    role: 'assistant',
    parts: [
      {
        type: 'text',
        text: [
          '### Airport Modernization ECS — Operations & Job Assistant',
          '',
          'Connected to the Hono server (`/api/chat`, `/api/jobs/stream`, `/api/connection`). Configure your **API Token** and **Model Connection** endpoint in the connection bar above, or inspect the server-synced **Ongoing ECS Jobs** panel on the right:',
          '',
          '- **In Progress (Yellow)**: `JOB-4091` (DEN · BNATCS Surface Radar), `JOB-4094` (DEL · Biometric Self-Bag-Drop), `JOB-4096` (LAX · SWIM SFDPS Sync), `JOB-4085` (ORD · AIP Grant Drawdown)',
          '- **Complete (Green)**: `JOB-4079` (DEN · 100% Gate Electrification Glidepath)',
          '- **Failure (Red)**: `JOB-4088` (JFK · 91% ORAT Gate Hold on CyberResilienceCheck)',
          '',
          'Use the **Ask** icon button on any job item to query its live server telemetry, or the **Abort** icon button next to it to halt an active run.',
        ].join('\n'),
      },
    ],
  },
]

const PROMPT_STARTERS = [
  'Diagnose JOB-4088 ORAT gate failure at JFK and remediation steps',
  'Summarize JOB-4091 BNATCS surface radar cutover progress at DEN',
  'Evaluate DEL T3 biometric self-bag-drop stage time (JOB-4094)',
  'Calculate W1 AIP & ATP grant drawdown ratio for ORD (JOB-4085)',
]

function renderFormattedText(raw: string) {
  const lines = raw.split('\n')
  return (
    <div class="message-content">
      <For each={lines}>
        {(line) => {
          const trimmed = line.trim()
          if (!trimmed) return <div style={{ height: '5px' }} />
          if (trimmed.startsWith('### ')) {
            return <h3>{trimmed.slice(4)}</h3>
          }
          if (trimmed.startsWith('- ')) {
            return (
              <ul>
                <li>{trimmed.slice(2)}</li>
              </ul>
            )
          }
          return <p>{trimmed}</p>
        }}
      </For>
    </div>
  )
}

function JobProgressIcon(props: { progress: number; status: JobStatus }) {
  const radius = 6.5
  const circumference = 2 * Math.PI * radius
  const dashOffset = () =>
    circumference - (Math.max(0, Math.min(100, props.progress)) / 100) * circumference

  return (
    <span
      class={`job-progress-badge status-${props.status} tabular-nums`}
      title={
        props.status === 'in_progress'
          ? `In progress: ${props.progress}%`
          : props.status === 'completed'
            ? `Complete: ${props.progress}%`
            : `Failure: ${props.progress}%`
      }
    >
      <svg class="progress-ring-svg" viewBox="0 0 18 18" aria-hidden="true">
        <circle class="progress-ring-track" cx="9" cy="9" r={radius} />
        <circle
          class={`progress-ring-fill status-${props.status}`}
          cx="9"
          cy="9"
          r={radius}
          stroke-dasharray={`${circumference} ${circumference}`}
          stroke-dashoffset={dashOffset()}
        />
      </svg>
      <span>{props.progress}%</span>
    </span>
  )
}

export default function App() {
  const [jobs, setJobs] = createSignal<EcsJob[]>(INITIAL_ECS_JOBS)
  const [selectedJobId, setSelectedJobId] = createSignal<string>(INITIAL_ECS_JOBS[0].id)
  const [expandedJobIds, setExpandedJobIds] = createSignal<Record<string, boolean>>({
    'JOB-4091': true,
  })
  const [statusFilter, setStatusFilter] = createSignal<'all' | JobStatus>('all')
  const [searchQuery, setSearchQuery] = createSignal('')
  const [inputPrompt, setInputPrompt] = createSignal('')
  const [attachSelectedJob, setAttachSelectedJob] = createSignal(true)
  const [mobileView, setMobileView] = createSignal<'split' | 'jobs' | 'chat'>('split')
  const [isDispatchModalOpen, setIsDispatchModalOpen] = createSignal(false)
  const [serverStreamConnected, setServerStreamConnected] = createSignal(false)

  // Model Connection Settings State (synced with server /api/connection)
  const [showConnectionBar, setShowConnectionBar] = createSignal(true)
  const [showApiToken, setShowApiToken] = createSignal(false)
  const [baseUrl, setBaseUrl] = createSignal('https://api.openai.com/v1')
  const [modelId, setModelId] = createSignal('gpt-4o-mini')
  const [apiToken, setApiToken] = createSignal('')
  const [serverHasToken, setServerHasToken] = createSignal(false)
  const [connectionSavedNotice, setConnectionSavedNotice] = createSignal('')

  // New job dispatch form state
  const [newJobCode, setNewJobCode] = createSignal<WorkflowCode>('W4')
  const [newJobAirport, setNewJobAirport] = createSignal('JFK')
  const [newJobTitle, setNewJobTitle] = createSignal('')

  const connectionConfig = createMemo<ModelConnectionConfig>(() => ({
    baseUrl: baseUrl().trim(),
    modelId: modelId().trim() || 'gpt-4o-mini',
    apiToken: apiToken().trim(),
  }))

  const hasActiveToken = createMemo(
    () => Boolean(apiToken().trim()) || serverHasToken(),
  )

  const {
    messages,
    status: chatStatus,
    error: chatError,
    sendMessage,
    regenerate,
    stop,
    clearError,
    setMessages,
  } = createVercelChat({
    api: '/api/chat',
    messages: SEEDED_MESSAGES,
  })

  let messagesEndRef: HTMLDivElement | undefined

  const scrollToBottom = () => {
    if (messagesEndRef) {
      messagesEndRef.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }
  }

  onMount(() => {
    // 1. Load saved local connection settings and sync with server /api/connection
    let localConnection: Partial<ModelConnectionConfig> | null = null
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY_CONNECTION)
      if (saved) {
        localConnection = JSON.parse(saved) as Partial<ModelConnectionConfig>
        if (typeof localConnection.baseUrl === 'string') setBaseUrl(localConnection.baseUrl)
        if (typeof localConnection.modelId === 'string') setModelId(localConnection.modelId)
        if (typeof localConnection.apiToken === 'string') setApiToken(localConnection.apiToken)
      }
    } catch {
      // Ignore storage errors
    }

    fetch('/api/connection')
      .then((res) => (res.ok ? res.json() : null))
      .then((serverConn) => {
        if (!serverConn) return
        if (!localConnection?.baseUrl && serverConn.baseUrl) {
          setBaseUrl(serverConn.baseUrl)
        }
        if (!localConnection?.modelId && serverConn.modelId) {
          setModelId(serverConn.modelId)
        }
        setServerHasToken(Boolean(serverConn.hasToken))

        // If client had stored credentials in localStorage, push them to the server session
        if (localConnection?.apiToken || localConnection?.baseUrl || localConnection?.modelId) {
          fetch('/api/connection', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              baseUrl: baseUrl(),
              modelId: modelId(),
              apiToken: apiToken(),
            }),
          })
            .then((r) => (r.ok ? r.json() : null))
            .then((updated) => {
              if (updated) setServerHasToken(Boolean(updated.hasToken))
            })
            .catch(() => {})
        }
      })
      .catch(() => {})

    // 2. Fetch authoritative initial jobs list from server
    fetch('/api/jobs')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.jobs?.length) {
          setJobs(data.jobs)
        }
      })
      .catch(() => {})

    // 3. Subscribe to live server SSE stream (/api/jobs/stream) for real-time job state sync
    const eventSource = new EventSource('/api/jobs/stream')

    eventSource.onopen = () => {
      setServerStreamConnected(true)
    }

    eventSource.addEventListener('jobs:sync', (event) => {
      try {
        const parsed = JSON.parse((event as MessageEvent).data) as { jobs?: EcsJob[] }
        if (Array.isArray(parsed.jobs)) {
          setJobs(parsed.jobs)
          setServerStreamConnected(true)
        }
      } catch {
        // Ignore malformed frame
      }
    })

    eventSource.onerror = () => {
      setServerStreamConnected(false)
    }

    onCleanup(() => {
      eventSource.close()
    })
  })

  const saveConnectionSettings = async (e?: Event) => {
    e?.preventDefault()
    const current = connectionConfig()
    try {
      window.localStorage.setItem(STORAGE_KEY_CONNECTION, JSON.stringify(current))
    } catch {
      // Ignore storage restrictions
    }

    try {
      const res = await fetch('/api/connection', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(current),
      })
      if (res.ok) {
        const updated = await res.json()
        setServerHasToken(Boolean(updated.hasToken))
        setConnectionSavedNotice('Synced with server')
      } else {
        setConnectionSavedNotice('Saved locally')
      }
    } catch {
      setConnectionSavedNotice('Saved locally')
    }

    window.setTimeout(() => setConnectionSavedNotice(''), 2500)
  }

  const toggleJobExpanded = (jobId: string) => {
    setSelectedJobId(jobId)
    setExpandedJobIds((prev) => ({
      ...prev,
      [jobId]: !prev[jobId],
    }))
  }

  const selectedJob = createMemo(
    () => jobs().find((j) => j.id === selectedJobId()) ?? jobs()[0],
  )

  const filteredJobs = createMemo(() => {
    const filter = statusFilter()
    const q = searchQuery().trim().toLowerCase()
    return jobs().filter((job) => {
      if (filter !== 'all' && job.status !== filter) return false
      if (!q) return true
      return (
        job.id.toLowerCase().includes(q) ||
        job.code.toLowerCase().includes(q) ||
        job.title.toLowerCase().includes(q) ||
        job.airportIata.toLowerCase().includes(q) ||
        job.airportIcao.toLowerCase().includes(q) ||
        job.ecsSystem.toLowerCase().includes(q)
      )
    })
  })

  const jobCounts = createMemo(() => {
    const all = jobs()
    return {
      total: all.length,
      inProgress: all.filter((j) => j.status === 'in_progress').length,
      completed: all.filter((j) => j.status === 'completed').length,
      failed: all.filter((j) => j.status === 'failed').length,
    }
  })

  const isStreaming = createMemo(
    () => chatStatus() === 'submitted' || chatStatus() === 'streaming',
  )

  const buildRequestOptions = () => {
    const conn = connectionConfig()
    return {
      body: { connection: conn },
      headers: {
        'x-model-id': conn.modelId,
        ...(conn.baseUrl ? { 'x-base-url': conn.baseUrl } : {}),
        ...(conn.apiToken ? { 'x-api-token': conn.apiToken } : {}),
      },
    }
  }

  const submitPrompt = async (rawText: string) => {
    const trimmed = rawText.trim()
    if (!trimmed || isStreaming()) return

    const activeJob = selectedJob()
    const contextualPrompt =
      attachSelectedJob() && activeJob && !trimmed.includes(activeJob.id)
        ? `[Context: ${activeJob.id} · ${activeJob.code} · ${activeJob.airportIata} (${activeJob.ecsSystem})]\n${trimmed}`
        : trimmed

    setInputPrompt('')
    if (mobileView() === 'jobs') {
      setMobileView('chat')
    }
    await sendMessage({ text: contextualPrompt }, buildRequestOptions())
    scrollToBottom()
  }

  const handleFormSubmit = async (e: SubmitEvent) => {
    e.preventDefault()
    await submitPrompt(inputPrompt())
  }

  const handleAskAboutJob = async (job: EcsJob, e: MouseEvent) => {
    e.stopPropagation()
    setSelectedJobId(job.id)
    if (mobileView() === 'jobs') {
      setMobileView('chat')
    }
    await sendMessage(
      {
        text: `Analyze ongoing job ${job.id} (${job.code} · ${job.title} at ${job.airportIata}/${job.airportIcao}, status: ${job.status}, progress: ${job.progress}%) and provide recommended ECS actions.`,
      },
      buildRequestOptions(),
    )
    scrollToBottom()
  }

  const handleAbortJob = async (job: EcsJob, e: MouseEvent) => {
    e.stopPropagation()
    if (job.status !== 'in_progress') return

    // Optimistic update reconciled with authoritative POST /api/jobs/:id/abort
    const previousJobs = jobs()
    setJobs((prev) =>
      prev.map((item) =>
        item.id === job.id
          ? {
              ...item,
              status: 'failed',
              lifecycleState: 'Aborted',
              eta: 'Aborted',
            }
          : item,
      ),
    )

    try {
      const res = await fetch(`/api/jobs/${job.id}/abort`, {
        method: 'POST',
      })
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data?.jobs)) {
          setJobs(data.jobs)
        }
      } else {
        setJobs(previousJobs)
      }
    } catch {
      // Keep optimistic state if offline
    }
  }

  const handleCreateJob = async (e: SubmitEvent) => {
    e.preventDefault()
    const payload = {
      code: newJobCode(),
      airportIata: newJobAirport(),
      title:
        newJobTitle().trim() ||
        `${newJobCode()} Modernization Pipeline (${newJobAirport()})`,
    }

    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data?.jobs)) {
          setJobs(data.jobs)
        } else if (data?.job) {
          setJobs((prev) => [data.job, ...prev])
        }
        if (data?.job?.id) {
          setSelectedJobId(data.job.id)
          setExpandedJobIds((prev) => ({ ...prev, [data.job.id]: true }))
        }
      }
    } catch {
      // Ignore network error
    }

    setNewJobTitle('')
    setIsDispatchModalOpen(false)
  }

  return (
    <div class="workspace-shell">
      {/* Top Bar Contract: Zone 1 (Brand) — Zone 2 (Nav Links) — Zone 3 (Primary Actions) */}
      <header class="topbar">
        <a href="#top" class="topbar-brand">
          Deloitte Airport Modernization
        </a>

        <nav class="topbar-nav" aria-label="Workspace navigation">
          <button
            type="button"
            class={`topbar-link ${mobileView() === 'split' ? 'is-active' : ''}`}
            onClick={() => setMobileView('split')}
          >
            Workspace
          </button>
          <button
            type="button"
            class={`topbar-link ${mobileView() === 'chat' ? 'is-active' : ''}`}
            onClick={() => setMobileView('chat')}
          >
            LLM Chat
          </button>
          <button
            type="button"
            class={`topbar-link ${mobileView() === 'jobs' ? 'is-active' : ''}`}
            onClick={() => setMobileView('jobs')}
          >
            Ongoing Jobs ({jobCounts().total})
          </button>
          <button
            type="button"
            class={`topbar-link ${showConnectionBar() ? 'is-active' : ''}`}
            onClick={() => setShowConnectionBar((v) => !v)}
          >
            Model Connection
          </button>
        </nav>

        <div class="topbar-actions">
          <button
            type="button"
            class="btn-primary"
            onClick={() => setIsDispatchModalOpen(true)}
          >
            + Dispatch Job
          </button>
        </div>
      </header>

      {/* Main Split Workspace: Chat Window on Left + Compact Ongoing Jobs on Right */}
      <div class="workspace-body">
        {/* Left-Hand Main Viewport: Standard Vercel AI UI Chat Window */}
        <main
          class={`chat-panel ${mobileView() === 'jobs' ? 'mobile-hidden' : ''}`}
          aria-label="ECS LLM Chat Window"
        >
          <div class="chat-header">
            <div class="chat-header-info">
              <h1 class="chat-title">ECS Modernization Assistant</h1>
              <p class="chat-subtitle">
                Vercel AI UI ·{' '}
                <span class="tabular-nums">
                  {hasActiveToken()
                    ? `Connected (${modelId() || 'gpt-4o-mini'})`
                    : `Server Engine (${modelId() || 'gpt-4o-mini'} · No API token set)`}
                </span>{' '}
                · Stream:{' '}
                <span class="tabular-nums">
                  {chatStatus() === 'ready'
                    ? 'Ready'
                    : chatStatus() === 'streaming'
                      ? 'Streaming…'
                      : chatStatus() === 'submitted'
                        ? 'Connecting…'
                        : 'Error'}
                </span>
              </p>
            </div>

            <div class="chat-header-actions">
              <button
                type="button"
                class="btn-secondary"
                aria-expanded={showConnectionBar()}
                onClick={() => setShowConnectionBar((v) => !v)}
              >
                {showConnectionBar() ? 'Hide Connection' : 'Connection Settings'}
              </button>
              <Show when={isStreaming()}>
                <button
                  type="button"
                  class="btn-secondary"
                  onClick={() => stop()}
                >
                  Stop Stream
                </button>
              </Show>
              <button
                type="button"
                class="btn-secondary"
                disabled={isStreaming() || messages().length < 2}
                onClick={() => regenerate(buildRequestOptions())}
              >
                Regenerate
              </button>
              <button
                type="button"
                class="btn-secondary"
                disabled={isStreaming()}
                onClick={() => setMessages([])}
              >
                Clear Chat
              </button>
            </div>
          </div>

          {/* User-Provided Model Connection Bar (synced to /api/connection & /api/chat) */}
          <Show when={showConnectionBar()}>
            <form
              class="connection-bar"
              aria-label="Model Connection Configuration"
              onSubmit={saveConnectionSettings}
            >
              <div class="connection-grid">
                <div class="conn-field">
                  <label for="conn-base-url">Model Endpoint / Base URL</label>
                  <input
                    id="conn-base-url"
                    type="url"
                    class="conn-input tabular-nums"
                    placeholder="https://api.openai.com/v1"
                    value={baseUrl()}
                    onInput={(e) => setBaseUrl(e.currentTarget.value)}
                  />
                </div>

                <div class="conn-field">
                  <label for="conn-model-id">Model Name</label>
                  <input
                    id="conn-model-id"
                    type="text"
                    class="conn-input tabular-nums"
                    placeholder="gpt-4o-mini"
                    value={modelId()}
                    onInput={(e) => setModelId(e.currentTarget.value)}
                  />
                </div>

                <div class="conn-field">
                  <label for="conn-api-token">API Token</label>
                  <div class="conn-input-group">
                    <input
                      id="conn-api-token"
                      type={showApiToken() ? 'text' : 'password'}
                      class="conn-input tabular-nums"
                      placeholder="sk-..."
                      value={apiToken()}
                      onInput={(e) => setApiToken(e.currentTarget.value)}
                    />
                    <button
                      type="button"
                      class="btn-secondary"
                      onClick={() => setShowApiToken((v) => !v)}
                    >
                      {showApiToken() ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>

                <button type="submit" class="btn-primary">
                  Save Connection
                </button>
              </div>

              <div class="conn-status-row">
                <span>
                  {hasActiveToken()
                    ? `Live LLM credentials synced with server for ${modelId() || 'gpt-4o-mini'} via ${baseUrl() || 'default endpoint'}.`
                    : 'Provide your API token and endpoint above to connect the server to your LLM provider.'}
                </span>
                <Show when={connectionSavedNotice()}>
                  <span class="tabular-nums">{connectionSavedNotice()}</span>
                </Show>
              </div>
            </form>
          </Show>

          <div class="chat-messages" role="log" aria-live="polite">
            <Show
              when={messages().length > 0}
              fallback={
                <div class="empty-state">
                  <p>
                    No messages in the current session. Select a prompt starter below or click
                    the Ask icon on any ongoing job in the right-hand panel.
                  </p>
                  <button
                    type="button"
                    class="btn-secondary"
                    onClick={() => setMessages(SEEDED_MESSAGES)}
                  >
                    Restore Operations Brief
                  </button>
                </div>
              }
            >
              <For each={messages()}>
                {(message) => (
                  <div
                    class={`chat-message-wrapper ${
                      message.role === 'user' ? 'is-user' : 'is-assistant'
                    }`}
                  >
                    <div class="chat-message-meta">
                      <span>
                        {message.role === 'user'
                          ? 'Operator'
                          : 'ECS Modernization Assistant'}
                      </span>
                      <span class="tabular-nums">
                        {message.role === 'assistant'
                          ? `Vercel AI UI · ${modelId() || 'gpt-4o-mini'}`
                          : 'Sent'}
                      </span>
                    </div>
                    <div class="chat-bubble">
                      {renderFormattedText(getMessageText(message))}
                    </div>
                  </div>
                )}
              </For>
            </Show>

            <Show when={chatError()}>
              {(err) => (
                <div class="chat-error-banner" role="alert">
                  <span>Connection / Stream error: {err().message}</span>
                  <button
                    type="button"
                    class="btn-secondary"
                    onClick={() => clearError()}
                  >
                    Dismiss
                  </button>
                </div>
              )}
            </Show>

            <div class="prompt-starters" aria-label="Suggested prompts">
              <For each={PROMPT_STARTERS}>
                {(starter) => (
                  <button
                    type="button"
                    class="starter-btn"
                    disabled={isStreaming()}
                    onClick={() => submitPrompt(starter)}
                  >
                    {starter}
                  </button>
                )}
              </For>
            </div>

            <div ref={messagesEndRef} />
          </div>

          <div class="chat-composer-container">
            <div class="chat-composer-inner">
              <div class="composer-context-bar">
                <label class="composer-context-toggle">
                  <input
                    type="checkbox"
                    checked={attachSelectedJob()}
                    onChange={(e) => setAttachSelectedJob(e.currentTarget.checked)}
                  />
                  <span>
                    Attach active job context (
                    {selectedJob()
                      ? `${selectedJob()!.id} · ${selectedJob()!.code} · ${selectedJob()!.airportIata}`
                      : 'None'}
                    )
                  </span>
                </label>
                <span class="tabular-nums">Enter to send · Shift+Enter for newline</span>
              </div>

              <form class="composer-form" onSubmit={handleFormSubmit}>
                <textarea
                  class="composer-input"
                  rows={2}
                  placeholder="Ask about an ongoing ECS job, ORAT readiness gate, BNATCS radar cutover, or AIP grant drawdown…"
                  aria-label="Message the ECS assistant"
                  value={inputPrompt()}
                  onInput={(e) => setInputPrompt(e.currentTarget.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      submitPrompt(inputPrompt())
                    }
                  }}
                />
                <button
                  type="submit"
                  class="btn-primary composer-submit"
                  disabled={isStreaming() || !inputPrompt().trim()}
                >
                  {isStreaming() ? 'Streaming…' : 'Send Message'}
                </button>
              </form>
            </div>
          </div>
        </main>

        {/* Right-Hand Panel: Compact Ongoing ECS Jobs with Collapsible Details */}
        <aside
          class={`jobs-panel ${mobileView() === 'chat' ? 'mobile-hidden' : ''}`}
          aria-label="Ongoing ECS Jobs"
        >
          <div class="panel-header">
            <div class="panel-title-row">
              <h2 class="panel-title">Ongoing Jobs</h2>
              <span class="panel-summary-meta tabular-nums" style={{ margin: 0 }}>
                <span>{jobCounts().inProgress} active</span>
                <span aria-hidden="true">·</span>
                <span>{jobCounts().completed} done</span>
                <span aria-hidden="true">·</span>
                <span>{jobCounts().failed} failed</span>
              </span>
            </div>
            <div class="panel-summary-meta">
              <span>{serverStreamConnected() ? 'Live SSE Sync' : 'HTTP Sync'}</span>
              <span aria-hidden="true">·</span>
              <span>Yellow: In Progress</span>
              <span aria-hidden="true">·</span>
              <span>Green: Complete</span>
              <span aria-hidden="true">·</span>
              <span>Red: Failure</span>
            </div>
          </div>

          <div class="jobs-controls">
            <input
              type="search"
              class="search-input"
              placeholder="Search jobs (JFK, DEN, W4, JOB-4091)…"
              aria-label="Search ongoing jobs"
              value={searchQuery()}
              onInput={(e) => setSearchQuery(e.currentTarget.value)}
            />

            <div class="segmented-filters" role="tablist" aria-label="Filter jobs by status">
              <button
                type="button"
                role="tab"
                aria-selected={statusFilter() === 'all'}
                class={`filter-tab ${statusFilter() === 'all' ? 'is-active' : ''}`}
                onClick={() => setStatusFilter('all')}
              >
                All ({jobCounts().total})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={statusFilter() === 'in_progress'}
                class={`filter-tab ${statusFilter() === 'in_progress' ? 'is-active' : ''}`}
                onClick={() => setStatusFilter('in_progress')}
              >
                In Progress ({jobCounts().inProgress})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={statusFilter() === 'completed'}
                class={`filter-tab ${statusFilter() === 'completed' ? 'is-active' : ''}`}
                onClick={() => setStatusFilter('completed')}
              >
                Complete ({jobCounts().completed})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={statusFilter() === 'failed'}
                class={`filter-tab ${statusFilter() === 'failed' ? 'is-active' : ''}`}
                onClick={() => setStatusFilter('failed')}
              >
                Failure ({jobCounts().failed})
              </button>
            </div>
          </div>

          <div class="jobs-list" role="list">
            <Show
              when={filteredJobs().length > 0}
              fallback={
                <div class="empty-state">
                  <p>No ongoing jobs match your current filter.</p>
                  <button
                    type="button"
                    class="btn-secondary"
                    onClick={() => {
                      setStatusFilter('all')
                      setSearchQuery('')
                    }}
                  >
                    Reset Filters
                  </button>
                </div>
              }
            >
              <For each={filteredJobs()}>
                {(job) => {
                  const isExpanded = () => Boolean(expandedJobIds()[job.id])
                  return (
                    <div
                      role="listitem"
                      class={`job-item ${selectedJob()?.id === job.id ? 'is-selected' : ''}`}
                    >
                      <div class="job-item-bar">
                        <button
                          type="button"
                          class="job-toggle-btn"
                          aria-expanded={isExpanded()}
                          onClick={() => toggleJobExpanded(job.id)}
                        >
                          <svg
                            class={`job-chevron ${isExpanded() ? 'is-open' : ''}`}
                            viewBox="0 0 16 16"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                            aria-hidden="true"
                          >
                            <path d="M6 4l4 4-4 4" stroke-linecap="round" stroke-linejoin="round" />
                          </svg>

                          <JobProgressIcon progress={job.progress} status={job.status} />

                          <div class="job-main-text">
                            <div class="job-compact-title">{job.title}</div>
                            <div class="job-compact-meta tabular-nums">
                              {job.id} · {job.code} · {job.airportIata} · {job.ecsSystem}
                            </div>
                          </div>
                        </button>

                        <div class="job-item-actions">
                          <button
                            type="button"
                            class="icon-action-btn btn-ask"
                            title={`Ask assistant about ${job.id}`}
                            aria-label={`Ask assistant about ${job.id}`}
                            onClick={(e) => handleAskAboutJob(job, e)}
                          >
                            <svg
                              width="13"
                              height="13"
                              viewBox="0 0 16 16"
                              fill="none"
                              stroke="currentColor"
                              stroke-width="1.75"
                              aria-hidden="true"
                            >
                              <path
                                d="M2.5 3.5h11v7h-7l-3.5 2.5v-2.5h-.5v-7z"
                                stroke-linejoin="round"
                              />
                            </svg>
                            <span>Ask</span>
                          </button>

                          <button
                            type="button"
                            class="icon-action-btn btn-abort"
                            disabled={job.status !== 'in_progress'}
                            title={
                              job.status === 'in_progress'
                                ? `Abort ${job.id}`
                                : `${job.id} is already ${job.status}`
                            }
                            aria-label={`Abort ${job.id}`}
                            onClick={(e) => handleAbortJob(job, e)}
                          >
                            <svg
                              width="13"
                              height="13"
                              viewBox="0 0 16 16"
                              fill="none"
                              stroke="currentColor"
                              stroke-width="1.75"
                              aria-hidden="true"
                            >
                              <circle cx="8" cy="8" r="5.5" />
                              <path d="M5.75 5.75l4.5 4.5M10.25 5.75l-4.5 4.5" stroke-linecap="round" />
                            </svg>
                            <span>Abort</span>
                          </button>
                        </div>
                      </div>

                      {/* Smooth bottom progress bar matching Yellow / Green / Red state */}
                      <div class="job-mini-progress-track" aria-hidden="true">
                        <div
                          class={`job-mini-progress-fill status-${job.status}`}
                          style={{
                            transform: `scaleX(${Math.max(0.03, job.progress / 100)})`,
                          }}
                        />
                      </div>

                      {/* Collapsible Details Section */}
                      <Show when={isExpanded()}>
                        <div class="job-details-collapse">
                          <div class="job-details-grid tabular-nums">
                            <span>State: {job.lifecycleState}</span>
                            <span>·</span>
                            <span>
                              {job.keyMetricLabel}: {job.keyMetricValue}
                            </span>
                            <span>·</span>
                            <span>Elapsed: {job.elapsed}</span>
                            <span>·</span>
                            <span>ETA: {job.eta}</span>
                          </div>

                          <p class="job-details-summary">{job.summary}</p>

                          <ul class="job-details-steps">
                            <For each={job.steps}>
                              {(step) => (
                                <li class="job-details-step">
                                  <div class="job-details-step-row">
                                    <span>{step.stage}</span>
                                    <span class="tabular-nums">{step.timestamp}</span>
                                  </div>
                                  <div class="job-details-step-desc">{step.detail}</div>
                                </li>
                              )}
                            </For>
                          </ul>
                        </div>
                      </Show>
                    </div>
                  )
                }}
              </For>
            </Show>
          </div>
        </aside>
      </div>

      {/* Dispatch New ECS Job Modal */}
      <Show when={isDispatchModalOpen()}>
        <div
          class="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="dispatch-modal-title"
        >
          <form class="modal-card" onSubmit={handleCreateJob}>
            <h2 id="dispatch-modal-title" class="modal-title">
              Dispatch Ongoing ECS Job
            </h2>
            <p class="modal-subtitle">
              Launch a workflow verification or ingestion job into the right-hand queue.
            </p>

            <div class="form-field">
              <label for="job-workflow-select">ECS Workflow (W1–W7)</label>
              <select
                id="job-workflow-select"
                value={newJobCode()}
                onChange={(e) => setNewJobCode(e.currentTarget.value as WorkflowCode)}
              >
                <option value="W1">W1 · Funding & Grant Lifecycle (FundingSystem)</option>
                <option value="W2">W2 · Capital Project Delivery & ORAT (ProjectLifecycleSystem)</option>
                <option value="W3">W3 · Passenger Journey Modernization (PassengerFlowSystem)</option>
                <option value="W4">W4 · ATC & Airfield Modernization (ATCDeploymentSystem)</option>
                <option value="W5">W5 · Sustainability & Energy Transition (SustainabilitySystem)</option>
                <option value="W6">W6 · Smart-Tech Adoption Maturity (MaturitySystem)</option>
                <option value="W7">W7 · Realtime Data Compilation (IngestionSystem)</option>
              </select>
            </div>

            <div class="form-field">
              <label for="job-airport-select">Target Airport Entity (IATA)</label>
              <select
                id="job-airport-select"
                value={newJobAirport()}
                onChange={(e) => setNewJobAirport(e.currentTarget.value)}
              >
                <option value="JFK">JFK · John F. Kennedy International (KJFK)</option>
                <option value="DEN">DEN · Denver International (KDEN)</option>
                <option value="LAX">LAX · Los Angeles International (KLAX)</option>
                <option value="ORD">ORD · Chicago O’Hare International (KORD)</option>
                <option value="DEL">DEL · Indira Gandhi International T3 (VIDP)</option>
              </select>
            </div>

            <div class="form-field">
              <label for="job-title-input">Job Objective</label>
              <input
                id="job-title-input"
                type="text"
                placeholder="e.g. Surface Awareness Initiative ADS-B Cutover Check"
                value={newJobTitle()}
                onInput={(e) => setNewJobTitle(e.currentTarget.value)}
              />
            </div>

            <div class="modal-actions">
              <button
                type="button"
                class="btn-secondary"
                onClick={() => setIsDispatchModalOpen(false)}
              >
                Cancel
              </button>
              <button type="submit" class="btn-primary">
                Dispatch Job
              </button>
            </div>
          </form>
        </div>
      </Show>
    </div>
  )
}
