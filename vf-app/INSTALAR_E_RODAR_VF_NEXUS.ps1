$ErrorActionPreference = "Stop"

Write-Host "=== VF Nexus: instalacao limpa ===" -ForegroundColor Cyan

$project = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $project
Write-Host "Pasta do app: $project" -ForegroundColor Green

# Garante registro publico do npm, pois locks gerados em ambiente externo podem apontar para registry interno.
npm config set registry https://registry.npmjs.org/
npm config delete proxy 2>$null
npm config delete https-proxy 2>$null
[Environment]::SetEnvironmentVariable('NPM_CONFIG_REGISTRY', $null, 'User')
[Environment]::SetEnvironmentVariable('NPM_CONFIG_REGISTRY', $null, 'Process')

# Remove arquivos/pastas que podem carregar registry antigo ou instalacao quebrada.
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
Remove-Item -Force package-lock.json -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force .git -ErrorAction SilentlyContinue

Write-Host "Node atual:" -ForegroundColor Yellow
node -v
Write-Host "NPM atual:" -ForegroundColor Yellow
npm -v
Write-Host "Registry atual:" -ForegroundColor Yellow
npm config get registry

if (-not (Test-Path ".env.local")) {
  Write-Host "Criando .env.local modelo. Preencha as chaves reais antes de usar recursos do Supabase." -ForegroundColor Yellow
  @"
NEXT_PUBLIC_SUPABASE_URL=https://pvethzuhxhcvrygqenzk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=COLE_SUA_CHAVE_PUBLICA_AQUI
SUPABASE_SERVICE_ROLE_KEY=COLE_SUA_SERVICE_ROLE_KEY_AQUI
MASTER_ADMIN_EMAILS=joaomarcosgpp@hotmail.com,joaomarcosgpexp@gmail.com
VAPID_PUBLIC_KEY=COLE_SUA_VAPID_PUBLIC_KEY_AQUI
VAPID_PRIVATE_KEY=COLE_SUA_VAPID_PRIVATE_KEY_AQUI
VAPID_SUBJECT=mailto:joaomarcosgpp@hotmail.com
CRON_SECRET=vfapp_jdev_120400
ANTHROPIC_MODEL=claude-sonnet-4-6
IA_DAILY_LIMIT=50
"@ | Set-Content -Encoding UTF8 .env.local
}

Write-Host "Instalando dependencias pelo registry publico..." -ForegroundColor Cyan
npm install --legacy-peer-deps --no-audit --no-fund --registry=https://registry.npmjs.org/

Write-Host "Rodando typecheck..." -ForegroundColor Cyan
npm run typecheck

Write-Host "Rodando lint..." -ForegroundColor Cyan
npm run lint

Write-Host "Rodando build..." -ForegroundColor Cyan
npm run build

Write-Host "Iniciando servidor local..." -ForegroundColor Cyan
npm run dev
