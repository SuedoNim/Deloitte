import path from 'node:path'
import type {
  AiProviderType,
  ModelConnectionConfig,
} from '../../client/src/types/jobs.ts'
import type { ILogger } from '../logging/logger.ts'
import { isGeminiConnection } from '../ai/gemini-client.ts'
import {
  FileServiceConfigStore,
  type IServiceConfigStore,
} from './config-service.ts'

export interface PublicConnectionStatus {
  provider: AiProviderType
  baseUrl: string
  modelId: string
  hasToken: boolean
  tokenPreview: string
  port: number
  configFile: string
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
  private readonly logger: ILogger
  private readonly configStore: IServiceConfigStore

  constructor(
    logger: ILogger,
    configStore?: IServiceConfigStore,
    initial?: Partial<ModelConnectionConfig>,
  ) {
    this.logger = logger
    this.configStore = configStore ?? new FileServiceConfigStore(logger)

    if (
      initial?.provider ||
      initial?.baseUrl ||
      initial?.modelId ||
      initial?.apiToken ||
      initial?.port
    ) {
      this.configStore.updateConfig({
        port: initial.port,
        aiConnection: {
          provider: initial.provider,
          baseUrl: initial.baseUrl,
          modelId: initial.modelId,
          apiToken: initial.apiToken,
        },
      })
    }
  }

  getPublicStatus(): PublicConnectionStatus {
    const cfg = this.configStore.getConfig()
    const provider: AiProviderType = isGeminiConnection(cfg.aiConnection)
      ? 'gemini'
      : 'openai'
    const envToken =
      provider === 'gemini'
        ? process.env.GEMINI_API_KEY?.trim() || ''
        : process.env.OPENAI_API_KEY?.trim() || ''
    const raw = cfg.aiConnection.apiToken.trim() || envToken
    const hasToken = Boolean(raw)
    const tokenPreview =
      hasToken && raw.length > 6
        ? `${raw.slice(0, 3)}...${raw.slice(-3)}`
        : hasToken
          ? 'Configured'
          : ''

    return {
      provider,
      baseUrl: cfg.aiConnection.baseUrl,
      modelId: cfg.aiConnection.modelId,
      hasToken,
      tokenPreview,
      port: cfg.server.port,
      configFile: path.basename(this.configStore.getConfigFilePath()),
    }
  }

  update(patch: Partial<ModelConnectionConfig>): PublicConnectionStatus {
    const aiPatch: Partial<ModelConnectionConfig> = {}
    if (patch.provider === 'gemini' || patch.provider === 'openai') {
      aiPatch.provider = patch.provider
    }
    if (typeof patch.baseUrl === 'string') {
      aiPatch.baseUrl = patch.baseUrl.trim()
    }
    if (typeof patch.modelId === 'string') {
      aiPatch.modelId = patch.modelId.trim()
    }
    if (typeof patch.apiToken === 'string') {
      aiPatch.apiToken = patch.apiToken.trim()
    }

    this.configStore.updateConfig({
      port: patch.port,
      aiConnection: aiPatch,
    })

    const status = this.getPublicStatus()
    this.logger.info('connection.updated', {
      provider: status.provider,
      baseUrl: status.baseUrl,
      modelId: status.modelId,
      hasToken: status.hasToken,
      port: status.port,
      configFile: status.configFile,
    })
    return status
  }

  resolveForRequest(
    override?: Partial<ModelConnectionConfig>,
    headers?: { apiToken?: string; baseUrl?: string; modelId?: string },
  ): ModelConnectionConfig {
    if (
      override?.provider ||
      override?.baseUrl?.trim() ||
      override?.modelId?.trim() ||
      override?.apiToken?.trim() ||
      typeof override?.port === 'number'
    ) {
      this.configStore.updateConfig({
        port: override.port,
        aiConnection: {
          ...(override.provider ? { provider: override.provider } : {}),
          ...(override.baseUrl?.trim()
            ? { baseUrl: override.baseUrl.trim() }
            : {}),
          ...(override.modelId?.trim()
            ? { modelId: override.modelId.trim() }
            : {}),
          ...(override.apiToken?.trim()
            ? { apiToken: override.apiToken.trim() }
            : {}),
        },
      })
    }

    const persisted = this.configStore.getAiConnection()
    const port = this.configStore.getServerPort()
    const provider: AiProviderType = isGeminiConnection({
      provider: override?.provider ?? persisted.provider,
      modelId: override?.modelId || headers?.modelId || persisted.modelId,
      baseUrl: override?.baseUrl || headers?.baseUrl || persisted.baseUrl,
    })
      ? 'gemini'
      : 'openai'

    const defaultBaseUrl =
      provider === 'gemini'
        ? 'https://generativelanguage.googleapis.com'
        : 'https://api.openai.com/v1'
    const defaultModelId =
      provider === 'gemini' ? 'gemini-3.8-flash' : 'gpt-4o-mini'
    const envToken =
      provider === 'gemini'
        ? process.env.GEMINI_API_KEY?.trim() || ''
        : process.env.OPENAI_API_KEY?.trim() || ''

    return {
      provider,
      baseUrl:
        override?.baseUrl?.trim() ||
        headers?.baseUrl?.trim() ||
        persisted.baseUrl.trim() ||
        defaultBaseUrl,
      modelId:
        override?.modelId?.trim() ||
        headers?.modelId?.trim() ||
        persisted.modelId.trim() ||
        defaultModelId,
      apiToken:
        override?.apiToken?.trim() ||
        headers?.apiToken?.trim() ||
        persisted.apiToken.trim() ||
        envToken,
      port,
    }
  }
}

