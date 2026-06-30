<?php
header('Content-Type: text/plain');
$it = new RecursiveIteratorIterator(
    new RecursiveDirectoryIterator('/home/nchads3/psf-backend', FilesystemIterator::SKIP_DOTS),
    RecursiveIteratorIterator::SELF_FIRST
);
$count = 0;
foreach ($it as $f) {
    if (str_ends_with($f->getPathname(), 'node_modules/express/package.json')) {
        echo $f->getPathname() . "\n";
        $count++;
        if ($count >= 3) break;
    }
}
if (!$count) echo "express not found under psf-backend\n";
