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
foreach ($p in @('haproxy/haproxy_pools.php','haproxy/haproxy_listeners_edit.php?id=WEB-SSL','haproxy/haproxy_listeners_edit.php?id=front_http')) {
  $f = "C:\psf-api\pfsense-" + ($p -replace '[\?=/]','-') + '.html'
  Invoke-WebRequest -UseBasicParsing -Uri "$PfHost/$p" -WebSession $session -TimeoutSec 45 -OutFile $f
  Write-Host "saved $f"
}
