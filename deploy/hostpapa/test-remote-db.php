<?php
header('Content-Type: application/json');
if (($_GET['key'] ?? '') !== 'psf-setup-2026') {
    http_response_code(403);
    exit('{}');
}
$host = $_GET['host'] ?? '107.175.91.211';
$port = (int) ($_GET['port'] ?? 3306);
$out = ['host' => $host, 'port' => $port, 'tcp' => false, 'mysql' => null];

$fp = @fsockopen($host, $port, $errno, $errstr, 5);
if ($fp) {
    $out['tcp'] = true;
    fclose($fp);
} else {
    $out['tcp_error'] = "$errno: $errstr";
}

// Optional: test with credentials from query (never log password)
$user = $_GET['user'] ?? '';
$pass = $_GET['pass'] ?? '';
$db = $_GET['db'] ?? 'psf_db';
if ($user !== '') {
    $mysqli = @new mysqli($host, $user, $pass, $db, $port);
    if ($mysqli->connect_error) {
        $out['mysql'] = $mysqli->connect_error;
    } else {
        $r = $mysqli->query('SELECT COUNT(*) AS c FROM users');
        $out['mysql'] = 'ok';
        $out['users'] = $r ? (int) $r->fetch_assoc()['c'] : null;
        $mysqli->close();
    }
}

echo json_encode($out, JSON_PRETTY_PRINT);
