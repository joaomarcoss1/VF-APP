import fs from 'node:fs'
import path from 'node:path'

let failed = false
const fail = (message) => { failed = true; console.error(`ERRO: ${message}`) }
const read = (file) => fs.readFileSync(path.resolve(file), 'utf8')
const exists = (file) => fs.existsSync(path.resolve(file))

const sw = read('public/sw.js')
if (!sw.includes('vf-nexus-v9-4-static')) fail('Service Worker sem cache V9.4')
if (sw.includes('location.reload')) fail('PWA não pode recarregar automaticamente')
if (!sw.includes("'/api/'")) fail('Service Worker precisa excluir APIs privadas')

const next = read('next.config.js')
if (next.includes('ignoreBuildErrors')) fail('ignoreBuildErrors não é permitido')

const lock = read('package-lock.json')
if (/applied-caas|internal\.api\.openai|openai\.org\/artifactory/i.test(lock)) fail('package-lock contém registry interno')

for (const file of ['src/services/_tenant.ts','src/services/_base.ts','src/contexts/TenantProvider.tsx','src/core/errors/app-error.ts','src/core/logging/logger.ts']) {
  if (!exists(file)) fail(`Estrutura obrigatória ausente: ${file}`)
}

const whatsappApi = read('src/app/api/whatsapp/send/route.ts')
if (!whatsappApi.includes('vf_effective_empresa_id')) fail('WhatsApp API sem tenant efetivo')
if (!whatsappApi.includes("status: 'processando'")) fail('WhatsApp API sem estado processando')

const stripeWebhook = read('src/app/api/stripe/webhook/route.ts')
if (!stripeWebhook.includes('STRIPE_WEBHOOK_SECRET')) fail('Webhook Stripe sem segredo')
if (!stripeWebhook.includes('verifyStripeSignature')) fail('Webhook Stripe sem validação de assinatura')

if (failed) process.exit(1)
console.log('Lint estrutural V9.4 aprovado: segurança, tenant, PWA, lockfile e integrações essenciais verificados.')
