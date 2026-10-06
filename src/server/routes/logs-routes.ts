import { Hono } from 'hono'
import type { ILogger, LogLevel } from '../logging/logger.ts'

interface ClientLogPayload {
  level?: LogLevel
  event: string
  timestamp?: string
  meta?: Record<string, unknown>
}

export function createLogsRoutes(clientFileLogger: ILogger, serverLogger: ILogger) {
  const router = new Hono()

  router.post('/client', async (c) => {
    try {
      const body = await c.req.json<ClientLogPayload | { entries?: ClientLogPayload[] }>()
      const entries =
        'entries' in body && Array.isArray(body.entries)
          ? body.entries
          : [body as ClientLogPayload]

      for (const item of entries) {
        if (!item?.event) continue
        clientFileLogger.writeEntry({
          timestamp: item.timestamp || new Date().toISOString(),
          level: item.level || 'info',
          source: 'client',
          event: item.event,
          meta: item.meta,
        })
      }

      return c.json({ ok: true, count: entries.length })
    } catch (err) {
      serverLogger.error('logs.client_ingest_failed', {
        error: err instanceof Error ? err.message : String(err),
      })
      return c.json({ ok: false }, 400)
    }
  })

  return router
}
