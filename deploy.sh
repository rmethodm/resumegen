#!/usr/bin/env bash
#
# Production activation script for Resumegen.
# Run ON THE SERVER after CI has rsynced a built release (vendor/ + public/build
# already present) into place. Migrates the database, re-caches, and restarts
# the queue worker.
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

# On success, bring the site back up. On failure, leave it in maintenance
# mode rather than serving broken/half-migrated code.
on_exit() {
  local status=$?
  if [[ $status -eq 0 ]]; then
    echo "==> Maintenance mode off"
    php artisan up || true
  else
    echo "==> Deploy FAILED (exit ${status}). Site left in maintenance mode." >&2
    echo "    If migrations ran, check 'php artisan migrate:status' before fixing forward." >&2
    echo "    Files are already rsynced from CI, so there is no local rollback command --" >&2
    echo "    fix the issue and re-run the GitHub Actions deploy job for a corrected commit." >&2
  fi
}
trap on_exit EXIT

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
