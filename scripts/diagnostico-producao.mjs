import fs from 'node:fs'

const checks = []
const add = (name, ok, detail) => checks.push({ name, ok, detail })
const read = (file) => fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '')

try {
  const pkg = JSON.parse(read('package.json'))
  add('package.json válido', true, `${pkg.name}@${pkg.version}`)
} catch (error) {
  add('package.json válido', false, error instanceof Error ? error.message : String(error))
}

try {
  JSON.parse(read('package-lock.json'))
  add('package-lock.json válido', true, 'JSON íntegro')
} catch (error) {
  add('package-lock.json válido', false, error instanceof Error ? error.message : String(error))
}

const lock = read('package-lock.json')
add(
  'Lockfile sem URLs internas',
  !/(applied-caas|internal\.api\.openai|openai\.org\/artifactory)/i.test(lock),
  'Deve usar somente o registry público do npm',
)

const nextConfig = read('next.config.js')
add(
  'Build sem ignoreBuildErrors',
  !nextConfig.includes('ignoreBuildErrors'),
  'TypeScript deve falhar de forma explícita',
)

const serviceWorker = read('public/sw.js')
add('Service Worker V9.3', serviceWorker.includes('vf-nexus-v9-3-static'), 'Cache versionado')
add('PWA sem reload automático', !serviceWorker.includes('location.reload'), 'Atualização é manual')

for (const key of ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY']) {
  add(`Env ${key}`, Boolean(process.env[key]), process.env[key] ? 'configurada' : 'ausente no processo atual')
}

const migrations = fs.readdirSync('supabase/migrations')
for (const migration of [
  '000_vf_nexus_base_tenant_helpers.sql',
  '045_vf_nexus_v9_3_base_tenant_helpers.sql',
  '046_vf_nexus_v9_3_whatsapp_auditoria.sql',
  '047_vf_nexus_v9_3_indexes_tenant.sql',
]) {
  add(`Migration ${migration}`, migrations.includes(migration), 'arquivo local')
}

for (const file of [
  'src/services/tenant/tenant-context.ts',
  'src/contexts/TenantProvider.tsx',
  'src/core/errors/app-error.ts',
  'src/services/whatsapp/whatsapp.service.ts',
  'src/services/documents/receipt.service.ts',
]) {
  add(`Estrutura ${file}`, fs.existsSync(file), fs.existsSync(file) ? 'presente' : 'ausente')
}

const lines = [
  '# Relatório de Diagnóstico de Produção',
  '',
  `Gerado em: ${new Date().toISOString()}`,
  '',
  ...checks.map((check) => `- ${check.ok ? '✅' : '❌'} **${check.name}** — ${check.detail}`),
  '',
  '## Observação',
  '',
  'As funções, tabelas, credenciais, providers e policies remotas precisam ser confirmadas no Supabase/Vercel após aplicar as migrations. Variáveis ausentes no processo local são avisos e não invalidam a estrutura do pacote.',
  '',
]

fs.writeFileSync('RELATORIO_DIAGNOSTICO_PRODUCAO.md', lines.join('\n'), 'utf8')
console.table(checks)

if (checks.some((check) => !check.ok && !check.name.startsWith('Env '))) {
  process.exitCode = 1
}
