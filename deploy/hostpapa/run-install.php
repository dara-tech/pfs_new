<?php
/**
 * One-time setup: npm install + start hint. Delete after use.
 */
header('Content-Type: text/plain');
$home = dirname(__DIR__, 2); // public_html/psfnew -> adjust
$backend = realpath(__DIR__ . '/../../psf-backend/psf-backend') ?: '/home/nchads3/psf-backend/psf-backend';
$node = '/home/nchads3/node/bin/node';
$npm = '/home/nchads3/node/bin/npm';

if (!is_file($node)) {
    exit("Node not found at $node\n");
}

function run($cmd, $cwd) {
    $desc = [1 => ['pipe', 'w'], 2 => ['pipe', 'w']];
    $p = proc_open($cmd, $desc, $pipes, $cwd);
    if (!is_resource($p)) {
        return "failed to start: $cmd\n";
    }
    $out = stream_get_contents($pipes[1]) . stream_get_contents($pipes[2]);
    proc_close($p);
    return $out;
}

echo "Backend: $backend\n\n";
if (!is_dir($backend . '/node_modules')) {
    echo "=== npm install (may take several minutes) ===\n";
    echo run("$npm install --production 2>&1", $backend);
} else {
    echo "node_modules already exists\n";
}

echo "\n=== Done. Ensure cron is running the API. ===\n";
