<?php
header('Content-Type: text/plain; charset=utf-8');
if (($_GET['key'] ?? '') !== 'psf-setup-2026') {
    http_response_code(403);
    exit('Forbidden');
}
require_once __DIR__ . '/node-boot.php';
if (psf_ensure_node_running()) {
    $ctx = stream_context_create(['http' => ['timeout' => 3, 'ignore_errors' => true]]);
    $health = @file_get_contents('http://127.0.0.1:3000/api/health', false, $ctx);
    exit("running\n" . ($health ?: '') . "\n");
}
exit("failed to start — see /home/nchads3/logs/node.log\n");
