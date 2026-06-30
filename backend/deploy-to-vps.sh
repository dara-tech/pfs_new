#!/bin/bash

# Deploy backend to VPS
# Usage: ./deploy-to-vps.sh

VPS_IP="107.175.91.211"
VPS_USER="root"
BACKEND_DIR="/Users/cheolsovandara/Documents/D/Developments/2026/psf_v4_report_v2/pfs_new/backend"
TEMP_TAR="/tmp/backend-deploy.tar.gz"

echo "📦 Creating tar archive..."
cd "$BACKEND_DIR"
tar --exclude='node_modules' \
    --exclude='.env' \
    --exclude='*.log' \
    -czf "$TEMP_TAR" .

echo "📊 Archive size: $(ls -lh "$TEMP_TAR" | awk '{print $5}')"
echo "📤 Uploading to VPS..."

scp "$TEMP_TAR" "${VPS_USER}@${VPS_IP}:/root/backend.tar.gz"

echo "✅ Upload complete!"
echo ""
echo "Now on the VPS, run:"
echo "  cd /root"
echo "  rm -rf backend"
echo "  tar -xzf backend.tar.gz"
echo "  mkdir -p backend"
echo "  tar -xzf backend.tar.gz -C backend"
echo "  cd backend"
echo "  npm install --production"
