<?php
header('Content-Type: text/plain');
echo 'disable_functions: ' . ini_get('disable_functions') . "\n";
echo 'proc_open: ' . (function_exists('proc_open') ? 'yes' : 'no') . "\n";
echo 'pcntl: ' . (function_exists('pcntl_exec') ? 'yes' : 'no') . "\n";
if (function_exists('proc_open')) {
    $p = proc_open('/bin/echo hello', [1 => ['pipe', 'w'], 2 => ['pipe', 'w']], $pipes);
    if (is_resource($p)) {
        echo stream_get_contents($pipes[1]);
        proc_close($p);
    }
}
