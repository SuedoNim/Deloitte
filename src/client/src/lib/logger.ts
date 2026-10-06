export interface IClientLogger {
  info(event: string, meta?: Record<string, unknown>): void
  warn(event: string, meta?: Record<string, unknown>): void
  error(event: string, meta?: Record<string, unknown>): void
}

type LogLevel = 'info' | 'warn' | 'error'

class RemoteFileClientLogger implements IClientLogger {
  private readonly endpoint: string

  constructor(endpoint = '/api/logs/client') {
    this.endpoint = endpoint
  }

  info(event: string, meta?: Record<string, unknown>): void {
    this.dispatch('info', event, meta)
  }

  warn(event: string, meta?: Record<string, unknown>): void {
    this.dispatch('warn', event, meta)
  }

  error(event: string, meta?: Record<string, unknown>): void {
    this.dispatch('error', event, meta)
  }

  private dispatch(level: LogLevel, event: string, meta?: Record<string, unknown>): void {
    const payload = JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      event,
      meta,
    })

    fetch(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
    }).catch(() => {
      // Non-blocking file log transport
    })
  }
}

export function createClientLogger(endpoint?: string): IClientLogger {
  return new RemoteFileClientLogger(endpoint)
}
