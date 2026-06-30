# Install PM2 globally and register startup (run once as Administrator)
$ErrorActionPreference = 'Stop'
npm install -g pm2
npm install -g pm2-windows-startup
pm2-startup install
Write-Host 'PM2 installed. After first pm2 start, run: pm2 save'
