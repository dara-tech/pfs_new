# Run once as Administrator if PM2 exits after SSH disconnect
$ErrorActionPreference = 'Stop'
Set-Location 'C:\psf-api'
$npm = "$env:APPDATA\npm"
$env:Path = "$env:Path;$npm"

pm2 delete psf-api 2>$null
pm2 start ecosystem.config.cjs
Start-Sleep -Seconds 10
pm2 save
pm2-startup install

$health = try {
  (Invoke-WebRequest -UseBasicParsing 'http://127.0.0.1:3000/api/health' -TimeoutSec 15).Content
} catch { $_.Exception.Message }

Write-Host "Node health: $health"
$apache = try {
  (Invoke-WebRequest -UseBasicParsing 'http://127.0.0.1/api/health' -TimeoutSec 15).Content
} catch { $_.Exception.Message }
Write-Host "Apache /api health: $apache"
pm2 list
