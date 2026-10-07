import { generateText, stepCountIs } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import type { EcsJob } from '../../client/src/types/jobs.ts'
import type { ILogger } from '../logging/logger.ts'
import type { IConnectionStore } from './connection-store.ts'
import {
  getSkillForWorkflow,
  getToolsForWorkflow,
} from '../ai/skills-catalog.ts'
import { runDeterministicSkillToolPass } from '../ai/tools-registry.ts'

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
 * Executes a single-purpose LLM chat for a specific EcsJob using its bound
 * U.S. Airport Investment Intelligence AI Skill (S1–S7) and deterministic AI Tools (T1–T12).
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

    const skill = getSkillForWorkflow(job.code)
    const boundTools = getToolsForWorkflow(job.code)

    this.logger.info('job_agent.started', {
      jobId: job.id,
      purpose: job.purpose,
      ecsSystem: job.ecsSystem,
      skillId: skill.id,
      skillSlug: skill.slug,
      boundTools: skill.boundToolNames,
    })

    const conn = this.connectionStore.resolveForRequest()
    const nowTime = () => new Date().toISOString().slice(11, 19)

    // If an API token is configured, run a single-purpose LLM completion equipped with the Skill & AI Tools
    if (conn.apiToken) {
      try {
        const provider = createOpenAI({
          apiKey: conn.apiToken,
          ...(conn.baseUrl ? { baseURL: conn.baseUrl } : {}),
        })

        const { text } = await generateText({
          model: provider(conn.modelId),
          abortSignal: signal,
          tools: boundTools,
          stopWhen: stepCountIs(3),
          system: [
            skill.systemInstruction,
            `Target U.S. Airport: ${job.airportIata} (${job.airportIcao} · ${job.airportName}).`,
            `Single Specific Job Purpose: "${job.purpose}".`,
            `Supported Standard Reports: ${skill.reportTemplates.join(', ')}.`,
            `Call your bound AI tools (${skill.boundToolNames.join(', ')}) to compute verified U.S. figures and cite primary provenance (Credibility 1–5).`,
          ].join('\n'),
          messages: job.chatHistory.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        })

        if (signal.aborted) return

        const assistantMsg = {
          id: `msg-${Date.now()}`,
          role: 'assistant' as const,
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
              stage: `${skill.id} (${skill.slug}) Tool Execution`,
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
          skillId: skill.id,
          error: err instanceof Error ? err.message : String(err),
        })
      }
    }

    // Deterministic AI Skill + AI Tool execution pass when running without an external API key
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

    const toolPass = runDeterministicSkillToolPass(job)
    const nextProgress = Math.min(96, Math.max(job.progress + 8, 32))

    const assistantMsg = {
      id: `msg-${Date.now()}`,
      role: 'assistant' as const,
      content: toolPass.subConversationReply,
      timestamp: nowTime(),
    }

    const updatedHistory =
      job.chatHistory.length >= 6
        ? [...job.chatHistory.slice(0, 1), ...job.chatHistory.slice(-4), assistantMsg]
        : [...job.chatHistory, assistantMsg]

    await callbacks.onProgress({
      progress: nextProgress,
      keyMetricLabel: toolPass.keyMetricLabel,
      keyMetricValue: toolPass.keyMetricValue,
      chatHistory: updatedHistory,
    })
  }
}
