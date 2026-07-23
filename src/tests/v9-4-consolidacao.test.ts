import { describe, expect, it } from 'vitest'
import fs from 'node:fs'

describe('V9.4 hardening', () => {
  it('não ignora erros de build', () => expect(fs.readFileSync('next.config.js', 'utf8')).not.toContain('ignoreBuildErrors'))
  it('lockfile usa registry público', () => expect(fs.readFileSync('package-lock.json', 'utf8')).not.toMatch(/applied-caas|internal\.api\.openai|openai\.org\/artifactory/))
  it('service worker é V9.4 e não recarrega automaticamente', () => {
    const sw = fs.readFileSync('public/sw.js', 'utf8')
    expect(sw).toContain('vf-nexus-v9-4-static')
    expect(sw).not.toContain('location.reload')
    expect(sw).toContain("'/api/'")
  })
  it('tema possui overlay e contraste dinâmico', () => {
    const css = fs.readFileSync('src/app/globals.css', 'utf8')
    expect(css).toContain('--vf-overlay')
    expect(css).toContain('--vf-fg-on-primary')
  })
  it('migration de segurança e tenant existe', () => expect(fs.existsSync('supabase/migrations/048_vf_nexus_v9_4_security_tenant_hardening.sql')).toBe(true))
  it('webhook Stripe bloqueia configuração ausente e valida assinatura', () => {
    const route = fs.readFileSync('src/app/api/stripe/webhook/route.ts', 'utf8')
    expect(route).toContain('STRIPE_WEBHOOK_SECRET')
    expect(route).toContain('verifyStripeSignature')
  })
})
