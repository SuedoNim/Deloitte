import { createSignal } from 'solid-js'
import {
  AbstractChat,
  DefaultChatTransport,
  type ChatInit,
  type ChatState,
  type ChatStatus,
  type UIMessage,
} from 'ai'

class SolidChatState<UI_MESSAGE extends UIMessage = UIMessage>
  implements ChatState<UI_MESSAGE>
{
  private statusSignal = createSignal<ChatStatus>('ready')
  private errorSignal = createSignal<Error | undefined>(undefined)
  private messagesSignal: ReturnType<typeof createSignal<UI_MESSAGE[]>>

  constructor(initialMessages: UI_MESSAGE[] = []) {
    this.messagesSignal = createSignal<UI_MESSAGE[]>(initialMessages)
  }

  get status(): ChatStatus {
    return this.statusSignal[0]()
  }

  set status(value: ChatStatus) {
    this.statusSignal[1](() => value)
  }

  get error(): Error | undefined {
    return this.errorSignal[0]()
  }

  set error(value: Error | undefined) {
    this.errorSignal[1](() => value)
  }

  get messages(): UI_MESSAGE[] {
    return this.messagesSignal[0]()
  }

  set messages(value: UI_MESSAGE[]) {
    this.messagesSignal[1](() => [...value])
  }

  pushMessage = (message: UI_MESSAGE) => {
    this.messagesSignal[1]((prev) => [...prev, this.snapshot(message)])
  }

  popMessage = () => {
    this.messagesSignal[1]((prev) => prev.slice(0, -1))
  }

  replaceMessage = (index: number, message: UI_MESSAGE) => {
    this.messagesSignal[1]((prev) => {
      const next = [...prev]
      next[index] = this.snapshot(message)
      return next
    })
  }

  snapshot = <T,>(thing: T): T => {
    try {
      return structuredClone(thing)
    } catch {
      return JSON.parse(JSON.stringify(thing)) as T
    }
  }
}

class SolidChat<
  UI_MESSAGE extends UIMessage = UIMessage,
> extends AbstractChat<UI_MESSAGE> {
  readonly solidState: SolidChatState<UI_MESSAGE>

  constructor(init: ChatInit<UI_MESSAGE> & { api?: string } = {}) {
    const solidState = new SolidChatState<UI_MESSAGE>(init.messages ?? [])
    super({
      ...init,
      state: solidState,
      transport:
        init.transport ??
        new DefaultChatTransport({
          api: init.api ?? '/api/chat',
        }),
    })
    this.solidState = solidState
  }
}

export function createVercelChat<UI_MESSAGE extends UIMessage = UIMessage>(
  init: ChatInit<UI_MESSAGE> & { api?: string } = {},
) {
  const chat = new SolidChat<UI_MESSAGE>(init)

  return {
    chat,
    messages: () => chat.solidState.messages,
    status: () => chat.solidState.status,
    error: () => chat.solidState.error,
    sendMessage: chat.sendMessage,
    regenerate: chat.regenerate,
    stop: chat.stop,
    clearError: chat.clearError,
    setMessages: (messages: UI_MESSAGE[]) => {
      chat.messages = messages
    },
  }
}

export function getMessageText(message: UIMessage): string {
  if (!message.parts || message.parts.length === 0) {
    return ''
  }
  return message.parts
    .filter(
      (part): part is Extract<UIMessage['parts'][number], { type: 'text' }> =>
        part.type === 'text',
    )
    .map((part) => part.text)
    .join('')
}
