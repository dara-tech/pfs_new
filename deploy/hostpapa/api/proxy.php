<?php
/**
 * API proxy for psfnew.nchads.gov.kh → VPS Express (nginx :80).
 * PATH_INFO rewrite preserves POST bodies (query-string rewrite does not).
 */
$backend = 'http://107.175.91.211';

$path = '';
// THE_REQUEST keeps the original line before rewrite (POST body stays intact)
if (!empty($_SERVER['THE_REQUEST']) && preg_match('#\s/api/(\S+)\s#', $_SERVER['THE_REQUEST'], $m)) {
    $path = $m[1];
} elseif (!empty($_SERVER['REDIRECT_PSF_API_PATH'])) {
    $path = $_SERVER['REDIRECT_PSF_API_PATH'];
} elseif (!empty($_SERVER['PSF_API_PATH'])) {
    $path = $_SERVER['PSF_API_PATH'];
} elseif (!empty($_SERVER['PATH_INFO'])) {
    $path = ltrim($_SERVER['PATH_INFO'], '/');
} elseif (preg_match('#/api/([^?]+)#', $_SERVER['REQUEST_URI'] ?? '', $m)) {
    $path = $m[1];
} elseif (!empty($_GET['path'])) {
    $path = ltrim($_GET['path'], '/');
}
$path = ltrim($path, '/');
// Never forward calls to the proxy script itself
if (strpos($path, 'proxy.php') === 0) {
    $path = '';
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

// CORS preflight — answer here (avoid duplicate headers from upstream)
if ($method === 'OPTIONS') {
    header('Access-Control-Allow-Origin: https://psfnew.nchads.gov.kh');
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
    http_response_code(204);
    exit;
}

$url = rtrim($backend, '/') . '/api/' . $path;
$query = $_GET;
unset($query['path']);
if ($query) {
    $url .= (strpos($url, '?') === false ? '?' : '&') . http_build_query($query);
}

$body = file_get_contents('php://input');
if ($body === false) {
    $body = '';
}

$headers = ['Accept: application/json'];
if (!empty($_SERVER['HTTP_AUTHORIZATION'])) {
    $headers[] = 'Authorization: ' . $_SERVER['HTTP_AUTHORIZATION'];
}
if (!empty($_SERVER['HTTP_CONTENT_TYPE'])) {
    $headers[] = 'Content-Type: ' . $_SERVER['HTTP_CONTENT_TYPE'];
}
if (!empty($_SERVER['HTTP_COOKIE'])) {
    $headers[] = 'Cookie: ' . $_SERVER['HTTP_COOKIE'];
}

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HEADER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
curl_setopt($ch, CURLOPT_TIMEOUT, 120);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);

switch ($method) {
    case 'POST':
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
        break;
    case 'PUT':
    case 'PATCH':
    case 'DELETE':
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
        break;
    default:
        curl_setopt($ch, CURLOPT_HTTPGET, true);
        break;
}

$response = curl_exec($ch);
if ($response === false) {
    http_response_code(502);
    header('Content-Type: application/json');
    header('Access-Control-Allow-Origin: https://psfnew.nchads.gov.kh');
    header('Access-Control-Allow-Credentials: true');
    echo json_encode(['error' => 'Bad gateway', 'detail' => curl_error($ch)]);
    exit;
}

$code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
$headerSize = (int) curl_getinfo($ch, CURLINFO_HEADER_SIZE);
curl_close($ch);

$rawHeaders = substr($response, 0, $headerSize);
$respBody = substr($response, $headerSize);

http_response_code($code);
header('Access-Control-Allow-Origin: https://psfnew.nchads.gov.kh');
header('Access-Control-Allow-Credentials: true');

$skip = ['access-control-', 'transfer-encoding', 'connection', 'keep-alive'];
foreach (explode("\r\n", $rawHeaders) as $line) {
    if ($line === '' || stripos($line, 'HTTP/') === 0) {
        continue;
    }
    $lower = strtolower($line);
    $skipHeader = false;
    foreach ($skip as $prefix) {
        if (strpos($lower, $prefix) === 0) {
            $skipHeader = true;
            break;
        }
    }
    if (!$skipHeader) {
        header($line, false);
    }
}

echo $respBody;
