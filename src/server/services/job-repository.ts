import fs from 'node:fs'
import path from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { PgBoss } from 'pg-boss'
import type {
  EcsJob,
  JobSubChatUpdate,
  WorkflowCode,
} from '../../client/src/types/jobs.ts'
import type { ILogger } from '../logging/logger.ts'
import type { IJobAgentRunner } from './job-agent-runner.ts'
import type { ISkillRegistry } from '../ai/skills-catalog.ts'
import { US_AIRPORT_BASELINES } from '../ai/us-airport-data.ts'
import {
  UsAirportPdfReportService,
  type IPdfReportService,
} from './pdf-report-service.ts'

type JobChatMessage = EcsJob['chatHistory'][number]

export type JobsSubscriber = (jobs: EcsJob[]) => void
export type JobProgressSubscriber = (update: JobSubChatUpdate) => void

export interface CreateJobInput {
  code?: WorkflowCode
  airportIata?: string
  title?: string
  purpose?: string
  owner?: string
  summary?: string
}

export interface UpdateJobInput {
  title?: string
  purpose?: string
  code?: WorkflowCode
  airportIata?: string
  status?: EcsJob['status']
  progress?: number
  lifecycleState?: string
  summary?: string
}

export interface IJobReader {
  getAll(): EcsJob[]
  getById(id: string): EcsJob | undefined
}

export interface IJobWriter {
  create(input: CreateJobInput): Promise<EcsJob>
  update(id: string, patch: UpdateJobInput): Promise<EcsJob | undefined>
  abort(id: string, reason?: string): Promise<EcsJob | undefined>
  remove(id: string): Promise<boolean>
  appendConversationMessage(
    id: string,
    userMessage: string,
  ): Promise<EcsJob | undefined>
}

export interface IJobEventStream {
  subscribe(listener: JobsSubscriber): () => void
  subscribeProgressUpdates(listener: JobProgressSubscriber): () => void
}

export interface IJobLifecycleScheduler {
  init(): Promise<void>
}

export interface IJobRepository
  extends IJobReader,
    IJobWriter,
    IJobEventStream,
    IJobLifecycleScheduler {}

const JOB_QUEUE_NAME = 'ecs-llm-job'

const WORKFLOW_LOOKUP: Record<
  WorkflowCode,
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

interface PgBossTaskPayload {
  jobId: string
  purpose: string
  revision: number
}

/**
 * Job Manager & Repository powered by PGlite and pg-boss.
 * Orchestrates single-purpose LLM jobs, persisting state in PGlite,
 * scheduling/cancelling/updating jobs via pg-boss, and emitting routine
 * concise updates from each job's sub-conversation.
 */
export class PglitePgBossJobManager implements IJobRepository {
  private readonly pg: PGlite
  private readonly boss: PgBoss
  private readonly logger: ILogger
  private readonly agentRunner: IJobAgentRunner
  private readonly skillRegistry: ISkillRegistry
  private readonly pdfReportService: IPdfReportService
  private readonly listeners = new Set<JobsSubscriber>()
  private readonly progressListeners = new Set<JobProgressSubscriber>()
  private readonly activeControllers = new Map<string, AbortController>()
  private readonly jobRevisions = new Map<string, number>()
  private jobsCache: EcsJob[] = []
  private initialized = false
  private nextSequence = 4100

  constructor(
    logger: ILogger,
    agentRunner: IJobAgentRunner,
    skillRegistry: ISkillRegistry,
    pdfReportService?: IPdfReportService,
    seedJobs: EcsJob[] = [],
  ) {
    this.logger = logger
    this.agentRunner = agentRunner
    this.skillRegistry = skillRegistry
    this.pdfReportService =
      pdfReportService ?? new UsAirportPdfReportService(logger)
    this.jobsCache = structuredClone(seedJobs).map((job) => ({
      ...job,
      reports: job.reports ?? [],
    }))
    this.nextSequence = 4100 + seedJobs.length

    this.pg = new PGlite()
    const dbAdapter = {
      executeSql: async (text: string, values?: unknown[]) => {
        if (!values || values.length === 0) {
          const results = await this.pg.exec(text)
          const last = results[results.length - 1] ?? { rows: [], affectedRows: 0 }
          return {
            rows: (last.rows as Record<string, unknown>[]) ?? [],
            rowCount: last.affectedRows ?? (last.rows?.length || 0),
          }
        }
        const res = await this.pg.query(text, values)
        return {
          rows: res.rows as Record<string, unknown>[],
          rowCount: res.affectedRows ?? res.rows.length,
        }
      },
    }

    this.boss = new PgBoss({
      db: dbAdapter,
      supervise: false,
      schedule: false,
    })

    this.boss.on('error', (err) => {
      this.logger.error('pgboss.error', {
        error: err instanceof Error ? err.message : String(err),
      })
    })
  }

  async init(): Promise<void> {
    if (this.initialized) return

    await this.pg.exec(`
      CREATE TABLE IF NOT EXISTS ecs_jobs (
        id TEXT PRIMARY KEY,
        sort_order INT NOT NULL,
        pg_boss_job_id TEXT,
        payload JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `)

    await this.boss.start()
    await this.boss.createQueue(JOB_QUEUE_NAME)

    await this.boss.work<PgBossTaskPayload>(
      JOB_QUEUE_NAME,
      { pollingIntervalSeconds: 1, batchSize: 2 },
      async (bossJobs) => {
        for (const bossJob of bossJobs) {
          const { jobId, revision } = bossJob.data
          const currentRevision = this.jobRevisions.get(jobId) ?? 1
          if (revision < currentRevision) {
            continue
          }

          const job = this.getById(jobId)
          if (!job || job.status !== 'in_progress') {
            continue
          }

          const controller = new AbortController()
          this.activeControllers.set(jobId, controller)

          try {
            await this.agentRunner.runJobChat(job, controller.signal, {
              onProgress: async (patch) => {
                if (controller.signal.aborted) return
                await this.applyInternalPatch(jobId, patch)
              },
            })
          } finally {
            if (this.activeControllers.get(jobId) === controller) {
              this.activeControllers.delete(jobId)
            }
          }
        }
      },
    )

    const existing = await this.pg.query<{ count: string }>(
      'SELECT COUNT(*)::text AS count FROM ecs_jobs',
    )
    const existingCount = Number(existing.rows[0]?.count ?? '0')

    if (existingCount === 0) {
      for (let idx = 0; idx < this.jobsCache.length; idx++) {
        const job = this.jobsCache[idx]
        this.jobRevisions.set(job.id, 1)
        if (job.status === 'in_progress') {
          const bossId = await this.boss.send(JOB_QUEUE_NAME, {
            jobId: job.id,
            purpose: job.purpose,
            revision: 1,
          })
          if (bossId) {
            job.pgBossJobId = bossId
          }
        }
        await this.pg.query(
          `INSERT INTO ecs_jobs (id, sort_order, pg_boss_job_id, payload)
           VALUES ($1, $2, $3, $4::jsonb)`,
          [job.id, idx, job.pgBossJobId ?? null, JSON.stringify(job)],
        )
      }
    } else {
      await this.reloadFromDatabase()
    }

    this.initialized = true
    this.logger.info('job_manager.initialized', {
      engine: 'pglite+pg-boss',
      queue: JOB_QUEUE_NAME,
      jobsCount: this.jobsCache.length,
    })
  }

  getAll(): EcsJob[] {
    return structuredClone(this.jobsCache)
  }

  getById(id: string): EcsJob | undefined {
    const found = this.jobsCache.find(
      (j) => j.id.toUpperCase() === id.trim().toUpperCase(),
    )
    return found ? structuredClone(found) : undefined
  }

  async create(input: CreateJobInput): Promise<EcsJob> {
    const idNumber = this.nextSequence++
    const code: WorkflowCode = input.code || 'W4'
    const requestedIata = (input.airportIata || 'JFK').toUpperCase()
    const baseline =
      US_AIRPORT_BASELINES[requestedIata] ?? US_AIRPORT_BASELINES.JFK
    const airportIata = baseline.iata
    const wf = WORKFLOW_LOOKUP[code] ?? WORKFLOW_LOOKUP.W4
    const ap = {
      icao: baseline.icao,
      name: baseline.name,
    }

    const title = input.title?.trim() || `${wf.name} Verification Run`
    const purpose =
      input.purpose?.trim() ||
      input.summary?.trim() ||
      `Execute ${code} (${wf.system}) analysis and telemetry verification for ${airportIata} (${ap.name}): ${title}.`
    const nowTime = new Date().toISOString().slice(11, 19)

    const initialSubMessage = `Welcome! I am your ${wf.name} Specialist Agent (${wf.system}) for ${ap.name} (${airportIata}/${ap.icao}). I am queued in pg-boss and preparing our Airport Modernization live telemetry and calculation tools for your mandate.`

    const initialChatHistory: JobChatMessage[] = [
      {
        id: `msg-${Date.now()}-1`,
        role: 'user',
        content: purpose,
        timestamp: nowTime,
      },
      {
        id: `msg-${Date.now()}-2`,
        role: 'assistant',
        content: initialSubMessage,
        timestamp: nowTime,
      },
    ]

    const newJob: EcsJob = {
      id: `JOB-${idNumber}`,
      code,
      workflowName: wf.name,
      title,
      purpose,
      airportIata,
      airportIcao: ap.icao,
      airportName: ap.name,
      ecsSystem: wf.system,
      lifecycleState: wf.state,
      status: 'in_progress',
      progress: 18,
      elapsed: '00m 05s',
      eta: '07m 30s',
      owner: input.owner?.trim() || 'PgBoss Orchestrator',
      keyMetricLabel: wf.metricLabel,
      keyMetricValue: wf.metricValue,
      summary: purpose,
      steps: [
        {
          id: 'step-1',
          timestamp: nowTime,
          stage: 'PgBoss Queue & PGlite Persistence',
          detail: `Enqueued single-purpose LLM chat job for ${airportIata}/${ap.icao}`,
          state: 'done',
        },
        {
          id: 'step-2',
          timestamp: nowTime,
          stage: `${wf.system} Execution`,
          detail: `Running single-purpose LLM chat: ${purpose.slice(0, 90)}`,
          state: 'active',
        },
      ],
      chatHistory: initialChatHistory,
      reports: [],
    }

    this.jobRevisions.set(newJob.id, 1)

    if (this.initialized) {
      const bossId = await this.boss.send(JOB_QUEUE_NAME, {
        jobId: newJob.id,
        purpose: newJob.purpose,
        revision: 1,
      })
      if (bossId) {
        newJob.pgBossJobId = bossId
      }

      await this.pg.query(
        `INSERT INTO ecs_jobs (id, sort_order, pg_boss_job_id, payload)
         VALUES ($1, $2, $3, $4::jsonb)`,
        [newJob.id, -idNumber, newJob.pgBossJobId ?? null, JSON.stringify(newJob)],
      )
    }

    this.jobsCache.unshift(newJob)
    this.logger.info('job.created', {
      jobId: newJob.id,
      pgBossJobId: newJob.pgBossJobId,
      code: newJob.code,
      airportIata: newJob.airportIata,
      purpose: newJob.purpose,
    })
    this.notifySubscribers()
    this.emitProgressUpdate(newJob, initialSubMessage, nowTime)
    return structuredClone(newJob)
  }

  async update(id: string, patch: UpdateJobInput): Promise<EcsJob | undefined> {
    const idx = this.jobsCache.findIndex(
      (j) => j.id.toUpperCase() === id.trim().toUpperCase(),
    )
    if (idx === -1) return undefined

    const current = this.jobsCache[idx]
    const wasRunning = current.status === 'in_progress'
    const purposeChanged =
      typeof patch.purpose === 'string' &&
      patch.purpose.trim() !== '' &&
      patch.purpose.trim() !== current.purpose
    const titleChanged =
      typeof patch.title === 'string' &&
      patch.title.trim() !== '' &&
      patch.title.trim() !== current.title

    const nowTime = new Date().toISOString().slice(11, 19)
    const nextPurpose = patch.purpose?.trim() || current.purpose
    const nextTitle = patch.title?.trim() || current.title
    const nextCode = patch.code || current.code
    const wf = WORKFLOW_LOOKUP[nextCode] ?? WORKFLOW_LOOKUP[current.code]

    const updatedChatHistory = [...current.chatHistory]
    const updatedSteps = [...current.steps]
    let subChatAck = ''

    if (purposeChanged || titleChanged) {
      updatedChatHistory.push({
        id: `msg-update-u-${Date.now()}`,
        role: 'user',
        content: `Updated job purpose: ${nextPurpose}`,
        timestamp: nowTime,
      })
      subChatAck = `I have updated your ${wf.name} (${wf.system}) mandate for ${current.airportName} (${current.airportIata}) to: "${nextPurpose}". I am re-running live online telemetry and engineering calculations now.`
      updatedChatHistory.push({
        id: `msg-update-a-${Date.now()}`,
        role: 'assistant',
        content: subChatAck,
        timestamp: nowTime,
      })
      updatedSteps.push({
        id: `step-update-${Date.now()}`,
        timestamp: nowTime,
        stage: 'PgBoss Live Job Re-Orchestration',
        detail: `Updated running job purpose to: "${nextPurpose.slice(0, 90)}"`,
        state: 'active',
      })
    }

    const shouldReexecute =
      purposeChanged ||
      titleChanged ||
      Boolean(patch.code && patch.code !== current.code) ||
      patch.status === 'in_progress'

    const nextStatus: EcsJob['status'] =
      patch.status ?? (shouldReexecute ? 'in_progress' : current.status)

    const updated: EcsJob = {
      ...current,
      ...patch,
      status: nextStatus,
      lifecycleState:
        nextStatus === 'in_progress' ? wf.state : (patch.lifecycleState ?? current.lifecycleState),
      progress: shouldReexecute && nextStatus === 'in_progress' ? 25 : (patch.progress ?? current.progress),
      code: nextCode,
      workflowName: wf.name,
      ecsSystem: wf.system,
      title: nextTitle,
      purpose: nextPurpose,
      summary: patch.summary?.trim() || (purposeChanged ? nextPurpose : current.summary),
      steps: updatedSteps,
      chatHistory: updatedChatHistory,
    }

    if (shouldReexecute && nextStatus === 'in_progress') {
      const activeCtrl = this.activeControllers.get(current.id)
      if (activeCtrl) {
        activeCtrl.abort('Running job updated by operator')
        this.activeControllers.delete(current.id)
      }

      if (this.initialized && current.pgBossJobId) {
        try {
          await this.boss.cancel(JOB_QUEUE_NAME, current.pgBossJobId)
        } catch {
          // Ignore if already completed in pg-boss
        }
      }

      const nextRev = (this.jobRevisions.get(current.id) ?? 1) + 1
      this.jobRevisions.set(current.id, nextRev)

      if (this.initialized) {
        const newBossId = await this.boss.send(JOB_QUEUE_NAME, {
          jobId: updated.id,
          purpose: updated.purpose,
          revision: nextRev,
        })
        if (newBossId) {
          updated.pgBossJobId = newBossId
        }
      }
    }

    this.jobsCache[idx] = updated
    await this.persistJobToDb(updated)

    this.logger.info('job.updated', {
      jobId: updated.id,
      pgBossJobId: updated.pgBossJobId,
      status: updated.status,
      purpose: updated.purpose,
    })
    this.notifySubscribers()
    if (subChatAck) {
      this.emitProgressUpdate(updated, subChatAck, nowTime)
    }
    return structuredClone(updated)
  }

  async abort(id: string, reason?: string): Promise<EcsJob | undefined> {
    const idx = this.jobsCache.findIndex(
      (j) => j.id.toUpperCase() === id.trim().toUpperCase(),
    )
    if (idx === -1) return undefined

    const current = this.jobsCache[idx]
    if (current.status === 'failed' && current.lifecycleState === 'Aborted') {
      return structuredClone(current)
    }

    const nextRev = (this.jobRevisions.get(current.id) ?? 1) + 1
    this.jobRevisions.set(current.id, nextRev)

    const activeCtrl = this.activeControllers.get(current.id)
    if (activeCtrl) {
      activeCtrl.abort(reason || 'Aborted by operator')
      this.activeControllers.delete(current.id)
    }

    if (this.initialized && current.pgBossJobId) {
      try {
        await this.boss.cancel(JOB_QUEUE_NAME, current.pgBossJobId)
      } catch {
        // Ignore if job already popped by worker
      }
    }

    const nowTime = new Date().toISOString().slice(11, 19)
    const abortDetail =
      reason?.trim() ||
      'Job execution aborted via pg-boss job manager; state transitioned to Aborted/Failed'

    const abortedStep = {
      id: `abort-${Date.now()}`,
      timestamp: nowTime,
      stage: 'PgBoss Abort Signal',
      detail: abortDetail,
      state: 'warning' as const,
    }

    const abortedSubMsg = `Sub-conversation halted at ${current.progress}%: ${abortDetail}`

    const abortedMessage: JobChatMessage = {
      id: `msg-abort-${Date.now()}`,
      role: 'assistant',
      content: abortedSubMsg,
      timestamp: nowTime,
    }

    const updated: EcsJob = {
      ...current,
      status: 'failed',
      lifecycleState: 'Aborted',
      eta: 'Aborted',
      steps: [...current.steps, abortedStep],
      chatHistory: [...current.chatHistory, abortedMessage],
    }

    this.jobsCache[idx] = updated
    await this.persistJobToDb(updated)

    this.logger.warn('job.aborted', {
      jobId: updated.id,
      pgBossJobId: updated.pgBossJobId,
      progressAtAbort: updated.progress,
      reason: abortDetail,
    })
    this.notifySubscribers()
    this.emitProgressUpdate(updated, abortedSubMsg, nowTime)
    return structuredClone(updated)
  }

  async remove(id: string): Promise<boolean> {
    const idx = this.jobsCache.findIndex(
      (j) => j.id.toUpperCase() === id.trim().toUpperCase(),
    )
    if (idx === -1) return false

    const target = this.jobsCache[idx]

    const activeCtrl = this.activeControllers.get(target.id)
    if (activeCtrl) {
      activeCtrl.abort('Job removed')
      this.activeControllers.delete(target.id)
    }

    if (this.initialized && target.pgBossJobId) {
      try {
        await this.boss.cancel(JOB_QUEUE_NAME, target.pgBossJobId)
      } catch {
        // Ignore if already finished
      }
    }

    this.jobsCache.splice(idx, 1)

    if (target.reports?.length) {
      const reportsDir = this.pdfReportService.getReportsDirectory()
      for (const rep of target.reports) {
        const filePath = path.join(reportsDir, rep.fileName)
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath)
          }
        } catch {
          // Ignore file removal error
        }
      }
    }

    if (this.initialized) {
      await this.pg.query('DELETE FROM ecs_jobs WHERE id = $1', [target.id])
    }

    this.logger.info('job.removed', {
      jobId: target.id,
      pgBossJobId: target.pgBossJobId,
    })
    this.notifySubscribers()
    return true
  }

  async appendConversationMessage(
    id: string,
    userMessage: string,
  ): Promise<EcsJob | undefined> {
    const idx = this.jobsCache.findIndex(
      (j) => j.id.toUpperCase() === id.trim().toUpperCase(),
    )
    if (idx === -1) return undefined

    const current = this.jobsCache[idx]
    const nowTime = new Date().toISOString().slice(11, 19)
    const userEntry: JobChatMessage = {
      id: `msg-u-${Date.now()}`,
      role: 'user',
      content: userMessage.trim(),
      timestamp: nowTime,
    }

    const turnResult = await this.agentRunner.runInteractiveJobTurn(
      current,
      userMessage.trim(),
    )

    const assistantReply = turnResult.assistantReply
    const assistantEntry: JobChatMessage = {
      id: `msg-a-${Date.now() + 1}`,
      role: 'assistant',
      content: assistantReply,
      timestamp: nowTime,
    }

    const existingReports = current.reports ?? []
    const mergedReports = [...existingReports]
    for (const newRep of turnResult.reports) {
      const existingIdx = mergedReports.findIndex(
        (r) => r.reportCode === newRep.reportCode,
      )
      if (existingIdx >= 0) {
        mergedReports[existingIdx] = newRep
      } else {
        mergedReports.push(newRep)
      }
    }

    const updated: EcsJob = {
      ...current,
      keyMetricLabel: turnResult.keyMetricLabel,
      keyMetricValue: turnResult.keyMetricValue,
      chatHistory: [...current.chatHistory, userEntry, assistantEntry],
      reports: mergedReports,
    }

    this.jobsCache[idx] = updated
    if (this.initialized) {
      await this.persistJobToDb(updated)
    }

    this.logger.info('job.conversation_message_appended', {
      jobId: updated.id,
      code: updated.code,
      airportIata: updated.airportIata,
      reportGenerated: turnResult.reportGenerated,
      reportCode: turnResult.reportCode,
    })

    this.notifySubscribers()
    this.emitProgressUpdate(updated, assistantReply, nowTime)
    return structuredClone(updated)
  }

  subscribe(listener: JobsSubscriber): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  subscribeProgressUpdates(listener: JobProgressSubscriber): () => void {
    this.progressListeners.add(listener)
    return () => {
      this.progressListeners.delete(listener)
    }
  }

  private emitProgressUpdate(
    job: EcsJob,
    subConversationMessage: string,
    timestamp: string,
  ): void {
    const update: JobSubChatUpdate = {
      id: `upd-${job.id}-${Date.now()}`,
      jobId: job.id,
      code: job.code,
      airportIata: job.airportIata,
      title: job.title,
      status: job.status,
      progress: job.progress,
      subConversationMessage,
      timestamp,
    }
    for (const listener of this.progressListeners) {
      try {
        listener(update)
      } catch {
        // Ignore subscriber error
      }
    }
  }

  private async applyInternalPatch(
    jobId: string,
    patch: Partial<EcsJob>,
  ): Promise<void> {
    const idx = this.jobsCache.findIndex((j) => j.id === jobId)
    if (idx === -1) return
    const current = this.jobsCache[idx]
    if (current.status !== 'in_progress') return

    const updated: EcsJob = {
      ...current,
      ...patch,
    }
    this.jobsCache[idx] = updated
    await this.persistJobToDb(updated)
    this.notifySubscribers()

    const latestMsg = updated.chatHistory[updated.chatHistory.length - 1]
    if (latestMsg && latestMsg.role === 'assistant') {
      this.emitProgressUpdate(updated, latestMsg.content, latestMsg.timestamp)
    }
  }

  private async persistJobToDb(job: EcsJob): Promise<void> {
    if (!this.initialized) return
    await this.pg.query(
      `UPDATE ecs_jobs
       SET pg_boss_job_id = $2,
           payload = $3::jsonb,
           updated_at = now()
       WHERE id = $1`,
      [job.id, job.pgBossJobId ?? null, JSON.stringify(job)],
    )
  }

  private async reloadFromDatabase(): Promise<void> {
    const res = await this.pg.query<{ payload: EcsJob }>(
      'SELECT payload FROM ecs_jobs ORDER BY sort_order ASC',
    )
    if (res.rows.length > 0) {
      this.jobsCache = res.rows.map((r) => r.payload)
    }
  }

  private notifySubscribers(): void {
    const snapshot = this.getAll()
    for (const listener of this.listeners) {
      try {
        listener(snapshot)
      } catch {
        // Ignore subscriber error
      }
    }
  }
}
