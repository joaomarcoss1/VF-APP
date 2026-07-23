import crypto from 'node:crypto'
import { NextRequest } from 'next/server'

export function requestId(req?: NextRequest): string {
  return req?.headers.get('x-request-id') || crypto.randomUUID()
}

export function clientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown'
}

export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  if (left.length !== right.length) return false
  return crypto.timingSafeEqual(left, right)
}

export function assertBodySize(rawBody: string, maxBytes = 1_000_000): void {
  if (Buffer.byteLength(rawBody, 'utf8') > maxBytes) throw new Error('Payload excede o limite permitido.')
}

export function verifyStripeSignature(rawBody: string, signatureHeader: string | null, secret: string, toleranceSeconds = 300): boolean {
  if (!signatureHeader || !secret) return false
  const values = signatureHeader.split(',').map((part) => part.trim().split('='))
  const timestamp = values.find(([key]) => key === 't')?.[1]
  const signatures = values.filter(([key]) => key === 'v1').map(([, value]) => value).filter(Boolean)
  if (!timestamp || signatures.length === 0) return false
  const timestampNumber = Number(timestamp)
  if (!Number.isFinite(timestampNumber)) return false
  if (Math.abs(Math.floor(Date.now() / 1000) - timestampNumber) > toleranceSeconds) return false
  const expected = crypto.createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex')
  return signatures.some((signature) => safeEqual(expected, signature))
}

export function hmacSha256(rawBody: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
}

export function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex')
}
