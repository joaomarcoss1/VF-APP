param(
  [switch]$SkipInstall
)

$ErrorActionPreference = "Stop"
$Project = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Project

function Invoke-NativeStep {
  param([string]$Name, [scriptblock]$Command)
  Write-Host "`n=== $Name ===" -ForegroundColor Cyan
  & $Command
  if ($LASTEXITCODE -ne 0) {
    throw "Falha na etapa: $Name (código $LASTEXITCODE)"
  }
}

try {
  if (!(Test-Path "package.json")) { throw "package.json não encontrado na raiz." }

  $nodeMajor = [int]((node -v).TrimStart('v').Split('.')[0])
  if ($nodeMajor -ne 22) { throw "Use Node 22 LTS. Detectado: $(node -v)" }

  npm config set registry https://registry.npmjs.org/

  if (Select-String -Path "package-lock.json" -Pattern "applied-caas|internal.api.openai|openai.org/artifactory" -Quiet) {
    throw "package-lock.json contém URL interna proibida."
  }

  if (!$SkipInstall) {
    Invoke-NativeStep "Instalação limpa" { npm ci --legacy-peer-deps --no-audit --no-fund --registry=https://registry.npmjs.org/ }
  }

  Invoke-NativeStep "Diagnóstico V9.4" { npm run diagnostico:v9.4 }
  Invoke-NativeStep "Verificação de segurança" { npm run security:check }
  Invoke-NativeStep "TypeScript" { npm run typecheck }
  Invoke-NativeStep "Lint" { npm run lint }
  Invoke-NativeStep "Testes Vitest" { npm test }
  Invoke-NativeStep "Build Next" { npm run build }

  Write-Host "`nVF Nexus V9.4 validado com sucesso neste computador." -ForegroundColor Green
}
catch {
  Write-Host "`nVALIDAÇÃO INTERROMPIDA: $($_.Exception.Message)" -ForegroundColor Red
  Write-Host "Corrija o erro antes de atualizar o GitHub ou publicar na Vercel." -ForegroundColor Yellow
  Read-Host "Pressione ENTER para encerrar"
  return
}

Read-Host "Pressione ENTER para encerrar"
