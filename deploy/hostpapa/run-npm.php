<?php
header('Content-Type: text/plain');
set_time_limit(600);
if (($_GET['key'] ?? '') !== 'psf-setup-2026') {
    http_response_code(403);
    exit('Forbidden');
}

$backend = '/home/nchads3/psf-backend/psf-backend';
$nodeBin = '/home/nchads3/node/node/bin';

putenv('PATH=' . $nodeBin . ':' . getenv('PATH'));
putenv('NODE_ENV=production');

$cmd = 'npm install --production --no-audit --no-fund 2>&1';
$desc = [1 => ['pipe', 'w'], 2 => ['pipe', 'w']];
$p = proc_open($cmd, $desc, $pipes, $backend);
if (!is_resource($p)) {
    exit("npm failed to start\n");
}
echo stream_get_contents($pipes[1]);
echo stream_get_contents($pipes[2]);
proc_close($p);
echo "\nexpress: " . (is_dir("$backend/node_modules/express") ? 'yes' : 'no') . "\n";
