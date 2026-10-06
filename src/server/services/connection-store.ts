import type { ModelConnectionConfig } from '../../client/src/types/jobs.ts'
import type { ILogger } from '../logging/logger.ts'

export interface PublicConnectionStatus {
  baseUrl: string
  modelId: string
  hasToken: boolean
  tokenPreview: string
}

export interface IConnectionStore {
  getPublicStatus(): PublicConnectionStatus
  update(patch: Partial<ModelConnectionConfig>): PublicConnectionStatus
  resolveForRequest(
    override?: Partial<ModelConnectionConfig>,
    headers?: { apiToken?: string; baseUrl?: string; modelId?: string },
  ): ModelConnectionConfig
}

export class InMemoryConnectionStore implements IConnectionStore {
  private config: ModelConnectionConfig
  private readonly logger: ILogger

  constructor(logger: ILogger, initial?: Partial<ModelConnectionConfig>) {
    this.logger = logger
    this.config = {
      baseUrl:
        initial?.baseUrl?.trim() ||
        process.env.OPENAI_BASE_URL?.trim() ||
        'https://api.openai.com/v1',
      modelId:
        initial?.modelId?.trim() ||
        process.env.OPENAI_MODEL?.trim() ||
        'gpt-4o-mini',
      apiToken:
        initial?.apiToken?.trim() ||
        process.env.OPENAI_API_KEY?.trim() ||
        '',
    }
  }

  getPublicStatus(): PublicConnectionStatus {
    const raw = this.config.apiToken.trim()
    const hasToken = Boolean(raw)
    const tokenPreview =
      hasToken && raw.length > 6
        ? `${raw.slice(0, 3)}...${raw.slice(-3)}`
        : hasToken
          ? 'Configured'
          : ''

    return {
      baseUrl: this.config.baseUrl,
      modelId: this.config.modelId,
      hasToken,
      tokenPreview,
    }
  }

  update(patch: Partial<ModelConnectionConfig>): PublicConnectionStatus {
    if (typeof patch.baseUrl === 'string') {
      this.config.baseUrl = patch.baseUrl.trim() || 'https://api.openai.com/v1'
    }
    if (typeof patch.modelId === 'string') {
      this.config.modelId = patch.modelId.trim() || 'gpt-4o-mini'
    }
    if (typeof patch.apiToken === 'string') {
      this.config.apiToken = patch.apiToken.trim()
    }

    const status = this.getPublicStatus()
    this.logger.info('connection.updated', {
      baseUrl: status.baseUrl,
      modelId: status.modelId,
      hasToken: status.hasToken,
    })
    return status
  }

  resolveForRequest(
    override?: Partial<ModelConnectionConfig>,
    headers?: { apiToken?: string; baseUrl?: string; modelId?: string },
  ): ModelConnectionConfig {
    if (override?.baseUrl?.trim()) {
      this.config.baseUrl = override.baseUrl.trim()
    }
    if (override?.modelId?.trim()) {
      this.config.modelId = override.modelId.trim()
    }
    if (override?.apiToken?.trim()) {
      this.config.apiToken = override.apiToken.trim()
    }

    return {
      baseUrl:
        override?.baseUrl?.trim() ||
        headers?.baseUrl?.trim() ||
        this.config.baseUrl.trim() ||
        'https://api.openai.com/v1',
      modelId:
        override?.modelId?.trim() ||
        headers?.modelId?.trim() ||
        this.config.modelId.trim() ||
        'gpt-4o-mini',
      apiToken:
        override?.apiToken?.trim() ||
        headers?.apiToken?.trim() ||
        this.config.apiToken.trim() ||
        process.env.OPENAI_API_KEY?.trim() ||
        '',
    }
  }
}
