import type {
  EcsJob,
  JobSubChatUpdate,
  ModelConnectionConfig,
  WorkflowCode,
} from '../types/jobs'
import type { IClientLogger } from '../lib/logger'

interface PublicConnectionStatus {
  baseUrl: string
  modelId: string
  hasToken: boolean
  tokenPreview: string
}

interface CreateJobPayload {
  code: WorkflowCode
  airportIata: string
  title: string
  purpose?: string
}

export interface IEcsApiClient {
  fetchJobs(): Promise<EcsJob[] | null>
  createJob(payload: CreateJobPayload): Promise<{ job?: EcsJob; jobs?: EcsJob[] } | null>
  abortJob(jobId: string): Promise<{ job?: EcsJob; jobs?: EcsJob[] } | null>
  fetchConnection(): Promise<PublicConnectionStatus | null>
  saveConnection(config: ModelConnectionConfig): Promise<PublicConnectionStatus | null>
  subscribeJobsStream(handlers: {
    onOpen: () => void
    onJobsSync: (jobs: EcsJob[]) => void
    onJobChatUpdate: (update: JobSubChatUpdate) => void
    onError: () => void
  }): () => void
}

class HttpEcsApiClient implements IEcsApiClient {
  private readonly logger: IClientLogger

  constructor(logger: IClientLogger) {
    this.logger = logger
  }

  async fetchJobs(): Promise<EcsJob[] | null> {
    try {
      const res = await fetch('/api/jobs')
      if (!res.ok) return null
      const data = (await res.json()) as { jobs?: EcsJob[] }
      this.logger.info('client.jobs_fetched', { count: data.jobs?.length ?? 0 })
      return data.jobs ?? null
    } catch (err) {
      this.logger.error('client.jobs_fetch_failed', {
        error: err instanceof Error ? err.message : String(err),
      })
      return null
    }
  }

  async createJob(
    payload: CreateJobPayload,
  ): Promise<{ job?: EcsJob; jobs?: EcsJob[] } | null> {
    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) return null
      const data = (await res.json()) as { job?: EcsJob; jobs?: EcsJob[] }
      this.logger.info('client.job_dispatched', {
        jobId: data.job?.id,
        code: payload.code,
        airportIata: payload.airportIata,
      })
      return data
    } catch (err) {
      this.logger.error('client.job_dispatch_failed', {
        error: err instanceof Error ? err.message : String(err),
      })
      return null
    }
  }

  async abortJob(
    jobId: string,
  ): Promise<{ job?: EcsJob; jobs?: EcsJob[] } | null> {
    try {
      const res = await fetch(`/api/jobs/${jobId}/abort`, {
        method: 'POST',
      })
      if (!res.ok) return null
      const data = (await res.json()) as { job?: EcsJob; jobs?: EcsJob[] }
      this.logger.warn('client.job_aborted', { jobId })
      return data
    } catch (err) {
      this.logger.error('client.job_abort_failed', {
        jobId,
        error: err instanceof Error ? err.message : String(err),
      })
      return null
    }
  }

  async fetchConnection(): Promise<PublicConnectionStatus | null> {
    try {
      const res = await fetch('/api/connection')
      if (!res.ok) return null
      return (await res.json()) as PublicConnectionStatus
    } catch {
      return null
    }
  }

  async saveConnection(
    config: ModelConnectionConfig,
  ): Promise<PublicConnectionStatus | null> {
    try {
      const res = await fetch('/api/connection', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      if (!res.ok) return null
      const updated = (await res.json()) as PublicConnectionStatus
      this.logger.info('client.connection_saved', {
        baseUrl: updated.baseUrl,
        modelId: updated.modelId,
        hasToken: updated.hasToken,
      })
      return updated
    } catch (err) {
      this.logger.error('client.connection_save_failed', {
        error: err instanceof Error ? err.message : String(err),
      })
      return null
    }
  }

  subscribeJobsStream(handlers: {
    onOpen: () => void
    onJobsSync: (jobs: EcsJob[]) => void
    onJobChatUpdate: (update: JobSubChatUpdate) => void
    onError: () => void
  }): () => void {
    const eventSource = new EventSource('/api/jobs/stream')

    eventSource.onopen = () => {
      this.logger.info('client.sse_connected')
      handlers.onOpen()
    }

    eventSource.addEventListener('jobs:sync', (event) => {
      try {
        const parsed = JSON.parse((event as MessageEvent).data) as { jobs?: EcsJob[] }
        if (Array.isArray(parsed.jobs)) {
          handlers.onJobsSync(parsed.jobs)
        }
      } catch {
        // Ignore malformed frame
      }
    })

    eventSource.addEventListener('job:chat_update', (event) => {
      try {
        const parsed = JSON.parse((event as MessageEvent).data) as JobSubChatUpdate
        if (parsed?.jobId && parsed?.subConversationMessage) {
          handlers.onJobChatUpdate(parsed)
        }
      } catch {
        // Ignore malformed frame
      }
    })

    eventSource.onerror = () => {
      handlers.onError()
    }

    return () => {
      eventSource.close()
    }
  }
}

export function createEcsApiClient(logger: IClientLogger): IEcsApiClient {
  return new HttpEcsApiClient(logger)
}
