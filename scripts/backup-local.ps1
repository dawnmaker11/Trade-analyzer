param(
  [Parameter(Mandatory = $true)][string]$DatabaseUrl,
  [string]$Destination = (Join-Path $PSScriptRoot '..\artifacts\backups')
)

$ErrorActionPreference = 'Stop'
$root = Resolve-Path (Join-Path $PSScriptRoot '..')
$target = [System.IO.Path]::GetFullPath($Destination)
if (-not $target.StartsWith([System.IO.Path]::GetFullPath($root))) { throw 'Backup destination must be inside the Trade workspace.' }
if (-not (Get-Command pg_dump -ErrorAction SilentlyContinue)) { throw 'pg_dump is required and must be on PATH.' }
New-Item -ItemType Directory -Force -Path $target | Out-Null
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$file = Join-Path $target "trade-$stamp.dump"
& pg_dump --format=custom --file=$file $DatabaseUrl
if ($LASTEXITCODE -ne 0 -or -not (Test-Path $file)) { throw 'PostgreSQL backup failed.' }
$hash = (Get-FileHash -Algorithm SHA256 $file).Hash
[pscustomobject]@{ Backup = $file; Sha256 = $hash; CreatedAt = (Get-Date).ToUniversalTime().ToString('o') } | ConvertTo-Json | Set-Content -Encoding UTF8 "$file.json"
Write-Host "Backup completed: $file"
