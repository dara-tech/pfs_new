# HostPapa setup (psfnew.nchads.gov.kh)

## Current mode: VPS API proxy (recommended)

| Layer | Location |
|-------|----------|
| React app | `public_html/psfnew/` on HostPapa |
| API gateway | `psf-api.php` → **VPS** `http://107.175.91.211/api` |
| Database | **Production** `psf_db` on VPS (read/write via API only) |
| Main NCHADS site | Unchanged |
| Local Node on HostPapa | **Not required** in this mode |

### URLs

- App: https://psfnew.nchads.gov.kh
- Health: https://psfnew.nchads.gov.kh/psf-api.php?p=health

### Deploy frontend + gateway

```bash
export CPANEL_PASS='your-password'
./deploy/hostpapa/deploy-frontend.sh
```

Upload `psf-api.php` after edits (included in deploy-frontend.sh).

---

## Alternative: full backend on HostPapa

Local Node + MySQL copy (`nchads3_psfnew`). Requires DB import and Node keepalive cron. See git history / `node-boot.php`, `deploy-backend.sh`.

---

## Security

Remove setup scripts from `public_html/psfnew/` when done: `start-node.php`, `import-sql.php`, `check-db.php`, `test-remote-db.php`, etc.
