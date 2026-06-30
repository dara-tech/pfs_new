<?php
/**
 * Run a .sql file from this directory. ?key= &file=schema.sql
 */
header('Content-Type: text/plain');
if (($_GET['key'] ?? '') !== 'psf-setup-2026') {
    http_response_code(403);
    exit('Forbidden');
}

$file = basename($_GET['file'] ?? 'schema.sql');
$sqlFile = __DIR__ . '/' . $file;
if (!is_file($sqlFile)) {
    exit("Missing $file\n");
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
    exit('DB connect failed: ' . $mysqli->connect_error . "\n");
}

$sql = file_get_contents($sqlFile);
if ($mysqli->multi_query($sql)) {
    do {
        if ($result = $mysqli->store_result()) {
            $result->free();
        }
    } while ($mysqli->more_results() && $mysqli->next_result());
}

if ($mysqli->error) {
    exit("Import error ($file): " . $mysqli->error . "\n");
}

echo "OK: imported $file\n";
$mysqli->close();
