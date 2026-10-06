import { Hono } from 'hono'
import { streamSSE } from 'hono/streaming'
import type { EcsJob } from '../../client/src/types/jobs.ts'
import type { CreateJobInput, IJobRepository } from '../services/job-repository.ts'
import type { ILogger } from '../logging/logger.ts'

export function createJobsRoutes(jobRepository: IJobRepository, logger: ILogger) {
  const router = new Hono()

  router.get('/', (c) => {
    return c.json({ jobs: jobRepository.getAll() })
  })

  router.get('/stream', (c) => {
    logger.info('jobs.sse_client_connected')
    return streamSSE(c, async (stream) => {
      let active = true

      const sendSnapshot = async (jobs: EcsJob[]) => {
        if (!active) return
        await stream.writeSSE({
          event: 'jobs:sync',
          data: JSON.stringify({ jobs }),
        })
      }

      await sendSnapshot(jobRepository.getAll())

      const unsubscribe = jobRepository.subscribe((jobs) => {
        sendSnapshot(jobs).catch(() => {})
      })

      stream.onAbort(() => {
        active = false
        unsubscribe()
        logger.info('jobs.sse_client_disconnected')
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

  router.post('/', async (c) => {
    const body = await c.req.json<CreateJobInput>()
    const job = jobRepository.create(body)
    return c.json({ job, jobs: jobRepository.getAll() }, 201)
  })

  router.post('/:id/abort', (c) => {
    const id = c.req.param('id')
    const job = jobRepository.abort(id)
    if (!job) {
      return c.json({ error: 'Job not found' }, 404)
    }
    return c.json({ job, jobs: jobRepository.getAll() })
  })

  router.patch('/:id', async (c) => {
    const id = c.req.param('id')
    const patch = await c.req.json<Partial<EcsJob>>()
    const job = jobRepository.update(id, patch)
    if (!job) {
      return c.json({ error: 'Job not found' }, 404)
    }
    return c.json({ job, jobs: jobRepository.getAll() })
  })

  return router
}
