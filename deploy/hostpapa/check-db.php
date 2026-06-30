<?php
header('Content-Type: application/json');
if (($_GET['key'] ?? '') !== 'psf-setup-2026') {
    http_response_code(403);
    exit('{}');
}
$envPath = '/home/nchads3/psf-backend/psf-backend/.env';
$env = [];
foreach (file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
    if ($line[0] === '#' || strpos($line, '=') === false) {
        continue;
    }
    [$k, $v] = explode('=', $line, 2);
    $env[trim($k)] = trim($v, " \t\"'");
}
$mysqli = new mysqli(
    $env['DB_HOST'] ?? 'localhost',
    $env['DB_USERNAME'] ?? '',
    $env['DB_PASSWORD'] ?? '',
    $env['DB_DATABASE'] ?? ''
);
if ($mysqli->connect_error) {
    echo json_encode(['error' => $mysqli->connect_error]);
    exit;
}

$out = [
    'database' => $env['DB_DATABASE'] ?? '',
    'host' => $env['DB_HOST'] ?? 'localhost',
];
$r = $mysqli->query('SHOW TABLES');
$out['tables'] = $r ? $r->num_rows : 0;

foreach (['users', 'tokens', 'userdata', 'providerdata', 'tbl_sites'] as $t) {
    $q = $mysqli->query("SELECT COUNT(*) AS c FROM `$t`");
    $out[$t] = $q ? (int) $q->fetch_assoc()['c'] : null;
}

echo json_encode($out, JSON_PRETTY_PRINT);
