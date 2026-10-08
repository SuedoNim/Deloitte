import type {
  AiProviderType,
  EcsJob,
  JobSubChatUpdate,
  ModelConnectionConfig,
  SkillCatalogSummary,
} from '../types/jobs'
import type { IClientLogger } from '../lib/logger'

interface PublicConnectionStatus {
  provider: AiProviderType
  baseUrl: string
  modelId: string
  hasToken: boolean
  tokenPreview: string
  port: number
  configFile: string
}

interface IJobsApiClient {
  fetchJobs(): Promise<EcsJob[] | null>
  abortJob(jobId: string): Promise<{ job?: EcsJob; jobs?: EcsJob[] } | null>
  removeJob(
    jobId: string,
  ): Promise<{ removed?: boolean; jobId?: string; jobs?: EcsJob[] } | null>
  sendJobConversationMessage(
    jobId: string,
    message: string,
  ): Promise<{ job?: EcsJob; jobs?: EcsJob[] } | null>
  getJobPdfDownloadUrl(jobId: string, reportCode?: string): string
  fetchSkillsCatalog(): Promise<SkillCatalogSummary | null>
  subscribeJobsStream(handlers: {
    onOpen: () => void
    onJobsSync: (jobs: EcsJob[]) => void
    onJobChatUpdate: (update: JobSubChatUpdate) => void
    onError: () => void
  }): () => void
}

interface IConnectionApiClient {
  fetchConnection(): Promise<PublicConnectionStatus | null>
  saveConnection(config: ModelConnectionConfig): Promise<PublicConnectionStatus | null>
}

export interface IEcsApiClient extends IJobsApiClient, IConnectionApiClient {}

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

  async removeJob(
    jobId: string,
  ): Promise<{ removed?: boolean; jobId?: string; jobs?: EcsJob[] } | null> {
    try {
      const res = await fetch(`/api/jobs/${encodeURIComponent(jobId)}`, {
        method: 'DELETE',
      })
      if (!res.ok) return null
      const data = (await res.json()) as {
        removed?: boolean
        jobId?: string
        jobs?: EcsJob[]
      }
      this.logger.info('client.job_removed', { jobId })
      return data
    } catch (err) {
      this.logger.error('client.job_remove_failed', {
        jobId,
        error: err instanceof Error ? err.message : String(err),
      })
      return null
    }
  }

  async fetchSkillsCatalog(): Promise<SkillCatalogSummary | null> {
    try {
      const res = await fetch('/api/skills')
      if (!res.ok) return null
      const data = (await res.json()) as SkillCatalogSummary
      this.logger.info('client.skills_catalog_fetched', {
        skillsCount: data.skills?.length ?? 0,
      })
      return data
    } catch (err) {
      this.logger.error('client.skills_catalog_fetch_failed', {
        error: err instanceof Error ? err.message : String(err),
      })
      return null
    }
  }

  async sendJobConversationMessage(
    jobId: string,
    message: string,
  ): Promise<{ job?: EcsJob; jobs?: EcsJob[] } | null> {
    try {
      const res = await fetch(`/api/jobs/${encodeURIComponent(jobId)}/conversation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      })
      if (!res.ok) return null
      const data = (await res.json()) as { job?: EcsJob; jobs?: EcsJob[] }
      this.logger.info('client.job_conversation_message_sent', {
        jobId,
        messageLength: message.length,
      })
      return data
    } catch (err) {
      this.logger.error('client.job_conversation_message_failed', {
        jobId,
        error: err instanceof Error ? err.message : String(err),
      })
      return null
    }
  }

  getJobPdfDownloadUrl(jobId: string, reportCode?: string): string {
    const query = reportCode
      ? `?reportCode=${encodeURIComponent(reportCode)}`
      : ''
    const url = `/api/jobs/${encodeURIComponent(jobId)}/report.pdf${query}`
    this.logger.info('client.job_pdf_report_downloaded', {
      jobId,
      reportCode: reportCode ?? 'primary',
      url,
    })
    return url
  }

  async fetchConnection(): Promise<PublicConnectionStatus | null> {
    try {
      const res = await fetch('/api/connection')
      if (!res.ok) return null
      const status = (await res.json()) as PublicConnectionStatus
      this.logger.info('client.connection_fetched', {
        baseUrl: status.baseUrl,
        modelId: status.modelId,
        hasToken: status.hasToken,
      })
      return status
    } catch (err) {
      this.logger.error('client.connection_fetch_failed', {
        error: err instanceof Error ? err.message : String(err),
      })
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
          this.logger.debug('client.sse_subchat_update_received', {
            jobId: parsed.jobId,
            code: parsed.code,
            progress: parsed.progress,
          })
          handlers.onJobChatUpdate(parsed)
        }
      } catch {
        // Ignore malformed frame
      }
    })

    eventSource.onerror = () => {
      this.logger.warn('client.sse_stream_reconnecting')
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
