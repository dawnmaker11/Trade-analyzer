$ErrorActionPreference = 'Stop'

$root = Resolve-Path (Join-Path $PSScriptRoot '..')
Set-Location $root

foreach ($command in 'node', 'npm', 'git') {
  if (-not (Get-Command $command -ErrorAction SilentlyContinue)) {
    throw "Required prerequisite is missing: $command"
  }
}

Write-Host "Node $(node --version)"
Write-Host 'Starting Trade in MANUAL mode on loopback.'

Start-Process powershell -WindowStyle Hidden -ArgumentList '-NoProfile', '-Command', "Set-Location '$root'; `$env:TRADE_MODE='manual'; `$env:TRADE_RUN_SERVER='1'; npx tsx apps/api/src/server.ts" -PassThru | Select-Object -ExpandProperty Id | Out-File (Join-Path $root 'scripts/api.pid')
Start-Process powershell -WindowStyle Hidden -ArgumentList '-NoProfile', '-Command', "Set-Location '$root'; npm run dev --workspace @trade/web" -PassThru | Select-Object -ExpandProperty Id | Out-File (Join-Path $root 'scripts/web.pid')
Start-Process powershell -WindowStyle Hidden -ArgumentList '-NoProfile', '-Command', "Set-Location '$root'; `$env:TRADE_MODE='manual'; npx tsx apps/worker/src/worker.ts" -PassThru | Select-Object -ExpandProperty Id | Out-File (Join-Path $root 'scripts/worker.pid')

Write-Host 'API:  http://localhost:3000/health'
Write-Host 'Web:  http://localhost:3001'
