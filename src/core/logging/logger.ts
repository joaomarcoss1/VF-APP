type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export type LogContext = {
  code?: string
  module?: string
  empresaId?: string | null
  userId?: string | null
  entity?: string
  entityId?: string | null
  requestId?: string
  details?: unknown
}

const SENSITIVE_KEYS = /password|senha|token|secret|authorization|cookie|card|cartao|service[_-]?role/i

function sanitize(value: unknown, depth = 0): unknown {
  if (depth > 4) return '[max-depth]'
  if (Array.isArray(value)) return value.slice(0, 50).map((item) => sanitize(item, depth + 1))
  if (!value || typeof value !== 'object') return value
  const output: Record<string, unknown> = {}
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    output[key] = SENSITIVE_KEYS.test(key) ? '[redacted]' : sanitize(item, depth + 1)
  }
  return output
}

function write(level: LogLevel, message: string, context: LogContext = {}) {
  const entry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...context,
    details: sanitize(context.details),
  }
  const target = level === 'error' ? console.error : level === 'warn' ? console.warn : level === 'debug' ? console.debug : console.info
  target('[VF Nexus]', entry)
}

export const logger = {
  debug: (message: string, context?: LogContext) => write('debug', message, context),
  info: (message: string, context?: LogContext) => write('info', message, context),
  warn: (message: string, context?: LogContext) => write('warn', message, context),
  error: (message: string, context?: LogContext) => write('error', message, context),
}
