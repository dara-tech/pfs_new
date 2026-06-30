$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot\..

if (-not (Test-Path '.env')) {
  Write-Error 'Missing C:\psf-api\.env — copy from deploy\windows\env.production.example'
}

npm install --omit=dev
pm2 delete psf-api 2>$null
pm2 start ecosystem.config.cjs
pm2 save
pm2 list
Write-Host 'Test: curl http://127.0.0.1:3000/api/health'
