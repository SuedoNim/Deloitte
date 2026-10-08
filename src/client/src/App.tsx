import { createMemo, createSignal, For, onCleanup, onMount, Show } from 'solid-js'
import type { UIMessage } from 'ai'
import { createVercelChat, getMessageText } from './lib/chat'
import { createClientLogger, type IClientLogger } from './lib/logger'
import { createEcsApiClient, type IEcsApiClient } from './services/api-client'
import { TopBar } from './components/TopBar'
import { ConnectionBar } from './components/ConnectionBar'
import { JobsPanel } from './components/JobsPanel'
import { SkillsCatalogModal } from './components/SkillsCatalogModal'
import { JobConversationModal } from './components/JobConversationModal'
import {
  type AiProviderType,
  type EcsJob,
  type JobStatus,
  type JobSubChatUpdate,
  type ModelConnectionConfig,
  type SkillCatalogEntry,
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
          '### Welcome to the Deloitte U.S. Airport Modernization & Investment Intelligence Orchestrator',
          '',
          'I am your executive co-pilot for **U.S. Airport Modernization Advisory Services**. Through this chat, I can explain our specialized airport engineering capabilities and orchestrate **Specialist Airport Modernization Jobs (`W1`–`W7`)** in `PGlite` and `pg-boss`:',
          '',
          '- **W1 · Federal Grant, Capital Stack & Municipal Bond Advisory**: FAA AIP/BIL ATP grants, PFCs, TIFIA loans, and Senior DSCR / CPE modeling (`R1`, `R4`, `R10`)',
          '- **W2 · Capital Program Delivery, NEPA & ACRP 164 ORAT**: Benefit-Cost Analysis, Earned Value (`CPI`/`SPI`), and Operational Readiness trials (`R2`, `R3`, `R6`)',
          '- **W3 · Passenger Flow, TSA Touchless ID & CBP Biometric Processing**: M/M/c Erlang-C checkpoint wait-time modeling and BHS throughput (`R5`, `R7`, `R8`)',
          '- **W4 · NAS Airspace, NextGen & BNATCS Surface Cutover**: FAA surface radar/tower cutover safety and ASPM delay-minute savings (`R3`, `R6`, `R8`)',
          '- **W5 · Decarbonization, FAA VALE, ZEV & EPA eGRID Sustainability**: Scope 1 & 2 emissions, 400Hz PCA gate electrification, and Part 150 noise (`R9`)',
          '- **W6 · Infratech Maturity, Digital Twin & Cyber-Physical ROI**: 25-capability Infratech diagnostic and NPV/IRR valuation (`R4`, `R7`)',
          '- **W7 · Realtime Online Aviation Telemetry & U.S. Hub Benchmarking**: Live queries across FAA/DOT/EPA/OpenSky/Weather portals (`R1`–`R10`)',
          '',
          'Ask me **"What can your Airport Modernization jobs do?"**, or ask me to launch a job for **`JFK`**, **`DEN`**, **`LAX`**, **`ORD`**, **`ATL`**, **`DFW`**, **`DCA`**, **`SDF`**, or **`GEG`**. Each job agent uses its **Live Online Data Tool** (`fetchOnlineAirportLiveData`) and **Domain Calculation Tools**, and only invokes its **PDF Report Tool** (`generatePdfAssessmentReport`) when a formal report is required.',
        ].join('\n'),
      },
    ],
  },
]

const BASE_PROMPT_STARTERS = [
  'What can you and your Airport Modernization jobs do for our airport?',
  'Create a W1 job for ORD to audit AIP grant drawdown and Senior DSCR coverage and generate the R10 report',
  'Create a W3 job for ATL to evaluate TSA Touchless ID biometric checkpoint wait times and generate the R7 report',
  'Create a W5 job for LAX to calculate EPA eGRID emissions and 400Hz gate electrification savings',
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

  const [jobs, setJobs] = createSignal<EcsJob[]>([])
  const [selectedJobId, setSelectedJobId] = createSignal<string>('')
  const [expandedJobIds, setExpandedJobIds] = createSignal<Record<string, boolean>>({})
  const [skillsCatalog, setSkillsCatalog] = createSignal<SkillCatalogEntry[]>([])
  const [statusFilter, setStatusFilter] = createSignal<'all' | JobStatus>('all')
  const [searchQuery, setSearchQuery] = createSignal('')
  const [inputPrompt, setInputPrompt] = createSignal('')
  const [attachSelectedJob, setAttachSelectedJob] = createSignal(false)
  const [routineUpdatesEnabled, setRoutineUpdatesEnabled] = createSignal(true)
  const [recentSubChatUpdates, setRecentSubChatUpdates] = createSignal<JobSubChatUpdate[]>([])
  const [mobileView, setMobileView] = createSignal<'split' | 'jobs' | 'chat'>('split')
  const [isSkillsModalOpen, setIsSkillsModalOpen] = createSignal(false)
  const [conversationModalJobId, setConversationModalJobId] = createSignal<string | null>(
    null,
  )

  // Model Connection & Config File Settings State
  const [showConnectionBar, setShowConnectionBar] = createSignal(true)
  const [serverPort, setServerPort] = createSignal<number>(3000)
  const [configFileName, setConfigFileName] = createSignal<string>('config.json')
  const [provider, setProvider] = createSignal<AiProviderType>('gemini')
  const [baseUrl, setBaseUrl] = createSignal(
    'https://generativelanguage.googleapis.com',
  )
  const [modelId, setModelId] = createSignal('gemini-3.8-flash')
  const [serverHasToken, setServerHasToken] = createSignal(false)
  const [connectionSavedNotice, setConnectionSavedNotice] = createSignal('')

  const connectionConfig = createMemo<ModelConnectionConfig>(() => ({
    provider: provider(),
    baseUrl: baseUrl().trim(),
    modelId: modelId().trim() || 'gemini-3.8-flash',
    apiToken: '',
    port: serverPort(),
  }))

  const hasActiveToken = createMemo(() => serverHasToken())

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

    clientLogger.debug('client.routine_digest_updated', {
      jobId: update.jobId,
      code: update.code,
      airportIata: update.airportIata,
      progress: update.progress,
    })
  }

  onMount(() => {
    clientLogger.info('client.app_mounted')

    apiClient.fetchConnection().then((serverConn) => {
      if (!serverConn) return
      if (typeof serverConn.port === 'number' && serverConn.port > 0) {
        setServerPort(serverConn.port)
      }
      if (serverConn.configFile) {
        setConfigFileName(serverConn.configFile)
      }
      if (serverConn.provider === 'gemini' || serverConn.provider === 'openai') {
        setProvider(serverConn.provider)
      }
      if (serverConn.baseUrl) {
        setBaseUrl(serverConn.baseUrl)
      }
      if (serverConn.modelId) {
        setModelId(serverConn.modelId)
      }
      setServerHasToken(Boolean(serverConn.hasToken))

      try {
        window.localStorage.setItem(
          STORAGE_KEY_CONNECTION,
          JSON.stringify({
            provider: serverConn.provider,
            baseUrl: serverConn.baseUrl,
            modelId: serverConn.modelId,
            port: serverConn.port,
          }),
        )
      } catch {
        // Ignore storage restrictions
      }
    })

    apiClient.fetchJobs().then((serverJobs) => {
      if (serverJobs) {
        setJobs(serverJobs)
        if (serverJobs[0] && !selectedJobId()) {
          setSelectedJobId(serverJobs[0].id)
        }
      }
    })

    apiClient.fetchSkillsCatalog().then((catalog) => {
      if (catalog?.skills) {
        setSkillsCatalog(catalog.skills)
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

  const saveConnectionSettings = async (e?: SubmitEvent) => {
    e?.preventDefault()
    const current = connectionConfig()
    try {
      window.localStorage.setItem(STORAGE_KEY_CONNECTION, JSON.stringify(current))
    } catch {
      // Ignore storage restrictions
    }

    const updated = await apiClient.saveConnection(current)
    if (updated) {
      if (typeof updated.port === 'number' && updated.port > 0) {
        setServerPort(updated.port)
      }
      if (updated.configFile) {
        setConfigFileName(updated.configFile)
      }
      if (updated.provider === 'gemini' || updated.provider === 'openai') {
        setProvider(updated.provider)
      }
      if (updated.baseUrl) setBaseUrl(updated.baseUrl)
      if (updated.modelId) setModelId(updated.modelId)
      setServerHasToken(Boolean(updated.hasToken))
      setConnectionSavedNotice(`Synchronized with ${updated.configFile || 'config.json'}`)
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

  const activeConversationJob = createMemo(() => {
    const id = conversationModalJobId()
    if (!id) return null
    return jobs().find((j) => j.id === id) ?? null
  })

  const handleViewConversation = (job: EcsJob, e: MouseEvent) => {
    e.stopPropagation()
    setSelectedJobId(job.id)
    setConversationModalJobId(job.id)
    clientLogger.info('client.job_conversation_modal_opened', {
      jobId: job.id,
      code: job.code,
      airportIata: job.airportIata,
    })
  }

  const handleDownloadPdfReport = (
    job: EcsJob,
    e?: MouseEvent,
    reportCode?: string,
  ) => {
    e?.stopPropagation()
    const code = reportCode || job.reports?.[0]?.reportCode
    const url = apiClient.getJobPdfDownloadUrl(job.id, code)
    const link = document.createElement('a')
    link.href = url
    link.download = `${job.id}-${job.airportIata}-${code || 'Report'}.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleSendJobConversationMessage = async (
    jobId: string,
    message: string,
  ) => {
    const result = await apiClient.sendJobConversationMessage(jobId, message)
    if (result?.jobs) {
      setJobs(result.jobs)
    } else if (result?.job) {
      setJobs((prev) =>
        prev.map((j) => (j.id === result.job!.id ? result.job! : j)),
      )
    }
  }

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

  const handleRemoveJob = async (job: EcsJob, e: MouseEvent) => {
    e.stopPropagation()
    const previousJobs = jobs()
    setJobs((prev) => prev.filter((item) => item.id !== job.id))
    if (conversationModalJobId() === job.id) {
      setConversationModalJobId(null)
    }

    const result = await apiClient.removeJob(job.id)
    if (result?.jobs) {
      setJobs(result.jobs)
    } else if (!result) {
      setJobs(previousJobs)
    }
  }

  const promptStarters = createMemo(() => {
    const active = selectedJob()
    if (!active) return BASE_PROMPT_STARTERS
    return [
      BASE_PROMPT_STARTERS[0],
      `Update ${active.id} purpose to evaluate ${active.airportIata} peak-hour capacity and DSCR`,
      `Abort ${active.id}`,
      `Inspect ${active.id} (${active.code} · ${active.airportIata}) and summarize its sub-conversation`,
    ]
  })

  return (
    <div class="workspace-shell">
      <TopBar
        mobileView={mobileView()}
        totalJobs={jobCounts().total}
        showConnectionBar={showConnectionBar()}
        onSelectView={(v) => {
          setMobileView(v)
          clientLogger.info('client.view_changed', { view: v })
        }}
        onToggleConnectionBar={() => {
          const next = !showConnectionBar()
          setShowConnectionBar(next)
          clientLogger.info('client.connection_bar_toggled', { open: next })
        }}
        onOpenSkillsModal={() => {
          setIsSkillsModalOpen(true)
          clientLogger.info('client.skills_modal_opened')
        }}
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
                onClick={() => {
                  const next = !routineUpdatesEnabled()
                  setRoutineUpdatesEnabled(next)
                  clientLogger.info('client.routine_updates_toggled', {
                    enabled: next,
                  })
                }}
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
              port={serverPort()}
              configFile={configFileName()}
              provider={provider()}
              baseUrl={baseUrl()}
              modelId={modelId()}
              hasActiveToken={hasActiveToken()}
              savedNotice={connectionSavedNotice()}
              onPortChange={setServerPort}
              onProviderChange={setProvider}
              onBaseUrlChange={setBaseUrl}
              onModelIdChange={setModelId}
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
              <For each={promptStarters()}>
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
          onViewConversation={handleViewConversation}
          onDownloadPdfReport={handleDownloadPdfReport}
          onAskAboutJob={handleAskAboutJob}
          onAbortJob={handleAbortJob}
          onRemoveJob={handleRemoveJob}
        />
      </div>

      <Show when={activeConversationJob()}>
        {(job) => (
          <JobConversationModal
            job={job()}
            onClose={() => {
              setConversationModalJobId(null)
              clientLogger.info('client.job_conversation_modal_closed')
            }}
            onSendMessage={handleSendJobConversationMessage}
            onDownloadReport={(targetJob, reportCode) =>
              handleDownloadPdfReport(targetJob, undefined, reportCode)
            }
          />
        )}
      </Show>

      <Show when={isSkillsModalOpen()}>
        <SkillsCatalogModal
          skills={skillsCatalog()}
          onClose={() => {
            setIsSkillsModalOpen(false)
            clientLogger.info('client.skills_modal_closed')
          }}
          onSelectSkill={(skillId, workflowCode) => {
            clientLogger.info('client.skill_selected', { skillId, workflowCode })
          }}
        />
      </Show>
    </div>
  )
}
