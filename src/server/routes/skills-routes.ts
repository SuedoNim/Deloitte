import { Hono } from 'hono'
import type { ISkillRegistry } from '../ai/skills-catalog.ts'
import type { WorkflowCode } from '../../client/src/types/jobs.ts'
import type { ILogger } from '../logging/logger.ts'

export function createSkillsRoutes(
  skillRegistry: ISkillRegistry,
  logger: ILogger,
): Hono {
  const router = new Hono()

  router.get('/', (c) => {
    logger.info('skills.catalog_requested')
    return c.json(skillRegistry.getCatalogSummary())
  })

  router.get('/:workflowCode', (c) => {
    const code = c.req.param('workflowCode').toUpperCase() as WorkflowCode
    const skill = skillRegistry.getSkillForWorkflow(code)
    logger.info('skills.workflow_skill_requested', {
      workflowCode: code,
      skillId: skill.id,
    })
    return c.json({ skill })
  })

  return router
}
