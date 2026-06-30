<?php
header('Content-Type: text/plain');
$url = 'http://127.0.0.1:3000/api/health';
$ctx = stream_context_create(['http' => ['timeout' => 5]]);
echo @file_get_contents($url, false, $ctx) ?: 'failed: ' . error_get_last()['message'] . "\n";
