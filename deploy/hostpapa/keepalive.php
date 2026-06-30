<?php
header('Content-Type: text/plain');
if (($_GET['key'] ?? '') !== 'psf-setup-2026') {
    http_response_code(403);
    exit('Forbidden');
}
require_once __DIR__ . '/node-boot.php';
exit(psf_ensure_node_running() ? "ok\n" : "started\n");
