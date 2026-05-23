#!/usr/bin/env bash
set -euo pipefail
APP_ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$APP_ROOT/server"
npm install --production
[ -f .env ] || { echo "Missing server/.env"; exit 1; }
if command -v pm2 >/dev/null 2>&1; then
  pm2 delete travel-server 2>/dev/null || true
  pm2 start index.js --name travel-server
  pm2 save
  sleep 2
  curl -s http://127.0.0.1:5000/api/health || true
  echo ""
  curl -s http://127.0.0.1:5000/api/gemini/test || true
  echo ""
else
  echo "Install pm2: sudo npm i -g pm2"
  echo "Or run: node index.js"
fi
