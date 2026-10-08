import path from 'node:path'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { FileLogger } from './logging/logger.ts'
import { FileServiceConfigStore } from './services/config-service.ts'
import { UsAirportPdfReportService } from './services/pdf-report-service.ts'
import { UsAirportToolRegistry } from './ai/tools-registry.ts'
import { UsAirportSkillRegistry } from './ai/skills-catalog.ts'
import { PglitePgBossJobManager } from './services/job-repository.ts'
import { InMemoryConnectionStore } from './services/connection-store.ts'
import { SinglePurposeLlmJobRunner } from './services/job-agent-runner.ts'
import { VercelAiChatService } from './services/chat-service.ts'
import { createJobsRoutes } from './routes/jobs-routes.ts'
import { createConnectionRoutes } from './routes/connection-routes.ts'
import { createChatRoutes } from './routes/chat-routes.ts'
import { createLogsRoutes } from './routes/logs-routes.ts'
import { createSkillsRoutes } from './routes/skills-routes.ts'

// Composition Root (SOLID Dependency Injection with PGlite + pg-boss)
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

const configStore = new FileServiceConfigStore(serverLogger)
const pdfReportService = new UsAirportPdfReportService(serverLogger)
const toolRegistry = new UsAirportToolRegistry(serverLogger, pdfReportService)
const skillRegistry = new UsAirportSkillRegistry(toolRegistry, serverLogger)
const connectionStore = new InMemoryConnectionStore(serverLogger, configStore)
const jobAgentRunner = new SinglePurposeLlmJobRunner(
  connectionStore,
  skillRegistry,
  serverLogger,
)
const jobRepository = new PglitePgBossJobManager(
  serverLogger,
  jobAgentRunner,
  skillRegistry,
  pdfReportService,
)
const chatService = new VercelAiChatService(
  jobRepository,
  connectionStore,
  serverLogger,
)

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

app.route(
  '/api/jobs',
  createJobsRoutes(jobRepository, pdfReportService, serverLogger),
)
app.route('/api/connection', createConnectionRoutes(connectionStore, serverLogger))
app.route('/api/chat', createChatRoutes(chatService, serverLogger))
app.route('/api/logs', createLogsRoutes(clientFileLogger, serverLogger))
app.route('/api/skills', createSkillsRoutes(skillRegistry, serverLogger))

app.get('/api/health', (c) => {
  const conn = connectionStore.getPublicStatus()
  return c.json({
    status: 'ok',
    service: 'deloitte-airport-modernization-ecs',
    jobManager: 'pglite+pg-boss',
    jobsCount: jobRepository.getAll().length,
    port: conn.port,
    configFile: conn.configFile,
    provider: conn.provider,
    modelId: conn.modelId,
    baseUrl: conn.baseUrl,
    hasApiToken: conn.hasToken,
  })
})

app.use('/*', serveStatic({ root: './src/client/dist' }))
app.get('*', serveStatic({ path: './src/client/dist/index.html' }))

const port = configStore.getServerPort()
const hostname = configStore.getConfig().server.host || '0.0.0.0'
serve({
  fetch: app.fetch,
  port,
  hostname,
})

serverLogger.info('server.started', {
  port,
  hostname,
  configFile: configStore.getConfigFilePath(),
  jobManager: 'pglite+pg-boss',
  logsDir,
})

// Initialize PGlite + pg-boss in background after server port is open
jobRepository.init().catch((err) => {
  serverLogger.error('job_manager.init_failed', {
    error: err instanceof Error ? err.message : String(err),
  })
})

export default app
