#!/bin/bash
set -e

echo "=== Deploying basecraft ==="

cd "$(dirname "$0")"

echo "1. Pulling latest code..."
git pull

echo "2. Installing dependencies..."
npm ci --production=false

echo "3. Building..."
npm run build

echo "4. Restarting PM2..."
pm2 delete basecraft 2>/dev/null || true
pm2 start ecosystem.config.cjs
pm2 save

echo "5. Verifying..."
sleep 3
pm2 show basecraft | head -10
echo ""
echo "=== NODE_ENV check ==="
pm2 env 0 | grep NODE_ENV || echo "WARNING: NODE_ENV not set!"

echo ""
echo "=== Deploy complete ==="