#!/usr/bin/env bash
# Repairs the server-side drift that has actually broken deploys (2026-08-25):
#   1. Root-owned files in the app tree (from running composer/npm/artisan as
#      root) — blocked composer install, the vite build, and maintenance mode.
#   2. Local edits to tracked files (a hand-run `composer update` dirtied
#      composer.lock) — aborted `git pull` in deploy.sh.
#   3. Site left stuck in maintenance mode by a failed deploy.
#   4. resumegen-queue.service missing — deploy.sh silently no-ops its restart,
#      so queued mail (job-alert digests) never sends.
#
# Run on the production box as root, then re-run the deploy:
#   sudo /var/www/resumegen.app/scripts/server-repair.sh
#
# ponytail: read-only-ish repair, no flags/config — add options when a case needs one
set -euo pipefail

APP_DIR=/var/www/resumegen.app

[ "$(id -u)" -eq 0 ] || { echo "Error: run as root." >&2; exit 1; }
[ -d "$APP_DIR" ] || { echo "Error: $APP_DIR not found." >&2; exit 1; }
cd "$APP_DIR"

echo "==> Fixing ownership (everything to www-data)"
chown -R www-data:www-data "$APP_DIR"

echo "==> Discarding local edits to tracked files"
# The repo is the source of truth on the server — any tracked-file drift here
# (composer.lock, chmod noise) is an accident and blocks git pull in deploy.sh.
# Untracked files (.env, storage contents) are untouched.
sudo -u www-data git checkout -- .
sudo -u www-data git status --short | head -5

echo "==> Leaving maintenance mode if stuck"
if [ -e storage/framework/down ]; then
  sudo -u www-data php artisan up
else
  echo "    (site already live)"
fi

echo "==> Checking queue worker"
if systemctl list-unit-files 2>/dev/null | grep -q '^resumegen-queue.service'; then
  systemctl is-active resumegen-queue >/dev/null || systemctl restart resumegen-queue
  echo "    resumegen-queue: $(systemctl is-active resumegen-queue)"
else
  echo "    WARNING: resumegen-queue.service not installed — queued mail will"
  echo "    never send. Install it per docs/DEPLOYMENT.md Part 9."
fi

echo "==> Repair done. Re-run the deploy (gh workflow run ci.yml)."
