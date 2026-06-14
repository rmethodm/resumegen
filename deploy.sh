#!/usr/bin/env bash
#
# Production deploy script for Resumegen.
# Run ON THE SERVER from the project root after pushing code to GitHub.
# Pulls latest main, installs deps, builds assets, migrates, and re-caches.
#
# Usage:  ./deploy.sh
# See docs/DEPLOYMENT.md for first-time server setup.

set -euo pipefail

APP_DIR="${PWD}"

if [[ ! -f "${APP_DIR}/artisan" ]]; then
  echo "Error: run this from the Resumegen project root (artisan not found)." >&2
  exit 1
fi

echo "==> Maintenance mode on"
php artisan down || true

# Always restore maintenance mode, even if a step below fails.
trap 'echo "==> Maintenance mode off"; php artisan up || true' EXIT

echo "==> Pulling latest code"
git pull origin main

echo "==> Installing PHP dependencies (production)"
composer install --no-dev --optimize-autoloader

echo "==> Building frontend assets"
npm ci
npm run build

echo "==> Running database migrations"
php artisan migrate --force

echo "==> Caching config, routes, and views"
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Restart the queue worker if one is installed (no-op otherwise).
if systemctl list-units --type=service 2>/dev/null | grep -q resumegen-queue; then
  echo "==> Restarting queue worker"
  sudo systemctl restart resumegen-queue
fi

echo "==> Deploy complete."
