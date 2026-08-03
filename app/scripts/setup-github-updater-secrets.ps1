# Configura secrets do auto-updater no GitHub (rode UMA vez no seu Windows)
# Uso:
#   1) gh auth login
#   2) powershell -ExecutionPolicy Bypass -File app/scripts/setup-github-updater-secrets.ps1

$ErrorActionPreference = "Stop"

$gh = "$env:ProgramFiles\GitHub CLI\gh.exe"
if (-not (Test-Path $gh)) {
  $gh = "$env:LocalAppData\Programs\GitHub CLI\gh.exe"
}
if (-not (Test-Path $gh)) {
  throw "GitHub CLI (gh) nao encontrado. Instale: winget install GitHub.cli"
}

& $gh auth status 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
  Write-Host "Faca login no GitHub primeiro:" -ForegroundColor Yellow
  Write-Host "  gh auth login" -ForegroundColor Cyan
  throw "Nao autenticado no gh."
}

$keyPath = Join-Path $env:USERPROFILE ".tauri\anamorong-estoque.key"
if (-not (Test-Path $keyPath)) {
  throw "Chave privada nao encontrada em $keyPath. Gere com: npx tauri signer generate -w `"$keyPath`" --ci"
}

$repo = "davidwilliamestudo-star/controle-de-estoque-mac"
$privateKey = Get-Content $keyPath -Raw

Write-Host "Configurando secrets no repo $repo ..." -ForegroundColor Green

# Chave privada (conteudo do arquivo)
$privateKey | & $gh secret set TAURI_SIGNING_PRIVATE_KEY --repo $repo

# Sem senha na chave (geramos sem password)
"" | & $gh secret set TAURI_SIGNING_PRIVATE_KEY_PASSWORD --repo $repo 2>$null
# Se secret vazio falhar, remove e segue
try {
  & $gh secret list --repo $repo
} catch {}

Write-Host ""
Write-Host "OK. Secrets configurados." -ForegroundColor Green
Write-Host "Pubkey ja deve estar em app/src-tauri/tauri.conf.json"
Write-Host "Proximo: criar tag v1.0.1 e push (se ainda nao fez)."
