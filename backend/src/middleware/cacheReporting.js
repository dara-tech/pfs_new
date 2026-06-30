import crypto from 'crypto';
import { getRedis } from '../config/redis.js';

function buildCacheKey(req) {
  const payload = {
    path: req.path,
    method: req.method,
    query: req.query ?? {},
    body: req.body ?? {},
    userId: req.user?.id ?? req.user?.userId ?? req.user?.sub ?? null,
    role: req.user?.role ?? null,
  };
  const hash = crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
  return `psf:reporting:${hash}`;
}

/**
 * Cache JSON responses for reporting routes (per-user filters + role).
 * Disabled when REDIS_URL is unset or Redis is down.
 */
export function cacheReporting(options = {}) {
  const ttlSeconds = Number(
    options.ttlSeconds ?? process.env.REPORTING_CACHE_TTL_SECONDS ?? 60
  );

  return async (req, res, next) => {
    if (ttlSeconds <= 0) return next();

    const redis = getRedis();
    if (!redis) return next();

    const cacheKey = buildCacheKey(req);

    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        res.setHeader('X-Cache', 'HIT');
        return res.status(200).json(JSON.parse(cached));
      }
    } catch (err) {
      console.warn('[cache] read failed:', err.message);
    }

    res.setHeader('X-Cache', 'MISS');
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode === 200 && body !== undefined) {
        redis.setex(cacheKey, ttlSeconds, JSON.stringify(body)).catch((err) => {
          console.warn('[cache] write failed:', err.message);
        });
      }
      return originalJson(body);
    };

    next();
  };
}
