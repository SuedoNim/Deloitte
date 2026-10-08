import fs from 'node:fs'
import path from 'node:path'
import { Hono } from 'hono'
import { streamSSE } from 'hono/streaming'
import type { EcsJob, JobSubChatUpdate } from '../../client/src/types/jobs.ts'
import type {
  IJobRepository,
  UpdateJobInput,
} from '../services/job-repository.ts'
import type { IPdfReportService } from '../services/pdf-report-service.ts'
import type { ILogger } from '../logging/logger.ts'

export function createJobsRoutes(
  jobRepository: IJobRepository,
  pdfReportService: IPdfReportService,
  logger: ILogger,
) {
  const router = new Hono()

  router.get('/', (c) => {
    return c.json({ jobs: jobRepository.getAll() })
  })

  router.get('/:id/reports', (c) => {
    const id = c.req.param('id')
    const job = jobRepository.getById(id)
    if (!job) {
      return c.json({ error: 'Job not found' }, 404)
    }
    return c.json({ jobId: job.id, reports: job.reports ?? [] })
  })

  router.get('/:id/report.pdf', (c) => {
    const id = c.req.param('id')
    const reportCode = c.req.query('reportCode')?.trim().toUpperCase()
    const job = jobRepository.getById(id)
    if (!job) {
      return c.json({ error: 'Job not found' }, 404)
    }

    const existingReports = job.reports ?? []
    const targetMeta = reportCode
      ? existingReports.find((r) => r.reportCode === reportCode)
      : existingReports[0]

    if (targetMeta) {
      const filePath = path.join(
        pdfReportService.getReportsDirectory(),
        targetMeta.fileName,
      )
      if (fs.existsSync(filePath)) {
        const buffer = fs.readFileSync(filePath)
        logger.info('jobs.pdf_report_downloaded', {
          jobId: job.id,
          airportIata: job.airportIata,
          reportCode: targetMeta.reportCode,
          fileName: targetMeta.fileName,
          sizeBytes: buffer.byteLength,
          source: 'tool-generated-disk-artifact',
        })
        return new Response(new Uint8Array(buffer), {
          status: 200,
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${targetMeta.fileName}"`,
            'Content-Length': String(buffer.byteLength),
            'Cache-Control': 'no-store',
          },
        })
      }
    }

    if (existingReports.length === 0) {
      return c.json(
        {
          error:
            'No PDF report was generated for this job because a report was not required. Ask the Job Agent in the job conversation to generate a PDF report using its PDF Report Tool.',
        },
        404,
      )
    }

    const generated = pdfReportService.generateJobReportPdf(
      job,
      reportCode ?? targetMeta?.reportCode,
    )
    logger.info('jobs.pdf_report_downloaded', {
      jobId: job.id,
      airportIata: job.airportIata,
      reportCode: generated.meta.reportCode,
      fileName: generated.meta.fileName,
      sizeBytes: generated.buffer.byteLength,
    })

    return new Response(new Uint8Array(generated.buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${generated.meta.fileName}"`,
        'Content-Length': String(generated.buffer.byteLength),
        'Cache-Control': 'no-store',
      },
    })
  })

  router.get('/:id/conversation', (c) => {
    const id = c.req.param('id')
    const job = jobRepository.getById(id)
    if (!job) {
      return c.json({ error: 'Job not found' }, 404)
    }
    return c.json({
      jobId: job.id,
      title: job.title,
      purpose: job.purpose,
      status: job.status,
      chatHistory: job.chatHistory,
      steps: job.steps,
      reports: job.reports ?? [],
    })
  })

  router.post('/:id/conversation', async (c) => {
    const id = c.req.param('id')
    const body = await c.req.json<{ message?: string }>().catch(() => ({
      message: '',
    }))
    const message = body.message?.trim()
    if (!message) {
      return c.json({ error: 'Message is required' }, 400)
    }
    const job = await jobRepository.appendConversationMessage(id, message)
    if (!job) {
      return c.json({ error: 'Job not found' }, 404)
    }
    return c.json({ job, jobs: jobRepository.getAll() })
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

      const sendSubChatUpdate = async (update: JobSubChatUpdate) => {
        if (!active) return
        await stream.writeSSE({
          event: 'job:chat_update',
          data: JSON.stringify(update),
        })
      }

      await sendSnapshot(jobRepository.getAll())

      const unsubscribeJobs = jobRepository.subscribe((jobs) => {
        sendSnapshot(jobs).catch(() => {})
      })

      const unsubscribeProgress = jobRepository.subscribeProgressUpdates(
        (update) => {
          sendSubChatUpdate(update).catch(() => {})
        },
      )

      stream.onAbort(() => {
        active = false
        unsubscribeJobs()
        unsubscribeProgress()
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

  router.get('/:id', (c) => {
    const id = c.req.param('id')
    const job = jobRepository.getById(id)
    if (!job) {
      return c.json({ error: 'Job not found' }, 404)
    }
    return c.json({ job })
  })

  router.post('/:id/abort', async (c) => {
    const id = c.req.param('id')
    const job = await jobRepository.abort(id)
    if (!job) {
      return c.json({ error: 'Job not found' }, 404)
    }
    return c.json({ job, jobs: jobRepository.getAll() })
  })

  router.patch('/:id', async (c) => {
    const id = c.req.param('id')
    const patch = await c.req.json<UpdateJobInput>()
    const job = await jobRepository.update(id, patch)
    if (!job) {
      return c.json({ error: 'Job not found' }, 404)
    }
    return c.json({ job, jobs: jobRepository.getAll() })
  })

  router.delete('/:id', async (c) => {
    const id = c.req.param('id')
    const removed = await jobRepository.remove(id)
    if (!removed) {
      return c.json({ error: 'Job not found' }, 404)
    }
    return c.json({ removed: true, jobId: id, jobs: jobRepository.getAll() })
  })

  return router
}
