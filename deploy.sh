#!/bin/bash

# Auto-deploy script for PSF Backend and Frontend to VPS
# Usage: ./deploy.sh [backend|frontend|all]

set -e

VPS_IP="107.175.91.211"
VPS_USER="root"
VPS_PASSWORD="${VPS_PASSWORD:-}"  # Set via environment variable
BACKEND_DIR="backend"
FRONTEND_DIR="frontend"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if sshpass is installed (for password auth)
check_sshpass() {
    if ! command -v sshpass &> /dev/null; then
        log_warn "sshpass not found. Install it for password-based deployment:"
        log_warn "  macOS: brew install hudochenkov/sshpass/sshpass"
        log_warn "  Linux: apt-get install sshpass"
        return 1
    fi
    return 0
}

# Deploy backend
deploy_backend() {
    log_info "Deploying backend..."
    
    cd "$SCRIPT_DIR/$BACKEND_DIR"
    
    # Create tar archive (exclude node_modules and .env)
    log_info "Creating backend archive..."
    tar --exclude='node_modules' \
        --exclude='.env' \
        --exclude='*.log' \
        -czf /tmp/backend-deploy.tar.gz .
    
    # Upload to VPS
    log_info "Uploading backend to VPS..."
    if command -v sshpass &> /dev/null; then
        sshpass -p "$VPS_PASSWORD" scp -o StrictHostKeyChecking=no /tmp/backend-deploy.tar.gz ${VPS_USER}@${VPS_IP}:/tmp/
    else
        scp -o StrictHostKeyChecking=no /tmp/backend-deploy.tar.gz ${VPS_USER}@${VPS_IP}:/tmp/
    fi
    
    # Extract and restart on VPS
    log_info "Extracting and restarting backend on VPS..."
    if command -v sshpass &> /dev/null; then
        sshpass -p "$VPS_PASSWORD" ssh -o StrictHostKeyChecking=no ${VPS_USER}@${VPS_IP} << 'ENDSSH'
            cd /root/backend
            tar -xzf /tmp/backend-deploy.tar.gz
            npm install --production
            if [ -f ecosystem.config.cjs ]; then
              pm2 delete psf-api 2>/dev/null || true
              pm2 start ecosystem.config.cjs --update-env
            else
              pm2 restart psf-api || pm2 start src/app.js --name psf-api
            fi
            pm2 save
            echo "✅ Backend deployed and restarted"
ENDSSH
    else
        ssh -o StrictHostKeyChecking=no ${VPS_USER}@${VPS_IP} << 'ENDSSH'
            cd /root/backend
            tar -xzf /tmp/backend-deploy.tar.gz
            npm install --production
            if [ -f ecosystem.config.cjs ]; then
              pm2 delete psf-api 2>/dev/null || true
              pm2 start ecosystem.config.cjs --update-env
            else
              pm2 restart psf-api || pm2 start src/app.js --name psf-api
            fi
            pm2 save
            echo "✅ Backend deployed and restarted"
ENDSSH
    fi
    
    rm /tmp/backend-deploy.tar.gz
    log_info "Backend deployment complete!"
}

# Deploy frontend
deploy_frontend() {
    log_info "Deploying frontend..."
    
    cd "$SCRIPT_DIR/$FRONTEND_DIR"
    
    # Build frontend locally (VPS doesn't have enough RAM)
    log_info "Building frontend..."
    npm run build
    
    # Create tar archive of dist folder
    log_info "Creating frontend archive..."
    cd dist
    tar -czf /tmp/frontend-dist.tar.gz .
    cd ..
    
    # Upload to VPS
    log_info "Uploading frontend to VPS..."
    if command -v sshpass &> /dev/null; then
        sshpass -p "$VPS_PASSWORD" scp -o StrictHostKeyChecking=no /tmp/frontend-dist.tar.gz ${VPS_USER}@${VPS_IP}:/tmp/
    else
        scp -o StrictHostKeyChecking=no /tmp/frontend-dist.tar.gz ${VPS_USER}@${VPS_IP}:/tmp/
    fi
    
    # Extract on VPS
    log_info "Extracting frontend on VPS..."
    if command -v sshpass &> /dev/null; then
        sshpass -p "$VPS_PASSWORD" ssh -o StrictHostKeyChecking=no ${VPS_USER}@${VPS_IP} << 'ENDSSH'
            rm -rf /var/www/psf/*
            tar -xzf /tmp/frontend-dist.tar.gz -C /var/www/psf/
            chown -R www-data:www-data /var/www/psf
            systemctl reload nginx
            echo "✅ Frontend deployed"
ENDSSH
    else
        ssh -o StrictHostKeyChecking=no ${VPS_USER}@${VPS_IP} << 'ENDSSH'
            rm -rf /var/www/psf/*
            tar -xzf /tmp/frontend-dist.tar.gz -C /var/www/psf/
            chown -R www-data:www-data /var/www/psf
            systemctl reload nginx
            echo "✅ Frontend deployed"
ENDSSH
    fi
    
    rm /tmp/frontend-dist.tar.gz
    log_info "Frontend deployment complete!"
}

# Deploy both (backend on VPS; frontend only when DEPLOY_FRONTEND_TO_VPS=1)
deploy_all() {
    log_info "Deploying backend to VPS..."
    deploy_backend
    if [[ "${DEPLOY_FRONTEND_TO_VPS:-0}" == "1" ]]; then
        deploy_frontend
    else
        log_info "Skipping VPS frontend (use HostPapa: deploy/hostpapa/deploy-frontend.sh)"
        log_info "  To deploy SPA to VPS IP again: DEPLOY_FRONTEND_TO_VPS=1 ./deploy.sh frontend"
    fi
    log_info "✅ Deployment complete!"
}

# Main
DEPLOY_TARGET="${1:-all}"

case "$DEPLOY_TARGET" in
    backend)
        deploy_backend
        ;;
    frontend)
        deploy_frontend
        ;;
    all)
        deploy_all
        ;;
    hostpapa|hostpapa-frontend)
        if [[ ! -x "$SCRIPT_DIR/deploy/hostpapa/deploy-frontend.sh" ]]; then
          chmod +x "$SCRIPT_DIR/deploy/hostpapa/deploy-frontend.sh"
        fi
        "$SCRIPT_DIR/deploy/hostpapa/deploy-frontend.sh"
        ;;
    vercel|vercel-frontend)
        if [[ ! -x "$SCRIPT_DIR/deploy/vercel/deploy-frontend.sh" ]]; then
          chmod +x "$SCRIPT_DIR/deploy/vercel/deploy-frontend.sh"
        fi
        "$SCRIPT_DIR/deploy/vercel/deploy-frontend.sh"
        ;;
    windows|win-server|win)
        if [[ ! -x "$SCRIPT_DIR/deploy/windows/deploy-from-mac.sh" ]]; then
          chmod +x "$SCRIPT_DIR/deploy/windows/deploy-from-mac.sh"
        fi
        "$SCRIPT_DIR/deploy/windows/deploy-from-mac.sh"
        ;;
    windows-frontend|win-frontend)
        if [[ ! -x "$SCRIPT_DIR/deploy/windows/deploy-frontend.sh" ]]; then
          chmod +x "$SCRIPT_DIR/deploy/windows/deploy-frontend.sh"
        fi
        "$SCRIPT_DIR/deploy/windows/deploy-frontend.sh"
        ;;
    windows-all|win-all|production|prod)
        if [[ ! -x "$SCRIPT_DIR/deploy/windows/deploy-all.sh" ]]; then
          chmod +x "$SCRIPT_DIR/deploy/windows/deploy-all.sh" \
            "$SCRIPT_DIR/deploy/windows/deploy-from-mac.sh" \
            "$SCRIPT_DIR/deploy/windows/deploy-frontend.sh"
        fi
        "$SCRIPT_DIR/deploy/windows/deploy-all.sh" all
        ;;
    *)
        echo "Usage: $0 [backend|frontend|all|production|hostpapa|vercel|windows|windows-frontend|windows-all]"
        exit 1
        ;;
esac
