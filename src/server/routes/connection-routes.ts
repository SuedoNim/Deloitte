import { Hono } from 'hono'
import type { ModelConnectionConfig } from '../../client/src/types/jobs.ts'
import type { IConnectionStore } from '../services/connection-store.ts'

export function createConnectionRoutes(connectionStore: IConnectionStore) {
  const router = new Hono()

  router.get('/', (c) => {
    return c.json(connectionStore.getPublicStatus())
  })

  router.put('/', async (c) => {
    const body = await c.req.json<Partial<ModelConnectionConfig>>()
    const updated = connectionStore.update(body)
    return c.json(updated)
  })

  return router
}
