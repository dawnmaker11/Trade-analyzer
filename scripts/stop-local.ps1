$ErrorActionPreference = 'Stop'
$root = Resolve-Path (Join-Path $PSScriptRoot '..')

foreach ($name in 'api', 'web', 'worker') {
  $pidFile = Join-Path $root "scripts/$name.pid"
  if (Test-Path $pidFile) {
    $processId = (Get-Content $pidFile -Raw).Trim()
    if ($processId -and (Get-Process -Id $processId -ErrorAction SilentlyContinue)) {
      Stop-Process -Id $processId -Force
    }
    Remove-Item $pidFile -Force
  }
}

Write-Host 'Trade local processes stopped.'
