import { generateText, stepCountIs } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import type { EcsJob } from '../../client/src/types/jobs.ts'
import type { ILogger } from '../logging/logger.ts'
import type { IConnectionStore } from './connection-store.ts'
import type { ISkillRegistry } from '../ai/skills-catalog.ts'
import { evaluateReportRequirement } from '../ai/tools-registry.ts'
import { US_AIRPORT_BASELINES } from '../ai/us-airport-data.ts'
import {
  isGeminiConnection,
  resolveGeminiModelName,
  runGeminiJobSkillConsultation,
} from '../ai/gemini-client.ts'

export interface JobExecutionCallbacks {
  onProgress: (patch: Partial<EcsJob>) => Promise<void>
}

export interface InteractiveJobTurnResult {
  replyText: string
  keyMetricLabel: string
  keyMetricValue: string
  reports: EcsJob['reports']
  stepDetail: string
}

export interface IJobAgentRunner {
  runJobChat(
    job: EcsJob,
    signal: AbortSignal,
    callbacks: JobExecutionCallbacks,
  ): Promise<void>
  runInteractiveJobTurn(
    job: EcsJob,
    userMessage: string,
  ): Promise<InteractiveJobTurnResult>
}

function abortableDelay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) {
      resolve()
      return
    }
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    const onAbort = () => {
      clearTimeout(timer)
      resolve()
    }
    signal.addEventListener('abort', onAbort, { once: true })
  })
}

/**
 * Executes a single-purpose LLM chat for a specific EcsJob using its bound
 * U.S. Airport Modernization & Investment Intelligence AI Skill (S1–S7) to acquire
 * live online airport telemetry (`fetchOnlineAirportLiveData`) & domain know-how,
 * deterministic AI Tools (T1–T12) to compute verified equations, and Tool T13
 * (`generatePdfAssessmentReport`) ONLY when a PDF report is required by the request.
 */
export class SinglePurposeLlmJobRunner implements IJobAgentRunner {
  private readonly connectionStore: IConnectionStore
  private readonly skillRegistry: ISkillRegistry
  private readonly logger: ILogger

  constructor(
    connectionStore: IConnectionStore,
    skillRegistry: ISkillRegistry,
    logger: ILogger,
  ) {
    this.connectionStore = connectionStore
    this.skillRegistry = skillRegistry
    this.logger = logger
  }

  async runJobChat(
    job: EcsJob,
    signal: AbortSignal,
    callbacks: JobExecutionCallbacks,
  ): Promise<void> {
    if (signal.aborted) return

    const skill = this.skillRegistry.getSkillForWorkflow(job.code)
    const boundTools = this.skillRegistry.getToolsForWorkflow(job.code)
    const baseline =
      US_AIRPORT_BASELINES[job.airportIata.toUpperCase()] ??
      US_AIRPORT_BASELINES.JFK
    const reportReq = evaluateReportRequirement(job.purpose, job.code)

    this.logger.info('job_agent.started', {
      jobId: job.id,
      purpose: job.purpose,
      ecsSystem: job.ecsSystem,
      skillId: skill.id,
      skillSlug: skill.slug,
      reportRequired: reportReq.required,
      targetReportCode: reportReq.reportCode,
      boundTools: skill.boundToolNames,
    })

    const conn = this.connectionStore.resolveForRequest()
    const startedMs = Date.now()
    const nowTime = () => new Date().toISOString().slice(11, 19)
    const formatElapsed = () => {
      const totalSec = Math.max(1, Math.round((Date.now() - startedMs) / 1000))
      const mins = String(Math.floor(totalSec / 60)).padStart(2, '0')
      const secs = String(totalSec % 60).padStart(2, '0')
      return `${mins}m ${secs}s`
    }

    const calcToolNames = skill.boundToolNames.filter(
      (n) => n !== 'generatePdfAssessmentReport',
    )

    // Stage 1: Conversant Airport Modernization Specialist introduction & live online data lookup initiation
    const skillKnowHowMsg = {
      id: `msg-${Date.now()}-skill`,
      role: 'assistant' as const,
      content: [
        `Hello! I am your **${skill.name}** Specialist Agent (\`${skill.id}\` · \`${job.ecsSystem}\`) for **${baseline.name} (${baseline.iata} / ${baseline.icao}, FAA ${baseline.faaRegion} Region)**.`,
        `• **Airport Modernization Tools Engaged**: I am now running \`fetchOnlineAirportLiveData\` (querying live NOAA AviationWeather.gov METAR, FAA NAS Status at \`nasstatus.faa.gov\`, and OpenSky Network ADS-B state vectors) and feeding those live parameters into \`${calcToolNames.join('`, `')}\`.`,
        `• **Airport Baseline Loaded**: ${(baseline.enplanements / 1_000_000).toFixed(1)}M annual enplanements · ${(baseline.annualOperationsTaf / 1_000).toFixed(0)}k TAF ops/yr (ASV ${(baseline.asvCapacityOps / 1_000).toFixed(0)}k) · ${baseline.rateRegime.toUpperCase()} AULA · CPE $${baseline.cpeUsd.toFixed(2)} · Senior DSCR ${baseline.dscrSenior}x · EPA eGRID (${baseline.egridSubregion}) ${baseline.egridRateTonnesPerMWh} tCO2e/MWh.`,
        `• **Report Plan**: ${
          reportReq.required
            ? `Your mandate requires a formal deliverable, so I will invoke the \`generatePdfAssessmentReport\` tool to compile **only** the single relevant report (**${reportReq.reportCode}**) using our requisite calculations.`
            : `Your mandate is an interactive analysis/telemetry run, so I will **not** generate an unnecessary PDF report unless you ask me for one.`
        }`,
      ].join('\n'),
      timestamp: nowTime(),
    }

    const stage1Steps: EcsJob['steps'] = [
      ...job.steps.map((s) =>
        s.state === 'active' ? { ...s, state: 'done' as const } : s,
      ),
      {
        id: `step-${Date.now()}-skill`,
        timestamp: nowTime(),
        stage: `${skill.id} (${skill.slug}) & Online Live Data Lookup`,
        detail: `Connecting to NOAA AviationWeather.gov, FAA NAS Status & OpenSky ADS-B for ${baseline.iata} (${baseline.icao})`,
        state: 'done' as const,
      },
      {
        id: `step-${Date.now()}-tools-active`,
        timestamp: nowTime(),
        stage: reportReq.required
          ? `Airport Modernization Tools & ${reportReq.reportCode} PDF Tool`
          : `Airport Modernization Calculation Tools (${calcToolNames.join(', ')})`,
        detail: reportReq.required
          ? `Executing requisite calculations and invoking generatePdfAssessmentReport for ${reportReq.reportCode}`
          : `Executing live telemetry and domain calculation tools (no PDF report required)`,
        state: 'active' as const,
      },
    ]

    await callbacks.onProgress({
      progress: 48,
      elapsed: formatElapsed(),
      eta: '00m 03s',
      steps: stage1Steps,
      chatHistory: [...job.chatHistory, skillKnowHowMsg],
    })

    await abortableDelay(700, signal)
    if (signal.aborted) return

    // Stage 2: Execute online live data lookup (T0), domain calculations (T1-T12), and conditional PDF tool (T13)
    const jobWithStage1Chat: EcsJob = {
      ...job,
      steps: stage1Steps,
      chatHistory: [...job.chatHistory, skillKnowHowMsg],
    }
    const toolPass = await this.skillRegistry.executeSkillToolPass(jobWithStage1Chat)
    if (signal.aborted) return

    const reportFilesSummary =
      toolPass.reportRequired && toolPass.generatedReports?.length
        ? toolPass.generatedReports
            .map(
              (r) =>
                `${r.reportCode} (${r.fileName} · ${Math.max(1, Math.round((r.sizeBytes ?? 4096) / 1024))} KB)`,
            )
            .join(', ')
        : 'None (not required by mandate)'

    const stage2Msg = {
      id: `msg-${Date.now()}-tools`,
      role: 'assistant' as const,
      content: toolPass.subConversationReply,
      timestamp: nowTime(),
    }

    const stage2Steps: EcsJob['steps'] = [
      ...stage1Steps.filter((s) => !s.id.endsWith('-tools-active')),
      {
        id: `step-${Date.now()}-tools-done`,
        timestamp: nowTime(),
        stage: toolPass.toolName,
        detail: `Computed ${toolPass.keyMetricLabel}: ${toolPass.keyMetricValue} · PDF Tool Output: ${reportFilesSummary}`,
        state: 'done' as const,
      },
    ]

    const currentHistory = [...job.chatHistory, skillKnowHowMsg, stage2Msg]

    // Stage 3: If an API token is configured, run a single-purpose LLM completion (Google Gemini or OpenAI)
    if (conn.apiToken) {
      const useGemini = isGeminiConnection(conn)
      const activeModelLabel = useGemini
        ? `Google Gemini (${resolveGeminiModelName(conn.modelId)})`
        : `OpenAI (${conn.modelId})`

      await callbacks.onProgress({
        progress: 78,
        elapsed: formatElapsed(),
        eta: '00m 02s',
        keyMetricLabel: toolPass.keyMetricLabel,
        keyMetricValue: toolPass.keyMetricValue,
        reports: toolPass.generatedReports ?? [],
        steps: [
          ...stage2Steps,
          {
            id: `step-${Date.now()}-llm`,
            timestamp: nowTime(),
            stage: `${activeModelLabel} Specialist Advisory`,
            detail: `Preparing conversant Airport Modernization guidance for ${job.airportIata}`,
            state: 'active',
          },
        ],
        chatHistory: currentHistory,
      })

      try {
        const systemPrompt = [
          skill.systemInstruction,
          `Target U.S. Airport: ${job.airportIata} (${job.airportIcao} · ${job.airportName}).`,
          `Single Specific Job Purpose: "${job.purpose}".`,
          `Live Online Data & Requisite Calculation Tool Output:\n${stage2Msg.content}`,
          toolPass.reportRequired
            ? `IMPORTANT: The \`generatePdfAssessmentReport\` tool has ALREADY generated the single matching PDF report (${reportFilesSummary}) containing the requisite calculations. Do NOT write a report yourself — provide a warm, conversant executive commentary on the tool results, confirm that the ${toolPass.reportCode} PDF report was generated by the tool, and invite the user to ask follow-up questions.`
            : `IMPORTANT: A formal PDF report is NOT required for this job mandate, so \`generatePdfAssessmentReport\` was NOT called. Do NOT generate a report! Instead, provide a warm, conversant explanation of our Airport Modernization tool results and invite the user to ask follow-up questions or request the ${toolPass.reportCode} PDF report if they decide they want one.`,
        ].join('\n')

        let llmText: string | null = null

        if (useGemini) {
          llmText = await runGeminiJobSkillConsultation({
            apiKey: conn.apiToken,
            modelId: conn.modelId,
            systemInstruction: systemPrompt,
            prompt: currentHistory
              .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
              .join('\n\n'),
          })
        } else {
          const provider = createOpenAI({
            apiKey: conn.apiToken,
            ...(conn.baseUrl ? { baseURL: conn.baseUrl } : {}),
          })

          const { text } = await generateText({
            model: provider(conn.modelId),
            abortSignal: signal,
            tools: boundTools,
            stopWhen: stepCountIs(3),
            system: systemPrompt,
            messages: currentHistory.map((m) => ({
              role: m.role,
              content: m.content,
            })),
          })
          llmText = text
        }

        if (signal.aborted) return

        if (llmText) {
          const assistantMsg = {
            id: `msg-${Date.now()}-llm`,
            role: 'assistant' as const,
            content: llmText,
            timestamp: nowTime(),
          }

          await callbacks.onProgress({
            status: 'completed',
            lifecycleState: toolPass.reportRequired ? 'ReportGenerated' : 'Completed',
            progress: 100,
            elapsed: formatElapsed(),
            eta: '00m 00s',
            keyMetricLabel: toolPass.keyMetricLabel,
            keyMetricValue: toolPass.keyMetricValue,
            summary: llmText.slice(0, 220),
            reports: toolPass.generatedReports ?? [],
            chatHistory: [...currentHistory, assistantMsg],
            steps: [
              ...stage2Steps,
              {
                id: `step-${Date.now()}-done`,
                timestamp: nowTime(),
                stage: `${skill.id} · ${activeModelLabel} Completed`,
                detail: llmText.slice(0, 140),
                state: 'done',
              },
            ],
          })
          return
        }
      } catch (err) {
        if (signal.aborted) return
        this.logger.warn('job_agent.llm_fallback', {
          jobId: job.id,
          skillId: skill.id,
          error: err instanceof Error ? err.message : String(err),
        })
      }
    }

    await abortableDelay(400, signal)
    if (signal.aborted) return

    this.logger.info('job_agent.step_completed', {
      jobId: job.id,
      skillId: skill.id,
      progress: 100,
      reportRequired: toolPass.reportRequired,
      reportCode: toolPass.reportCode,
      keyMetricLabel: toolPass.keyMetricLabel,
      keyMetricValue: toolPass.keyMetricValue,
    })

    await callbacks.onProgress({
      status: 'completed',
      lifecycleState: toolPass.reportRequired ? 'ReportGenerated' : 'Completed',
      progress: 100,
      elapsed: formatElapsed(),
      eta: '00m 00s',
      keyMetricLabel: toolPass.keyMetricLabel,
      keyMetricValue: toolPass.keyMetricValue,
      summary:
        toolPass.calculationPayload?.calculationNarrative ||
        `${toolPass.keyMetricLabel}: ${toolPass.keyMetricValue}`,
      reports: toolPass.generatedReports ?? [],
      steps: stage2Steps,
      chatHistory: currentHistory,
    })
  }

  /**
   * Handles interactive follow-up messages sent by the user inside a Job's Conversation Modal.
   * Engages the user warmly as an Airport Modernization Specialist, runs live online lookups
   * and calculation tools with any updated user parameters, and ONLY invokes the PDF report
   * generation tool if the user's message requires/requests a report!
   */
  async runInteractiveJobTurn(
    job: EcsJob,
    userMessage: string,
  ): Promise<InteractiveJobTurnResult> {
    const skill = this.skillRegistry.getSkillForWorkflow(job.code)
    const baseline =
      US_AIRPORT_BASELINES[job.airportIata.toUpperCase()] ??
      US_AIRPORT_BASELINES.JFK
    const trimmed = userMessage.trim()
    const lower = trimmed.toLowerCase()

    // Check if the user is asking the job agent what it can do / how it helps
    const isAskingAboutJobCapabilities =
      /\b(what\s+can\s+you\s+do|how\s+can\s+you\s+help|what\s+are\s+your\s+tools|who\s+are\s+you|explain\s+your\s+role|what\s+reports\s+can\s+you)\b/i.test(
        lower,
      )

    if (isAskingAboutJobCapabilities) {
      const existingReports = job.reports ?? []
      const replyText = [
        `I am your dedicated **${skill.name}** Specialist Agent (\`${skill.id}\` · Workflow \`${job.code}\` · \`${job.ecsSystem}\`) for **${baseline.name} (${baseline.iata} / ${baseline.icao})**!`,
        ``,
        `Here is how my **Airport Modernization Tools** can help you in this conversation:`,
        `• **Live Online Aviation Telemetry (\`fetchOnlineAirportLiveData\`)**: I look online at **NOAA AviationWeather.gov** (live METAR/wind/visibility), **FAA NAS Status** (\`nasstatus.faa.gov\`), and **OpenSky Network** (live ADS-B aircraft in ${baseline.iata}'s terminal airspace) to ground every calculation in real-time conditions.`,
        `• **Requisite Domain Calculations**: I run \`${skill.boundToolNames.filter((t) => t !== 'generatePdfAssessmentReport').join('`, `')}\` to compute verified financial, engineering, queueing, and operational metrics. Try asking me a "what-if" question (for example, changing active lanes, passenger arrival rates, project BAC, or electrified gate counts)!`,
        `• **Purpose-Driven PDF Report Tool (\`generatePdfAssessmentReport\`)**: I never generate reports unless you need one. Whenever you are ready for an institutional deliverable, just ask me to generate the relevant report (such as **${skill.reportTemplates[0]}** — supported templates for \`${job.code}\`: \`${skill.reportTemplates.join('`, `')}\`), and my report tool will compile the PDF with our latest calculations.`,
        ``,
        `What calculation, live data check, or scenario would you like to explore for **${baseline.iata}**?`,
      ].join('\n')

      return {
        replyText,
        keyMetricLabel: job.keyMetricLabel,
        keyMetricValue: job.keyMetricValue,
        reports: existingReports,
        stepDetail: `Explained ${skill.id} Airport Modernization tools & interactive capabilities to operator`,
      }
    }

    // Run the live online lookup + requisite calculations + conditional PDF report tool pass
    const toolPass = await this.skillRegistry.executeSkillToolPass(job, trimmed)
    const conn = this.connectionStore.resolveForRequest()

    // If an external LLM token is configured, let the LLM frame the tool output conversationally
    if (conn.apiToken) {
      try {
        const useGemini = isGeminiConnection(conn)
        const systemPrompt = [
          skill.systemInstruction,
          `You are chatting directly with the user inside Job ${job.id} for ${baseline.name} (${baseline.iata} / ${baseline.icao}).`,
          `Original Job Mandate: "${job.purpose}".`,
          `User's Latest Message: "${trimmed}".`,
          `Latest Tool Execution Output:\n${toolPass.subConversationReply}`,
          toolPass.reportRequired
            ? `The \`generatePdfAssessmentReport\` tool was invoked and generated the single relevant report ${toolPass.reportCode} (${toolPass.generatedReports?.[0]?.fileName}). Confirm this warmly and walk the user through the calculated figures.`
            : `No PDF report was required for the user's message, so \`generatePdfAssessmentReport\` was NOT called. Answer the user's message warmly using the live data and calculation tool results, and let them know they can ask you to generate the ${toolPass.reportCode} PDF report whenever they need it.`,
        ].join('\n')

        if (useGemini) {
          const geminiReply = await runGeminiJobSkillConsultation({
            apiKey: conn.apiToken,
            modelId: conn.modelId,
            systemInstruction: systemPrompt,
            prompt: [
              ...job.chatHistory.map((m) => `${m.role.toUpperCase()}: ${m.content}`),
              `USER: ${trimmed}`,
            ].join('\n\n'),
          })
          if (geminiReply) {
            return {
              replyText: geminiReply,
              keyMetricLabel: toolPass.keyMetricLabel,
              keyMetricValue: toolPass.keyMetricValue,
              reports: toolPass.generatedReports ?? job.reports ?? [],
              stepDetail: toolPass.reportRequired
                ? `Executed ${toolPass.toolName} and generated ${toolPass.reportCode} PDF`
                : `Executed ${toolPass.toolName} for operator inquiry (no report required)`,
            }
          }
        }
      } catch (err) {
        this.logger.warn('job_agent.interactive_llm_fallback', {
          jobId: job.id,
          error: err instanceof Error ? err.message : String(err),
        })
      }
    }

    return {
      replyText: toolPass.subConversationReply,
      keyMetricLabel: toolPass.keyMetricLabel,
      keyMetricValue: toolPass.keyMetricValue,
      reports: toolPass.generatedReports ?? job.reports ?? [],
      stepDetail: toolPass.reportRequired
        ? `Executed ${toolPass.toolName} and generated ${toolPass.reportCode} PDF`
        : `Executed ${toolPass.toolName} for operator inquiry (no report required)`,
    }
  }
}
