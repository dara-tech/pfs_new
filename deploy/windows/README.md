# PSF on Windows Server (production)

**Live:** https://psfnew.nchads.gov.kh  
**Server:** `SR-ODK` · `192.168.0.16` · XAMPP + Node  
**Database:** `psfnew` (MySQL on localhost)

Full setup history, architecture, pfSense HAProxy, DNS, and troubleshooting:

→ **[PRODUCTION_SETUP.md](PRODUCTION_SETUP.md)**

---

## Quick deploy

```bash
cp deploy/windows/.env.deploy.example deploy/windows/.env.deploy
# Edit WIN_SSH_HOST, WIN_SSH_PORT, WIN_SSH_USER, WIN_SSH_PASS

npm run deploy
```

| Command | Action |
|---------|--------|
| `npm run deploy` | Backend + frontend + restart + health check |
| `./deploy.sh windows` | Backend only |
| `./deploy.sh windows-frontend` | Frontend only |

**GitHub Actions:** push to `main` → auto-deploy. See [GITHUB_ACTIONS.md](GITHUB_ACTIONS.md).

**Requirement:** ngrok SSH (or stable SSH) on Windows must be running for remote deploy.

---

## Layout

| Item | Location |
|------|----------|
| Node API | `C:\psf-api\` (scheduled task `psf-api-node`, port 3000) |
| Frontend SPA | `C:\xampp\htdocs\psfnew\` |
| Apache vhost | `conf/extra/psfnew.conf` → `:80` and `:2087` |
| API env | `C:\psf-api\.env` |

WAN HTTPS: **pfSense HAProxy** → `192.168.0.16:2087` → Apache → `/api` → Node → MySQL **`psfnew`**.

---

## Local dev (same DB)

```bash
npm run db:tunnel    # terminal 1 — SSH tunnel to server MySQL
npm run dev          # terminal 2
```

Set `DB_DATABASE=psfnew` in `backend/.env`. See [PRODUCTION_SETUP.md §5](PRODUCTION_SETUP.md#5-local-dev--same-database-psfnew).

---

## First-time server setup

Only needed once on a fresh server:

```powershell
# On Windows (as Administrator)
powershell -ExecutionPolicy Bypass -File C:\psf-api\scripts\install-api-service.ps1
netsh advfirewall firewall add rule name="Apache 2087 psfnew" dir=in action=allow protocol=TCP localport=2087
```

pfSense HAProxy (from Mac with tunnel to `192.168.0.6`):

```bash
ssh -N -L 18080:192.168.0.6:80 -p <port> Administrator@<ngrok-host> &
export PFSENSE_PASS='<password>'
python3 deploy/windows/scripts/configure-haproxy-psfnew.py http://127.0.0.1:18080
```

Details: [PRODUCTION_SETUP.md](PRODUCTION_SETUP.md)

---

## Seed data

```bash
cd backend
npm run seed:admin
node migrations/import_questions.js
```

(Run against `psfnew` — local with tunnel or on server via SSH.)

---

## Docs index

| Doc | Contents |
|-----|----------|
| [PRODUCTION_SETUP.md](PRODUCTION_SETUP.md) | **Main reference** — architecture, cutover, HAProxy, DNS, troubleshooting |
| [GITHUB_ACTIONS.md](GITHUB_ACTIONS.md) | CI secrets and workflow |
| [SETUP_COMPLETE.md](SETUP_COMPLETE.md) | Early setup log (partially superseded) |
| [MIGRATION.md](MIGRATION.md) | Vercel/VPS → Windows migration notes |
| [env.production.example](env.production.example) | `C:\psf-api\.env` template |
