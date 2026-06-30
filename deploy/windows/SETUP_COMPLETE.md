# Windows API setup — step-by-step log

Server: **SR-ODK** (`192.168.0.16`) · Windows Server 2012 R2 · XAMPP

## Completed automatically

| Step | What | Result |
|------|------|--------|
| 1 | Upload backend to `C:\psf-api` | Done |
| 2 | `npm install` | Done |
| 3 | Create `.env` (MySQL `psf_db`, CORS, JWT) | Done |
| 4 | MySQL | `psf_db` exists, **147 users** — no import needed |
| 5 | PM2 install + `psf-api` start + boot registry | Done |
| 6 | Apache `conf/extra/psf-api.conf` + Include in `httpd.conf` | Done |
| 7 | Apache restart | Done |

## Verified on server

```text
http://127.0.0.1:3000/api/health     → {"status":"ok"}
http://127.0.0.1/api/health          → {"status":"ok"}  (Apache → Node)
http://192.168.0.16/api/health       → {"status":"ok"}  (LAN)
```

## Your manual steps (pfSense + public access)

### Step 8 — pfSense NAT (`192.168.0.6`)

Login: `https://192.168.0.6` (admin)

**Firewall → NAT → Port Forward → Add:**

| Interface | Protocol | Dest port | Redirect IP | Redirect port |
|-----------|----------|-----------|-------------|---------------|
| WAN | TCP | 443 | 192.168.0.16 | 443 |
| WAN | TCP | 80 | 192.168.0.16 | 80 |

**Firewall → Rules → WAN** — allow HTTPS/HTTP to WAN address.

### Step 9 — DNS (HostPapa / NCHADS)

Add **A record** (for API subdomain):

| Type | Name | Value |
|------|------|--------|
| A | `api.psfnew` | *your WAN public IP* |

Test from outside LAN: `https://api.psfnew.nchads.gov.kh/api/health`

### Step 10 — Vercel cutover (when Step 8–9 work)

**Dual-run now:** Vercel still uses VPS (`vercel.json` → `107.175.91.211`).

When Windows API is public, edit `frontend/vercel.json`:

```json
"destination": "https://api.psfnew.nchads.gov.kh/api/:path*"
```

Push to Git → Vercel redeploy.

**Rollback:** change destination back to `http://107.175.91.211/api/:path*`

## LAN testing (no pfSense yet)

From a PC on `192.168.0.x`:

- `http://192.168.0.16/api/health`
- Login test: Admin / `password` (or your prod password)

## Maintenance commands (on Windows)

```cmd
cd C:\psf-api
pm2 list
pm2 logs psf-api
pm2 restart psf-api
C:\xampp\apache\bin\httpd.exe -k restart
```

Redeploy from Mac: `./deploy.sh windows`

## Security

- Rotate MySQL password (was in phpMyAdmin config on disk).
- Rotate Windows / pfSense / cPanel passwords shared in chat.
- Do not commit `C:\psf-api\.env`.
