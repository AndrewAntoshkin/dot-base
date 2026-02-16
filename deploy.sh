#!/bin/bash
set -e

cd "$(dirname "$0")"

NODE=/opt/fnode/bin/node
NPM=/opt/fnode/bin/npm

echo "=== Deploying basecraft ==="

echo "1. Pulling latest code..."
git pull

echo "2. Stopping PM2..."
pm2 delete basecraft 2>/dev/null || true

echo "3. Clearing caches..."
rm -rf .next/cache
pm2 flush

echo "4. Building..."
$NPM run build

echo "5. Starting PM2..."
pm2 start ecosystem.config.cjs --interpreter "$NODE"
pm2 save

echo "6. Verifying..."
sleep 3
pm2 show basecraft | grep -E "status|name|memory"
echo ""
pm2 env 0 | grep -E "NODE_ENV|NODE_OPTIONS" || echo "WARNING: env not set!"

echo ""
echo "=== Deploy complete ==="
