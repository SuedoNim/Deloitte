import path from 'node:path'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { FileLogger } from './logging/logger.ts'
import { InMemoryJobRepository } from './services/job-repository.ts'
import { InMemoryConnectionStore } from './services/connection-store.ts'
import { VercelAiChatService } from './services/chat-service.ts'
import { createJobsRoutes } from './routes/jobs-routes.ts'
import { createConnectionRoutes } from './routes/connection-routes.ts'
import { createChatRoutes } from './routes/chat-routes.ts'
import { createLogsRoutes } from './routes/logs-routes.ts'

// Composition Root (Dependency Inversion & Single Responsibility)
const logsDir = path.resolve(process.cwd(), 'logs')
const serverLogger = new FileLogger({
  logsDir,
  fileName: 'server.log',
  source: 'server',
})
const clientFileLogger = new FileLogger({
  logsDir,
  fileName: 'client.log',
  source: 'client',
})

const jobRepository = new InMemoryJobRepository(serverLogger)
const connectionStore = new InMemoryConnectionStore(serverLogger)
const chatService = new VercelAiChatService(jobRepository, connectionStore, serverLogger)

const app = new Hono()

app.use('*', cors())

// HTTP request logging middleware for API routes
app.use('/api/*', async (c, next) => {
  const startedAt = Date.now()
  await next()
  if (c.req.path !== '/api/logs/client') {
    serverLogger.info('http.request', {
      method: c.req.method,
      path: c.req.path,
      status: c.res.status,
      durationMs: Date.now() - startedAt,
    })
  }
})

app.route('/api/jobs', createJobsRoutes(jobRepository, serverLogger))
app.route('/api/connection', createConnectionRoutes(connectionStore))
app.route('/api/chat', createChatRoutes(chatService))
app.route('/api/logs', createLogsRoutes(clientFileLogger, serverLogger))

app.get('/api/health', (c) => {
  const conn = connectionStore.getPublicStatus()
  return c.json({
    status: 'ok',
    service: 'deloitte-airport-modernization-ecs',
    jobsCount: jobRepository.getAll().length,
    modelId: conn.modelId,
    baseUrl: conn.baseUrl,
    hasApiToken: conn.hasToken,
  })
})

app.use('/*', serveStatic({ root: './src/client/dist' }))
app.get('*', serveStatic({ path: './src/client/dist/index.html' }))

// Background server-authoritative job telemetry tick
setInterval(() => {
  jobRepository.tickProgress()
}, 4000)

const port = Number(process.env.PORT) || 3000
serve({
  fetch: app.fetch,
  port,
  hostname: '0.0.0.0',
})

serverLogger.info('server.started', {
  port,
  hostname: '0.0.0.0',
  logsDir,
})

export default app
