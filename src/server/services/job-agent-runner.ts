import { generateText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import type { EcsJob, JobChatMessage } from '../../client/src/types/jobs.ts'
import type { ILogger } from '../logging/logger.ts'
import type { IConnectionStore } from './connection-store.ts'

export interface JobExecutionCallbacks {
  onProgress: (patch: Partial<EcsJob>) => Promise<void>
}

export interface IJobAgentRunner {
  runJobChat(
    job: EcsJob,
    signal: AbortSignal,
    callbacks: JobExecutionCallbacks,
  ): Promise<void>
}

/**
 * Executes a single-purpose LLM chat for a specific EcsJob.
 * Designed following the Open/Closed Principle so the next stage's detailed
 * agent implementation can extend or replace this runner cleanly.
 */
export class SinglePurposeLlmJobRunner implements IJobAgentRunner {
  private readonly connectionStore: IConnectionStore
  private readonly logger: ILogger

  constructor(connectionStore: IConnectionStore, logger: ILogger) {
    this.connectionStore = connectionStore
    this.logger = logger
  }

  async runJobChat(
    job: EcsJob,
    signal: AbortSignal,
    callbacks: JobExecutionCallbacks,
  ): Promise<void> {
    if (signal.aborted) return

    this.logger.info('job_agent.started', {
      jobId: job.id,
      purpose: job.purpose,
      ecsSystem: job.ecsSystem,
    })

    const conn = this.connectionStore.resolveForRequest()
    const nowTime = () => new Date().toISOString().slice(11, 19)

    // If an API token is configured, run a single-purpose LLM completion for this job's purpose
    if (conn.apiToken) {
      try {
        const provider = createOpenAI({
          apiKey: conn.apiToken,
          ...(conn.baseUrl ? { baseURL: conn.baseUrl } : {}),
        })

        const { text } = await generateText({
          model: provider(conn.modelId),
          abortSignal: signal,
          system: `You are a single-purpose ECS Job Agent executing workflow ${job.code} (${job.ecsSystem}) for airport ${job.airportIata} (${job.airportIcao}). Focus strictly on fulfilling the job's single specific purpose concisely.`,
          messages: job.chatHistory.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        })

        if (signal.aborted) return

        const assistantMsg: JobChatMessage = {
          id: `msg-${Date.now()}`,
          role: 'assistant',
          content: text,
          timestamp: nowTime(),
        }

        await callbacks.onProgress({
          progress: Math.min(96, Math.max(job.progress + 15, 65)),
          summary: text.slice(0, 220),
          chatHistory: [...job.chatHistory, assistantMsg],
          steps: [
            ...job.steps,
            {
              id: `step-${Date.now()}`,
              timestamp: nowTime(),
              stage: `${job.ecsSystem} LLM Evaluation`,
              detail: text.slice(0, 140),
              state: 'active',
            },
          ],
        })
        return
      } catch (err) {
        if (signal.aborted) return
        this.logger.warn('job_agent.llm_fallback', {
          jobId: job.id,
          error: err instanceof Error ? err.message : String(err),
        })
      }
    }

    // Staged single-purpose execution step when running without external API token
    await new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, 400)
      signal.addEventListener(
        'abort',
        () => {
          clearTimeout(timer)
          resolve()
        },
        { once: true },
      )
    })

    if (signal.aborted) return

    const nextProgress = Math.min(96, Math.max(job.progress + 8, 32))
    const stageReply = `Executed ${job.ecsSystem} pass for purpose: "${job.purpose.slice(0, 90)}". Current telemetry: ${job.keyMetricLabel} = ${job.keyMetricValue} (${nextProgress}%).`

    const assistantMsg: JobChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'assistant',
      content: stageReply,
      timestamp: nowTime(),
    }

    const updatedHistory =
      job.chatHistory.length >= 6
        ? [...job.chatHistory.slice(0, 1), ...job.chatHistory.slice(-4), assistantMsg]
        : [...job.chatHistory, assistantMsg]

    await callbacks.onProgress({
      progress: nextProgress,
      chatHistory: updatedHistory,
    })
  }
}
