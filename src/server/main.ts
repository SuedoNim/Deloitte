import { Hono } from 'hono'
import { cors } from 'hono/cors'
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from 'ai'
import { openai } from '@ai-sdk/openai'

const app = new Hono()

app.use('*', cors({
  origin: ['http://localhost:5173'],
  allowHeaders: ['Content-Type'],
}))

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

app.get('/', (c) => c.text('Hono is running'))

export default app