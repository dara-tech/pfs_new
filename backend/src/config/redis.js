import Redis from 'ioredis';

let client = null;
let unavailable = false;

/**
 * Optional Redis client. Returns null when REDIS_URL is unset or connection fails.
 */
export function getRedis() {
  if (unavailable) return null;
  if (client) return client;

  const url = process.env.REDIS_URL?.trim();
  if (!url) return null;

  client = new Redis(url, {
    maxRetriesPerRequest: 2,
    connectTimeout: 5000,
    lazyConnect: true,
    enableOfflineQueue: false,
  });

  client.on('error', (err) => {
    console.warn('[redis]', err.message);
  });

  return client;
}

export async function initRedis() {
  const redis = getRedis();
  if (!redis) {
    console.log('ℹ️  Redis not configured (REDIS_URL empty) — reporting cache disabled');
    return false;
  }

  try {
    if (redis.status === 'wait') {
      await redis.connect();
    }
    await redis.ping();
    console.log('✅ Redis connected — reporting cache enabled');
    return true;
  } catch (err) {
    console.warn('⚠️  Redis unavailable — reporting cache disabled:', err.message);
    unavailable = true;
    try {
      redis.disconnect();
    } catch {
      /* ignore */
    }
    client = null;
    return false;
  }
}

export async function closeRedis() {
  if (!client) return;
  try {
    await client.quit();
  } catch {
    client.disconnect();
  }
  client = null;
}
