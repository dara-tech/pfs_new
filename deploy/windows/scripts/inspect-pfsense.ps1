# Inspect pfSense NAT via web UI (LAN only). Does not modify config.
$ErrorActionPreference = 'Stop'
$base = 'http://192.168.0.6'
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession

function Get-Csrf([string]$html) {
  if ($html -match 'name="__csrf_magic"\s+value="([^"]+)"') { return $Matches[1] }
  throw 'csrf token not found on login page'
}

$loginPage = Invoke-WebRequest -UseBasicParsing -Uri "$base/index.php" -WebSession $session
$csrf = Get-Csrf $loginPage.Content
$null = Invoke-WebRequest -UseBasicParsing -Uri "$base/index.php" -Method POST -WebSession $session -Body @{
  __csrf_magic = $csrf
  usernamefld  = 'admin'
  passwordfld  = $env:PFSENSE_PASS
  login        = 'Sign In'
}

$nat = Invoke-WebRequest -UseBasicParsing -Uri "$base/firewall_nat.php" -WebSession $session
$html = $nat.Content
$out = 'C:\psf-api\pfsense-nat-snippet.txt'
$lines = $html -split "`n" | Where-Object { $_ -match '192\.168\.0\.(16|6)|psfnew|Port Forward|WAN' }
$lines | Select-Object -First 40 | Set-Content $out
Write-Host "Saved snippet to $out ($($lines.Count) matching lines)"
if ($html -match '192\.168\.0\.16') { Write-Host 'FOUND existing NAT to 192.168.0.16' } else { Write-Host 'MISSING NAT to 192.168.0.16' }
