import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8')
const exists = (file) => fs.existsSync(path.join(root, file))
const results = []
const add = (name, ok, detail = '') => results.push({ name, ok: Boolean(ok), detail })

const pkg = JSON.parse(read('package.json'))
const lock = JSON.parse(read('package-lock.json'))
add('Versão V9.4', pkg.version === '9.4.0', pkg.version)
add('Lockfile compatível', lock.lockfileVersion >= 3, `lockfileVersion=${lock.lockfileVersion}`)
add('Lockfile público', !/applied-caas|internal\.api\.openai|openai\.org\/artifactory/i.test(read('package-lock.json')), 'Sem URLs internas')
add('TypeScript estrito', JSON.parse(read('tsconfig.json')).compilerOptions.strict === true)
add('Build sem ignoreBuildErrors', !read('next.config.js').includes('ignoreBuildErrors'))
add('Service Worker V9.4', read('public/sw.js').includes('vf-nexus-v9-4-static'))
add('PWA sem reload automático', !read('public/sw.js').includes('location.reload'))
add('Migration hardening', exists('supabase/migrations/048_vf_nexus_v9_4_security_tenant_hardening.sql'))
add('Diagnóstico SQL', exists('supabase/DIAGNOSTICO_SEGURANCA_V9_4.sql'))
add('Tenant efetivo', read('src/services/_base.ts').includes('vf_effective_empresa_id'))
add('Permissão fail-closed', read('src/services/_base.ts').includes('AuthorizationUnavailableError'))
add('Webhook Stripe protegido', read('src/app/api/stripe/webhook/route.ts').includes('verifyStripeSignature'))
add('Checkout oficial', read('src/app/api/billing/checkout/route.ts').includes('resolveOfficialPlan'))
add('WhatsApp PDF', read('src/services/documents/receipt.service.ts').includes('sendDocumentOrFallback'))
add('Relatório de rentabilidade', exists('src/features/reports/product-profitability.ts'))
add('Fila offline idempotente', read('src/lib/offline-db.ts').includes('idempotency_key'))

const missingEnv = ['NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_ANON_KEY'].filter((key) => !process.env[key])
add('Ambiente Supabase', missingEnv.length === 0, missingEnv.length ? `Ausentes: ${missingEnv.join(', ')}` : 'Configurado')
const providerConfigured = Boolean(process.env.WHATSAPP_API_URL && process.env.WHATSAPP_API_TOKEN)
add('Provider WhatsApp', providerConfigured, providerConfigured ? 'Configurado' : 'Fallback manual será utilizado')

const lines = [
  '# Relatório de diagnóstico VF Nexus V9.4', '',
  `Gerado em: ${new Date().toISOString()}`, '',
  '| Verificação | Resultado | Detalhes |', '|---|---|---|',
  ...results.map((item) => `| ${item.name} | ${item.ok ? 'OK' : 'PENDENTE'} | ${String(item.detail).replace(/\|/g, '\\|')} |`),
  '',
  '> Itens de credenciais externas são marcados como pendentes sem impedir a inspeção estática do projeto.',
]
fs.writeFileSync(path.join(root, 'RELATORIO_DIAGNOSTICO_V9_4.md'), `${lines.join('\n')}\n`)
for (const item of results) console.log(`${item.ok ? 'OK' : 'PENDENTE'} — ${item.name}: ${item.detail}`)
const structuralFailures = results.filter((item) => !item.ok && !['Ambiente Supabase','Provider WhatsApp'].includes(item.name))
if (structuralFailures.length) process.exit(1)
