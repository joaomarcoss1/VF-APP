import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const files = []
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules','.next','.git'].includes(entry.name)) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full)
    else if (/\.(ts|tsx|js|mjs|json|sql|env|example)$/.test(entry.name)) files.push(full)
  }
}
walk(root)
let failed = false
const violations = []
for (const file of files) {
  const rel = path.relative(root, file)
  const text = fs.readFileSync(file, 'utf8')
  if (/NEXT_PUBLIC_[A-Z0-9_]*(SERVICE_ROLE|SECRET|TOKEN)/.test(text)) violations.push(`${rel}: segredo exposto com NEXT_PUBLIC`)
  if (rel.startsWith('src/') && !rel.startsWith('src/tests/') && /applied-caas|internal\.api\.openai|openai\.org\/artifactory/i.test(text)) violations.push(`${rel}: URL interna`)
  if (/ignoreBuildErrors\s*:\s*true/.test(text)) violations.push(`${rel}: ignoreBuildErrors`)
}
for (const violation of violations) { console.error(`ERRO: ${violation}`); failed = true }
if (failed) process.exit(1)
console.log(`Security check V9.4 aprovado em ${files.length} arquivos: sem segredos públicos, registry interno ou build ignorado.`)
