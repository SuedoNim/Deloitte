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
import { evaluateReportRequirement } from '../ai/tools-registry.ts'
import { US_AIRPORT_BASELINES } from '../ai/us-airport-data.ts'

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

function inferWorkflowFromPrompt(text: string): WorkflowCode {
  const explicit = text.match(/\b(W[1-7])\b/i)
  if (explicit) return explicit[1].toUpperCase() as WorkflowCode

  const lower = text.toLowerCase()
  if (
    /\b(funding|capital\s+stack|aip|pfc|garb|dscr|cpe|dcoh|grant|outlay|sf-424|r1\b|r4\b)\b/.test(
      lower,
    )
  ) {
    return 'W1'
  }
  if (
    /\b(orat|acrp\s*164|evm|earned\s+value|spi|cpi|cspp|bca|benefit-cost|nepa|commissioning|r2\b|r3\b|r5\b|r6\b)\b/.test(
      lower,
    )
  ) {
    return 'W2'
  }
  if (
    /\b(passenger|queue|erlang|tsa|precheck|touchless|bag-drop|biometric|cbp|fis|wait\s+time|kiosk|lane)\b/.test(
      lower,
    )
  ) {
    return 'W3'
  }
  if (
    /\b(bnatcs|surface\s+radar|cutover|aspm|delay\s+saving|vtts|adom|atc|airfield|runway|r10\b)\b/.test(
      lower,
    )
  ) {
    return 'W4'
  }
  if (
    /\b(sustainability|egrid|vale|zev|emissions|scope\s+1|scope\s+2|apu|400\s*hz|gate\s+electrification|geothermal|microgrid|net-zero|r8\b)\b/.test(
      lower,
    )
  ) {
    return 'W5'
  }
  if (/\b(infratech|maturity|smart-tech|digital\s+twin|predictive\s+maintenance|mckinsey)\b/.test(lower)) {
    return 'W6'
  }
  if (/\b(benchmark|cohort|z-score|iqr|swim|metar|opensky|ads-b|r7\b|r9\b)\b/.test(lower)) {
    return 'W7'
  }
  return 'W1'
}

/**
 * Main Job-Management Chat Service.
 * Acts as the warm, conversant U.S. Airport Modernization & Investment Intelligence Orchestrator.
 * Manages jobs in PGlite and pg-boss (`createJob`, `updateJob`, `abortJob`, `removeJob`, `listJobs`),
 * and when asked what it can do, explains what the specialized Airport Modernization Jobs (W1-W7)
 * and their calculation & live-telemetry tools can accomplish for the user.
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
          'Create and enqueue a new single-purpose Airport Modernization LLM job in PGlite and pg-boss.',
        inputSchema: z.object({
          title: z.string().describe('Short descriptive title for the job'),
          purpose: z
            .string()
            .describe('The single specific purpose/prompt for this job LLM chat'),
          code: WORKFLOW_ENUM.default('W1').describe('ECS Workflow code W1-W7'),
          airportIata: z
            .string()
            .default('JFK')
            .describe('3-letter US IATA airport code (e.g. JFK, DEN, LAX, ORD, ATL, DFW, DCA, SDF, GEG)'),
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
              workflowName: created.workflowName,
              airportIata: created.airportIata,
              airportName: created.airportName,
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
          jobId: z.string().describe('The job ID to update, e.g. JOB-4100'),
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
          jobId: z.string().describe('The job ID to abort, e.g. JOB-4100'),
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
          jobId: z.string().describe('The job ID to remove, e.g. JOB-4100'),
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
              reports: j.reports ?? [],
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
              `${j.id} (pgBoss=${j.pgBossJobId ?? 'none'}) [${j.code} ${j.airportIata}]: title="${j.title}" | purpose="${j.purpose}" | status=${j.status} | progress=${j.progress}% | reports=${(j.reports ?? []).map((r) => r.reportCode).join(',') || 'none'}`,
          )
          .join('\n')
      : 'No active jobs in queue yet.'

    const systemInstruction = [
      'You are the U.S. Airport Modernization & Investment Intelligence Orchestrator for the Deloitte ECS platform.',
      'Be warm, conversant, consultative, and reassuring! Speak about our platform capabilities as premier Airport Modernization Tools designed to give airport executives, engineers, and financial advisors complete confidence.',
      'Your role in this main chat is two-fold:',
      '1. Manage Airport Modernization jobs in PGlite and pg-boss using your job management tools (`createJob`, `updateJob`, `abortJob`, `removeJob`, `listJobs`).',
      '2. When the user greets you or asks what you can do (or what workflows/tools/reports are available), explain enthusiastically what our specialized Airport Modernization Jobs (W1–W7) can do for them:',
      '   - W1 (Funding, Capital Stack & Rate-Making · Skill S1): Quantifies 5-yr NPIAS/CIP capital gaps, 49 U.S.C. § 47109 AIP federal shares (75%–95%), 14 CFR Part 158 net PFC ($4.39/pax), Senior DSCR (>=1.25x), CPE, and DCOH (>=365d). Reports: R1, R2, R4, R9.',
      '   - W2 (Capital Delivery, NEPA/CSPP & ORAT · Skill S2): Evaluates FAA TAF/ASV triggers, OMB Circular A-94 BCA (NPV/BCR), P3 LLCR (>=1.30x), Earned Value (SPI/CPI/EAC), AC 150/5370-2G overnight CSPP closure efficiency (η), and ACRP 164 ORAT readiness (R >= 0.95). Reports: R2, R3, R5, R6, R9.',
      '   - W3 (Passenger Flow, TSA PGDS & CBP FIS Queueing · Skill S3): Runs multi-server Erlang-C (M/M/c) queueing math for Biometric Bag-Drop, TSA Touchless ID/CT lanes, and CBP Simplified Arrival FIS to solve for 95th-percentile wait W_q95 and optimal active lanes c*. Reports: R6, R7, R10.',
      '   - W4 (NAS / BNATCS Airfield Cutover & Delay Monetization · Skill S4): Tracks FAA BNATCS surface radar/SAI/TFDM/fiber cutovers, scores overnight windows using live NOAA METAR & FAA SWIM traffic, and monetizes ASPM delay savings via USDOT VTTS ($57.20/hr) + ADOM. Reports: R3, R5, R10.',
      '   - W5 (Airport Sustainability, VALE/ZEV & EPA eGRID · Skill S5): Computes Scope 1+2 emissions via U.S. EPA eGRID subregions, 400Hz GPU+PCA gate electrification APU savings, geothermal HVAC, and solar+battery microgrid EaaS P3s. Reports: R8, R9.',
      '   - W6 (Smart-Tech Adoption & Infratech ROI Governance · Skill S6): Scores primary-evidence infratech maturity (0–4), quarantines unofficial consultancy claims, and computes risk-adjusted Infratech NPV. Reports: R3, R7.',
      '   - W7 (Realtime NAS Data Hub & FAA Hub Cohort Benchmarking · Skill S7): Uses `fetchOnlineAirportLiveData` to pull live NOAA METAR, FAA NAS status, and OpenSky ADS-B traffic, and computes standard (z) and robust IQR (z_IQR) cohort benchmarks across U.S. hubs (JFK, DEN, LAX, ORD, ATL, DFW, DCA, SDF, GEG). Reports: R7, R9, R10.',
      '   - Emphasize that reports are NEVER generated without purpose: each job agent uses `fetchOnlineAirportLiveData` and calculation tools first, and only invokes the `generatePdfAssessmentReport` tool to produce the single relevant PDF report (R1–R10) when a report is actually required by the request!',
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
   * Conversant natural-language Airport Modernization Orchestrator when no external
   * LLM token is configured or as deterministic fallback.
   * Explains what the Airport Modernization jobs and tools can do when asked, and
   * dispatches, updates, aborts, removes, or inspects jobs in PGlite + pg-boss.
   */
  private async executeDeterministicJobManagement(
    rawPrompt: string,
    connection: ModelConnectionConfig,
  ): Promise<string> {
    const stripped = rawPrompt.replace(/^\[Context:[^\]]+\]\s*/i, '').trim()
    const lower = stripped.toLowerCase()

    const explicitJobIdMatch = stripped.match(/\b(JOB-\d{3,5})\b/i)
    const contextJobIdMatch = rawPrompt.match(/\[Context:\s*(JOB-\d{3,5})/i)
    const allJobs = this.jobRepository.getAll()
    const targetJobId =
      explicitJobIdMatch?.[1]?.toUpperCase() ??
      contextJobIdMatch?.[1]?.toUpperCase() ??
      allJobs[0]?.id

    const detectedWorkflow = inferWorkflowFromPrompt(stripped)
    const airportMatch = stripped.match(/\b(JFK|DEN|LAX|ORD|ATL|DFW|DCA|SDF|GEG)\b/i)
    const detectedAirport = airportMatch?.[1]?.toUpperCase()

    // 1. CHECK FOR CAPABILITIES / "WHAT CAN YOU DO" / GREETING / HELP INQUIRY FIRST
    const isCapabilitiesOrGreeting =
      /^(hi|hello|hey|greetings|good\s+(morning|afternoon|evening)|help|what\s+can\s+you\s+do|what\s+do\s+you\s+do|how\s+can\s+you\s+help|what\s+are\s+your\s+services|what\s+can\s+the\s+jobs\s+do|explain\s+what\s+you\s+can\s+do|tell\s+me\s+about\s+your\s+tools|what\s+workflows|what\s+reports|who\s+are\s+you)\b/i.test(
        stripped,
      ) ||
      /\b(what\s+can\s+you\s+do|what\s+can\s+the\s+jobs\s+do|what\s+services\s+do\s+you\s+offer|how\s+does\s+this\s+work)\b/i.test(
        lower,
      )

    if (isCapabilitiesOrGreeting) {
      return [
        `### Welcome to Your U.S. Airport Modernization & Investment Intelligence Orchestrator`,
        ``,
        `I am here to make planning, underwriting, and operating your airport modernization programs effortless! As the **Main Orchestrator**, I coordinate specialized **Airport Modernization Job Agents** in \`PGlite\` and \`pg-boss\`. Whenever you need an analysis, live telemetry check, or institutional report, I dispatch the right specialist job for you — and you can open any job's **Conversation** window to collaborate directly with that specialist.`,
        ``,
        `### What Our Airport Modernization Jobs & Tools Can Do For You`,
        ``,
        `- **W1 · Funding, Capital Stack & Airline Rate-Making (\`FundingSystem\` · Skill \`S1\`)**: Uses our Capital Stack, AIP/PFC Grant (\`49 U.S.C. § 47109\` & \`14 CFR Part 158\`), and Rate-Making Tools to quantify 5-year NPIAS/CIP funding gaps, net PFC capacity (\`$4.39/pax\`), Senior/All-In DSCR ($\\ge 1.25\\times$), CPE, and DCOH ($\\ge 365\\text{d}$). *Eligible Reports: \`R1\`, \`R2\`, \`R4\`, \`R9\`.*`,
        `- **W2 · Capital Project Delivery, NEPA/CSPP & ORAT (\`ProjectLifecycleSystem\` · Skill \`S2\`)**: Uses our BCA, Earned Value (\`SPI\`/\`CPI\`/\`EAC\`), \`AC 150/5370-2G\` overnight closure efficiency ($\\eta$), and \`ACRP Report 164\` ORAT Readiness ($R \\ge 0.95$) Tools to keep major terminal and airfield builds on schedule. *Eligible Reports: \`R2\`, \`R3\`, \`R5\`, \`R6\`, \`R9\`.*`,
        `- **W3 · Passenger Journey, TSA PGDS & CBP FIS Flow (\`PassengerFlowSystem\` · Skill \`S3\`)**: Runs multi-server **Erlang-C ($M/M/c$)** queueing tools for Biometric Self-Bag-Drop, TSA PreCheck Touchless ID / CT lanes, and CBP Simplified Arrival FIS to keep 95th-percentile wait times ($W_{q95}$) within budget and solve for optimal active lanes ($c^*$). *Eligible Reports: \`R6\`, \`R7\`, \`R10\`.*`,
        `- **W4 · NAS / BNATCS Airfield Cutover & Delay Savings (\`ATCDeploymentSystem\` · Skill \`S4\`)**: Tracks FAA BNATCS surface radar, SAI, TFDM, and fiber cutovers, scores low-traffic overnight windows using live NOAA METAR & FAA SWIM feeds, and monetizes ASPM delay savings via USDOT VTTS (\`$57.20/hr\`) + ADOM. *Eligible Reports: \`R3\`, \`R5\`, \`R10\`.*`,
        `- **W5 · Airport Sustainability, VALE/ZEV & EPA eGRID (\`SustainabilitySystem\` · Skill \`S5\`)**: Uses official U.S. EPA \`eGRID\` subregional grid factors and FAA AEDT/VALE tools to quantify \`400Hz GPU + PCA\` gate electrification APU savings, geothermal HVAC, and solar+battery microgrid EaaS P3s. *Eligible Reports: \`R8\`, \`R9\`.*`,
        `- **W6 · Smart-Tech Adoption & Infratech ROI Governance (\`MaturitySystem\` · Skill \`S6\`)**: Scores primary-evidence infratech maturity ($0\\text{–}4$), enforces \`DataReadinessHold\` gates, and quarantines unofficial vendor/consultancy claims. *Eligible Reports: \`R3\`, \`R7\`.*`,
        `- **W7 · Realtime NAS Data Hub & FAA Hub Cohort Benchmarking (\`IngestionSystem\` · Skill \`S7\`)**: Uses \`fetchOnlineAirportLiveData\` to pull live **NOAA AviationWeather.gov METAR**, **FAA NAS Status**, and **OpenSky ADS-B** traffic, and computes standard ($z$) and robust IQR ($z_{\\text{IQR}}$) benchmarks across U.S. hubs (\`JFK\`, \`DEN\`, \`LAX\`, \`ORD\`, \`ATL\`, \`DFW\`, \`DCA\`, \`SDF\`, \`GEG\`). *Eligible Reports: \`R7\`, \`R9\`, \`R10\`.*`,
        ``,
        `### Purpose-Driven Report Discipline`,
        `- **Live Online Data + Requisite Calculations First**: Every job agent automatically queries live online aviation feeds (\`fetchOnlineAirportLiveData\`) and runs the exact domain math tools required for your request.`,
        `- **Reports Only When Required**: Agents **do not** generate PDF reports unless your job purpose or prompt requires one. When a report *is* required, our \`generatePdfAssessmentReport\` tool compiles **only the single matching report (\`R1\`–\`R10\`)** populated with your request's live telemetry and calculated numbers.`,
        ``,
        `How would you like to begin? You can ask me to dispatch a quick live analysis (without a report) or a full assessment with a specific PDF report!`,
      ].join('\n')
    }

    const hasCreateIntent =
      !explicitJobIdMatch &&
      (/^(please\s+)?(create|start|dispatch|launch|add|new\s+job|queue|spawn|run|evaluate|audit|analyze|check|model|assess|verify|compute|generate)\b/i.test(
        stripped,
      ) ||
        /\b(create|start|dispatch|launch|add|new job|queue|spawn|run a job)\b/i.test(
          lower,
        ) ||
        Boolean(detectedAirport && stripped.length > 12))

    // 2. CREATE / START / DISPATCH / ANALYZE NEW JOB INTENT
    if (hasCreateIntent) {
      const code: WorkflowCode = detectedWorkflow
      const airportIata = detectedAirport || 'JFK'
      const baseline =
        US_AIRPORT_BASELINES[airportIata] ?? US_AIRPORT_BASELINES.JFK
      const purposeText =
        stripped
          .replace(
            /^(please\s+)?(create|start|dispatch|launch|add|queue|spawn|run)\s+(a\s+)?(new\s+)?(w[1-7]\s+)?(job\s+)?(to|for)?\s*/i,
            '',
          )
          .trim() || `Execute ${code} Airport Modernization analysis for ${airportIata}`

      const shortTitle =
        purposeText.length > 52 ? `${purposeText.slice(0, 49)}…` : purposeText

      const reportReq = evaluateReportRequirement(purposeText, code)

      const created = await this.jobRepository.create({
        code,
        airportIata,
        title: shortTitle.charAt(0).toUpperCase() + shortTitle.slice(1),
        purpose: purposeText,
      })

      return [
        `I would be delighted to help with your **${baseline.name} (${created.airportIata})** modernization initiative! I have dispatched a dedicated **${created.code} — ${created.workflowName}** specialist job in \`PGlite\` and \`pg-boss\`.`,
        ``,
        `### Airport Modernization Job Dispatched (\`createJob\`)`,
        ``,
        `- **New Job ID**: \`${created.id}\` (\`pg-boss\` ID: \`${created.pgBossJobId ?? 'queued'}\`)`,
        `- **Modernization Service**: \`${created.code}\` · **${created.workflowName}** (\`${created.ecsSystem}\`)`,
        `- **Target Airport**: **${created.airportName} (${created.airportIata} / ${created.airportIcao})**`,
        `- **Single Specific Mandate**: ${created.purpose}`,
        `- **Report Generation Plan**: ${
          reportReq.required
            ? `Will invoke \`generatePdfAssessmentReport\` to compile single relevant report **${reportReq.reportCode}** (${reportReq.selectionReason})`
            : `Interactive telemetry & calculation run — **no PDF report will be generated** unless you request one in the job chat`
        }`,
        `- **Status**: **IN PROGRESS** (${created.progress}%)`,
        ``,
        `Your specialist Job Agent is now calling \`fetchOnlineAirportLiveData\` (NOAA METAR, FAA NAS Status & OpenSky ADS-B) and running the requisite calculation tools. Click **Conversation** on **${created.id}** in the right-hand panel anytime to engage directly with the specialist agent!`,
      ].join('\n')
    }

    // 3. REMOVE / DELETE JOB INTENT
    if (
      /\b(remove|delete|drop|purge)\b/i.test(lower) &&
      targetJobId
    ) {
      const existing = this.jobRepository.getById(targetJobId)
      const removed = await this.jobRepository.remove(targetJobId)
      if (!removed || !existing) {
        return `I checked our \`PGlite\` / \`pg-boss\` queue, and I could not find a job with ID \`${targetJobId}\` to remove. Would you like me to list the current jobs for you?`
      }
      return [
        `Certainly! I have cancelled and permanently removed **${existing.id}** from your Airport Modernization queue.`,
        ``,
        `### Airport Modernization Job Removed (\`removeJob\`)`,
        ``,
        `- **Removed Job**: \`${existing.id}\` (*${existing.title}*)`,
        `- **pg-boss Queue ID**: \`${existing.pgBossJobId ?? 'cancelled'}\``,
        `- **Mandate**: ${existing.purpose}`,
        `- **Status**: Cancelled in \`pg-boss\` and deleted from \`PGlite\`.`,
      ].join('\n')
    }

    // 4. ABORT / CANCEL / STOP JOB INTENT
    if (
      /\b(abort|cancel|stop|halt|kill)\b/i.test(lower) &&
      targetJobId
    ) {
      const aborted = await this.jobRepository.abort(
        targetJobId,
        `Aborted via Job Management Chat: "${stripped.slice(0, 80)}"`,
      )
      if (!aborted) {
        return `I could not find job \`${targetJobId}\` in \`PGlite\` to abort. Let me know if you meant a different job ID!`
      }
      return [
        `Understood — I have immediately halted **${aborted.id}** in \`pg-boss\` and transitioned its state to **Aborted**.`,
        ``,
        `### Airport Modernization Job Aborted (\`abortJob\`)`,
        ``,
        `- **Job**: \`${aborted.id}\` · \`${aborted.code}\` (**${aborted.workflowName}**) · **${aborted.airportIata}** (*${aborted.title}*)`,
        `- **pg-boss Queue ID**: \`${aborted.pgBossJobId ?? 'n/a'}\` (cancelled)`,
        `- **New Status**: **FAILURE / ABORTED** (Red · ${aborted.progress}%)`,
        `- **Mandate**: ${aborted.purpose}`,
        ``,
        `If you ever want to resume or repurpose **${aborted.id}**, just tell me *"Update ${aborted.id} purpose to..."* and I will re-orchestrate it for you.`,
      ].join('\n')
    }

    // 5. UPDATE / MODIFY / CHANGE / RESUME JOB INTENT
    if (
      /\b(update|change|modify|repurpose|set purpose|rename|restart|resume)\b/i.test(lower) &&
      targetJobId
    ) {
      const current = this.jobRepository.getById(targetJobId)
      if (!current) {
        return `I could not find job \`${targetJobId}\` in \`PGlite\` to update.`
      }

      const cleanedPurpose = stripped
        .replace(/^(please\s+)?(update|change|modify|repurpose|rename|restart|resume)\s+(job\s+)?(JOB-\d+\s*)?(to|with|purpose\s+to)?\s*/i, '')
        .trim()

      const nextPurpose =
        cleanedPurpose.length > 6 ? cleanedPurpose : `${current.purpose} (Updated via chat)`
      const nextCode = /\bW[1-7]\b/i.test(stripped) ? detectedWorkflow : current.code
      const reportReq = evaluateReportRequirement(nextPurpose, nextCode)

      const updated = await this.jobRepository.update(targetJobId, {
        purpose: nextPurpose,
        code: nextCode,
        status: 'in_progress',
      })

      return [
        `Gladly! I have updated **${updated!.id}** and re-queued its Airport Modernization specialist agent in \`pg-boss\` with your revised objective.`,
        ``,
        `### Airport Modernization Job Updated (\`updateJob\`)`,
        ``,
        `- **Job**: \`${updated!.id}\` · \`${updated!.code}\` (**${updated!.workflowName}**) · **${updated!.airportIata}** (*${updated!.title}*)`,
        `- **Re-Orchestrated pg-boss ID**: \`${updated!.pgBossJobId ?? 'n/a'}\``,
        `- **Status**: \`${updated!.status}\` (${updated!.progress}%)`,
        `- **Updated Mandate**: ${updated!.purpose}`,
        `- **Report Generation Plan**: ${
          reportReq.required
            ? `Will invoke \`generatePdfAssessmentReport\` for single matching report **${reportReq.reportCode}**`
            : `Live calculation & telemetry run without generating a new PDF report unless requested`
        }`,
      ].join('\n')
    }

    // 6. INSPECT SPECIFIC JOB OR LIST JOBS VIA `listJobs` TOOL
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
      const reportInfo =
        matchedJob.reports && matchedJob.reports.length > 0
          ? matchedJob.reports
              .map((r) => `**${r.reportCode}** (\`${r.fileName}\`)`)
              .join(', ')
          : 'None generated (report was not required for this mandate; you can request one in the Job Conversation anytime)'
      return [
        `Here is the latest overview for **${matchedJob.id}** at **${matchedJob.airportName} (${matchedJob.airportIata})**:`,
        ``,
        `### Airport Modernization Job Inspection (\`listJobs\` → \`${matchedJob.id}\`)`,
        ``,
        `- **Job & Service**: \`${matchedJob.id}\` · \`${matchedJob.code}\` (**${matchedJob.workflowName}** · \`${matchedJob.ecsSystem}\`)`,
        `- **Airport**: **${matchedJob.airportName} (${matchedJob.airportIata} / ${matchedJob.airportIcao})**`,
        `- **Status**: **${matchedJob.status.toUpperCase()}** (${matchedJob.progress}% complete)`,
        `- **Primary Calculated Metric (${matchedJob.keyMetricLabel})**: \`${matchedJob.keyMetricValue}\``,
        `- **Tool-Generated PDF Report**: ${reportInfo}`,
        `- **Single Specific Mandate**: ${matchedJob.purpose}`,
        latestChat
          ? `- **Latest Specialist Message** (*${latestChat.timestamp}*): "${latestChat.content.slice(0, 260)}${latestChat.content.length > 260 ? '…' : ''}"`
          : '',
        ``,
        `You can open **${matchedJob.id}**'s **Conversation** window on the right to chat directly with its specialist agent, or tell me here to **update**, **abort**, or **remove** \`${matchedJob.id}\`.`,
      ]
        .filter(Boolean)
        .join('\n')
    }

    const runningCount = jobs.filter((j) => j.status === 'in_progress').length
    const completedCount = jobs.filter((j) => j.status === 'completed').length
    const failedCount = jobs.filter((j) => j.status === 'failed').length

    return [
      `### U.S. Airport Modernization & Investment Intelligence Orchestrator`,
      ``,
      `I am your **Main Job Orchestrator** (\`${connection.modelId}\`), ready to help you launch and manage specialized **Airport Modernization Jobs (W1–W7)** across U.S. NPIAS hubs (\`JFK\`, \`DEN\`, \`LAX\`, \`ORD\`, \`ATL\`, \`DFW\`, \`DCA\`, \`SDF\`, \`GEG\`).`,
      ``,
      `- **Current Queue**: **${jobs.length} total jobs** (**${runningCount} in progress**, **${completedCount} complete**, **${failedCount} failed/aborted**)`,
      ...jobs.slice(0, 5).map(
        (j) =>
          `- **${j.id} (${j.code} · ${j.airportIata})** [${j.status} · ${j.progress}%] — *Mandate*: ${j.purpose.slice(0, 80)}${j.purpose.length > 80 ? '…' : ''}`,
      ),
      ``,
      `### How Can I Help You Today?`,
      `- Ask **"What can you do?"** for a full tour of our **W1–W7 Airport Modernization Jobs**, **Live Online Telemetry Tool (\`fetchOnlineAirportLiveData\`)**, **Calculation Tools**, and **R1–R10 PDF Assessment Reports**.`,
      `- **Dispatch a live calculation/telemetry job (no report required)**: e.g., *"Create a W3 job for ATL to check live TSA PreCheck and biometric bag-drop Erlang-C wait times"*`,
      `- **Dispatch a formal report job (single matching PDF generated by tool)**: e.g., *"Create a W1 job for ORD to audit AIP grant drawdowns and generate the R4 PDF report"*`,
    ].join('\n')
  }
}
