# PSF load test results (2026-05-20)

Tests used **Apache Bench** and **autocannon** from the dev machine against local backend and production VPS (`107.175.91.211`).

**Re-run:** `./scripts/load-test.sh local` and `./scripts/load-test.sh production`

## Quick answer: how many users?

| User type | Comfortable concurrent | Bottleneck |
|-----------|------------------------|------------|
| **Survey / questionnaire** (clients filling forms) | **50+** local, **~20–50** production | Light DB reads; prod limited by network RTT (~750 ms @ 10 concurrent) |
| **Admin viewing cached dashboard** | **100+** (Redis HIT) | HTTP + Redis |
| **Admin loading reporting table** (full SQL) | **~5–10** active at once | **DB pool max 5**; ~4 s median per query @ 10 concurrent |
| **Admin polling dashboard every 30s** | **~30–50** users | ~2 heavy req/s max with pool 5; cached polls are much higher |

### Latest run (local, `DB_POOL_MAX` default 5)

| Endpoint | Test | Result |
|----------|------|--------|
| `/api/health` | 500 req, c=50 | 4421 req/s, p99 16 ms |
| `/api/health` | autocannon 10s, c=50 | ~7288 req/s |
| Questionnaire tokens | 100 req, c=10 | 1621 req/s, p99 11 ms |
| `/api/reporting/dashboard` | cached POST | &lt;25 ms p99 after warm cache |
| `/api/reporting/table` | 60 req, c=20 | **2.5 req/s**, p50 **7.8 s** (pool saturated) |
| `/api/reporting/table` | autocannon 15s, c=10 | **2.1 req/s**, p50 **4.0 s** |

### Latest run (production VPS)

| Endpoint | Test | Result |
|----------|------|--------|
| `/api/health` | 200 req, c=10 | 15 req/s, p50 **573 ms** |
| `/api/health` | 500 req, c=50 | 65 req/s, p50 **565 ms** |
| Questionnaire page | 100 req, c=10 | 11 req/s, p50 **762 ms** |

**HostPapa PHP proxy** adds large latency. Prefer VPS API directly when load testing production.

## Bottleneck

`backend/src/config/database.js` defaults Sequelize pool **`max: 5`**. Heavy reporting queries queue; raise `DB_POOL_MAX` on VPS (see `scripts/SCALING.md`).

## Re-run tests

```bash
chmod +x scripts/load-test.sh
./scripts/load-test.sh local
./scripts/load-test.sh production
./scripts/load-test.sh hostpapa
```

## Recommendations

Implemented in repo — see **`scripts/SCALING.md`**:

- `DB_POOL_MAX` env + PM2 cluster (`ecosystem.config.cjs`)
- Redis cache on `/api/reporting/*`
- Dashboard poll default 30s (`VITE_REALTIME_INTERVAL_MS`)

Still needed for **1000+** users: read replica, load balancer, CDN, pre-aggregated SQL.

1. Deploy scaling env on VPS and install Redis.
2. Run production tests **from the VPS** (`ab http://127.0.0.1:3000/api/health`) to separate network latency.
3. Re-run `./scripts/load-test.sh production` after deploy.
