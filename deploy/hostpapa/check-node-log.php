<?php
header('Content-Type: text/plain');
$log = '/home/nchads3/logs/node.log';
echo is_file($log) ? file_get_contents($log) : "no log yet\n";
if (is_file('/home/nchads3/psf-backend/psf-backend/package.json')) {
    echo "\npackage.json ok\n";
}
echo 'node_modules: ' . (is_dir('/home/nchads3/psf-backend/psf-backend/node_modules') ? 'yes' : 'no') . "\n";
