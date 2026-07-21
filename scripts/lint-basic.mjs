import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const fail = (msg) => { console.error(`ERRO lint: ${msg}`); process.exitCode = 1 }
const read = (file) => fs.existsSync(path.join(root, file)) ? fs.readFileSync(path.join(root, file), 'utf8') : ''

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    if (['node_modules', '.next', '.git', 'coverage', 'dist'].includes(entry.name)) continue
    const rel = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(rel, out)
    else out.push(rel)
  }
  return out
}

for (const file of walk('.')) {
  if (/\.bak$|\.log$/.test(file)) fail(`arquivo temporário encontrado: ${file}`)
}

const globals = read('src/app/globals.css')
const importantCount = (globals.match(/!important/g) || []).length
if (importantCount > 20) fail(`globals.css ainda tem excesso de !important (${importantCount})`)
for (const token of ['--vf-input-bg', '--vf-input-text', '--vf-bottom-nav-bg']) {
  if (!globals.includes(token)) fail(`token visual ausente em globals.css: ${token}`)
}

const modules = read('src/lib/modules.ts')
for (const banned of ['icon: \'Atd\'', 'icon: \'Coz\'', 'icon: \'Bar\'', 'icon: \'Cx\'', 'icon: \'SCAN\'', 'icon: \'TAG\'']) {
  if (modules.includes(banned)) fail(`ícone textual legado encontrado: ${banned}`)
}

const sw = read('public/sw.js')
if (!sw.includes('vf-nexus-v9-2-3-stable')) fail('Service Worker sem cache da V9.2.3')
if (sw.includes('location.reload')) fail('Service Worker não pode forçar reload')

const nextConfig = read('next.config.js')
if (nextConfig.includes('ignoreBuildErrors') && !read('package.json').includes('\"typecheck\"')) fail('next.config.js só pode ignorar typecheck interno do Next se houver npm run typecheck obrigatório')

const installPrompt = read('src/components/mobile/InstallAppPrompt.tsx')
if (installPrompt.includes('controllerchange') && installPrompt.includes('location.reload')) fail('InstallAppPrompt não deve recarregar automaticamente')

if (!process.exitCode) console.log('Lint estrutural V9.2.3 aprovado: CSS, PWA, ícones, build config e arquivos temporários verificados.')
