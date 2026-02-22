#!/bin/bash
set -e

cd "$(dirname "$0")"

NODE=/opt/fnode/bin/node
NPM=/opt/fnode/bin/npm
NGINX_CONF="/etc/nginx/fastpanel2-sites/basecraft/basecraft.ru.conf"
NGINX_PROXY_CONF="/etc/nginx/fastpanel2-sites/basecraft/basecraft.wdda.pro.conf"

BLUE_NAME="basecraft-blue"
GREEN_NAME="basecraft-green"
BLUE_PORT=3000
GREEN_PORT=3001

# ── Determine which slot is currently active ──
get_active_port() {
  grep -oP 'upstream basecraft \{\s*server 127\.0\.0\.1:\K[0-9]+' "$NGINX_CONF" 2>/dev/null || echo "$BLUE_PORT"
}

ACTIVE_PORT=$(get_active_port)

if [ "$ACTIVE_PORT" = "$BLUE_PORT" ]; then
  OLD_NAME="$BLUE_NAME"
  NEW_NAME="$GREEN_NAME"
  NEW_PORT="$GREEN_PORT"
else
  OLD_NAME="$GREEN_NAME"
  NEW_NAME="$BLUE_NAME"
  NEW_PORT="$BLUE_PORT"
fi

echo "=== Blue-Green Deploy ==="
echo "    Active: $OLD_NAME (port $ACTIVE_PORT)"
echo "    Target: $NEW_NAME (port $NEW_PORT)"
echo ""

# ── Step 1: Pull latest code ──
echo "1. Pulling latest code..."
git pull

# ── Step 2: Build (old server still running, no downtime) ──
echo "2. Building..."
rm -rf .next/cache
$NPM run build

# ── Step 3: Start new process on the inactive port ──
echo "3. Starting $NEW_NAME on port $NEW_PORT..."
pm2 delete "$NEW_NAME" 2>/dev/null || true
pm2 start ecosystem.config.cjs --only "$NEW_NAME" --update-env

# ── Step 4: Wait for new process to be ready ──
echo "4. Waiting for $NEW_NAME to be ready..."
HEALTH_URL="http://127.0.0.1:${NEW_PORT}/api/health"
MAX_WAIT=30
WAITED=0
while [ $WAITED -lt $MAX_WAIT ]; do
  if curl -sf "$HEALTH_URL" > /dev/null 2>&1; then
    echo "   Ready! (${WAITED}s)"
    break
  fi
  sleep 1
  WAITED=$((WAITED + 1))
done

if [ $WAITED -ge $MAX_WAIT ]; then
  echo "FAIL: $NEW_NAME did not start in ${MAX_WAIT}s — rolling back"
  pm2 delete "$NEW_NAME" 2>/dev/null || true
  echo "Old process $OLD_NAME still running, nothing changed."
  exit 1
fi

# ── Step 5: Switch nginx to the new port ──
echo "5. Switching nginx to port $NEW_PORT..."
sed -i "s/server 127\.0\.0\.1:[0-9]\+;/server 127.0.0.1:${NEW_PORT};/" "$NGINX_CONF"
sed -i "s|proxy_pass http://127\.0\.0\.1:[0-9]\+;|proxy_pass http://127.0.0.1:${NEW_PORT};|" "$NGINX_PROXY_CONF"
nginx -t && nginx -s reload

# ── Step 6: Stop old process ──
echo "6. Stopping old $OLD_NAME..."
sleep 2
pm2 delete "$OLD_NAME" 2>/dev/null || true
pm2 save

# ── Done ──
echo ""
echo "=== Deploy complete ==="
echo "    Active: $NEW_NAME (port $NEW_PORT)"
pm2 show "$NEW_NAME" | grep -E "status|name|memory"