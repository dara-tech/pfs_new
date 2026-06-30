<?php
header('Content-Type: text/plain');
echo "disable_functions: " . ini_get('disable_functions') . "\n\n";
foreach (['node', 'npm', 'which node', 'ls /opt/cpanel/ea-nodejs*/bin/node 2>/dev/null', 'ls ~/nodevenv 2>/dev/null'] as $cmd) {
    echo "=== $cmd ===\n";
    echo shell_exec($cmd) ?: "(empty)\n";
    echo "\n";
}
