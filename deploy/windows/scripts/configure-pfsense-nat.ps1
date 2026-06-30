# Login to pfSense and dump NAT page summary (LAN). Optional: add WAN 80/443 -> 192.168.0.16
param(
  [string]$PfHost = 'http://192.168.0.6',
  [string]$User = 'admin',
  [string]$Pass = $env:PFSENSE_PASS,
  [switch]$AddNat
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
  __csrf_magic = $csrf
  usernamefld  = $User
  passwordfld  = $Pass
  login        = 'Sign In'
}

$nat = Invoke-WebRequest -UseBasicParsing -Uri "$PfHost/firewall_nat.php" -WebSession $session
$html = $nat.Content
$has16 = $html -match '192\.168\.0\.16'
Write-Host "NAT page bytes: $($html.Length); has .16 rule: $has16"

if (-not $AddNat) { exit 0 }
if ($has16) { Write-Host 'NAT to 192.168.0.16 already present'; exit 0 }

function Add-PortForward([int]$Port, [string]$Descr) {
  $edit = Invoke-WebRequest -UseBasicParsing -Uri "$PfHost/firewall_nat_edit.php?dup=0" -WebSession $session
  $csrf2 = Get-Csrf $edit.Content
  $body = @{
    __csrf_magic      = $csrf2
    after             = ''
    type              = 'pass'
    interface         = 'wan'
    ipprotocol        = 'inet'
    protocol          = 'tcp'
    srcnot            = 'on'
    srcbeginport      = ''
    srcendport        = ''
    dstnot            = 'on'
    dstbeginport      = $Port
    dstendport        = $Port
    dsttype           = 'any'
    srctype           = 'any'
    target            = '192.168.0.16'
    'local-port'      = $Port
    localbeginport    = $Port
    localendport      = $Port
    descr             = $Descr
    top               = 'on'
    save              = 'Save'
  }
  $resp = Invoke-WebRequest -UseBasicParsing -Uri "$PfHost/firewall_nat_edit.php" -Method POST -WebSession $session -Body $body
  Write-Host "Added NAT TCP $Port -> 192.168.0.16:$Port ($Descr) status $($resp.StatusCode)"
}

Add-PortForward -Port 80 -Descr 'psfnew HTTP'
Add-PortForward -Port 443 -Descr 'psfnew HTTPS'

$applyCsrf = Get-Csrf ((Invoke-WebRequest -UseBasicParsing -Uri "$PfHost/firewall_nat.php" -WebSession $session).Content)
$null = Invoke-WebRequest -UseBasicParsing -Uri "$PfHost/firewall_nat.php" -Method POST -WebSession $session -Body @{
  __csrf_magic = $applyCsrf
  apply        = 'Apply Changes'
}
Write-Host 'Applied pfSense NAT changes'
