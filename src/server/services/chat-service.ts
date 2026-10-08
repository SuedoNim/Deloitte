import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  stepCountIs,
  streamText,
  tool,
  toUIMessageStream,
  type UIMessage,
} from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { z } from 'zod'
import type {
  EcsJob,
  ModelConnectionConfig,
  WorkflowCode,
} from '../../client/src/types/jobs.ts'
import type { ILogger } from '../logging/logger.ts'
import type { IJobRepository } from './job-repository.ts'
import type { IConnectionStore } from './connection-store.ts'
import {
  isGeminiConnection,
  resolveGeminiModelName,
  runGeminiJobManagementChat,
} from '../ai/gemini-client.ts'

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

const WORKFLOW_ENUM = z.enum(['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7'])
const STATUS_ENUM = z.enum(['in_progress', 'completed', 'failed'])

/**
 * Main Job-Management Chat Service.
 * Its sole purpose is to determine what single-purpose LLM jobs the user wants to
 * create, update, abort, remove, or inspect, using exclusively job-management tools
 * backed by PGlite and pg-boss.
 */
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

  private buildJobManagementTools() {
    return {
      createJob: tool({
        description:
          'Create and enqueue a new single-purpose LLM job in PGlite and pg-boss.',
        inputSchema: z.object({
          title: z.string().describe('Short descriptive title for the job'),
          purpose: z
            .string()
            .describe('The single specific purpose/prompt for this job LLM chat'),
          code: WORKFLOW_ENUM.default('W4').describe('ECS Workflow code W1-W7'),
          airportIata: z
            .string()
            .default('JFK')
            .describe('3-letter US IATA airport code (e.g. JFK, DEN, LAX, ORD, ATL, DFW, DCA)'),
        }),
        execute: async ({ title, purpose, code, airportIata }) => {
          const created = await this.jobRepository.create({
            title,
            purpose,
            code,
            airportIata,
          })
          return {
            action: 'created',
            job: {
              id: created.id,
              pgBossJobId: created.pgBossJobId,
              title: created.title,
              purpose: created.purpose,
              code: created.code,
              airportIata: created.airportIata,
              status: created.status,
              progress: created.progress,
            },
          }
        },
      }),

      updateJob: tool({
        description:
          'Update an existing job (such as its single specific purpose, title, workflow code, or status). If the job is currently running, pg-boss re-orchestrates the job with the updated purpose.',
        inputSchema: z.object({
          jobId: z.string().describe('The job ID to update, e.g. JOB-4091'),
          title: z.string().optional().describe('Updated job title'),
          purpose: z
            .string()
            .optional()
            .describe('Updated single specific purpose for the job LLM chat'),
          code: WORKFLOW_ENUM.optional().describe('Updated workflow code W1-W7'),
          status: STATUS_ENUM.optional().describe('Updated job status'),
          progress: z.number().min(0).max(100).optional(),
        }),
        execute: async ({ jobId, title, purpose, code, status, progress }) => {
          const updated = await this.jobRepository.update(jobId, {
            title,
            purpose,
            code,
            status,
            progress,
          })
          if (!updated) {
            return { action: 'not_found', jobId }
          }
          return {
            action: 'updated',
            job: {
              id: updated.id,
              pgBossJobId: updated.pgBossJobId,
              title: updated.title,
              purpose: updated.purpose,
              status: updated.status,
              progress: updated.progress,
            },
          }
        },
      }),

      abortJob: tool({
        description:
          'Abort an in-progress job in pg-boss and transition its status to failed/Aborted.',
        inputSchema: z.object({
          jobId: z.string().describe('The job ID to abort, e.g. JOB-4091'),
          reason: z.string().optional().describe('Reason for aborting the job'),
        }),
        execute: async ({ jobId, reason }) => {
          const aborted = await this.jobRepository.abort(jobId, reason)
          if (!aborted) {
            return { action: 'not_found', jobId }
          }
          return {
            action: 'aborted',
            job: {
              id: aborted.id,
              pgBossJobId: aborted.pgBossJobId,
              status: aborted.status,
              lifecycleState: aborted.lifecycleState,
            },
          }
        },
      }),

      removeJob: tool({
        description:
          'Cancel and permanently remove a job from pg-boss and PGlite storage.',
        inputSchema: z.object({
          jobId: z.string().describe('The job ID to remove, e.g. JOB-4088'),
        }),
        execute: async ({ jobId }) => {
          const removed = await this.jobRepository.remove(jobId)
          return {
            action: removed ? 'removed' : 'not_found',
            jobId,
          }
        },
      }),

      listJobs: tool({
        description:
          'List current jobs managed by PGlite and pg-boss or inspect a specific job ID.',
        inputSchema: z.object({
          jobId: z.string().optional().describe('Optional specific job ID to inspect'),
          status: STATUS_ENUM.optional().describe('Optional status filter'),
        }),
        execute: async ({ jobId, status }) => {
          if (jobId) {
            const job = this.jobRepository.getById(jobId)
            return { job: job ?? null }
          }
          const all = this.jobRepository.getAll()
          const filtered = status ? all.filter((j) => j.status === status) : all
          return {
            count: filtered.length,
            jobs: filtered.map((j) => ({
              id: j.id,
              pgBossJobId: j.pgBossJobId,
              code: j.code,
              airportIata: j.airportIata,
              title: j.title,
              purpose: j.purpose,
              status: j.status,
              progress: j.progress,
            })),
          }
        },
      }),
    }
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
      provider: resolvedConn.provider,
      modelId: resolvedConn.modelId,
      baseUrl: resolvedConn.baseUrl,
      hasApiToken: Boolean(resolvedConn.apiToken),
      promptPreview: userText.slice(0, 120),
    })

    const jobsContext = jobs.length
      ? jobs
          .map(
            (j) =>
              `${j.id} (pgBoss=${j.pgBossJobId ?? 'none'}) [${j.code} ${j.airportIata}]: title="${j.title}" | purpose="${j.purpose}" | status=${j.status} | progress=${j.progress}%`,
          )
          .join('\n')
      : 'No active jobs in queue yet.'

    const systemInstruction = [
      'You are the Job Management Orchestrator for the Deloitte Airport Modernization ECS platform.',
      'Your ONLY purpose in this main chat is to determine what jobs the user wants to create, update, abort, remove, or inspect, and execute those operations using your job management tools (`createJob`, `updateJob`, `abortJob`, `removeJob`, `listJobs`).',
      'Every job is a single-purpose LLM chat orchestrated by PGlite and pg-boss.',
      'When creating or updating a job, always define a clear, single specific `purpose` for that job.',
      '',
      'Current Jobs in PGlite / pg-boss:',
      jobsContext,
    ].join('\n')

    if (resolvedConn.apiToken) {
      if (isGeminiConnection(resolvedConn)) {
        try {
          const geminiReply = await runGeminiJobManagementChat({
            apiKey: resolvedConn.apiToken,
            modelId: resolvedConn.modelId,
            userPrompt: userText,
            systemInstruction,
            jobRepository: this.jobRepository,
            logger: this.logger,
          })
          if (geminiReply) {
            return this.createChunkedTextResponse(
              geminiReply,
              resolveGeminiModelName(resolvedConn.modelId),
            )
          }
        } catch (err) {
          this.logger.warn('chat.gemini_fallback_to_deterministic', {
            modelId: resolvedConn.modelId,
            error: err instanceof Error ? err.message : String(err),
          })
        }
      } else {
        try {
          const provider = createOpenAI({
            apiKey: resolvedConn.apiToken,
            ...(resolvedConn.baseUrl ? { baseURL: resolvedConn.baseUrl } : {}),
          })

          const result = streamText({
            model: provider(resolvedConn.modelId),
            messages: await convertToModelMessages(input.messages),
            tools: this.buildJobManagementTools(),
            stopWhen: stepCountIs(5),
            system: systemInstruction,
          })

          return createUIMessageStreamResponse({
            stream: toUIMessageStream({ stream: result.stream }),
          })
        } catch (err) {
          this.logger.warn('chat.openai_fallback_to_deterministic', {
            modelId: resolvedConn.modelId,
            error: err instanceof Error ? err.message : String(err),
          })
        }
      }
    }

    const replyText = await this.executeDeterministicJobManagement(
      userText,
      resolvedConn,
    )
    return this.createChunkedTextResponse(replyText, resolvedConn.modelId)
  }

  private createChunkedTextResponse(replyText: string, modelId: string): Response {
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
      mode: 'job_manager_orchestrator',
      modelId,
      responseLength: replyText.length,
    })

    return createUIMessageStreamResponse({ stream })
  }

  /**
   * Deterministic natural-language job management tool dispatcher when no external
   * LLM token is configured. Parses user intent to create, update, abort, remove,
   * or inspect jobs in PGlite + pg-boss.
   */
  private async executeDeterministicJobManagement(
    rawPrompt: string,
    connection: ModelConnectionConfig,
  ): Promise<string> {
    // Strip optional "[Context: ...]" header when matching user intent
    const stripped = rawPrompt.replace(/^\[Context:[^\]]+\]\s*/i, '').trim()
    const lower = stripped.toLowerCase()

    const explicitJobIdMatch = stripped.match(/\b(JOB-\d{3,5})\b/i)
    const contextJobIdMatch = rawPrompt.match(/\[Context:\s*(JOB-\d{3,5})/i)
    const allJobs = this.jobRepository.getAll()
    const targetJobId =
      explicitJobIdMatch?.[1]?.toUpperCase() ??
      contextJobIdMatch?.[1]?.toUpperCase() ??
      allJobs[0]?.id

    const workflowMatch = stripped.match(/\b(W[1-7])\b/i)
    const detectedWorkflow = (workflowMatch?.[1]?.toUpperCase() as WorkflowCode) || undefined

    const airportMatch = stripped.match(/\b(JFK|DEN|LAX|ORD|ATL|DFW|DCA|SDF|GEG)\b/i)
    const detectedAirport = airportMatch?.[1]?.toUpperCase()

    const startsWithCreateVerb =
      /^(please\s+)?(create|start|dispatch|launch|add|new\s+job|queue|spawn|run)\b/i.test(
        stripped,
      )

    // 1. CREATE / START / DISPATCH / ADD NEW JOB INTENT (checked first when user explicitly starts a new job)
    if (
      !explicitJobIdMatch &&
      (startsWithCreateVerb ||
        /\b(create|start|dispatch|launch|add|new job|queue|spawn|run a job)\b/i.test(lower))
    ) {
      const code: WorkflowCode = detectedWorkflow || 'W4'
      const airportIata = detectedAirport || 'JFK'
      const purposeText =
        stripped
          .replace(
            /^(please\s+)?(create|start|dispatch|launch|add|queue|spawn|run)\s+(a\s+)?(new\s+)?(w[1-7]\s+)?(job\s+)?(to|for)?\s*/i,
            '',
          )
          .trim() || `Execute ${code} single-purpose LLM analysis for ${airportIata}`

      const shortTitle =
        purposeText.length > 52 ? `${purposeText.slice(0, 49)}…` : purposeText

      const created = await this.jobRepository.create({
        code,
        airportIata,
        title: shortTitle.charAt(0).toUpperCase() + shortTitle.slice(1),
        purpose: purposeText,
      })

      return [
        `### Job Created via \`createJob\` (\`PGlite\` + \`pg-boss\`)`,
        ``,
        `- **New Job ID**: \`${created.id}\` (\`pg-boss\` ID: \`${created.pgBossJobId ?? 'queued'}\`)`,
        `- **Workflow & Airport**: \`${created.code}\` (${created.ecsSystem}) · **${created.airportIata} (${created.airportIcao})**`,
        `- **Single Purpose**: ${created.purpose}`,
        `- **Status**: **IN PROGRESS** (Yellow · ${created.progress}%)`,
        ``,
        `The job is now persisted in \`PGlite\` and actively orchestrated by \`pg-boss\` in the right-hand panel.`,
      ].join('\n')
    }

    // 2. REMOVE / DELETE JOB INTENT
    if (
      /\b(remove|delete|drop|purge)\b/i.test(lower) &&
      targetJobId
    ) {
      const existing = this.jobRepository.getById(targetJobId)
      const removed = await this.jobRepository.remove(targetJobId)
      if (!removed || !existing) {
        return `### Job Manager (\`removeJob\`)\n\n- Could not find \`${targetJobId}\` in PGlite / \`pg-boss\`.`
      }
      return [
        `### Job Removed via \`removeJob\` (\`PGlite\` + \`pg-boss\`)`,
        ``,
        `- **Removed Job**: \`${existing.id}\` (*${existing.title}*)`,
        `- **pg-boss Queue ID**: \`${existing.pgBossJobId ?? 'cancelled'}\``,
        `- **Single Purpose**: ${existing.purpose}`,
        `- **Status**: Cancelled in \`pg-boss\` and deleted from \`PGlite\` (\`ecs_jobs\`).`,
      ].join('\n')
    }

    // 3. ABORT / CANCEL / STOP JOB INTENT
    if (
      /\b(abort|cancel|stop|halt|kill)\b/i.test(lower) &&
      targetJobId
    ) {
      const aborted = await this.jobRepository.abort(
        targetJobId,
        `Aborted via Job Management Chat: "${stripped.slice(0, 80)}"`,
      )
      if (!aborted) {
        return `### Job Manager (\`abortJob\`)\n\n- Job \`${targetJobId}\` was not found in PGlite.`
      }
      return [
        `### Job Aborted via \`abortJob\` (\`PGlite\` + \`pg-boss\`)`,
        ``,
        `- **Job**: \`${aborted.id}\` · \`${aborted.code}\` · **${aborted.airportIata}** (*${aborted.title}*)`,
        `- **pg-boss Queue ID**: \`${aborted.pgBossJobId ?? 'n/a'}\` (cancelled)`,
        `- **New Status**: **FAILURE / ABORTED** (Red · ${aborted.progress}%)`,
        `- **Single Purpose**: ${aborted.purpose}`,
      ].join('\n')
    }

    // 4. UPDATE / MODIFY / CHANGE / RESUME JOB INTENT
    if (
      /\b(update|change|modify|repurpose|set purpose|rename|restart|resume)\b/i.test(lower) &&
      targetJobId
    ) {
      const current = this.jobRepository.getById(targetJobId)
      if (!current) {
        return `### Job Manager (\`updateJob\`)\n\n- Job \`${targetJobId}\` was not found in PGlite.`
      }

      const cleanedPurpose = stripped
        .replace(/^(please\s+)?(update|change|modify|repurpose|rename|restart|resume)\s+(job\s+)?(JOB-\d+\s*)?(to|with|purpose\s+to)?\s*/i, '')
        .trim()

      const nextPurpose =
        cleanedPurpose.length > 6 ? cleanedPurpose : `${current.purpose} (Updated via chat)`

      const updated = await this.jobRepository.update(targetJobId, {
        purpose: nextPurpose,
        ...(detectedWorkflow ? { code: detectedWorkflow } : {}),
        status: 'in_progress',
      })

      return [
        `### Job Updated via \`updateJob\` (\`PGlite\` + \`pg-boss\`)`,
        ``,
        `- **Job**: \`${updated!.id}\` · \`${updated!.code}\` · **${updated!.airportIata}** (*${updated!.title}*)`,
        `- **Re-Orchestrated pg-boss ID**: \`${updated!.pgBossJobId ?? 'n/a'}\``,
        `- **Status**: \`${updated!.status}\` (${updated!.progress}%)`,
        `- **Updated Single Purpose**: ${updated!.purpose}`,
        ``,
        `The running job worker was notified and re-queued in \`pg-boss\` with the updated single-purpose LLM chat objective.`,
      ].join('\n')
    }

    // 5. INSPECT SPECIFIC JOB OR LIST JOBS VIA `listJobs` TOOL
    const jobs = this.jobRepository.getAll()
    const matchedJob =
      (explicitJobIdMatch
        ? jobs.find((j) => j.id.toUpperCase() === explicitJobIdMatch[1].toUpperCase())
        : undefined) ??
      jobs.find(
        (j) =>
          lower.includes(j.id.toLowerCase()) ||
          (detectedAirport && j.airportIata === detectedAirport),
      )

    if (matchedJob) {
      const latestChat = matchedJob.chatHistory[matchedJob.chatHistory.length - 1]
      return [
        `### Job Manager Inspection (\`listJobs\` → \`${matchedJob.id}\`)`,
        ``,
        `- **Job**: \`${matchedJob.id}\` · \`${matchedJob.code}\` · **${matchedJob.airportIata} / ${matchedJob.airportIcao}**`,
        `- **pg-boss Queue ID**: \`${matchedJob.pgBossJobId ?? 'completed/halted'}\``,
        `- **Status**: **${matchedJob.status.toUpperCase()}** (${matchedJob.progress}% · \`${matchedJob.ecsSystem}\`)`,
        `- **Single Specific Purpose**: ${matchedJob.purpose}`,
        latestChat
          ? `- **Latest Job LLM Chat Message** (*${latestChat.timestamp}*): "${latestChat.content}"`
          : '',
        ``,
        `**Available Job Manager Commands for \`${matchedJob.id}\`**:`,
        `- *"Update ${matchedJob.id} purpose to [new single purpose]"*`,
        `- *"Abort ${matchedJob.id}"*`,
        `- *"Remove ${matchedJob.id}"*`,
      ]
        .filter(Boolean)
        .join('\n')
    }

    const runningCount = jobs.filter((j) => j.status === 'in_progress').length
    const completedCount = jobs.filter((j) => j.status === 'completed').length
    const failedCount = jobs.filter((j) => j.status === 'failed').length

    return [
      `### Job Management Orchestrator (\`PGlite\` + \`pg-boss\`)`,
      ``,
      `- **Orchestrator Mode**: Main chat is scoped exclusively to **Job Management Tools** (\`createJob\`, \`updateJob\`, \`abortJob\`, \`removeJob\`, \`listJobs\`).`,
      `- **Model Connection**: \`${connection.modelId}\` @ \`${connection.baseUrl}\``,
      `- **Active Queue**: **${jobs.length} total jobs** (**${runningCount} in progress**, **${completedCount} complete**, **${failedCount} failed/aborted**)`,
      ``,
      ...jobs.slice(0, 5).map(
        (j) =>
          `- **${j.id} (${j.code} · ${j.airportIata})** [${j.status} · ${j.progress}%] — *Purpose*: ${j.purpose.slice(0, 85)}${j.purpose.length > 85 ? '…' : ''}`,
      ),
      ``,
      `Tell me what job you want to **create**, **update**, **abort**, or **remove** (for example: *"Create a W1 job for JFK to audit AIP grant drawdowns"*, *"Update JOB-4091 purpose to verify Runway 34L surface radar"*, or *"Remove JOB-4088"*).`,
    ].join('\n')
  }
}
