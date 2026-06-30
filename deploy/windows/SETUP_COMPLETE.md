# Windows setup log

> **Superseded by [PRODUCTION_SETUP.md](PRODUCTION_SETUP.md)** — that file is the current, complete reference.

This log covers the **initial** Windows API setup. Production has since moved forward:

| Item | Initial setup | **Current** |
|------|---------------|-------------|
| Database | `psf_db` | **`psfnew`** |
| API process | PM2 | **Scheduled task `psf-api-node`** |
| Frontend | Vercel | **Windows** `C:\xampp\htdocs\psfnew` |
| Public URL | VPS / api subdomain | **https://psfnew.nchads.gov.kh** |
| WAN routing | Direct NAT | **pfSense HAProxy → :2087** |

## Still valid from first setup

- Backend path: `C:\psf-api`
- Health: `http://127.0.0.1:3000/api/health`
- Apache proxy: `/api` → Node on port 3000
- Redeploy from Mac: `npm run deploy`

See [PRODUCTION_SETUP.md](PRODUCTION_SETUP.md) for everything else.
