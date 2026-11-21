$root = Resolve-Path (Join-Path $PSScriptRoot '..')

foreach ($name in 'api', 'web', 'worker') {
  $pidFile = Join-Path $root "scripts/$name.pid"
  if (Test-Path $pidFile) {
    $processId = (Get-Content $pidFile -Raw).Trim()
    $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
    if ($process) { Write-Host "${name}: running (PID ${processId})" } else { Write-Host "${name}: stopped (stale PID)" }
  } else {
    Write-Host "${name}: stopped"
  }
}
