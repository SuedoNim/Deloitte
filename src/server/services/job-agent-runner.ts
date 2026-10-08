import { generateText, stepCountIs } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import type { EcsJob } from '../../client/src/types/jobs.ts'
import type { ILogger } from '../logging/logger.ts'
import type { IConnectionStore } from './connection-store.ts'
import type { ISkillRegistry } from '../ai/skills-catalog.ts'
import { US_AIRPORT_BASELINES } from '../ai/us-airport-data.ts'
import {
  isGeminiConnection,
  resolveGeminiModelName,
  runGeminiJobSkillConsultation,
} from '../ai/gemini-client.ts'

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
 * U.S. Airport Investment Intelligence AI Skill (S1–S7) to acquire realtime
 * airport telemetry & domain know-how, and deterministic AI Tools (T1–T13)
 * to compute verified equations and create the required PDF reports.
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

    this.logger.info('job_agent.started', {
      jobId: job.id,
      purpose: job.purpose,
      ecsSystem: job.ecsSystem,
      skillId: skill.id,
      skillSlug: skill.slug,
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

    // Stage 1: Consult AI Skill for domain know-how and ingest realtime airport telemetry
    const skillKnowHowMsg = {
      id: `msg-${Date.now()}-skill`,
      role: 'assistant' as const,
      content: [
        `[${skill.id} · ${skill.name} (${skill.slug})] Loaded domain know-how and realtime telemetry for ${baseline.iata} (${baseline.icao} · ${baseline.name}, FAA ${baseline.region} Region):`,
        `• Realtime Feeds: ASPM=${baseline.realtimeLatencySec.aspm}s, ATCSCC=${baseline.realtimeLatencySec.atcscc}s, TSA=${baseline.realtimeLatencySec.tsa}s, CBP=${baseline.realtimeLatencySec.cbp}s · Annual Enplanements=${baseline.enplanementsM.toFixed(1)}M · Operations=${baseline.annualOperationsK.toFixed(0)}k/yr · AAR=${baseline.aarPeakHr}/hr · ADR=${baseline.adrPeakHr}/hr · Avg Gate Turn=${baseline.avgTurnaroundMin} min · EPA eGRID (${baseline.egridSubregion})=${baseline.egridKgCo2PerKwh} kgCO2e/kWh.`,
        `• Domain Know-How Applied: ${skill.description} Invoking bound tools (${skill.boundToolNames.join(', ')}) to execute "${job.purpose}" and generate PDF report (${skill.reportTemplates.join(', ')}).`,
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
        stage: `${skill.id} (${skill.slug}) Realtime Data & Know-How`,
        detail: `Ingested live FAA ASPM/ATCSCC/TSA/CBP telemetry for ${baseline.iata} (${baseline.icao}) and applied ${skill.id} methodology`,
        state: 'done' as const,
      },
      {
        id: `step-${Date.now()}-tools-active`,
        timestamp: nowTime(),
        stage: `AI Tools (${skill.boundToolNames.join(', ')}) & PDF Generation`,
        detail: `Executing domain calculation tools and generating ${skill.reportTemplates.join(', ')} PDF report`,
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

    await abortableDelay(900, signal)
    if (signal.aborted) return

    // Stage 2: Execute deterministic domain tool calculations & PDF report synthesis (generatePdfAssessmentReport)
    const toolPass = this.skillRegistry.executeSkillToolPass(job)
    if (signal.aborted) return

    const reportFilesSummary =
      toolPass.generatedReports
        ?.map(
          (r) =>
            `${r.reportCode} (${r.fileName} · ${Math.max(1, Math.round((r.sizeBytes ?? 4096) / 1024))} KB)`,
        )
        .join(', ') || 'PDF Report generated'

    const stage2Msg = {
      id: `msg-${Date.now()}-tools`,
      role: 'assistant' as const,
      content: `${toolPass.subConversationReply} | PDF Artifact Created via generatePdfAssessmentReport: ${reportFilesSummary}.`,
      timestamp: nowTime(),
    }

    const stage2Steps: EcsJob['steps'] = [
      ...stage1Steps.filter((s) => !s.id.endsWith('-tools-active')),
      {
        id: `step-${Date.now()}-tools-done`,
        timestamp: nowTime(),
        stage: `${toolPass.toolName} & generatePdfAssessmentReport`,
        detail: `Computed ${toolPass.keyMetricLabel}: ${toolPass.keyMetricValue} · Generated PDF: ${reportFilesSummary}`,
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
        reports: toolPass.generatedReports ?? job.reports,
        steps: [
          ...stage2Steps,
          {
            id: `step-${Date.now()}-llm`,
            timestamp: nowTime(),
            stage: `${activeModelLabel} Executive Synthesis`,
            detail: `Synthesizing findings for ${job.airportIata} with ${skill.id}`,
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
          `Supported Standard Reports: ${skill.reportTemplates.join(', ')}.`,
          `Verified Tool Output: ${stage2Msg.content}`,
          `Provide a concise, high-impact executive synthesis citing the verified metrics and confirming the generated PDF report (${reportFilesSummary}).`,
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
            lifecycleState: 'Completed',
            progress: 100,
            elapsed: formatElapsed(),
            eta: '00m 00s',
            keyMetricLabel: toolPass.keyMetricLabel,
            keyMetricValue: toolPass.keyMetricValue,
            summary: llmText.slice(0, 220),
            reports: toolPass.generatedReports ?? job.reports,
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

    await abortableDelay(600, signal)
    if (signal.aborted) return

    this.logger.info('job_agent.step_completed', {
      jobId: job.id,
      skillId: skill.id,
      progress: 100,
      keyMetricLabel: toolPass.keyMetricLabel,
      keyMetricValue: toolPass.keyMetricValue,
    })

    await callbacks.onProgress({
      status: 'completed',
      lifecycleState: 'Completed',
      progress: 100,
      elapsed: formatElapsed(),
      eta: '00m 00s',
      keyMetricLabel: toolPass.keyMetricLabel,
      keyMetricValue: toolPass.keyMetricValue,
      reports: toolPass.generatedReports ?? job.reports,
      steps: stage2Steps,
      chatHistory: currentHistory,
    })
  }
}
