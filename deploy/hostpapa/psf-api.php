<?php
/**
 * PSF API gateway: psfnew.nchads.gov.kh → production VPS (live psf_db).
 * Browser: /psf-api.php?p=auth/login
 */
@set_time_limit(300);
@ini_set('max_execution_time', '300');

require_once __DIR__ . '/cors-allow-origin.php';

$backend = 'http://107.175.91.211';

$path = isset($_GET['p']) ? ltrim((string) $_GET['p'], '/') : '';
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'OPTIONS') {
    psf_send_cors_headers();
    http_response_code(204);
    exit;
}

$url = rtrim($backend, '/') . '/api/' . $path;
$query = $_GET;
unset($query['p']);
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
if (in_array($method, ['POST', 'PUT', 'PATCH'], true)) {
    $headers[] = 'Content-Type: application/json';
}

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HEADER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 15);
curl_setopt($ch, CURLOPT_TIMEOUT, 180);
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
    psf_send_cors_headers();
    echo json_encode(['error' => 'Bad gateway', 'detail' => curl_error($ch)]);
    exit;
}

$code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
$headerSize = (int) curl_getinfo($ch, CURLINFO_HEADER_SIZE);
curl_close($ch);

$rawHeaders = substr($response, 0, $headerSize);
$respBody = substr($response, $headerSize);

// HostPapa sometimes returns the SPA index.html on upstream/proxy errors.
if ($code >= 500 || (stripos($respBody, '<!doctype html') !== false && stripos($respBody, '<div id="root">') !== false)) {
    http_response_code($code >= 500 ? $code : 502);
    header('Content-Type: application/json');
    psf_send_cors_headers();
    echo json_encode([
        'error' => 'API gateway error',
        'detail' => 'Upstream unavailable or returned HTML instead of JSON. Retry in a moment.',
        'upstreamStatus' => $code,
    ]);
    exit;
}

http_response_code($code);
psf_send_cors_headers();

$skip = ['access-control-', 'transfer-encoding', 'connection', 'keep-alive'];
foreach (explode("\r\n", $rawHeaders) as $line) {
    if ($line === '' || stripos($line, 'HTTP/') === 0) {
        continue;
    }
    $lower = strtolower($line);
    foreach ($skip as $prefix) {
        if (strpos($lower, $prefix) === 0) {
            continue 2;
        }
    }
    header($line, false);
}

echo $respBody;
