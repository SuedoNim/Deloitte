import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import type { EcsJob, ModelConnectionConfig } from '../../client/src/types/jobs.ts'
import type { ILogger } from '../logging/logger.ts'
import type { IJobRepository } from './job-repository.ts'
import type { IConnectionStore } from './connection-store.ts'

export interface ChatRequestInput {
  messages: UIMessage[]
  connection?: Partial<ModelConnectionConfig>
  headers?: {
    apiToken?: string
    baseUrl?: string
    modelId?: string
  }
}

export interface IChatService {
  streamChatResponse(input: ChatRequestInput): Promise<Response>
}

export class VercelAiChatService implements IChatService {
  private readonly jobRepository: IJobRepository
  private readonly connectionStore: IConnectionStore
  private readonly logger: ILogger

  constructor(
    jobRepository: IJobRepository,
    connectionStore: IConnectionStore,
    logger: ILogger,
  ) {
    this.jobRepository = jobRepository
    this.connectionStore = connectionStore
    this.logger = logger
  }

  async streamChatResponse(input: ChatRequestInput): Promise<Response> {
    const resolvedConn = this.connectionStore.resolveForRequest(
      input.connection,
      input.headers,
    )
    const jobs = this.jobRepository.getAll()

    const lastUserMessage = [...input.messages].reverse().find((m) => m.role === 'user')
    const userText =
      lastUserMessage?.parts
        ?.filter(
          (p): p is Extract<UIMessage['parts'][number], { type: 'text' }> =>
            p.type === 'text',
        )
        .map((p) => p.text)
        .join('\n') ?? ''

    this.logger.info('chat.request_received', {
      messageCount: input.messages.length,
      modelId: resolvedConn.modelId,
      baseUrl: resolvedConn.baseUrl,
      hasApiToken: Boolean(resolvedConn.apiToken),
      promptPreview: userText.slice(0, 120),
    })

    if (resolvedConn.apiToken) {
      const jobsContext = jobs
        .map(
          (j) =>
            `${j.id} [${j.code} ${j.airportIata}]: ${j.title} | status=${j.status} | progress=${j.progress}% | system=${j.ecsSystem} | state=${j.lifecycleState} | metric=${j.keyMetricLabel}:${j.keyMetricValue}`,
        )
        .join('\n')

      const provider = createOpenAI({
        apiKey: resolvedConn.apiToken,
        ...(resolvedConn.baseUrl ? { baseURL: resolvedConn.baseUrl } : {}),
      })

      const result = streamText({
        model: provider(resolvedConn.modelId),
        messages: await convertToModelMessages(input.messages),
        system: `You are the Deloitte Airport Modernization ECS Assistant. Use the active ECS job queue below to provide concise, quantitative guidance on workflows W1-W7, entities, and systems.\n\nActive ECS Jobs:\n${jobsContext}`,
      })

      return createUIMessageStreamResponse({
        stream: toUIMessageStream({ stream: result.stream }),
      })
    }

    const replyText = this.buildFallbackResponse(userText, jobs, resolvedConn)
    const chunks = replyText.match(/.{1,18}(\s|$)|\S+/g) ?? [replyText]

    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        const partId = `txt-${Date.now()}`
        writer.write({ type: 'text-start', id: partId })
        for (const chunk of chunks) {
          writer.write({ type: 'text-delta', id: partId, delta: chunk })
          await new Promise((resolve) => setTimeout(resolve, 12))
        }
        writer.write({ type: 'text-end', id: partId })
      },
    })

    this.logger.info('chat.response_streamed', {
      mode: 'server_ecs_engine',
      modelId: resolvedConn.modelId,
      responseLength: replyText.length,
    })

    return createUIMessageStreamResponse({ stream })
  }

  private buildFallbackResponse(
    userPrompt: string,
    jobs: EcsJob[],
    connection: ModelConnectionConfig,
  ): string {
    const q = userPrompt.toLowerCase()
    const runningJobs = jobs.filter((j) => j.status === 'in_progress')
    const failedJobs = jobs.filter((j) => j.status === 'failed')
    const completedJobs = jobs.filter((j) => j.status === 'completed')

    const matchedJob = jobs.find(
      (j) =>
        q.includes(j.id.toLowerCase()) ||
        q.includes(j.code.toLowerCase()) ||
        q.includes(j.airportIata.toLowerCase()) ||
        q.includes(j.ecsSystem.toLowerCase()),
    )

    const connNote = `Endpoint: \`${connection.baseUrl}\` · Model: \`${connection.modelId}\``

    if (matchedJob) {
      const activeStep =
        matchedJob.steps.find((s) => s.state === 'active' || s.state === 'warning') ??
        matchedJob.steps[matchedJob.steps.length - 1]
      return [
        `### ${matchedJob.id} · ${matchedJob.code} ${matchedJob.title} (${matchedJob.airportIata} / ${matchedJob.airportIcao})`,
        ``,
        `- **Connection**: ${connNote}`,
        `- **ECS System**: \`${matchedJob.ecsSystem}\` · **Lifecycle State**: \`${matchedJob.lifecycleState}\``,
        `- **Current Status**: **${matchedJob.status.toUpperCase()}** (${matchedJob.progress}% · elapsed ${matchedJob.elapsed} · ETA ${matchedJob.eta})`,
        `- **Primary Telemetry**: ${matchedJob.keyMetricLabel}: **${matchedJob.keyMetricValue}**`,
        activeStep ? `- **Latest Stage**: *${activeStep.stage}* — ${activeStep.detail}` : '',
        ``,
        `**Recommended ECS Action**:`,
        matchedJob.status === 'failed'
          ? `1. Inspect the halted guard on \`${matchedJob.lifecycleState}\` (${activeStep?.detail ?? 'aborted/failed state'}).\n2. Re-dispatch or remediate VLAN/ORAT preconditions before re-running \`${matchedJob.ecsSystem}\`.`
          : `1. Keep \`${matchedJob.ecsSystem}\` running through completion (${matchedJob.progress}% → 100%).\n2. \`ViewProjectionSystem\` will seal the \`Provenance\` component upon completion.`,
      ]
        .filter(Boolean)
        .join('\n')
    }

    return [
      `### Airport Modernization ECS — Live Operations Brief`,
      ``,
      `- **Connection**: ${connNote}`,
      `- **Queue Summary**: **${runningJobs.length} in progress** (yellow) · **${completedJobs.length} complete** (green) · **${failedJobs.length} failed/aborted** (red)`,
      ``,
      ...jobs.slice(0, 4).map(
        (j) =>
          `- **${j.id} (${j.code} · ${j.airportIata})** — *${j.title}*: \`${j.status}\` at **${j.progress}%** (${j.keyMetricLabel}: \`${j.keyMetricValue}\`)`,
      ),
      ``,
      `Click the **Ask** icon on any job in the right-hand panel to diagnose its ECS telemetry, or expand a job row to inspect its stage logs.`,
    ].join('\n')
  }
}
