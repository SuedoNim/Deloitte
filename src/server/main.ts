import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from 'ai'
import { openai } from '@ai-sdk/openai'

const app = new Hono()

app.use('*', cors())

app.post('/api/chat', async (c) => {
  const { messages }: { messages: UIMessage[] } = await c.req.json()

  const result = streamText({
    model: openai('gpt-4o-mini'),
    messages: await convertToModelMessages(messages),
    instructions: 'You are a helpful assistant.',
  })

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream }),
  })
})

app.get('/api/health', (c) => c.text('Hono is running'))

app.use('/*', serveStatic({ root: './src/client/dist' }))
app.get('*', serveStatic({ path: './src/client/dist/index.html' }))

const port = Number(process.env.PORT) || 3000
serve({
  fetch: app.fetch,
  port,
  hostname: '0.0.0.0',
})

export default app