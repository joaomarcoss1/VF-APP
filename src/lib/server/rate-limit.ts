type Entry = { count: number; resetAt: number }
const buckets = new Map<string, Entry>()

export function consumeRateLimit(key: string, options: { limit: number; windowMs: number }): { ok: boolean; retryAfter: number } {
  const now = Date.now()
  const current = buckets.get(key)
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + options.windowMs })
    return { ok: true, retryAfter: 0 }
  }
  if (current.count >= options.limit) {
    return { ok: false, retryAfter: Math.max(1, Math.ceil((current.resetAt - now) / 1000)) }
  }
  current.count += 1
  return { ok: true, retryAfter: 0 }
}

export function checkRateLimit(key: string, limit: number, windowMs: number): { allowed: boolean; retryAfter: number } {
  const result = consumeRateLimit(key, { limit, windowMs })
  return { allowed: result.ok, retryAfter: result.retryAfter }
}
