import fs from 'node:fs'
import path from 'node:path'

export type LogLevel = 'info' | 'warn' | 'error' | 'debug'
export type LogSource = 'server' | 'client'

export interface LogEntry {
  timestamp: string
  level: LogLevel
  source: LogSource
  event: string
  meta?: Record<string, unknown>
}

export interface ILogger {
  info(event: string, meta?: Record<string, unknown>): void
  warn(event: string, meta?: Record<string, unknown>): void
  error(event: string, meta?: Record<string, unknown>): void
  debug(event: string, meta?: Record<string, unknown>): void
  writeEntry(entry: LogEntry): void
}

export class FileLogger implements ILogger {
  private readonly logFilePath: string
  private readonly source: LogSource

  constructor(options: { logsDir?: string; fileName: string; source: LogSource }) {
    const logsDir = options.logsDir ?? path.resolve(process.cwd(), 'logs')
    fs.mkdirSync(logsDir, { recursive: true })
    this.logFilePath = path.join(logsDir, options.fileName)
    this.source = options.source

    if (!fs.existsSync(this.logFilePath)) {
      fs.writeFileSync(this.logFilePath, '', 'utf8')
    }
  }

  info(event: string, meta?: Record<string, unknown>): void {
    this.log('info', event, meta)
  }

  warn(event: string, meta?: Record<string, unknown>): void {
    this.log('warn', event, meta)
  }

  error(event: string, meta?: Record<string, unknown>): void {
    this.log('error', event, meta)
  }

  debug(event: string, meta?: Record<string, unknown>): void {
    this.log('debug', event, meta)
  }

  writeEntry(entry: LogEntry): void {
    const line = JSON.stringify({
      timestamp: entry.timestamp || new Date().toISOString(),
      level: entry.level,
      source: entry.source,
      event: entry.event,
      ...(entry.meta && Object.keys(entry.meta).length > 0 ? { meta: entry.meta } : {}),
    })
    fs.appendFile(this.logFilePath, `${line}\n`, 'utf8', () => {
      // Non-blocking append
    })
  }

  private log(level: LogLevel, event: string, meta?: Record<string, unknown>): void {
    this.writeEntry({
      timestamp: new Date().toISOString(),
      level,
      source: this.source,
      event,
      meta,
    })
  }
}
