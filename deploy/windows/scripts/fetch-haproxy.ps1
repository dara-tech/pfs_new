param([string]$PfHost = 'http://192.168.0.6', [string]$User = 'admin', [string]$Pass = $env:PFSENSE_PASS)
$ErrorActionPreference = 'Stop'
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
function Get-Csrf([string]$html) {
  if ($html -match "name='__csrf_magic'\s+value=`"([^`"]+)`"") { return $Matches[1] }
  throw 'csrf missing'
}
$lp = Invoke-WebRequest -UseBasicParsing -Uri "$PfHost/index.php" -WebSession $session -TimeoutSec 20
$csrf = Get-Csrf $lp.Content
$null = Invoke-WebRequest -UseBasicParsing -Uri "$PfHost/index.php" -Method POST -WebSession $session -TimeoutSec 20 -Body @{
  __csrf_magic=$csrf; usernamefld=$User; passwordfld=$Pass; login='Sign In'
}
$out = 'C:\psf-api\pfsense-haproxy.html'
Invoke-WebRequest -UseBasicParsing -Uri "$PfHost/haproxy/haproxy_listeners.php" -WebSession $session -TimeoutSec 45 -OutFile $out
Write-Host "saved $out size $((Get-Item $out).Length)"
