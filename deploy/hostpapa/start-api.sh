#!/bin/bash
export PATH="/home/nchads3/node/bin:$PATH"
cd /home/nchads3/psf-backend/psf-backend || exit 1
export NODE_ENV=production
export PORT=3000
exec /home/nchads3/node/bin/node src/app.js
