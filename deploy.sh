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

PREV_SHA="$(git rev-parse HEAD)"

# On success, bring the site back up. On failure, leave it in maintenance
# mode rather than serving broken/half-migrated code, and print how to
# manually recover to the last known-good commit.
on_exit() {
  local status=$?
  if [[ $status -eq 0 ]]; then
    echo "==> Maintenance mode off"
    php artisan up || true
  else
    local curr_sha
    curr_sha="$(git rev-parse HEAD)"
    echo "==> Deploy FAILED (exit ${status}). Site left in maintenance mode." >&2
    echo "    Last known-good commit: ${PREV_SHA}" >&2
    echo "    Current commit:         ${curr_sha}" >&2
    if [[ "${curr_sha}" != "${PREV_SHA}" ]]; then
      echo "    If migrations ran, check 'php artisan migrate:status' before rolling back schema." >&2
      echo "    To restore the last known-good code:" >&2
      echo "      git checkout ${PREV_SHA} && composer install --no-dev --optimize-autoloader && npm ci && npm run build && php artisan config:cache && php artisan route:cache && php artisan view:cache && php artisan up" >&2
    else
      echo "    Code was not updated (failed before/at git pull); safe to fix and re-run ./deploy.sh." >&2
    fi
  fi
}
trap on_exit EXIT

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
