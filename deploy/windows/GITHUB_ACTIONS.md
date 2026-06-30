# GitHub Actions — auto-deploy on push

Pushing to **`main`** (when `backend/`, `frontend/`, or `deploy/` change) runs [`.github/workflows/deploy-production.yml`](../../.github/workflows/deploy-production.yml) and deploys to the Windows server.

## One-time setup

1. Open **https://github.com/dara-tech/pfs_new/settings/secrets/actions**
2. Add repository secrets:

| Secret | Example | Required |
|--------|---------|----------|
| `WIN_SSH_HOST` | `0.tcp.ap.ngrok.io` | Yes |
| `WIN_SSH_PORT` | `14155` | Yes |
| `WIN_SSH_USER` | `Administrator` | Yes |
| `WIN_SSH_PASS` | your Windows password | Yes |
| `PRODUCTION_URL` | `https://psfnew.nchads.gov.kh` | No |

3. Ensure **ngrok SSH** (or your stable SSH tunnel) is running on the Windows server before each deploy.

## Manual run

**Actions** → **Deploy production (Windows)** → **Run workflow**

## Local deploy (same scripts)

```bash
cp deploy/windows/.env.deploy.example deploy/windows/.env.deploy
npm run deploy
```

## Troubleshooting

| Failure | Fix |
|---------|-----|
| `Connection refused` / SSH timeout | Start ngrok on Windows; update `WIN_SSH_HOST` / `WIN_SSH_PORT` if the URL changed |
| `Missing GitHub secret` | Add all four `WIN_SSH_*` secrets in repo settings |
| Health check failed | API or Apache down on server — SSH in and run `post-deploy.ps1` |
| Workflow skipped | Push did not touch `backend/`, `frontend/`, or `deploy/` — use **Run workflow** manually |
