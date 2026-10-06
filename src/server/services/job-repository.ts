import {
  INITIAL_ECS_JOBS,
  type EcsJob,
  type WorkflowCode,
} from '../../client/src/types/jobs.ts'
import type { ILogger } from '../logging/logger.ts'

export type JobsSubscriber = (jobs: EcsJob[]) => void

export interface CreateJobInput {
  code?: WorkflowCode
  airportIata?: string
  title?: string
  owner?: string
  summary?: string
}

export interface IJobRepository {
  getAll(): EcsJob[]
  getById(id: string): EcsJob | undefined
  create(input: CreateJobInput): EcsJob
  abort(id: string): EcsJob | undefined
  update(id: string, patch: Partial<EcsJob>): EcsJob | undefined
  tickProgress(): boolean
  subscribe(listener: JobsSubscriber): () => void
}

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

export class InMemoryJobRepository implements IJobRepository {
  private readonly jobs: EcsJob[]
  private readonly listeners = new Set<JobsSubscriber>()
  private readonly logger: ILogger

  constructor(logger: ILogger, seedJobs: EcsJob[] = INITIAL_ECS_JOBS) {
    this.logger = logger
    this.jobs = structuredClone(seedJobs)
    this.logger.info('job_repository.initialized', { count: this.jobs.length })
  }

  getAll(): EcsJob[] {
    return structuredClone(this.jobs)
  }

  getById(id: string): EcsJob | undefined {
    const found = this.jobs.find((j) => j.id === id)
    return found ? structuredClone(found) : undefined
  }

  create(input: CreateJobInput): EcsJob {
    const idNumber = 4100 + this.jobs.length
    const code: WorkflowCode = input.code || 'W4'
    const airportIata = (input.airportIata || 'JFK').toUpperCase()
    const wf = WORKFLOW_LOOKUP[code] ?? WORKFLOW_LOOKUP.W4
    const ap = AIRPORT_LOOKUP[airportIata] ?? {
      icao: `K${airportIata}`,
      name: `${airportIata} Airport`,
    }

    const newJob: EcsJob = {
      id: `JOB-${idNumber}`,
      code,
      workflowName: wf.name,
      title: input.title?.trim() || `${wf.name} Verification Run`,
      airportIata,
      airportIcao: ap.icao,
      airportName: ap.name,
      ecsSystem: wf.system,
      lifecycleState: wf.state,
      status: 'in_progress',
      progress: 18,
      elapsed: '00m 12s',
      eta: '07m 30s',
      owner: input.owner?.trim() || 'ECS Dispatch Controller',
      keyMetricLabel: wf.metricLabel,
      keyMetricValue: wf.metricValue,
      summary:
        input.summary?.trim() ||
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

    this.jobs.unshift(newJob)
    this.logger.info('job.created', {
      jobId: newJob.id,
      code: newJob.code,
      airportIata: newJob.airportIata,
      ecsSystem: newJob.ecsSystem,
    })
    this.notifySubscribers()
    return structuredClone(newJob)
  }

  abort(id: string): EcsJob | undefined {
    const idx = this.jobs.findIndex((j) => j.id === id)
    if (idx === -1) return undefined

    const current = this.jobs[idx]
    if (current.status !== 'in_progress') {
      return structuredClone(current)
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

    this.jobs[idx] = updated
    this.logger.warn('job.aborted', {
      jobId: updated.id,
      airportIata: updated.airportIata,
      progressAtAbort: updated.progress,
    })
    this.notifySubscribers()
    return structuredClone(updated)
  }

  update(id: string, patch: Partial<EcsJob>): EcsJob | undefined {
    const idx = this.jobs.findIndex((j) => j.id === id)
    if (idx === -1) return undefined

    const updated: EcsJob = {
      ...this.jobs[idx],
      ...patch,
    }
    this.jobs[idx] = updated
    this.logger.info('job.updated', {
      jobId: updated.id,
      status: updated.status,
      progress: updated.progress,
    })
    this.notifySubscribers()
    return structuredClone(updated)
  }

  tickProgress(): boolean {
    let changed = false
    for (let i = 0; i < this.jobs.length; i++) {
      const job = this.jobs[i]
      if (job.status !== 'in_progress') continue
      changed = true
      const nextProgress = job.progress >= 96 ? 35 : job.progress + 1
      this.jobs[i] = {
        ...job,
        progress: nextProgress,
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
