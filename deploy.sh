#!/usr/bin/env bash
#
# Production activation script for Resumegen.
# Pulls the latest main, installs dependencies, builds frontend assets,
# migrates the database, re-caches, and restarts the queue worker.
#
# Usage:  ./deploy.sh
# Run ON THE SERVER as root, from the project root (/var/www/resumegen.app).
# See docs/DEPLOYMENT.md for first-time server setup.
#
# NOTE: CI-based deploy (.github/workflows/ci.yml) is currently blocked --
# Hostinger's network firewall drops SSH connections from GitHub Actions
# runner IPs before they ever reach sshd. Until that's resolved, run this
# script by hand after every push to main.

set -euo pipefail

APP_DIR="${PWD}"

if [[ ! -f "${APP_DIR}/artisan" ]]; then
  echo "Error: run this from the Resumegen project root (artisan not found)." >&2
  exit 1
fi

echo "==> Maintenance mode on"
php artisan down || true

# On success, bring the site back up. On failure, leave it in maintenance
# mode rather than serving broken/half-deployed code.
on_exit() {
  local status=$?
  if [[ $status -eq 0 ]]; then
    echo "==> Maintenance mode off"
    php artisan up || true
  else
    echo "==> Deploy FAILED (exit ${status}). Site left in maintenance mode." >&2
    echo "    Check the output above for which step failed before fixing forward." >&2
    echo "    If migrations already ran, check 'php artisan migrate:status' first." >&2
  fi
}
trap on_exit EXIT

echo "==> Pulling latest main"
git pull --ff-only origin main

echo "==> Installing PHP dependencies"
composer install --no-dev --optimize-autoloader --no-interaction

echo "==> Installing and building frontend assets"
npm ci --legacy-peer-deps
npm run build

echo "==> Running database migrations"
php artisan migrate --force

echo "==> Caching config, routes, and views"
php artisan config:cache
php artisan route:cache
php artisan view:cache

echo "==> Fixing ownership and permissions"
chown -R www-data:www-data "${APP_DIR}"
chmod -R 775 "${APP_DIR}/storage" "${APP_DIR}/bootstrap/cache"

# Restart the queue worker if one is installed (no-op otherwise).
if systemctl list-units --type=service 2>/dev/null | grep -q resumegen-queue; then
  echo "==> Restarting queue worker"
  sudo systemctl restart resumegen-queue
fi

echo "==> Deploy complete."
