import { createSignal, For, Show } from 'solid-js'
import type { EcsJob, JobPdfReportMeta } from '../types/jobs'

interface JobConversationModalProps {
  job: EcsJob
  onClose: () => void
  onSendMessage: (jobId: string, message: string) => Promise<void>
  onDownloadReport: (job: EcsJob, reportCode?: JobPdfReportMeta['reportCode']) => void
}

export function JobConversationModal(props: JobConversationModalProps) {
  const [promptText, setPromptText] = createSignal('')
  const [isSending, setIsSending] = createSignal(false)

  const handleSubmit = async (e: SubmitEvent) => {
    e.preventDefault()
    const trimmed = promptText().trim()
    if (!trimmed || isSending()) return
    setIsSending(true)
    try {
      await props.onSendMessage(props.job.id, trimmed)
      setPromptText('')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div
      class="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="job-conversation-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) props.onClose()
      }}
    >
      <div class="modal-card modal-card-wide">
        <div class="modal-header">
          <div>
            <h2 id="job-conversation-modal-title" class="modal-title">
              Job Conversation & PDF Reports · {props.job.id} ({props.job.airportIata})
            </h2>
            <p class="modal-subtitle tabular-nums">
              {props.job.code} · {props.job.workflowName} · {props.job.ecsSystem} · State:{' '}
              {props.job.lifecycleState} ({props.job.progress}%)
            </p>
          </div>
          <div class="job-modal-header-actions">
            <button
              type="button"
              class="btn-primary"
              onClick={() => props.onDownloadReport(props.job)}
            >
              Download Primary PDF Report
            </button>
            <button
              type="button"
              class="btn-secondary"
              onClick={() => props.onClose()}
            >
              Close
            </button>
          </div>
        </div>

        <div class="job-conversation-modal-body">
          <div class="job-purpose-box">
            <span class="job-section-label">Single Specific Purpose:</span>{' '}
            <span>{props.job.purpose}</span>
          </div>

          <div class="job-reports-bar">
            <div class="job-section-label">
              Generated PDF Assessment Reports (Standard U.S. Templates)
            </div>
            <div class="job-reports-list">
              <Show
                when={(props.job.reports?.length ?? 0) > 0}
                fallback={
                  <button
                    type="button"
                    class="icon-action-btn btn-pdf"
                    onClick={() => props.onDownloadReport(props.job)}
                  >
                    <span>Download {props.job.id} Assessment PDF</span>
                  </button>
                }
              >
                <For each={props.job.reports}>
                  {(rep) => (
                    <button
                      type="button"
                      class="report-download-chip tabular-nums"
                      title={`Download ${rep.title}`}
                      onClick={() => props.onDownloadReport(props.job, rep.reportCode)}
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
                          d="M8 2.5v7.5m0 0L5.25 7.25M8 10l2.75-2.75M3 12.5h10"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        />
                      </svg>
                      <span>{rep.reportCode} PDF</span>
                      <span class="report-chip-sub">({rep.fileName})</span>
                    </button>
                  )}
                </For>
              </Show>
            </div>
          </div>

          <div class="job-conversation-transcript">
            <div class="job-section-label">
              Full Job LLM Sub-Conversation ({props.job.chatHistory.length} messages)
            </div>
            <ul class="job-subchat-list job-subchat-list-modal">
              <For each={props.job.chatHistory}>
                {(msg) => (
                  <li class={`job-subchat-item role-${msg.role}`}>
                    <div class="job-subchat-meta tabular-nums">
                      <span>
                        {msg.role === 'user'
                          ? 'Operator / Job Mandate'
                          : 'Single-Purpose Job Agent'}
                      </span>
                      <span>{msg.timestamp}</span>
                    </div>
                    <div class="job-subchat-text">{msg.content}</div>
                  </li>
                )}
              </For>
            </ul>
          </div>

          <form class="job-conversation-form" onSubmit={handleSubmit}>
            <input
              type="text"
              class="conn-input"
              placeholder={`Send a direct instruction to ${props.job.id} (${props.job.ecsSystem}) and refresh its PDF report…`}
              aria-label={`Message ${props.job.id} sub-conversation`}
              value={promptText()}
              onInput={(e) => setPromptText(e.currentTarget.value)}
            />
            <button
              type="submit"
              class="btn-primary"
              disabled={isSending() || !promptText().trim()}
            >
              {isSending() ? 'Running Tool…' : 'Send to Job Agent'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
