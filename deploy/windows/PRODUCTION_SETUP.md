# PSF production on Windows — setup & deploy reference

This document records **how production was configured** when PSF moved from Vercel/VPS to the NCHADS Windows server (`SR-ODK`). Use it for onboarding, redeploys, and troubleshooting.

**Live site:** https://psfnew.nchads.gov.kh  
**Repo:** https://github.com/dara-tech/pfs_new  
**Branch:** `main` (auto-deploy on push)

---

## 1. Architecture (current)

```text
Internet
  │
  ▼
DNS  psfnew.nchads.gov.kh  →  A  36.37.175.123  (WAN)
  │
  ▼
pfSense  192.168.0.6
  │  HAProxy (SSL termination on :443)
  │    WEB-SSL frontend:
  │      psfnew.nchads.gov.kh  →  backend pool "psfnew"  →  192.168.0.16:2087
  │      psfweb.nchads.gov.kh  →  backend pool "PSFWEB"  →  192.168.0.16:2082
  │
  ▼
Windows  SR-ODK  192.168.0.16  (XAMPP)
  │
  ├─ Apache :2087  vhost psfnew.nchads.gov.kh
  │     DocumentRoot  C:\xampp\htdocs\psfnew   (React SPA)
  │     /api/*        →  http://127.0.0.1:3000/api/*  (Node)
  │
  ├─ Node API  C:\psf-api  (scheduled task psf-api-node, port 3000)
  │
  └─ MySQL  localhost:3306  database  psfnew
```

**HTTPS path:** Browser → pfSense HAProxy → Windows Apache **:2087** → SPA or `/api` proxy → Node **:3000** → MySQL **`psfnew`**.

**Plain HTTP (:80)** may still return 503 from HAProxy unless a matching `front_http` rule exists — production users should use **HTTPS**.

---

## 2. Server inventory

| Item | Value |
|------|--------|
| Hostname | `SR-ODK` |
| LAN IP | `192.168.0.16` |
| OS | Windows Server 2012 R2 |
| Stack | XAMPP (Apache + MySQL) |
| Node | v18 (`C:\Program Files\nodejs`) |
| pfSense | `192.168.0.6` |
| WAN IP (DNS) | `36.37.175.123` |
| Public URL | https://psfnew.nchads.gov.kh |
| SSH (remote admin) | ngrok → `ssh -p <port> Administrator@<ngrok-host>` |

### Paths on Windows

| Purpose | Path |
|---------|------|
| Node API | `C:\psf-api\` |
| API env | `C:\psf-api\.env` |
| Deploy scripts | `C:\psf-api\scripts\` |
| Frontend SPA | `C:\xampp\htdocs\psfnew\` |
| Apache vhost | `C:\xampp\apache\conf\extra\psfnew.conf` |
| Apache main config | `C:\xampp\apache\conf\httpd.conf` |

### Ports

| Port | Service |
|------|---------|
| 3000 | Node API (internal) |
| 2087 | Apache vhost for **psfnew** (HAProxy WAN backend) |
| 2082 | Apache vhost for **psfweb** (legacy PSFWEB app) |
| 2086 | Apache vhost for **prep** (unchanged) |
| 3306 | MySQL (localhost only) |

### Database

| Database | Used by API? | Notes |
|----------|--------------|-------|
| **`psfnew`** | **Yes (production)** | ~150 users, `questions` table, Question Manager |
| `psf_db` | No (legacy) | Old production copy; not wired to API anymore |
| `psf_db5`, `psf_db_v5` | No | Other copies on same server |

Production `C:\psf-api\.env`:

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=psfnew
DB_USERNAME=root
DB_PASSWORD=<xampp-mysql-root-password>

CLIENT_URL=https://psfnew.nchads.gov.kh
CORS_ORIGINS=https://psf-flax.vercel.app,https://psfnew.nchads.gov.kh
```

---

## 3. What was configured (cutover checklist)

### 3.1 Backend on Windows

1. Upload backend to `C:\psf-api` (`deploy-from-mac.sh` or `npm run deploy`).
2. Create `C:\psf-api\.env` from [`env.production.example`](env.production.example).
3. `npm install --omit=dev` on server.
4. Register API as **Windows scheduled task** (PM2 was unreliable over SSH disconnect):

   ```powershell
   powershell -ExecutionPolicy Bypass -File C:\psf-api\scripts\install-api-service.ps1
   ```

   Task name: **`psf-api-node`** — runs `node src/app.js`, restarts on boot.

### 3.2 Frontend on Windows

1. Build React app locally, zip `dist/`, upload to `C:\xampp\htdocs\psfnew`.
2. Deploy `.htaccess` + Apache vhost from [`apache-psfnew.conf`](apache-psfnew.conf).
3. Ensure `httpd.conf` includes:

   ```apache
   Include conf/extra/psfnew.conf
   Listen 2087
   ```

4. Script: `./deploy.sh windows-frontend` or part of `npm run deploy`.

### 3.3 Apache `/api` proxy

Vhost proxies `/api` to Node on `127.0.0.1:3000` **only** for `ServerName psfnew.nchads.gov.kh` — other sites on the server are untouched.

Verify on server:

```text
http://127.0.0.1:3000/api/health          → {"status":"ok"}
http://127.0.0.1:2087/api/health        → ok  (Host: psfnew.nchads.gov.kh)
https://psfnew.nchads.gov.kh/api/health   → ok
```

### 3.4 Windows Firewall

Inbound rule required for HAProxy to reach Apache on **2087**:

```powershell
netsh advfirewall firewall add rule name="Apache 2087 psfnew" dir=in action=allow protocol=TCP localport=2087
```

(Without this, WAN HTTPS returned **503** even when LAN worked.)

### 3.5 DNS (HostPapa / NCHADS)

Replace Vercel CNAME with **A record**:

| Type | Name | Value |
|------|------|--------|
| A | `psfnew` | `36.37.175.123` |

Script: `deploy/hostpapa/configure-windows-dns.sh` (optional).

### 3.6 pfSense HAProxy

WAN traffic is handled by **HAProxy**, not direct NAT to Apache.

**Backend pool `psfnew`:**

- Server: `192.168.0.16:2087`
- Health check: disabled (`check_type=none`) — same as other pools that redirect on `/`

**WEB-SSL frontend** — ACL + action:

| ACL | Host | Action | Backend |
|-----|------|--------|---------|
| psfnew | `psfnew.nchads.gov.kh` | use_backend | `psfnew` |
| PSFWEB | `psfweb.nchads.gov.kh` | use_backend | `PSFWEB` → `:2082` |

**Setup from Mac** (SSH tunnel to pfSense web UI):

```bash
# Terminal 1 — tunnel Mac → Windows → pfSense
ssh -N -L 18080:192.168.0.6:80 -p <WIN_SSH_PORT> Administrator@<ngrok-host>

# Terminal 2 — add psfnew pool + ACL (first time)
export PFSENSE_PASS='<pfsense-admin-password>'
python3 deploy/windows/scripts/configure-haproxy-psfnew.py http://127.0.0.1:18080
```

**If `psfweb.nchads.gov.kh` returns 503** after psfnew work — WEB-SSL action row for PSFWEB may have been overwritten. Restore with:

```bash
export PFSENSE_PASS='<pfsense-admin-password>'
python3 deploy/windows/scripts/fix-haproxy-psfweb.py http://127.0.0.1:18080
```

### 3.7 Data & admin

On **`psfnew`** database:

```bash
# From Mac (with DB tunnel — see §5)
cd backend
npm run seed:admin          # Admin / password
node migrations/import_questions.js   # 40 questions for Question Manager
```

---

## 4. Deploy workflow

### 4.1 One-command deploy (Mac)

```bash
cp deploy/windows/.env.deploy.example deploy/windows/.env.deploy
# Edit WIN_SSH_HOST, WIN_SSH_PORT, WIN_SSH_USER, WIN_SSH_PASS

npm run deploy
# same as: ./deploy.sh production
```

This runs [`deploy-all.sh`](deploy-all.sh):

1. Upload backend → `C:\psf-api`
2. Upload frontend → `C:\xampp\htdocs\psfnew`
3. Run [`post-deploy.ps1`](scripts/post-deploy.ps1) (`npm install`, restart scheduled task)
4. Curl health on https://psfnew.nchads.gov.kh

**Partial deploy:**

```bash
./deploy.sh windows           # backend only
./deploy.sh windows-frontend  # frontend only
SKIP_VERIFY=1 npm run deploy  # skip health check
```

### 4.2 GitHub Actions

Push to **`main`** deploys when `backend/`, `frontend/`, or `deploy/` change.

See [GITHUB_ACTIONS.md](GITHUB_ACTIONS.md) for secrets:

- `WIN_SSH_HOST`, `WIN_SSH_PORT`, `WIN_SSH_USER`, `WIN_SSH_PASS`
- Optional: `PRODUCTION_URL`

**Requirement:** ngrok SSH (or stable SSH) must be running on Windows when CI deploys.

### 4.3 Post-deploy on server (automatic)

[`post-deploy.ps1`](scripts/post-deploy.ps1):

- `npm install --omit=dev` in `C:\psf-api`
- Restart `psf-api-node` scheduled task
- Check `http://127.0.0.1:3000/api/health` and Apache `:2087`

---

## 5. Local dev → same database (`psfnew`)

Local backend can use the **remote** `psfnew` DB via SSH tunnel:

**`backend/.env`:**

```env
DB_HOST=127.0.0.1
DB_PORT=3307
DB_DATABASE=psfnew
DB_USERNAME=root
DB_PASSWORD=<windows-mysql-password>
```

**Terminal 1:**

```bash
npm run db:tunnel
```

**Terminal 2:**

```bash
npm run dev
cd backend && npm run db:check   # should print OK: psfnew @ 127.0.0.1:3307
```

See [`scripts/remote-db-tunnel.sh`](../../scripts/remote-db-tunnel.sh) and [`backend/.env.remote.example`](../../backend/.env.remote.example).

---

## 6. Isolated from other NCHADS systems

| Change | Affects others? |
|--------|-----------------|
| Node on port **3000** only | No |
| Apache vhost **psfnew.nchads.gov.kh** only | No — `prep`, `psfweb`, `htdocs`, etc. unchanged |
| MySQL database **`psfnew`** only | No — `psf_db`, `fonpam`, … untouched |
| HAProxy ACL for **psfnew** hostname | No — other hostnames keep their backends |
| DNS **A record psfnew** only | No — other subdomains unchanged |

**Do not** add a global `ProxyPass /api` on port 80 — it would break other sites on the same Apache instance.

---

## 7. Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| **503** on https://psfnew.nchads.gov.kh | Windows Firewall blocking **2087** | Add firewall rule (§3.4) |
| **503** on https://psfweb.nchads.gov.kh | HAProxy PSFWEB action broken | Run `fix-haproxy-psfweb.py` (§3.6) |
| API 502 / empty | Node not running | `Start-ScheduledTask psf-api-node`; check `C:\psf-api\.env` |
| Question Manager empty | `questions` table empty | `node migrations/import_questions.js` |
| Login fails | Wrong DB or no admin | `npm run seed:admin` on target DB |
| Deploy SSH fails | ngrok URL/port changed | Update `.env.deploy` or GitHub secrets |
| CORS errors | Wrong origins | Set `CLIENT_URL`, `CORS_ORIGINS` in `.env`, restart API |
| HTTP (:80) 503 | No HAProxy `front_http` rule for psfnew | Use HTTPS or add HAProxy HTTP rule |

**Health checks:**

```bash
curl -s https://psfnew.nchads.gov.kh/api/health
curl -sI https://psfnew.nchads.gov.kh/
curl -sI https://psfweb.nchads.gov.kh/
```

---

## 8. Security notes

- Rotate passwords shared during setup (Windows, MySQL, pfSense, ngrok, cPanel).
- Never commit `backend/.env`, `deploy/windows/.env.deploy`, or `C:\psf-api\.env`.
- MySQL `root` should accept connections from `127.0.0.1` only.
- Keep Windows, XAMPP, and pfSense patched.

---

## 9. Related files

| File | Purpose |
|------|---------|
| [`deploy-all.sh`](deploy-all.sh) | Full production deploy |
| [`deploy-from-mac.sh`](deploy-from-mac.sh) | Backend upload |
| [`deploy-frontend.sh`](deploy-frontend.sh) | Frontend upload |
| [`_ssh.sh`](_ssh.sh) | SSH/SCP helpers + health verify |
| [`env.production.example`](env.production.example) | API `.env` template |
| [`apache-psfnew.conf`](apache-psfnew.conf) | Apache vhost |
| [`scripts/install-api-service.ps1`](scripts/install-api-service.ps1) | Scheduled task |
| [`scripts/post-deploy.ps1`](scripts/post-deploy.ps1) | Post-upload restart |
| [`scripts/configure-haproxy-psfnew.py`](scripts/configure-haproxy-psfnew.py) | pfSense psfnew pool |
| [`scripts/fix-haproxy-psfweb.py`](scripts/fix-haproxy-psfweb.py) | Restore psfweb routing |
| [`../../scripts/remote-db-tunnel.sh`](../../scripts/remote-db-tunnel.sh) | Local → remote MySQL |
| [`../../backend/seed-admin.js`](../../backend/seed-admin.js) | Admin user seed |

---

## 10. History (migration summary)

1. **Before:** Frontend on Vercel, API on VPS (`107.175.91.211`), DB `psf_db`.
2. **Target:** Single Windows server — SPA + API + MySQL, public URL `psfnew.nchads.gov.kh`.
3. **Cutover:** DNS A record → WAN IP; pfSense HAProxy → Apache `:2087`; firewall rule for 2087.
4. **API process:** PM2 → **Windows scheduled task** (survives SSH disconnect).
5. **Database:** Production switched to **`psfnew`** (aligned with local dev).
6. **CI:** GitHub Actions deploy on push to `main`.
7. **Side fix:** Restored **psfweb** HAProxy routing after psfnew ACL work accidentally broke action row 8.

Legacy VPS/HostPapa/Vercel docs remain under `deploy/vps/`, `deploy/hostpapa/`, `deploy/vercel/` for reference only.
