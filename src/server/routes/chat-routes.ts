import { Hono } from 'hono'
import type { UIMessage } from 'ai'
import type { ModelConnectionConfig } from '../../client/src/types/jobs.ts'
import type { IChatService } from '../services/chat-service.ts'
import type { ILogger } from '../logging/logger.ts'

export function createChatRoutes(chatService: IChatService, logger: ILogger) {
  const router = new Hono()

  router.post('/', async (c) => {
    const payload = await c.req.json<{
      messages?: UIMessage[]
      connection?: Partial<ModelConnectionConfig>
    }>()

    logger.debug('chat.route_dispatched', {
      messagesCount: payload.messages?.length ?? 0,
    })

    return chatService.streamChatResponse({
      messages: payload.messages ?? [],
      connection: payload.connection,
      headers: {
        apiToken: c.req.header('x-api-token'),
        baseUrl: c.req.header('x-base-url'),
        modelId: c.req.header('x-model-id'),
      },
    })
  })

  return router
}
