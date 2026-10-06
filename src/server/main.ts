import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { streamSSE } from 'hono/streaming'
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import {
  INITIAL_ECS_JOBS,
  type EcsJob,
  type ModelConnectionConfig,
} from '../client/src/types/jobs.ts'

const app = new Hono()

// Server-authoritative state for ongoing ECS jobs and model connection configuration
const jobsStore: EcsJob[] = structuredClone(INITIAL_ECS_JOBS)

let serverConnection: ModelConnectionConfig = {
  baseUrl: process.env.OPENAI_BASE_URL?.trim() || 'https://api.openai.com/v1',
  modelId: process.env.OPENAI_MODEL?.trim() || 'gpt-4o-mini',
  apiToken: process.env.OPENAI_API_KEY?.trim() || '',
}

type JobsListener = (jobs: EcsJob[]) => void
const jobsListeners = new Set<JobsListener>()

function broadcastJobs() {
  const snapshot = structuredClone(jobsStore)
  for (const listener of jobsListeners) {
    try {
      listener(snapshot)
    } catch {
      // Ignore disconnected listener errors
    }
  }
}

// Server-side ECS job progression tick (updates in-progress jobs authoritatively and broadcasts via SSE)
setInterval(() => {
  let changed = false
  for (let i = 0; i < jobsStore.length; i++) {
    const job = jobsStore[i]
    if (job.status !== 'in_progress') continue
    changed = true
    const nextProgress = job.progress >= 96 ? 35 : job.progress + 1
    jobsStore[i] = {
      ...job,
      progress: nextProgress,
    }
  }
  if (changed) {
    broadcastJobs()
  }
}, 4000)

app.use('*', cors())

// Authoritative Model Connection Endpoints
app.get('/api/connection', (c) => {
  const hasToken = Boolean(serverConnection.apiToken.trim())
  const raw = serverConnection.apiToken.trim()
  const tokenPreview =
    hasToken && raw.length > 6
      ? `${raw.slice(0, 3)}...${raw.slice(-3)}`
      : hasToken
        ? 'Configured'
        : ''

  return c.json({
    baseUrl: serverConnection.baseUrl,
    modelId: serverConnection.modelId,
    hasToken,
    tokenPreview,
  })
})

app.put('/api/connection', async (c) => {
  const body = await c.req.json<Partial<ModelConnectionConfig>>()
  if (typeof body.baseUrl === 'string') {
    serverConnection.baseUrl = body.baseUrl.trim() || 'https://api.openai.com/v1'
  }
  if (typeof body.modelId === 'string') {
    serverConnection.modelId = body.modelId.trim() || 'gpt-4o-mini'
  }
  if (typeof body.apiToken === 'string') {
    serverConnection.apiToken = body.apiToken.trim()
  }

  const hasToken = Boolean(serverConnection.apiToken.trim())
  return c.json({
    baseUrl: serverConnection.baseUrl,
    modelId: serverConnection.modelId,
    hasToken,
  })
})

// Authoritative Ongoing ECS Jobs Endpoints + SSE Live Stream
app.get('/api/jobs', (c) => {
  return c.json({ jobs: jobsStore })
})

app.get('/api/jobs/stream', (c) => {
  return streamSSE(c, async (stream) => {
    let active = true

    const sendSnapshot = async (jobs: EcsJob[]) => {
      if (!active) return
      await stream.writeSSE({
        event: 'jobs:sync',
        data: JSON.stringify({ jobs }),
      })
    }

    await sendSnapshot(jobsStore)

    const listener: JobsListener = (jobs) => {
      sendSnapshot(jobs).catch(() => {})
    }
    jobsListeners.add(listener)

    stream.onAbort(() => {
      active = false
      jobsListeners.delete(listener)
    })

    while (active) {
      await stream.sleep(15000)
      if (active) {
        await stream.writeSSE({
          event: 'ping',
          data: String(Date.now()),
        })
      }
    }
  })
})

app.post('/api/jobs', async (c) => {
  const body = await c.req.json<Partial<EcsJob>>()
  const idNumber = 4100 + jobsStore.length
  const code = body.code || 'W4'
  const airportIata = (body.airportIata || 'JFK').toUpperCase()
  const airportMap: Record<string, { icao: string; name: string }> = {
    JFK: { icao: 'KJFK', name: 'John F. Kennedy International' },
    DEN: { icao: 'KDEN', name: 'Denver International' },
    LAX: { icao: 'KLAX', name: 'Los Angeles International' },
    ORD: { icao: 'KORD', name: 'Chicago O’Hare International' },
    DEL: { icao: 'VIDP', name: 'Indira Gandhi International (T3)' },
  }
  const workflowMap: Record<
    string,
    { name: string; system: string; state: string; metricLabel: string; metricValue: string }
  > = {
    W1: {
      name: 'Funding & Grant Lifecycle',
      system: 'FundingSystem',
      state: 'DrawdownActive',
      metricLabel: 'Outlay Ratio (OR)',
      metricValue: '0.72 target',
    },
    W2: {
      name: 'Capital Project Delivery & ORAT',
      system: 'ProjectLifecycleSystem',
      state: 'Commissioning',
      metricLabel: 'ORAT Readiness (R)',
      metricValue: '0.96 gate pass',
    },
    W3: {
      name: 'Passenger Journey Modernization',
      system: 'PassengerFlowSystem',
      state: 'Piloting',
      metricLabel: 'Stage Time Delta',
      metricValue: '-24.5% vs baseline',
    },
    W4: {
      name: 'ATC & Airfield Modernization',
      system: 'ATCDeploymentSystem',
      state: 'CutoverScheduled',
      metricLabel: 'Surface Radar Sync',
      metricValue: '99.4% nominal',
    },
    W5: {
      name: 'Sustainability & Energy Transition',
      system: 'SustainabilitySystem',
      state: 'OnTrack',
      metricLabel: 'Scope 1+2 Delta',
      metricValue: '-16.8% kgCO2e/pax',
    },
    W6: {
      name: 'Smart-Tech Adoption Maturity',
      system: 'MaturitySystem',
      state: 'Piloting',
      metricLabel: 'Maturity Dimension',
      metricValue: 'Level 3.4 / 4.0',
    },
    W7: {
      name: 'Realtime Data Compilation & Benchmarking',
      system: 'IngestionSystem',
      state: 'Streaming',
      metricLabel: 'Feed Latency SLA',
      metricValue: '2.8s (RT ≤ 10s)',
    },
  }

  const wf = workflowMap[code] ?? workflowMap.W4
  const ap = airportMap[airportIata] ?? {
    icao: `K${airportIata}`,
    name: `${airportIata} Airport`,
  }

  const newJob: EcsJob = {
    id: `JOB-${idNumber}`,
    code,
    workflowName: wf.name,
    title: body.title?.trim() || `${wf.name} Verification Run`,
    airportIata,
    airportIcao: ap.icao,
    airportName: ap.name,
    ecsSystem: wf.system,
    lifecycleState: wf.state,
    status: 'in_progress',
    progress: 18,
    elapsed: '00m 12s',
    eta: '07m 30s',
    owner: body.owner?.trim() || 'ECS Dispatch Controller',
    keyMetricLabel: wf.metricLabel,
    keyMetricValue: wf.metricValue,
    summary:
      body.summary?.trim() ||
      `Dispatched ${code} (${wf.system}) pipeline for ${airportIata} (${ap.name}).`,
    steps: [
      {
        id: 'step-1',
        timestamp: new Date().toISOString().slice(11, 19),
        stage: 'Entity & Component Resolution',
        detail: `Resolved ${airportIata}/${ap.icao} RelationSet and Provenance components`,
        state: 'done',
      },
      {
        id: 'step-2',
        timestamp: new Date().toISOString().slice(11, 19),
        stage: `${wf.system} Execution`,
        detail: `Running state transition guards for ${wf.state}`,
        state: 'active',
      },
    ],
  }

  jobsStore.unshift(newJob)
  broadcastJobs()
  return c.json({ job: newJob, jobs: jobsStore }, 201)
})

app.post('/api/jobs/:id/abort', (c) => {
  const id = c.req.param('id')
  const idx = jobsStore.findIndex((j) => j.id === id)
  if (idx === -1) {
    return c.json({ error: 'Job not found' }, 404)
  }

  const current = jobsStore[idx]
  if (current.status !== 'in_progress') {
    return c.json({ job: current, jobs: jobsStore })
  }

  const abortedStep = {
    id: `abort-${Date.now()}`,
    timestamp: new Date().toISOString().slice(11, 19),
    stage: 'Operator Abort Signal',
    detail: 'Job execution aborted by operator; state transitioned to Aborted/Failed',
    state: 'warning' as const,
  }

  const updated: EcsJob = {
    ...current,
    status: 'failed',
    lifecycleState: 'Aborted',
    eta: 'Aborted',
    steps: [...current.steps, abortedStep],
  }

  jobsStore[idx] = updated
  broadcastJobs()
  return c.json({ job: updated, jobs: jobsStore })
})

app.patch('/api/jobs/:id', async (c) => {
  const id = c.req.param('id')
  const patch = await c.req.json<Partial<EcsJob>>()
  const idx = jobsStore.findIndex((j) => j.id === id)
  if (idx === -1) {
    return c.json({ error: 'Job not found' }, 404)
  }
  const current = jobsStore[idx]
  const updated: EcsJob = {
    ...current,
    ...patch,
  }
  jobsStore[idx] = updated
  broadcastJobs()
  return c.json({ job: updated, jobs: jobsStore })
})

function buildAssistantResponse(
  userPrompt: string,
  jobs: EcsJob[],
  connection: { baseUrl?: string; modelId: string; hasToken: boolean },
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

  const connNote = connection.baseUrl
    ? `Endpoint: \`${connection.baseUrl}\` · Model: \`${connection.modelId}\``
    : `Model: \`${connection.modelId}\` (Server ECS Engine — save an API token in Connection Settings for external LLM provider calls)`

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

app.post('/api/chat', async (c) => {
  const payload = await c.req.json<{
    messages: UIMessage[]
    connection?: Partial<ModelConnectionConfig>
  }>()

  const messages = payload.messages ?? []
  const connection = payload.connection

  // Update server connection state if non-empty fields are supplied
  if (connection?.baseUrl?.trim()) {
    serverConnection.baseUrl = connection.baseUrl.trim()
  }
  if (connection?.modelId?.trim()) {
    serverConnection.modelId = connection.modelId.trim()
  }
  if (connection?.apiToken?.trim()) {
    serverConnection.apiToken = connection.apiToken.trim()
  }

  const apiToken =
    connection?.apiToken?.trim() ||
    c.req.header('x-api-token')?.trim() ||
    serverConnection.apiToken.trim() ||
    process.env.OPENAI_API_KEY?.trim() ||
    ''
  const baseUrl =
    connection?.baseUrl?.trim() ||
    c.req.header('x-base-url')?.trim() ||
    serverConnection.baseUrl.trim() ||
    undefined
  const modelId =
    connection?.modelId?.trim() ||
    c.req.header('x-model-id')?.trim() ||
    serverConnection.modelId.trim() ||
    'gpt-4o-mini'

  const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user')
  const userText =
    lastUserMessage?.parts
      ?.filter((p): p is Extract<UIMessage['parts'][number], { type: 'text' }> => p.type === 'text')
      .map((p) => p.text)
      .join('\n') ?? ''

  const jobsContext = jobsStore
    .map(
      (j) =>
        `${j.id} [${j.code} ${j.airportIata}]: ${j.title} | status=${j.status} | progress=${j.progress}% | system=${j.ecsSystem} | state=${j.lifecycleState} | metric=${j.keyMetricLabel}:${j.keyMetricValue}`,
    )
    .join('\n')

  if (apiToken) {
    const provider = createOpenAI({
      apiKey: apiToken,
      ...(baseUrl ? { baseURL: baseUrl } : {}),
    })

    const result = streamText({
      model: provider(modelId),
      messages: await convertToModelMessages(messages),
      system: `You are the Deloitte Airport Modernization ECS Assistant. Use the active ECS job queue below to provide concise, quantitative guidance on workflows W1-W7, entities, and systems.\n\nActive ECS Jobs:\n${jobsContext}`,
    })

    return createUIMessageStreamResponse({
      stream: toUIMessageStream({ stream: result.stream }),
    })
  }

  const replyText = buildAssistantResponse(userText, jobsStore, {
    baseUrl,
    modelId,
    hasToken: false,
  })
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

  return createUIMessageStreamResponse({ stream })
})

app.get('/api/health', (c) =>
  c.json({
    status: 'ok',
    service: 'deloitte-airport-modernization-ecs',
    jobsCount: jobsStore.length,
    modelId: serverConnection.modelId,
    baseUrl: serverConnection.baseUrl,
    hasApiToken: Boolean(serverConnection.apiToken),
  }),
)

app.use('/*', serveStatic({ root: './src/client/dist' }))
app.get('*', serveStatic({ path: './src/client/dist/index.html' }))

const port = Number(process.env.PORT) || 3000
serve({
  fetch: app.fetch,
  port,
  hostname: '0.0.0.0',
})

export default app
