import { PGlite } from '@electric-sql/pglite'
import { PgBoss } from 'pg-boss'
import {
  INITIAL_ECS_JOBS,
  type EcsJob,
  type JobChatMessage,
  type WorkflowCode,
} from '../../client/src/types/jobs.ts'
import type { ILogger } from '../logging/logger.ts'
import type { IJobAgentRunner } from './job-agent-runner.ts'

export type JobsSubscriber = (jobs: EcsJob[]) => void

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

export interface IJobRepository {
  init(): Promise<void>
  getAll(): EcsJob[]
  getById(id: string): EcsJob | undefined
  create(input: CreateJobInput): Promise<EcsJob>
  update(id: string, patch: UpdateJobInput): Promise<EcsJob | undefined>
  abort(id: string, reason?: string): Promise<EcsJob | undefined>
  remove(id: string): Promise<boolean>
  tickProgress(): Promise<boolean>
  subscribe(listener: JobsSubscriber): () => void
}

const JOB_QUEUE_NAME = 'ecs-llm-job'

const AIRPORT_LOOKUP: Record<string, { icao: string; name: string }> = {
  JFK: { icao: 'KJFK', name: 'John F. Kennedy International' },
  DEN: { icao: 'KDEN', name: 'Denver International' },
  LAX: { icao: 'KLAX', name: 'Los Angeles International' },
  ORD: { icao: 'KORD', name: 'Chicago O’Hare International' },
  DEL: { icao: 'VIDP', name: 'Indira Gandhi International (T3)' },
}

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
 * Orchestrates single-purpose LLM jobs, persisting state in PGlite and
 * scheduling/cancelling/updating jobs via pg-boss.
 */
export class PglitePgBossJobManager implements IJobRepository {
  private readonly pg: PGlite
  private readonly boss: PgBoss
  private readonly logger: ILogger
  private readonly agentRunner: IJobAgentRunner
  private readonly listeners = new Set<JobsSubscriber>()
  private readonly activeControllers = new Map<string, AbortController>()
  private readonly jobRevisions = new Map<string, number>()
  private jobsCache: EcsJob[] = []
  private initialized = false
  private nextSequence = 4100

  constructor(
    logger: ILogger,
    agentRunner: IJobAgentRunner,
    seedJobs: EcsJob[] = INITIAL_ECS_JOBS,
  ) {
    this.logger = logger
    this.agentRunner = agentRunner
    this.jobsCache = structuredClone(seedJobs)
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

    // Register the pg-boss worker that runs single-purpose LLM jobs
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

    // Seed initial jobs into PGlite and enqueue in-progress jobs into pg-boss
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
    const airportIata = (input.airportIata || 'JFK').toUpperCase()
    const wf = WORKFLOW_LOOKUP[code] ?? WORKFLOW_LOOKUP.W4
    const ap = AIRPORT_LOOKUP[airportIata] ?? {
      icao: `K${airportIata}`,
      name: `${airportIata} Airport`,
    }

    const title = input.title?.trim() || `${wf.name} Verification Run`
    const purpose =
      input.purpose?.trim() ||
      input.summary?.trim() ||
      `Execute ${code} (${wf.system}) analysis and telemetry verification for ${airportIata} (${ap.name}): ${title}.`
    const nowTime = new Date().toISOString().slice(11, 19)

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
        content: `Queued in pg-boss (${JOB_QUEUE_NAME}). Initializing ${wf.system} components for ${airportIata}/${ap.icao}.`,
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

    if (purposeChanged || titleChanged) {
      updatedChatHistory.push({
        id: `msg-update-${Date.now()}`,
        role: 'user',
        content: `Updated job purpose: ${nextPurpose}`,
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

    const updated: EcsJob = {
      ...current,
      ...patch,
      code: nextCode,
      workflowName: wf.name,
      ecsSystem: wf.system,
      title: nextTitle,
      purpose: nextPurpose,
      summary: patch.summary?.trim() || (purposeChanged ? nextPurpose : current.summary),
      steps: updatedSteps,
      chatHistory: updatedChatHistory,
    }

    // If a running job is updated, interrupt the old execution and re-orchestrate via pg-boss
    if (wasRunning && (purposeChanged || titleChanged || patch.status === 'in_progress')) {
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

      if (this.initialized && updated.status === 'in_progress') {
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
    return structuredClone(updated)
  }

  async abort(id: string, reason?: string): Promise<EcsJob | undefined> {
    const idx = this.jobsCache.findIndex(
      (j) => j.id.toUpperCase() === id.trim().toUpperCase(),
    )
    if (idx === -1) return undefined

    const current = this.jobsCache[idx]
    if (current.status !== 'in_progress') {
      return structuredClone(current)
    }

    // 1. Signal active AbortController for this running job
    const activeCtrl = this.activeControllers.get(current.id)
    if (activeCtrl) {
      activeCtrl.abort(reason || 'Aborted by operator')
      this.activeControllers.delete(current.id)
    }

    // 2. Cancel the job in pg-boss queue
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

    const abortedMessage: JobChatMessage = {
      id: `msg-abort-${Date.now()}`,
      role: 'assistant',
      content: `Job aborted: ${abortDetail}`,
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

  async tickProgress(): Promise<boolean> {
    let changed = false
    for (let i = 0; i < this.jobsCache.length; i++) {
      const job = this.jobsCache[i]
      if (job.status !== 'in_progress') continue
      changed = true
      const nextProgress = job.progress >= 96 ? 35 : job.progress + 1
      const updated: EcsJob = {
        ...job,
        progress: nextProgress,
      }
      this.jobsCache[i] = updated
      if (this.initialized) {
        await this.persistJobToDb(updated)
      }
    }
    if (changed) {
      this.notifySubscribers()
    }
    return changed
  }

  subscribe(listener: JobsSubscriber): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
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
