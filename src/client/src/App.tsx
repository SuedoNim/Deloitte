import { createMemo, createSignal, For, onCleanup, onMount, Show } from 'solid-js'
import type { UIMessage } from 'ai'
import { createVercelChat, getMessageText } from './lib/chat'
import { createClientLogger, type IClientLogger } from './lib/logger'
import { createEcsApiClient, type IEcsApiClient } from './services/api-client'
import { TopBar } from './components/TopBar'
import { ConnectionBar } from './components/ConnectionBar'
import { JobsPanel } from './components/JobsPanel'
import { DispatchJobModal } from './components/DispatchJobModal'
import { SkillsCatalogModal } from './components/SkillsCatalogModal'
import {
  INITIAL_ECS_JOBS,
  type EcsJob,
  type JobStatus,
  type JobSubChatUpdate,
  type ModelConnectionConfig,
  type WorkflowCode,
} from './types/jobs'
import './App.css'

const STORAGE_KEY_CONNECTION = 'ecs_model_connection_v1'
const ROUTINE_DIGEST_MESSAGE_ID = 'routine-job-subchat-digest'

const SEEDED_MESSAGES: UIMessage[] = [
  {
    id: 'seed-assistant-1',
    role: 'assistant',
    parts: [
      {
        type: 'text',
        text: [
          '### Job Management Orchestrator (`PGlite` + `pg-boss`)',
          '',
          'This main chat is scoped exclusively to **Job Management Tools** (`createJob`, `updateJob`, `abortJob`, `removeJob`, `listJobs`) to create, update, abort, or remove single-purpose LLM jobs.',
          '',
          '- **In Progress (Yellow)**: `JOB-4091` (DEN · W4), `JOB-4094` (ATL · W3), `JOB-4096` (LAX · W7), `JOB-4085` (ORD · W1)',
          '- **Complete (Green)**: `JOB-4079` (DEN · W5 Gate Electrification)',
          '- **Failure (Red)**: `JOB-4088` (JFK · W2 ORAT Gate Hold)',
          '',
          'Expand any job on the right to view its **Single Specific Purpose** and **Job LLM Sub-Conversation**, or tell me what job you would like to create, update, abort, or remove.',
        ].join('\n'),
      },
    ],
  },
]

const PROMPT_STARTERS = [
  'Create a W1 job for JFK to audit AIP grant drawdown and DSCR coverage',
  'Update JOB-4091 purpose to verify Runway 34L surface radar cutover latency',
  'Abort JOB-4085 in pg-boss',
  'Remove JOB-4088 from the job queue',
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

export default function App() {
  const clientLogger: IClientLogger = createClientLogger('/api/logs/client')
  const apiClient: IEcsApiClient = createEcsApiClient(clientLogger)

  const [jobs, setJobs] = createSignal<EcsJob[]>(INITIAL_ECS_JOBS)
  const [selectedJobId, setSelectedJobId] = createSignal<string>(INITIAL_ECS_JOBS[0].id)
  const [expandedJobIds, setExpandedJobIds] = createSignal<Record<string, boolean>>({
    'JOB-4091': true,
  })
  const [statusFilter, setStatusFilter] = createSignal<'all' | JobStatus>('all')
  const [searchQuery, setSearchQuery] = createSignal('')
  const [inputPrompt, setInputPrompt] = createSignal('')
  const [attachSelectedJob, setAttachSelectedJob] = createSignal(true)
  const [routineUpdatesEnabled, setRoutineUpdatesEnabled] = createSignal(true)
  const [recentSubChatUpdates, setRecentSubChatUpdates] = createSignal<JobSubChatUpdate[]>([])
  const [mobileView, setMobileView] = createSignal<'split' | 'jobs' | 'chat'>('split')
  const [isDispatchModalOpen, setIsDispatchModalOpen] = createSignal(false)
  const [isSkillsModalOpen, setIsSkillsModalOpen] = createSignal(false)

  // Model Connection Settings State
  const [showConnectionBar, setShowConnectionBar] = createSignal(true)
  const [baseUrl, setBaseUrl] = createSignal('https://api.openai.com/v1')
  const [modelId, setModelId] = createSignal('gpt-4o-mini')
  const [apiToken, setApiToken] = createSignal('')
  const [serverHasToken, setServerHasToken] = createSignal(false)
  const [connectionSavedNotice, setConnectionSavedNotice] = createSignal('')

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
    onError: (err) => {
      clientLogger.error('client.chat_stream_error', { message: err.message })
    },
  })

  let messagesEndRef: HTMLDivElement | undefined

  const scrollToBottom = () => {
    if (messagesEndRef) {
      messagesEndRef.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }
  }

  /**
   * Routinely posts/updates a concise assistant progress message in the main chat
   * reflecting the latest sub-conversation messages from active jobs.
   */
  const pushRoutineSubChatUpdateToMainChat = (update: JobSubChatUpdate) => {
    if (!routineUpdatesEnabled()) return
    if (chatStatus() === 'submitted' || chatStatus() === 'streaming') return

    const nextUpdates = [
      update,
      ...recentSubChatUpdates().filter((u) => u.jobId !== update.jobId),
    ].slice(0, 4)
    setRecentSubChatUpdates(nextUpdates)

    const digestText = [
      `### Routine Job Chats Progress Digest (Sub-Conversation Sync)`,
      ``,
      ...nextUpdates.map(
        (u) =>
          `- **${u.jobId} (${u.code} · ${u.airportIata} · ${u.progress}%)** [${u.timestamp}]: ${u.subConversationMessage}`,
      ),
    ].join('\n')

    const currentMsgs = messages()
    const existingIdx = currentMsgs.findIndex(
      (m) => m.id === ROUTINE_DIGEST_MESSAGE_ID,
    )

    const digestMsg: UIMessage = {
      id: ROUTINE_DIGEST_MESSAGE_ID,
      role: 'assistant',
      parts: [{ type: 'text', text: digestText }],
    }

    if (existingIdx !== -1) {
      const updatedMsgs = [...currentMsgs]
      updatedMsgs[existingIdx] = digestMsg
      setMessages(updatedMsgs)
    } else {
      setMessages([...currentMsgs, digestMsg])
    }
  }

  onMount(() => {
    clientLogger.info('client.app_mounted')

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
      // Ignore storage restrictions
    }

    apiClient.fetchConnection().then((serverConn) => {
      if (!serverConn) return
      if (!localConnection?.baseUrl && serverConn.baseUrl) {
        setBaseUrl(serverConn.baseUrl)
      }
      if (!localConnection?.modelId && serverConn.modelId) {
        setModelId(serverConn.modelId)
      }
      setServerHasToken(Boolean(serverConn.hasToken))

      if (localConnection?.apiToken || localConnection?.baseUrl || localConnection?.modelId) {
        apiClient.saveConnection(connectionConfig()).then((updated) => {
          if (updated) setServerHasToken(Boolean(updated.hasToken))
        })
      }
    })

    apiClient.fetchJobs().then((serverJobs) => {
      if (serverJobs?.length) {
        setJobs(serverJobs)
      }
    })

    const unsubscribeSse = apiClient.subscribeJobsStream({
      onOpen: () => {},
      onJobsSync: (syncedJobs) => {
        setJobs(syncedJobs)
      },
      onJobChatUpdate: (update) => {
        pushRoutineSubChatUpdateToMainChat(update)
      },
      onError: () => {},
    })

    onCleanup(() => {
      unsubscribeSse()
    })
  })

  const saveConnectionSettings = async (e: SubmitEvent) => {
    e.preventDefault()
    const current = connectionConfig()
    try {
      window.localStorage.setItem(STORAGE_KEY_CONNECTION, JSON.stringify(current))
    } catch {
      // Ignore storage restrictions
    }

    const updated = await apiClient.saveConnection(current)
    if (updated) {
      setServerHasToken(Boolean(updated.hasToken))
      setConnectionSavedNotice('Synced with server')
    } else {
      setConnectionSavedNotice('Saved locally')
    }

    window.setTimeout(() => setConnectionSavedNotice(''), 2500)
  }

  const toggleJobExpanded = (jobId: string) => {
    setSelectedJobId(jobId)
    setExpandedJobIds((prev) => {
      const next = !prev[jobId]
      clientLogger.info('client.job_details_toggled', { jobId, expanded: next })
      return {
        ...prev,
        [jobId]: next,
      }
    })
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
        job.purpose.toLowerCase().includes(q) ||
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

    clientLogger.info('client.chat_message_submitted', {
      attachedJobId: attachSelectedJob() ? activeJob?.id : null,
      promptLength: trimmed.length,
    })

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
    clientLogger.info('client.job_ask_clicked', {
      jobId: job.id,
      status: job.status,
      progress: job.progress,
    })
    if (mobileView() === 'jobs') {
      setMobileView('chat')
    }
    await sendMessage(
      {
        text: `Inspect ${job.id} (${job.code} · ${job.title} at ${job.airportIata}) and summarize its single purpose and sub-conversation status.`,
      },
      buildRequestOptions(),
    )
    scrollToBottom()
  }

  const handleAbortJob = async (job: EcsJob, e: MouseEvent) => {
    e.stopPropagation()
    if (job.status !== 'in_progress') return

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

    const result = await apiClient.abortJob(job.id)
    if (result?.jobs) {
      setJobs(result.jobs)
    } else if (!result) {
      setJobs(previousJobs)
    }
  }

  const handleCreateJob = async (payload: {
    code: WorkflowCode
    airportIata: string
    title: string
    purpose: string
  }) => {
    const result = await apiClient.createJob(payload)
    if (result?.jobs) {
      setJobs(result.jobs)
    } else if (result?.job) {
      setJobs((prev) => [result.job!, ...prev])
    }
    if (result?.job?.id) {
      setSelectedJobId(result.job.id)
      setExpandedJobIds((prev) => ({ ...prev, [result.job!.id]: true }))
    }
    setIsDispatchModalOpen(false)
  }

  return (
    <div class="workspace-shell">
      <TopBar
        mobileView={mobileView()}
        totalJobs={jobCounts().total}
        showConnectionBar={showConnectionBar()}
        onSelectView={(v) => setMobileView(v)}
        onToggleConnectionBar={() => setShowConnectionBar((v) => !v)}
        onOpenSkillsModal={() => setIsSkillsModalOpen(true)}
        onOpenDispatchModal={() => setIsDispatchModalOpen(true)}
      />

      <div class="workspace-body">
        <main
          class={`chat-panel ${mobileView() === 'jobs' ? 'mobile-hidden' : ''}`}
          aria-label="ECS LLM Chat Window"
        >
          <div class="chat-header">
            <div class="chat-header-info">
              <h1 class="chat-title">Job Management Orchestrator Chat</h1>
              <p class="chat-subtitle">
                Tools: createJob · updateJob · abortJob · removeJob · listJobs ·{' '}
                <span class="tabular-nums">
                  {hasActiveToken()
                    ? `Connected (${modelId() || 'gpt-4o-mini'})`
                    : `PGlite + pg-boss Engine (${modelId() || 'gpt-4o-mini'})`}
                </span>
              </p>
            </div>

            <div class="chat-header-actions">
              <button
                type="button"
                class="btn-secondary"
                aria-pressed={routineUpdatesEnabled()}
                onClick={() => setRoutineUpdatesEnabled((v) => !v)}
              >
                {routineUpdatesEnabled()
                  ? 'Routine Updates: On'
                  : 'Routine Updates: Off'}
              </button>
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

          <Show when={showConnectionBar()}>
            <ConnectionBar
              baseUrl={baseUrl()}
              modelId={modelId()}
              apiToken={apiToken()}
              hasActiveToken={hasActiveToken()}
              savedNotice={connectionSavedNotice()}
              onBaseUrlChange={setBaseUrl}
              onModelIdChange={setModelId}
              onApiTokenChange={setApiToken}
              onSave={saveConnectionSettings}
            />
          </Show>

          <div class="chat-messages" role="log" aria-live="polite">
            <Show
              when={messages().length > 0}
              fallback={
                <div class="empty-state">
                  <p>
                    No messages in the current session. Use a prompt starter below to create,
                    update, abort, or remove jobs in PGlite and pg-boss.
                  </p>
                  <button
                    type="button"
                    class="btn-secondary"
                    onClick={() => setMessages(SEEDED_MESSAGES)}
                  >
                    Restore Orchestrator Brief
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
                          : message.id === ROUTINE_DIGEST_MESSAGE_ID
                            ? 'Job Sub-Conversation Monitor (pg-boss)'
                            : 'Job Management Orchestrator'}
                      </span>
                      <span class="tabular-nums">
                        {message.role === 'assistant'
                          ? `PGlite · pg-boss · ${modelId() || 'gpt-4o-mini'}`
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

            <div class="prompt-starters" aria-label="Suggested job management commands">
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
                    Attach selected job context (
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
                  placeholder="Tell the orchestrator what job to create, update, abort, or remove (e.g. 'Create a W3 job for LAX to evaluate biometric e-gates')…"
                  aria-label="Message the Job Management Orchestrator"
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

        <JobsPanel
          jobs={filteredJobs()}
          selectedJobId={selectedJob()?.id ?? ''}
          expandedJobIds={expandedJobIds()}
          statusFilter={statusFilter()}
          searchQuery={searchQuery()}
          counts={jobCounts()}
          hiddenOnMobile={mobileView() === 'chat'}
          onSearchChange={setSearchQuery}
          onFilterChange={setStatusFilter}
          onToggleExpand={toggleJobExpanded}
          onAskAboutJob={handleAskAboutJob}
          onAbortJob={handleAbortJob}
        />
      </div>

      <Show when={isDispatchModalOpen()}>
        <DispatchJobModal
          onClose={() => setIsDispatchModalOpen(false)}
          onSubmit={handleCreateJob}
        />
      </Show>

      <Show when={isSkillsModalOpen()}>
        <SkillsCatalogModal
          onClose={() => setIsSkillsModalOpen(false)}
          onDispatchSkillJob={async (payload) => {
            setIsSkillsModalOpen(false)
            await handleCreateJob(payload)
          }}
        />
      </Show>
    </div>
  )
}
