import {
  type FunctionDeclaration,
  GoogleGenAI,
  Type,
} from '@google/genai'
import type { WorkflowCode } from '../../client/src/types/jobs.ts'
import type { ILogger } from '../logging/logger.ts'
import type { IJobRepository } from '../services/job-repository.ts'

export function isGeminiConnection(config: {
  provider?: string
  modelId?: string
  baseUrl?: string
}): boolean {
  if (config.provider === 'gemini') return true
  if (config.provider === 'openai') return false
  const model = (config.modelId || '').toLowerCase()
  const base = (config.baseUrl || '').toLowerCase()
  return (
    model.startsWith('gemini') ||
    base.includes('googleapis.com') ||
    base.includes('generativelanguage')
  )
}

export function resolveGeminiModelName(requestedModelId?: string): string {
  const raw = (requestedModelId || '').trim()
  const lower = raw.toLowerCase()

  if (!raw || lower === 'gemini' || lower === 'gemini-3.8-flash') {
    return 'gemini-3.8-flash'
  }
  if (lower === 'gemini-flash' || lower === 'gemini flash' || lower === 'gemini-flash-latest') {
    return 'gemini-flash-latest'
  }
  if (
    lower === 'gemini-lite' ||
    lower === 'flash-lite' ||
    lower === 'gemini-3.1-flash-lite'
  ) {
    return 'gemini-3.1-flash-lite'
  }
  // Never use deprecated Gemini 1.5 or 2.0 models; upgrade to gemini-3.8-flash
  if (
    lower.startsWith('gemini-1.5') ||
    lower.startsWith('gemini-2.0') ||
    lower === 'gemini-pro' ||
    lower.startsWith('gpt-')
  ) {
    return 'gemini-3.8-flash'
  }
  return raw
}

export function createServerGeminiClient(apiKeyOverride?: string): GoogleGenAI {
  const apiKey = apiKeyOverride?.trim() || process.env.GEMINI_API_KEY?.trim() || ''
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  })
}

const JOB_MANAGEMENT_FUNCTION_DECLARATIONS: FunctionDeclaration[] = [
  {
    name: 'createJob',
    description:
      'Create and enqueue a new single-purpose LLM job in PGlite and pg-boss.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: {
          type: Type.STRING,
          description: 'Short descriptive title for the job',
        },
        purpose: {
          type: Type.STRING,
          description: 'The single specific purpose/prompt for this job LLM chat',
        },
        code: {
          type: Type.STRING,
          description: 'ECS Workflow code W1, W2, W3, W4, W5, W6, or W7',
        },
        airportIata: {
          type: Type.STRING,
          description:
            '3-letter US IATA airport code (JFK, DEN, LAX, ORD, ATL, DFW, DCA, SDF, GEG)',
        },
      },
      required: ['title', 'purpose', 'code', 'airportIata'],
    },
  },
  {
    name: 'updateJob',
    description:
      'Update an existing job (its single specific purpose, title, workflow code, or status) and re-orchestrate it in pg-boss.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        jobId: {
          type: Type.STRING,
          description: 'The job ID to update, e.g. JOB-4100',
        },
        title: {
          type: Type.STRING,
          description: 'Updated job title',
        },
        purpose: {
          type: Type.STRING,
          description: 'Updated single specific purpose for the job LLM chat',
        },
        code: {
          type: Type.STRING,
          description: 'Updated workflow code W1-W7',
        },
      },
      required: ['jobId'],
    },
  },
  {
    name: 'abortJob',
    description:
      'Abort an active job in pg-boss and transition its status to failed/Aborted.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        jobId: {
          type: Type.STRING,
          description: 'The job ID to abort, e.g. JOB-4100',
        },
        reason: {
          type: Type.STRING,
          description: 'Reason for aborting the job',
        },
      },
      required: ['jobId'],
    },
  },
  {
    name: 'removeJob',
    description:
      'Cancel and permanently remove a job from pg-boss and PGlite storage.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        jobId: {
          type: Type.STRING,
          description: 'The job ID to remove, e.g. JOB-4100',
        },
      },
      required: ['jobId'],
    },
  },
  {
    name: 'listJobs',
    description:
      'List current jobs managed by PGlite and pg-boss or inspect a specific job ID.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        jobId: {
          type: Type.STRING,
          description: 'Optional specific job ID to inspect',
        },
      },
    },
  },
]

export async function runGeminiJobManagementChat(params: {
  apiKey: string
  modelId: string
  userPrompt: string
  systemInstruction: string
  jobRepository: IJobRepository
  logger: ILogger
}): Promise<string | null> {
  const ai = createServerGeminiClient(params.apiKey)
  const model = resolveGeminiModelName(params.modelId)

  const response = await ai.models.generateContent({
    model,
    contents: params.userPrompt,
    config: {
      systemInstruction: params.systemInstruction,
      tools: [{ functionDeclarations: JOB_MANAGEMENT_FUNCTION_DECLARATIONS }],
    },
  })

  const functionCalls = response.functionCalls
  if (functionCalls && functionCalls.length > 0) {
    const toolSummaries: string[] = []
    for (const call of functionCalls) {
      const args = (call.args ?? {}) as Record<string, unknown>
      params.logger.info('gemini.tool_call', {
        model,
        toolName: call.name,
        args,
      })

      if (call.name === 'createJob') {
        const code = (String(args.code || 'W4').toUpperCase() as WorkflowCode) || 'W4'
        const airportIata = String(args.airportIata || 'JFK').toUpperCase()
        const purpose =
          String(args.purpose || '').trim() ||
          `Execute ${code} analysis for ${airportIata}`
        const title =
          String(args.title || '').trim() ||
          (purpose.length > 52 ? `${purpose.slice(0, 49)}…` : purpose)

        const created = await params.jobRepository.create({
          code,
          airportIata,
          title,
          purpose,
        })
        toolSummaries.push(
          [
            `### Job Created via Google Gemini (\`createJob\` · \`${model}\`)`,
            ``,
            `- **New Job ID**: \`${created.id}\` (\`pg-boss\` ID: \`${created.pgBossJobId ?? 'queued'}\`)`,
            `- **Workflow & Airport**: \`${created.code}\` (${created.ecsSystem}) · **${created.airportIata} (${created.airportIcao})**`,
            `- **Single Purpose**: ${created.purpose}`,
            `- **Status**: **IN PROGRESS** (${created.progress}%)`,
          ].join('\n'),
        )
      } else if (call.name === 'updateJob') {
        const jobId = String(args.jobId || '').trim()
        const purpose = args.purpose ? String(args.purpose).trim() : undefined
        const title = args.title ? String(args.title).trim() : undefined
        const code = args.code
          ? (String(args.code).toUpperCase() as WorkflowCode)
          : undefined
        const updated = await params.jobRepository.update(jobId, {
          purpose,
          title,
          code,
          status: 'in_progress',
        })
        if (updated) {
          toolSummaries.push(
            [
              `### Job Updated via Google Gemini (\`updateJob\` · \`${model}\`)`,
              ``,
              `- **Job**: \`${updated.id}\` · \`${updated.code}\` · **${updated.airportIata}** (*${updated.title}*)`,
              `- **Re-Orchestrated pg-boss ID**: \`${updated.pgBossJobId ?? 'n/a'}\``,
              `- **Updated Single Purpose**: ${updated.purpose}`,
              `- **Status**: \`${updated.status}\` (${updated.progress}%)`,
            ].join('\n'),
          )
        }
      } else if (call.name === 'abortJob') {
        const jobId = String(args.jobId || '').trim()
        const reason = args.reason ? String(args.reason).trim() : undefined
        const aborted = await params.jobRepository.abort(jobId, reason)
        if (aborted) {
          toolSummaries.push(
            [
              `### Job Aborted via Google Gemini (\`abortJob\` · \`${model}\`)`,
              ``,
              `- **Job**: \`${aborted.id}\` · \`${aborted.code}\` · **${aborted.airportIata}** (*${aborted.title}*)`,
              `- **New Status**: **FAILURE / ABORTED** (${aborted.progress}%)`,
              `- **Single Purpose**: ${aborted.purpose}`,
            ].join('\n'),
          )
        }
      } else if (call.name === 'removeJob') {
        const jobId = String(args.jobId || '').trim()
        const existing = params.jobRepository.getById(jobId)
        const removed = await params.jobRepository.remove(jobId)
        if (removed && existing) {
          toolSummaries.push(
            [
              `### Job Removed via Google Gemini (\`removeJob\` · \`${model}\`)`,
              ``,
              `- **Removed Job**: \`${existing.id}\` (*${existing.title}*)`,
              `- **Status**: Cancelled in \`pg-boss\` and deleted from \`PGlite\`.`,
            ].join('\n'),
          )
        }
      } else if (call.name === 'listJobs') {
        const jobId = args.jobId ? String(args.jobId).trim() : undefined
        if (jobId) {
          const found = params.jobRepository.getById(jobId)
          if (found) {
            toolSummaries.push(
              [
                `### Job Inspection via Google Gemini (\`listJobs\` → \`${found.id}\`)`,
                ``,
                `- **Job**: \`${found.id}\` · \`${found.code}\` · **${found.airportIata} / ${found.airportIcao}**`,
                `- **Status**: **${found.status.toUpperCase()}** (${found.progress}% · \`${found.ecsSystem}\`)`,
                `- **Single Purpose**: ${found.purpose}`,
              ].join('\n'),
            )
          }
        }
      }
    }

    if (toolSummaries.length > 0) {
      return toolSummaries.join('\n\n')
    }
  }

  return response.text?.trim() || null
}

export async function runGeminiJobSkillConsultation(params: {
  apiKey: string
  modelId: string
  systemInstruction: string
  prompt: string
}): Promise<string | null> {
  const ai = createServerGeminiClient(params.apiKey)
  const model = resolveGeminiModelName(params.modelId)

  const response = await ai.models.generateContent({
    model,
    contents: params.prompt,
    config: {
      systemInstruction: params.systemInstruction,
    },
  })

  return response.text?.trim() || null
}
