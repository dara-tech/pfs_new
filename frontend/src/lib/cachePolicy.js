/** Max serialized size for a single cached GET response (~512 KB) */
export const MAX_CACHE_ENTRY_BYTES = 512 * 1024;

/** Max number of cached GET keys kept in offline storage */
export const MAX_CACHE_ENTRIES = 12;

/** Default TTL for cacheable GET responses (15 minutes) */
export const DEFAULT_CACHE_TTL_MS = 15 * 60 * 1000;

const NO_CACHE_PATTERNS = [
  '/admin/',
  '/reporting/',
  '/auth/',
];

export function shouldCacheGet(url = '') {
  const path = String(url).split('?')[0];
  return !NO_CACHE_PATTERNS.some((p) => path.includes(p));
}

export function estimatePayloadBytes(data) {
  try {
    return new Blob([JSON.stringify(data)]).size;
  } catch {
    return MAX_CACHE_ENTRY_BYTES + 1;
  }
}

export function isCacheablePayload(data) {
  return estimatePayloadBytes(data) <= MAX_CACHE_ENTRY_BYTES;
}
