<?php
/** Shared CORS Allow-Origin for psf-api.php / proxy.php */
function psf_cors_allow_origin(): string
{
    $allowed = [
        'https://psfnew.nchads.gov.kh',
        'http://psfnew.nchads.gov.kh',
        'https://psf-flax.vercel.app',
    ];
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origin !== '' && in_array($origin, $allowed, true)) {
        return $origin;
    }
    if ($origin !== '' && preg_match('#^https://[a-z0-9-]+(-[a-z0-9]+)*\.vercel\.app$#i', $origin)) {
        return $origin;
    }
    return 'https://psfnew.nchads.gov.kh';
}

function psf_send_cors_headers(): void
{
    header('Access-Control-Allow-Origin: ' . psf_cors_allow_origin());
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
}
