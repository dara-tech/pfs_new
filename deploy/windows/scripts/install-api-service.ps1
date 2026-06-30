# Register PSF API as a Windows scheduled task (survives SSH disconnect / reboot).
# Run once as Administrator: powershell -ExecutionPolicy Bypass -File install-api-service.ps1
$ErrorActionPreference = 'Stop'
$taskName = 'psf-api-node'
$workDir = 'C:\psf-api'
$node = 'C:\Program Files\nodejs\node.exe'
if (-not (Test-Path $node)) {
  $node = (Get-Command node.exe -ErrorAction Stop).Source
}

Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue
Get-Process node -ErrorAction SilentlyContinue | Where-Object { $_.Path -like '*nodejs*' } | Stop-Process -Force -ErrorAction SilentlyContinue

$action = New-ScheduledTaskAction -Execute $node -Argument 'src\app.js' -WorkingDirectory $workDir
$trigger = New-ScheduledTaskTrigger -AtStartup
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -RunLevel Highest -User 'SYSTEM' | Out-Null
Start-ScheduledTask -TaskName $taskName
Start-Sleep -Seconds 10

$health = try {
  (Invoke-WebRequest -UseBasicParsing 'http://127.0.0.1:3000/api/health' -TimeoutSec 15).Content
} catch { $_.Exception.Message }
Write-Host "Node health: $health"
Get-ScheduledTask -TaskName $taskName | Select-Object TaskName, State
