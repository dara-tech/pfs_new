/**
 * API base URL resolution for dev, Vercel (+ custom domain), HostPapa, and direct VPS.
 *
 * Vercel (recommended): leave VITE_API_BASE empty; vercel.json rewrites /api → VPS.
 * HostPapa: build with VITE_USE_PHP_GATEWAY=true (psf-api.php gateway).
 * Direct API: VITE_API_BASE=https://api.psfnew.nchads.gov.kh/api (needs CORS on backend).
 */

function normalizeApiBase(value) {
  const trimmed = (value || '').trim().replace(/\/$/, '');
  if (!trimmed) return '';
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
}

export function shouldUsePhpApiGateway() {
  if (import.meta.env.VITE_USE_PHP_GATEWAY === 'true') return true;
  if (import.meta.env.VITE_USE_PHP_GATEWAY === 'false') return false;
  return false;
}

export function getApiBaseURL() {
  if (shouldUsePhpApiGateway()) return '';
  const explicit = normalizeApiBase(import.meta.env.VITE_API_BASE);
  if (explicit) return explicit;
  return '/api';
}

/** Same-origin /api (Vercel rewrite or Vite dev proxy). */
export function usesSameOriginApi() {
  return getApiBaseURL() === '/api' && !shouldUsePhpApiGateway();
}
