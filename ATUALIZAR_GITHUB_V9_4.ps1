param(
  [string]$CommitMessage = "VF Nexus V9.4: hardening segurança performance e multiempresa",
  [switch]$SkipInstall
)

$ErrorActionPreference = "Stop"
$Project = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Project
$Repo = "https://github.com/joaomarcoss1/VF-APP.git"

function Invoke-NativeStep {
  param([string]$Name, [scriptblock]$Command)
  Write-Host "`n=== $Name ===" -ForegroundColor Cyan
  & $Command
  if ($LASTEXITCODE -ne 0) { throw "Falha na etapa: $Name (código $LASTEXITCODE)" }
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

  if (!(Test-Path ".git")) { Invoke-NativeStep "Inicializando Git" { git init } }
  Invoke-NativeStep "Branch main" { git branch -M main }

  $origin = git remote get-url origin 2>$null
  if ($LASTEXITCODE -ne 0) {
    Invoke-NativeStep "Adicionando origin" { git remote add origin $Repo }
  } elseif ($origin -ne $Repo) {
    Invoke-NativeStep "Atualizando origin" { git remote set-url origin $Repo }
  }

  Invoke-NativeStep "Adicionando arquivos" { git add . }
  $pending = git status --porcelain
  if ([string]::IsNullOrWhiteSpace($pending)) {
    Write-Host "Nenhuma alteração para commit." -ForegroundColor Yellow
  } else {
    Invoke-NativeStep "Criando commit" { git commit -m $CommitMessage }
  }

  Invoke-NativeStep "Enviando para GitHub" { git push -u origin main }
  Write-Host "`nGitHub atualizado com sucesso, sem force push." -ForegroundColor Green
}
catch {
  Write-Host "`nATUALIZAÇÃO INTERROMPIDA: $($_.Exception.Message)" -ForegroundColor Red
  Write-Host "O GitHub não foi atualizado. Corrija a etapa indicada e execute novamente." -ForegroundColor Yellow
  Read-Host "Pressione ENTER para encerrar"
  return
}

Read-Host "Pressione ENTER para encerrar"
