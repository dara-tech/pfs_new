# Auto-Deploy Guide

> **Production (Windows / NCHADS):** see **[deploy/windows/PRODUCTION_SETUP.md](deploy/windows/PRODUCTION_SETUP.md)** for the full architecture, pfSense HAProxy, DNS cutover, and `npm run deploy` workflow. Live URL: https://psfnew.nchads.gov.kh

This guide explains how to automatically deploy the PSF backend and frontend to your VPS.

## Quick Deploy (Local Script)

### Prerequisites

1. **Install sshpass** (for password-based deployment):
   ```bash
   # macOS
   brew install hudochenkov/sshpass/sshpass
   
   # Linux
   apt-get install sshpass
   ```

2. **Set VPS password** (optional - defaults to hardcoded value):
   ```bash
   export VPS_PASSWORD="your-password"
   ```

### Usage

Deploy backend to VPS (default — **no** frontend on `http://107.175.91.211/`):
```bash
cd pfs_new
./deploy.sh all
# or: ./deploy.sh backend
```

Deploy frontend to **HostPapa** (`https://psfnew.nchads.gov.kh/`):
```bash
CPANEL_PASS='…' ./deploy/hostpapa/deploy-frontend.sh
```

Remove SPA from VPS IP (API only):
```bash
./deploy/vps/remove-frontend-from-vps.sh
```

Optional — also put frontend on VPS IP (not recommended):
```bash
DEPLOY_FRONTEND_TO_VPS=1 ./deploy.sh frontend
```

Deploy only backend:
```bash
./deploy.sh backend
```

Deploy only frontend:
```bash
./deploy.sh frontend
```

## GitHub Actions Auto-Deploy

### Setup

1. **Add GitHub Secrets** (Settings → Secrets and variables → Actions):
   - `VPS_HOST`: `107.175.91.211`
   - `VPS_USER`: `root`
   - `VPS_PASSWORD`: Your VPS root password

2. **Push to main/master branch**:
   ```bash
   git add .
   git commit -m "Update app"
   git push origin main
   ```

3. **Deployment will trigger automatically** when you push changes to:
   - `pfs_new/backend/**`
   - `pfs_new/frontend/**`

### Manual Trigger

You can also trigger deployment manually:
1. Go to GitHub → Actions tab
2. Select "Deploy to VPS" workflow
3. Click "Run workflow"

## What Gets Deployed

### Backend
- All source files (`src/`, `config/`, etc.)
- `package.json` (dependencies installed on VPS)
- Excludes: `node_modules`, `.env`, `*.log`

### Frontend
- Built `dist/` folder (built locally, uploaded to VPS)
- Served from `/var/www/psf/`

## Deployment Process

1. **Backend**:
   - Creates tar archive
   - Uploads to VPS `/tmp/`
   - Extracts to `/root/backend`
   - Runs `npm install --production`
   - Restarts PM2 process

2. **Frontend**:
   - Builds locally (`npm run build`)
   - Creates tar archive of `dist/`
   - Uploads to VPS
   - Extracts to `/var/www/psf/`
   - Sets permissions
   - Reloads Nginx

## Troubleshooting

### SSH Connection Issues
- Ensure VPS firewall allows port 22
- Check VPS password is correct
- Try SSH manually: `ssh root@107.175.91.211`

### Build Failures
- Frontend builds locally, so ensure Node.js 20+ is installed
- Check `package.json` dependencies are up to date

### PM2 Issues
- Check PM2 is installed: `pm2 list`
- View logs: `pm2 logs psf-api`

### Nginx Issues
- Check Nginx status: `systemctl status nginx`
- View error log: `tail -f /var/log/nginx/error.log`

## Security Notes

⚠️ **Important**: 
- The deploy script contains the VPS password. Consider:
  - Using SSH keys instead of passwords
  - Storing password in environment variable
  - Using GitHub Secrets for CI/CD

To use SSH keys:
1. Generate key: `ssh-keygen -t rsa -b 4096`
2. Copy to VPS: `ssh-copy-id root@107.175.91.211`
3. Update deploy script to remove password authentication
