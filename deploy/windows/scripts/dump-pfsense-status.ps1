# Dump pfSense NAT rows mentioning 192.168.0.16 / psfnew / HAProxy
param(
  [string]$PfHost = 'http://192.168.0.6',
  [string]$User = 'admin',
  [string]$Pass = $env:PFSENSE_PASS
)
$ErrorActionPreference = 'Stop'
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession

function Get-Csrf([string]$html) {
  if ($html -match "name='__csrf_magic'\s+value=`"([^`"]+)`"") { return $Matches[1] }
  if ($html -match 'name="__csrf_magic"\s+value="([^"]+)"') { return $Matches[1] }
  throw 'csrf token not found'
}

$loginPage = Invoke-WebRequest -UseBasicParsing -Uri "$PfHost/index.php" -WebSession $session
$csrf = Get-Csrf $loginPage.Content
$null = Invoke-WebRequest -UseBasicParsing -Uri "$PfHost/index.php" -Method POST -WebSession $session -Body @{
  __csrf_magic = $csrf; usernamefld = $User; passwordfld = $Pass; login = 'Sign In'
}

foreach ($path in @('firewall_nat.php', 'status_haproxy.php', 'haproxy/haproxy_listeners.php')) {
  try {
    $r = Invoke-WebRequest -UseBasicParsing -Uri "$PfHost/$path" -WebSession $session
    Write-Host "=== $path ($($r.Content.Length) bytes) ==="
    $r.Content -split "`n" | Where-Object { $_ -match '192\.168\.0\.16|psfnew|503|haproxy|36\.37\.175|prep' } | Select-Object -First 25 | ForEach-Object { $_.Trim() }
  } catch {
    Write-Host "=== $path unavailable: $($_.Exception.Message) ==="
  }
}
