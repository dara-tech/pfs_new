# PSF API on Windows Server (NCHADS LAN)

Host the Node API on **SR-ODK** (`192.168.0.16`) with **XAMPP** (Apache + MySQL). Frontend stays on **Vercel**; update `vercel.json` to proxy `/api` to your public API URL after pfSense port-forward.

## Frontend on Windows (same server)

| Item | Path / host |
|------|-------------|
| SPA files | `C:\xampp\htdocs\psfnew` |
| Apache vhost | `conf/extra/psfnew.conf` → **ServerName psfnew.nchads.gov.kh** only |
| API | `/api` → `127.0.0.1:3000` (same origin) |

Deploy frontend: `./deploy.sh windows-frontend` or `./deploy/windows/deploy-frontend.sh`

**After first deploy on server:**
```powershell
powershell -ExecutionPolicy Bypass -File C:\psf-api\scripts\install-api-service.ps1
netsh advfirewall firewall add rule name="Apache 2087 psfnew" dir=in action=allow protocol=TCP localport=2087
```
Then run HAProxy setup (from Mac with SSH tunnel to pfSense `192.168.0.6:80`):
```bash
ssh -N -L 18080:192.168.0.6:80 -p 14155 Administrator@0.tcp.ap.ngrok.io &
python3 deploy/windows/scripts/configure-haproxy-psfnew.py http://127.0.0.1:18080
```

**DNS cutover from Vercel:** replace CNAME with **A record** `psfnew` → WAN IP `36.37.175.123`. pfSense HAProxy must have backend `psfnew` → `192.168.0.16:2087` (see script above). Other subdomains unchanged.

## Isolated — does not affect other systems

| Change | Affects others? |
|--------|-----------------|
| Node API on **port 3000** only | **No** — Apache still owns 80/443/2086 |
| Apache vhost **`api.psfnew.nchads.gov.kh` only** | **No** — other sites (`prep.nchads.gov.kh`, `htdocs`, `takemehomeapi`, etc.) unchanged |
| MySQL database **`psf_db` only** | **No** — other DBs (`fonpam`, `takemehomeapi`, …) untouched |
| pfSense NAT **443/80 → 192.168.0.16** | Only exposes this server; other LAN IPs not changed |
| DNS **A record `api.psfnew` only** | **No** — `nchads.gov.kh`, `www`, `psfnew` (Vercel) unchanged |
| Vercel still on **VPS** during dual-run | **No** — production users unchanged until you cut over |

**Do not** use a global `ProxyPass /api` on port 80 — that would hijack `/api` on every site on the server. The config uses a **dedicated VirtualHost** for `api.psfnew.nchads.gov.kh` only.

## Server facts (verified)

| Item | Value |
|------|--------|
| Hostname | `SR-ODK` |
| OS | Windows Server 2012 R2 |
| LAN IP | `192.168.0.16` |
| pfSense | `192.168.0.6` |
| Node | v18.17.1 (`C:\Program Files\nodejs`) |
| Stack | XAMPP — Apache `:80/:443`, MySQL `:3306` |
| SSH (ngrok) | `ssh -p 14155 Administrator@0.tcp.ap.ngrok.io` |

## Architecture

```text
Internet → pfSense (192.168.0.6) → NAT → Windows 192.168.0.16:443
         → Apache (XAMPP) /api → http://127.0.0.1:3000 Node API
         → MySQL localhost:3306

Vercel frontend → vercel.json /api rewrite → your public API host
```

## 1. pfSense (admin @ 192.168.0.6)

**Firewall → NAT → Port Forward** (example):

| WAN port | LAN IP | LAN port | Purpose |
|----------|--------|----------|---------|
| 443 | 192.168.0.16 | 443 | HTTPS API (Apache) |
| 80 | 192.168.0.16 | 80 | HTTP redirect (optional) |

Use a **public hostname** (e.g. `api.psfnew.nchads.gov.kh`) DNS A record → your WAN IP.

## 2. Deploy backend (from your Mac)

**One command (backend + frontend + restart + health check):**

```bash
cp deploy/windows/.env.deploy.example deploy/windows/.env.deploy
# Edit WIN_SSH_PASS in .env.deploy

npm run deploy
# or: ./deploy.sh production
```

**Partial deploy:**

```bash
./deploy.sh windows          # backend only
./deploy.sh windows-frontend # frontend only
SKIP_VERIFY=1 ./deploy.sh production  # skip curl check
```

## GitHub Actions (push → auto-deploy)

On push to **`main`**, GitHub deploys automatically when `backend/`, `frontend/`, or `deploy/` files change.

**Setup:** add secrets `WIN_SSH_HOST`, `WIN_SSH_PORT`, `WIN_SSH_USER`, `WIN_SSH_PASS` in the repo (see [GITHUB_ACTIONS.md](GITHUB_ACTIONS.md)).

ngrok SSH on the Windows server must be running when the workflow runs.

Backend-only manual steps (first-time setup) — edit `C:\psf-api\.env` on the server:

- `DB_PASSWORD` — XAMPP MySQL root password
- `JWT_SECRET`, `SESSION_SECRET` — strong random strings
- `CLIENT_URL=https://psfnew.nchads.gov.kh`
- `CORS_ORIGINS=https://psf-flax.vercel.app,https://psfnew.nchads.gov.kh`

Then on the server (first time only — later deploys run `post-deploy.ps1` automatically):

```powershell
cd C:\psf-api
powershell -ExecutionPolicy Bypass -File scripts\install-api-service.ps1
```

## 3. Apache reverse proxy (XAMPP)

Include `deploy/windows/apache-psf-api.conf` from `C:\xampp\apache\conf\httpd.conf`:

```apache
Include "conf/extra/psf-api.conf"
```

Copy `apache-psf-api.conf` → `C:\xampp\apache\conf\extra\psf-api.conf`, enable modules `proxy`, `proxy_http`, restart Apache from XAMPP Control Panel.

Test: `http://192.168.0.16/api/health`

## 4. Point Vercel to new API

In `frontend/vercel.json`, set rewrite destination to your public API, e.g.:

```json
"destination": "https://api.psfnew.nchads.gov.kh/api/:path*"
```

Or WAN IP (HTTPS via Apache on Windows).

## 5. Redis (optional)

Reporting cache works without Redis (slower). To enable on Windows:

- Install [Memurai](https://www.memurai.com/) or Redis for Windows
- `REDIS_URL=redis://127.0.0.1:6379` in `.env`

## 6. Security

- **Rotate** all passwords shared in chat (Windows, cPanel, pfSense, ngrok).
- Do not commit `.env` or `.env.deploy`.
- Restrict MySQL `root` to localhost only.
- Keep Windows + XAMPP patched.

## Troubleshooting

| Issue | Check |
|-------|--------|
| API not reachable from internet | pfSense NAT, WAN firewall |
| 502 from Apache | `pm2 list`, Node on `:3000`, `curl http://127.0.0.1:3000/api/health` |
| DB connection refused | XAMPP MySQL running, `.env` credentials |
| CORS from Vercel | `CLIENT_URL`, `CORS_ORIGINS`, redeploy backend |
