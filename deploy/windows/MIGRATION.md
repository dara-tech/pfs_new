# API migration: VPS + Windows (dual run)

You chose **run both** during migration — production stays on the VPS until Windows is verified.

## Phase 1 — Now (both running)

| Role | Host | Status |
|------|------|--------|
| **Frontend** | Vercel `psfnew.nchads.gov.kh` | Live |
| **API (production)** | VPS `107.175.91.211` | Live — **do not stop** |
| **API (staging)** | Windows `192.168.0.16` | Setup in progress |

`frontend/vercel.json` keeps:

```json
"destination": "http://107.175.91.211/api/:path*"
```

Users are unaffected while Windows is configured.

## Phase 2 — Test Windows (LAN / ngrok)

On Windows after `.env` + PM2 + Apache:

```text
http://192.168.0.16/api/health          (LAN)
https://YOUR-WAN-IP/api/health          (after pfSense NAT)
```

Optional: second ngrok tunnel for API testing:

```bash
ngrok http 192.168.0.16:80
```

Compare login + reporting with VPS. Use **same** `psf_db` dump on Windows MySQL or a copy for safe testing.

## Phase 3 — Cutover (when Windows passes tests)

1. pfSense NAT **443 → 192.168.0.16:443** (or dedicated API port)
2. DNS `api.psfnew.nchads.gov.kh` → WAN IP
3. Update `frontend/vercel.json`:

   ```json
   "destination": "https://api.psfnew.nchads.gov.kh/api/:path*"
   ```

4. Push → Vercel redeploy
5. Monitor 24–48h; then decommission VPS API (optional)

## Rollback

Revert `vercel.json` to VPS IP and redeploy — takes ~2 minutes.

## Checklist before cutover

- [ ] `curl https://api.psfnew.nchads.gov.kh/api/health` → `{"status":"ok"}`
- [ ] Login Admin on Vercel frontend
- [ ] Reporting dashboard loads
- [ ] MySQL backups on Windows scheduled
- [ ] PM2 starts on Windows reboot (`pm2 save` + `pm2-startup`)
