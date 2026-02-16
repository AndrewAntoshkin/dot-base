#!/bin/bash
set -e

cd "$(dirname "$0")"

NODE=/opt/fnode/bin/node
NPM=/opt/fnode/bin/npm

echo "=== Deploying basecraft ==="

echo "1. Pulling latest code..."
git pull

echo "2. Clearing Next.js cache..."
rm -rf .next/cache

echo "3. Building..."
$NPM run build

echo "4. Restarting PM2..."
pm2 delete basecraft 2>/dev/null || true
pm2 flush 2>/dev/null || true
pm2 start ecosystem.config.cjs --interpreter "$NODE"
pm2 save

echo "5. Verifying..."
sleep 3
pm2 show basecraft | grep -E "status|name|memory"
echo ""
pm2 env 0 | grep -E "NODE_ENV|NODE_OPTIONS" || echo "WARNING: env not set!"

echo ""
echo "=== Deploy complete ==="
