#!/bin/bash
set -e

cd "$(dirname "$0")"

NODE=/opt/fnode/bin/node
NPM=/opt/fnode/bin/npm

echo "=== Deploying basecraft ==="

echo "1. Pulling latest code..."
git pull

echo "2. Building..."
$NPM run build

echo "3. Restarting PM2..."
pm2 delete basecraft 2>/dev/null || true
pm2 start ecosystem.config.cjs --interpreter "$NODE"
pm2 save

echo "4. Verifying..."
sleep 3
pm2 show basecraft | grep -E "status|name|node.js"
echo ""
pm2 env 0 | grep NODE_ENV || echo "WARNING: NODE_ENV not set!"

echo ""
echo "=== Deploy complete ==="
