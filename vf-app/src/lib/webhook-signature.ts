import crypto from 'crypto'

export function hashAssinaturaWebhook(signature: string | null | undefined): string | null {
  const clean = String(signature || '').trim()
  if (!clean) return null
  return crypto.createHash('sha256').update(clean).digest('hex')
}

export function gerarAssinaturaHmac(payload: string, secret: string): string {
  if (!secret?.trim()) throw new Error('Secret do webhook não configurado.')
  return crypto.createHmac('sha256', secret).update(payload).digest('hex')
}

export function validarAssinaturaHmac(payload: string, signature: string | null | undefined, secret: string | null | undefined): boolean {
  if (!secret?.trim()) return false
  const cleanSignature = String(signature || '').trim()
  if (!cleanSignature) return false
  const expected = gerarAssinaturaHmac(payload, secret.trim())
  const normalized = cleanSignature.includes('=') ? cleanSignature.split('=').pop() || '' : cleanSignature
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(normalized))
  } catch {
    return false
  }
}
