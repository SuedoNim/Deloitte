import fs from 'node:fs'
import path from 'node:path'
import type { ModelConnectionConfig } from '../../client/src/types/jobs.ts'
import type { ILogger } from '../logging/logger.ts'

export interface ServerNetworkConfig {
  port: number
  host: string
}

export interface AppServiceConfig {
  server: ServerNetworkConfig
  aiConnection: ModelConnectionConfig
}

export interface UpdateServiceConfigPatch {
  port?: number
  host?: string
  aiConnection?: Partial<ModelConnectionConfig>
}

export interface IServiceConfigStore {
  getConfigFilePath(): string
  getConfig(): AppServiceConfig
  getServerPort(): number
  getAiConnection(): ModelConnectionConfig
  updateConfig(patch: UpdateServiceConfigPatch): AppServiceConfig
}

const DEFAULT_CONFIG: AppServiceConfig = {
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  aiConnection: {
    provider: 'gemini',
    baseUrl: 'https://generativelanguage.googleapis.com',
    modelId: 'gemini-3.8-flash',
    apiToken: '',
  },
}

/**
 * SOLID Single-Responsibility Service for persisting and synchronizing
 * server port and AI model connection configuration with `config.json`.
 */
export class FileServiceConfigStore implements IServiceConfigStore {
  private readonly configFilePath: string
  private readonly logger: ILogger
  private cachedConfig: AppServiceConfig
  private lastKnownMtimeMs = 0

  constructor(logger: ILogger, customConfigPath?: string) {
    this.logger = logger
    this.configFilePath = path.resolve(
      process.cwd(),
      customConfigPath || process.env.CONFIG_PATH || 'config.json',
    )
    this.cachedConfig = this.loadOrInitializeConfig()
  }

  getConfigFilePath(): string {
    return this.configFilePath
  }

  getConfig(): AppServiceConfig {
    this.reloadIfModifiedExternally()
    return {
      server: { ...this.cachedConfig.server },
      aiConnection: { ...this.cachedConfig.aiConnection },
    }
  }

  getServerPort(): number {
    this.reloadIfModifiedExternally()
    const envPort = Number(process.env.PORT)
    if (Number.isFinite(envPort) && envPort > 0) {
      return envPort
    }
    return this.cachedConfig.server.port || 3000
  }

  getAiConnection(): ModelConnectionConfig {
    this.reloadIfModifiedExternally()
    return { ...this.cachedConfig.aiConnection }
  }

  updateConfig(patch: UpdateServiceConfigPatch): AppServiceConfig {
    this.reloadIfModifiedExternally()

    const nextPort =
      typeof patch.port === 'number' &&
      Number.isFinite(patch.port) &&
      patch.port >= 1 &&
      patch.port <= 65535
        ? Math.floor(patch.port)
        : this.cachedConfig.server.port

    const nextHost =
      typeof patch.host === 'string' && patch.host.trim()
        ? patch.host.trim()
        : this.cachedConfig.server.host

    const aiPatch = patch.aiConnection ?? {}
    const nextProvider =
      aiPatch.provider === 'gemini' || aiPatch.provider === 'openai'
        ? aiPatch.provider
        : this.cachedConfig.aiConnection.provider ?? 'gemini'

    const defaultBaseForProvider =
      nextProvider === 'gemini'
        ? 'https://generativelanguage.googleapis.com'
        : 'https://api.openai.com/v1'
    const defaultModelForProvider =
      nextProvider === 'gemini' ? 'gemini-3.8-flash' : 'gpt-4o-mini'

    const nextBaseUrl =
      typeof aiPatch.baseUrl === 'string'
        ? aiPatch.baseUrl.trim() || defaultBaseForProvider
        : this.cachedConfig.aiConnection.baseUrl

    const nextModelId =
      typeof aiPatch.modelId === 'string'
        ? aiPatch.modelId.trim() || defaultModelForProvider
        : this.cachedConfig.aiConnection.modelId

    const nextApiToken =
      typeof aiPatch.apiToken === 'string'
        ? aiPatch.apiToken.trim()
        : this.cachedConfig.aiConnection.apiToken

    this.cachedConfig = {
      server: {
        port: nextPort,
        host: nextHost,
      },
      aiConnection: {
        provider: nextProvider,
        baseUrl: nextBaseUrl,
        modelId: nextModelId,
        apiToken: nextApiToken,
      },
    }

    this.persistToDisk(this.cachedConfig)

    this.logger.info('config.file_synchronized', {
      configFile: path.basename(this.configFilePath),
      port: this.cachedConfig.server.port,
      provider: this.cachedConfig.aiConnection.provider,
      baseUrl: this.cachedConfig.aiConnection.baseUrl,
      modelId: this.cachedConfig.aiConnection.modelId,
      hasApiToken: Boolean(this.cachedConfig.aiConnection.apiToken),
    })

    return this.getConfig()
  }

  private loadOrInitializeConfig(): AppServiceConfig {
    try {
      if (fs.existsSync(this.configFilePath)) {
        const raw = fs.readFileSync(this.configFilePath, 'utf8')
        const parsed = JSON.parse(raw) as Partial<AppServiceConfig>
        const normalized = this.normalizeConfig(parsed)
        const stat = fs.statSync(this.configFilePath)
        this.lastKnownMtimeMs = stat.mtimeMs
        this.logger.info('config.file_loaded', {
          configFile: path.basename(this.configFilePath),
          port: normalized.server.port,
          provider: normalized.aiConnection.provider,
          baseUrl: normalized.aiConnection.baseUrl,
          modelId: normalized.aiConnection.modelId,
          hasApiToken: Boolean(normalized.aiConnection.apiToken),
        })
        return normalized
      }
    } catch (err) {
      this.logger.warn('config.file_load_fallback', {
        configFile: path.basename(this.configFilePath),
        error: err instanceof Error ? err.message : String(err),
      })
    }

    const initial = this.normalizeConfig({
      server: {
        port: Number(process.env.PORT) || DEFAULT_CONFIG.server.port,
        host: DEFAULT_CONFIG.server.host,
      },
      aiConnection: {
        provider: 'gemini',
        baseUrl: DEFAULT_CONFIG.aiConnection.baseUrl,
        modelId: DEFAULT_CONFIG.aiConnection.modelId,
        apiToken:
          process.env.GEMINI_API_KEY?.trim() ||
          process.env.OPENAI_API_KEY?.trim() ||
          DEFAULT_CONFIG.aiConnection.apiToken,
      },
    })

    this.persistToDisk(initial)
    return initial
  }

  private reloadIfModifiedExternally(): void {
    try {
      if (!fs.existsSync(this.configFilePath)) return
      const stat = fs.statSync(this.configFilePath)
      if (stat.mtimeMs > this.lastKnownMtimeMs + 1) {
        const raw = fs.readFileSync(this.configFilePath, 'utf8')
        const parsed = JSON.parse(raw) as Partial<AppServiceConfig>
        this.cachedConfig = this.normalizeConfig(parsed)
        this.lastKnownMtimeMs = stat.mtimeMs
        this.logger.info('config.file_reloaded_from_disk', {
          configFile: path.basename(this.configFilePath),
          port: this.cachedConfig.server.port,
          provider: this.cachedConfig.aiConnection.provider,
          baseUrl: this.cachedConfig.aiConnection.baseUrl,
          modelId: this.cachedConfig.aiConnection.modelId,
        })
      }
    } catch {
      // Ignore transient read race
    }
  }

  private persistToDisk(config: AppServiceConfig): void {
    try {
      const dir = path.dirname(this.configFilePath)
      fs.mkdirSync(dir, { recursive: true })
      fs.writeFileSync(
        this.configFilePath,
        `${JSON.stringify(config, null, 2)}\n`,
        'utf8',
      )
      const stat = fs.statSync(this.configFilePath)
      this.lastKnownMtimeMs = stat.mtimeMs
    } catch (err) {
      this.logger.error('config.file_persist_failed', {
        configFile: path.basename(this.configFilePath),
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  private normalizeConfig(raw?: Partial<AppServiceConfig>): AppServiceConfig {
    const portCandidate = Number(raw?.server?.port)
    const port =
      Number.isFinite(portCandidate) &&
      portCandidate >= 1 &&
      portCandidate <= 65535
        ? Math.floor(portCandidate)
        : DEFAULT_CONFIG.server.port

    const host =
      typeof raw?.server?.host === 'string' && raw.server.host.trim()
        ? raw.server.host.trim()
        : DEFAULT_CONFIG.server.host

    const rawModel = raw?.aiConnection?.modelId?.trim() || ''
    const rawBase = raw?.aiConnection?.baseUrl?.trim() || ''
    const inferredProvider =
      raw?.aiConnection?.provider === 'openai' ||
      raw?.aiConnection?.provider === 'gemini'
        ? raw.aiConnection.provider
        : rawModel.toLowerCase().startsWith('gpt-') ||
            rawBase.toLowerCase().includes('openai.com')
          ? 'openai'
          : 'gemini'

    const baseUrl =
      rawBase ||
      (inferredProvider === 'gemini'
        ? 'https://generativelanguage.googleapis.com'
        : 'https://api.openai.com/v1')

    const modelId =
      rawModel ||
      (inferredProvider === 'gemini' ? 'gemini-3.8-flash' : 'gpt-4o-mini')

    const apiToken =
      typeof raw?.aiConnection?.apiToken === 'string'
        ? raw.aiConnection.apiToken.trim()
        : DEFAULT_CONFIG.aiConnection.apiToken

    return {
      server: { port, host },
      aiConnection: { provider: inferredProvider, baseUrl, modelId, apiToken },
    }
  }
}
