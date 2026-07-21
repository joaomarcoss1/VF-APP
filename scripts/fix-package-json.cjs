const fs = require('fs')

const path = 'package.json'
let raw = fs.readFileSync(path, 'utf8')

// Remove BOM e caracteres invis?veis problem?ticos no in?cio do arquivo
raw = raw.replace(/^\uFEFF/, '').trimStart()

const pkg = JSON.parse(raw)

pkg.name = pkg.name || 'vf-app'
pkg.version = pkg.version || '1.0.0'
pkg.private = true
pkg.scripts = pkg.scripts || {}
pkg.scripts.build = 'node scripts/build-stable.mjs'

fs.writeFileSync(path, JSON.stringify(pkg, null, 2) + '\n', { encoding: 'utf8' })

console.log('package.json corrigido e salvo em UTF-8 sem BOM.')
