import { For, Show } from 'solid-js'
import type { EcsJob, JobStatus } from '../types/jobs'

interface JobsPanelProps {
  jobs: EcsJob[]
  selectedJobId: string
  expandedJobIds: Record<string, boolean>
  statusFilter: 'all' | JobStatus
  searchQuery: string
  counts: {
    total: number
    inProgress: number
    completed: number
    failed: number
  }
  hiddenOnMobile: boolean
  onSearchChange: (q: string) => void
  onFilterChange: (filter: 'all' | JobStatus) => void
  onToggleExpand: (jobId: string) => void
  onAskAboutJob: (job: EcsJob, e: MouseEvent) => void
  onAbortJob: (job: EcsJob, e: MouseEvent) => void
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

export function JobsPanel(props: JobsPanelProps) {
  return (
    <aside
      class={`jobs-panel ${props.hiddenOnMobile ? 'mobile-hidden' : ''}`}
      aria-label="Ongoing ECS Jobs"
    >
      <div class="panel-header">
        <div class="panel-title-row">
          <h2 class="panel-title">Ongoing Jobs (PGlite · pg-boss)</h2>
          <span class="panel-summary-meta tabular-nums" style={{ margin: 0 }}>
            <span>{props.counts.inProgress} active</span>
            <span aria-hidden="true">·</span>
            <span>{props.counts.completed} done</span>
            <span aria-hidden="true">·</span>
            <span>{props.counts.failed} failed</span>
          </span>
        </div>
        <div class="panel-summary-meta">
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
          value={props.searchQuery}
          onInput={(e) => props.onSearchChange(e.currentTarget.value)}
        />

        <div class="segmented-filters" role="tablist" aria-label="Filter jobs by status">
          <button
            type="button"
            role="tab"
            aria-selected={props.statusFilter === 'all'}
            class={`filter-tab ${props.statusFilter === 'all' ? 'is-active' : ''}`}
            onClick={() => props.onFilterChange('all')}
          >
            All ({props.counts.total})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={props.statusFilter === 'in_progress'}
            class={`filter-tab ${props.statusFilter === 'in_progress' ? 'is-active' : ''}`}
            onClick={() => props.onFilterChange('in_progress')}
          >
            In Progress ({props.counts.inProgress})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={props.statusFilter === 'completed'}
            class={`filter-tab ${props.statusFilter === 'completed' ? 'is-active' : ''}`}
            onClick={() => props.onFilterChange('completed')}
          >
            Complete ({props.counts.completed})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={props.statusFilter === 'failed'}
            class={`filter-tab ${props.statusFilter === 'failed' ? 'is-active' : ''}`}
            onClick={() => props.onFilterChange('failed')}
          >
            Failure ({props.counts.failed})
          </button>
        </div>
      </div>

      <div class="jobs-list" role="list">
        <Show
          when={props.jobs.length > 0}
          fallback={
            <div class="empty-state">
              <p>No ongoing jobs match your current filter.</p>
              <button
                type="button"
                class="btn-secondary"
                onClick={() => {
                  props.onFilterChange('all')
                  props.onSearchChange('')
                }}
              >
                Reset Filters
              </button>
            </div>
          }
        >
          <For each={props.jobs}>
            {(job) => {
              const isExpanded = () => Boolean(props.expandedJobIds[job.id])
              return (
                <div
                  role="listitem"
                  class={`job-item ${props.selectedJobId === job.id ? 'is-selected' : ''}`}
                >
                  <div class="job-item-bar">
                    <button
                      type="button"
                      class="job-toggle-btn"
                      aria-expanded={isExpanded()}
                      onClick={() => props.onToggleExpand(job.id)}
                    >
                      <svg
                        class={`job-chevron ${isExpanded() ? 'is-open' : ''}`}
                        viewBox="0 0 16 16"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        aria-hidden="true"
                      >
                        <path
                          d="M6 4l4 4-4 4"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        />
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
                        title={`Ask job manager about ${job.id}`}
                        aria-label={`Ask assistant about ${job.id}`}
                        onClick={(e) => props.onAskAboutJob(job, e)}
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
                        onClick={(e) => props.onAbortJob(job, e)}
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
                          <path
                            d="M5.75 5.75l4.5 4.5M10.25 5.75l-4.5 4.5"
                            stroke-linecap="round"
                          />
                        </svg>
                        <span>Abort</span>
                      </button>
                    </div>
                  </div>

                  <div class="job-mini-progress-track" aria-hidden="true">
                    <div
                      class={`job-mini-progress-fill status-${job.status}`}
                      style={{
                        transform: `scaleX(${Math.max(0.03, job.progress / 100)})`,
                      }}
                    />
                  </div>

                  <Show when={isExpanded()}>
                    <div class="job-details-collapse">
                      <div class="job-details-grid tabular-nums">
                        <span>State: {job.lifecycleState}</span>
                        <span>·</span>
                        <span>
                          {job.keyMetricLabel}: {job.keyMetricValue}
                        </span>
                        <span>·</span>
                        <span>ETA: {job.eta}</span>
                      </div>

                      <div class="job-purpose-box">
                        <span class="job-section-label">Single Purpose:</span>{' '}
                        <span>{job.purpose}</span>
                      </div>

                      <div class="job-subchat-container" aria-label={`${job.id} sub-conversation`}>
                        <div class="job-section-label">Job LLM Sub-Conversation</div>
                        <ul class="job-subchat-list">
                          <For each={job.chatHistory}>
                            {(msg) => (
                              <li class={`job-subchat-item role-${msg.role}`}>
                                <div class="job-subchat-meta tabular-nums">
                                  <span>
                                    {msg.role === 'user' ? 'Job Purpose' : 'Job Agent'}
                                  </span>
                                  <span>{msg.timestamp}</span>
                                </div>
                                <div class="job-subchat-text">{msg.content}</div>
                              </li>
                            )}
                          </For>
                        </ul>
                      </div>
                    </div>
                  </Show>
                </div>
              )
            }}
          </For>
        </Show>
      </div>
    </aside>
  )
}
