$hostHeader = 'psfweb.nchads.gov.kh'
foreach ($port in 2082,2084,2086,2087,80) {
  try {
    $r = Invoke-WebRequest -UseBasicParsing "http://127.0.0.1:$port/" -Headers @{ Host = $hostHeader } -TimeoutSec 8
    Write-Output "port $port -> $($r.StatusCode)"
  } catch {
    $code = $null
    if ($_.Exception.Response) { $code = [int]$_.Exception.Response.StatusCode }
    Write-Output "port $port -> FAIL $code $($_.Exception.Message.Split([char]10)[0])"
  }
}
