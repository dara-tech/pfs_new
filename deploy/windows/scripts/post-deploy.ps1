# Run on Windows after backend upload: npm install + restart API (scheduled task).
$ErrorActionPreference = 'Stop'
$workDir = 'C:\psf-api'
Set-Location $workDir

if (-not (Test-Path '.env')) {
  Write-Error 'Missing C:\psf-api\.env — create from env.production.example before first deploy'
}

Write-Host 'npm install --omit=dev ...'
& npm.cmd install --omit=dev
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$taskName = 'psf-api-node'
$task = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($task) {
  Write-Host "Restarting scheduled task $taskName ..."
  Stop-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
  Get-Process node -ErrorAction SilentlyContinue |
    Where-Object { $_.Path -like '*nodejs*' } |
    Stop-Process -Force -ErrorAction SilentlyContinue
  Start-Sleep -Seconds 3
  Start-ScheduledTask -TaskName $taskName
} else {
  Write-Host 'Installing API scheduled task (first deploy)...'
  & "$PSScriptRoot\install-api-service.ps1"
}

Start-Sleep -Seconds 10

$nodeHealth = try {
  (Invoke-WebRequest -UseBasicParsing 'http://127.0.0.1:3000/api/health' -TimeoutSec 20).Content
} catch { $_.Exception.Message }
Write-Host "Node: $nodeHealth"

$apacheHealth = try {
  (Invoke-WebRequest -UseBasicParsing 'http://127.0.0.1:2087/api/health' -Headers @{ Host = 'psfnew.nchads.gov.kh' } -TimeoutSec 20).Content
} catch { $_.Exception.Message }
Write-Host "Apache 2087: $apacheHealth"

if ($nodeHealth -notmatch '"status":"ok"') { exit 1 }
