import { Hono } from 'hono'
import type { ModelConnectionConfig } from '../../client/src/types/jobs.ts'
import type { IConnectionStore } from '../services/connection-store.ts'
import type { ILogger } from '../logging/logger.ts'

export function createConnectionRoutes(
  connectionStore: IConnectionStore,
  logger: ILogger,
) {
  const router = new Hono()

  router.get('/', (c) => {
    const status = connectionStore.getPublicStatus()
    logger.debug('connection.status_queried', {
      baseUrl: status.baseUrl,
      modelId: status.modelId,
      hasToken: status.hasToken,
    })
    return c.json(status)
  })

  router.put('/', async (c) => {
    const body = await c.req.json<Partial<ModelConnectionConfig>>()
    const updated = connectionStore.update(body)
    return c.json(updated)
  })

  return router
}
