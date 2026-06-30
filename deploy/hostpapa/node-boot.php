<?php
/**
 * Ensure local Node API is listening on :3000 (shared by psf-api.php, keepalive, start-node).
 */
function psf_ensure_node_running(): bool
{
    $ctx = stream_context_create(['http' => ['timeout' => 2, 'ignore_errors' => true]]);
    $health = @file_get_contents('http://127.0.0.1:3000/api/health', false, $ctx);
    if ($health !== false && strpos($health, '"ok"') !== false) {
        return true;
    }

    $logDir = '/home/nchads3/logs';
    $backend = '/home/nchads3/psf-backend/psf-backend';
    $node = '/home/nchads3/node/node/bin/node';
    $pidFile = "$logDir/node.pid";

    if (!is_file($node) || !is_file("$backend/src/app.js")) {
        return false;
    }
    if (!is_dir($logDir)) {
        mkdir($logDir, 0755, true);
    }

    @exec(sprintf('fuser -k 3000/tcp 2>/dev/null; pkill -f "%s/src/app.js" 2>/dev/null; true', $backend));

    $cmd = sprintf(
        'cd %s && nohup %s src/app.js >> %s/node.log 2>&1 </dev/null & echo $! > %s',
        escapeshellarg($backend),
        escapeshellarg($node),
        escapeshellarg($logDir),
        escapeshellarg($pidFile)
    );
    $desc = [1 => ['pipe', 'w'], 2 => ['pipe', 'w']];
    $p = proc_open('/bin/bash -c ' . escapeshellarg($cmd), $desc, $pipes);
    if (is_resource($p)) {
        fclose($pipes[1]);
        fclose($pipes[2]);
        proc_close($p);
    }

    for ($i = 0; $i < 8; $i++) {
        usleep(500000);
        $health = @file_get_contents('http://127.0.0.1:3000/api/health', false, $ctx);
        if ($health !== false && strpos($health, '"ok"') !== false) {
            return true;
        }
    }

    return false;
}
