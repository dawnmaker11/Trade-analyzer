$ErrorActionPreference = 'Stop'

$failed = $false
foreach ($command in 'node', 'npm', 'git') {
  if (-not (Get-Command $command -ErrorAction SilentlyContinue)) {
    Write-Error "Missing prerequisite: $command"
    $failed = $true
  }
}

if (Get-Command node -ErrorAction SilentlyContinue) {
  $major = [int](node --version).TrimStart('v').Split('.')[0]
  if ($major -lt 20) {
    Write-Error 'Node.js 20 or newer is required.'
    $failed = $true
  }
}

if ($failed) { exit 1 }
Write-Host 'Windows prerequisites passed.'
