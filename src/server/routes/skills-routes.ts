import { Hono } from 'hono'
import {
  getCatalogSummary,
  getSkillForWorkflow,
} from '../ai/skills-catalog.ts'
import type { WorkflowCode } from '../../client/src/types/jobs.ts'

export function createSkillsRoutes(): Hono {
  const router = new Hono()

  router.get('/', (c) => {
    return c.json(getCatalogSummary())
  })

  router.get('/:workflowCode', (c) => {
    const code = c.req.param('workflowCode').toUpperCase() as WorkflowCode
    const skill = getSkillForWorkflow(code)
    return c.json({ skill })
  })

  return router
}
