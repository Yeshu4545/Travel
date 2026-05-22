#!/usr/bin/env bash
# Simple deployment bootstrap for Ubuntu (run on EC2 as ubuntu user)
# Usage (on EC2):
#   export REPO_URL=https://github.com/yourname/yourrepo.git
#   bash deploy.sh

set -euo pipefail

REPO_URL=${REPO_URL:-}
APP_DIR=${APP_DIR:-/home/ubuntu/app}
NODE_VERSION=${NODE_VERSION:-18}

if [ -z "$REPO_URL" ]; then
  echo "ERROR: Set REPO_URL environment variable to your git repo URL before running."
  echo "Example: export REPO_URL=https://github.com/yourname/yourrepo.git"
  exit 1
fi

sudo apt update
sudo apt install -y git curl nginx build-essential

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | sudo -E bash -
sudo apt install -y nodejs

# pm2
sudo npm install -g pm2

mkdir -p $APP_DIR
cd $APP_DIR

if [ ! -d "$APP_DIR/.git" ]; then
  git clone "$REPO_URL" .
else
  git fetch --all
  git reset --hard origin/HEAD
fi

echo "Installing server dependencies..."
cd server
npm install --production

echo "(Optional) Build client (if you want to serve frontend from same server)"
if [ -d ../client ]; then
  cd ../client
  npm install
  npm run build
  cd ../server
fi

echo "Make sure you created / edited $APP_DIR/server/.env with production values (MONGO_URI, JWT_SECRET, etc.)"

# start server with pm2
pm2 stop travel-server || true
pm2 start index.js --name travel-server --cwd $APP_DIR/server --env production
pm2 save

echo "Setup nginx: place the provided nginx_travel.conf into /etc/nginx/sites-available/travel and enable it"
echo "Then run: sudo nginx -t && sudo systemctl restart nginx"

echo "Deployment finished. Tail logs with: pm2 logs travel-server --lines 200"
