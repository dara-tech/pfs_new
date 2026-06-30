# PSF scaling setup (Phase 1 + 2)

Changes in this repo to support many more concurrent users.

## What was added

| Feature | Files | Effect |
|---------|-------|--------|
| **DB pool from env** | `backend/src/config/database.js` | `DB_POOL_MAX=50` on VPS |
| **PM2 cluster** | `backend/ecosystem.config.cjs` | Multiple Node workers |
| **Redis reporting cache** | `cacheReporting.js`, `redis.js` | Same filters → cached JSON 60–120s |
| **Slower dashboard polling** | `frontend/src/config/realtime.js` | Default 30s instead of 10s |

## Production VPS setup

SSH to `107.175.91.211` and edit `/root/backend/.env`:

```env
NODE_ENV=production
PORT=3000

# Scale DB connections (MySQL max_connections must allow this)
DB_POOL_MAX=50
DB_POOL_MIN=2

# Redis (install first: apt install -y redis-server)
REDIS_URL=redis://127.0.0.1:6379
REPORTING_CACHE_DASHBOARD_TTL=60
REPORTING_CACHE_TABLE_TTL=120

# PM2 workers (optional; default = all CPU cores)
PM2_INSTANCES=4
```

Install Redis:

```bash
apt update && apt install -y redis-server
systemctl enable redis-server
systemctl start redis-server
redis-cli ping   # expect PONG
```

Deploy from your machine:

```bash
cd pfs_new
./deploy.sh backend
```

On VPS after deploy:

```bash
cd /root/backend
pm2 list
pm2 logs psf-api --lines 50
# Look for: "Redis connected" and "DB pool max: 50"
```

## Frontend (optional)

Create `frontend/.env.production`:

```env
VITE_REALTIME_INTERVAL_MS=30000
```

Rebuild and deploy frontend when you change this.

## Verify cache

```bash
curl -s -D - -o /dev/null -X POST https://YOUR_API/api/reporting/dashboard \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"filters":{}}' | grep -i x-cache
```

First request: `X-Cache: MISS`. Repeat within TTL: `X-Cache: HIT`.

## Path to ~1000 users

This setup targets **hundreds** of concurrent dashboard viewers with caching.

For **1000+** you still need:

- Bigger VPS or 2+ API servers behind nginx load balancer
- MySQL read replica + ProxySQL
- CDN for static frontend (Cloudflare on `psfnew.nchads.gov.kh`)
- Pre-aggregated reporting tables (nightly jobs)

See `scripts/LOAD_TEST_RESULTS.md` for baseline capacity numbers.
