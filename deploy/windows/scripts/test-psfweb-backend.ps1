$r = Invoke-WebRequest -UseBasicParsing 'http://192.168.0.16:2082/' -Headers @{ Host = 'psfweb.nchads.gov.kh' } -MaximumRedirection 0 -ErrorAction SilentlyContinue
if ($r) {
  Write-Output "192.168.0.16:2082 status $($r.StatusCode) location $($r.Headers.Location)"
} else {
  Write-Output 'no response'
}

try {
  $r2 = Invoke-WebRequest -UseBasicParsing 'http://127.0.0.1:2082/' -Headers @{ Host = 'psfweb.nchads.gov.kh' } -MaximumRedirection 0
  Write-Output "127.0.0.1:2082 status $($r2.StatusCode) location $($r2.Headers.Location)"
} catch {
  if ($_.Exception.Response) {
    $code = [int]$_.Exception.Response.StatusCode
    $loc = $_.Exception.Response.Headers['Location']
    Write-Output "127.0.0.1:2082 status $code location $loc"
  } else {
    Write-Output "127.0.0.1:2082 error $($_.Exception.Message)"
  }
}

Test-NetConnection -ComputerName 192.168.0.6 -Port 80 -WarningAction SilentlyContinue | Select-Object ComputerName, TcpTestSucceeded
