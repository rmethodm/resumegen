#!/usr/bin/env bash
#
# Production activation script for Resumegen.
# Pulls the latest main, installs dependencies, builds frontend assets,
# migrates the database, re-caches, and restarts the queue worker.
#
# Usage:  ./deploy.sh   (can be invoked from any cwd, e.g. sudo /path/to/deploy.sh)
# Run ON THE SERVER as root. Resolves its own directory from the script path,
# so it doesn't depend on the caller's working directory.
# See docs/DEPLOYMENT.md for first-time server setup.
#
# Security note: git pull / composer install / npm ci+build all execute
# third-party code (composer plugins, npm postinstall/prepare hooks). Running
# that as root would hand any compromised dependency full root on every
# deploy. Root here only orchestrates and restarts the systemd service --
# every step that fetches or installs code runs as www-data (the same user
# php-fpm already runs the app as), using an isolated HOME/SSH identity at
# /var/lib/resumegen-deploy so it never touches root's own SSH config.
#
# Invoked by the "Deploy to production" job in .github/workflows/ci.yml, which
# runs on a self-hosted runner (label: resumegen-prod) living on this same
# box as the low-privilege github-runner user -- see that file and
# /etc/sudoers.d/github-runner for the narrowly-scoped sudo rule permitting
# only this script to run as root.

set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_HOME="/var/lib/resumegen-deploy"
GIT_SSH_COMMAND="ssh -i ${DEPLOY_HOME}/.ssh/id_ed25519_resumegen -o IdentitiesOnly=yes -o UserKnownHostsFile=${DEPLOY_HOME}/.ssh/known_hosts"

if [[ ! -f "${APP_DIR}/artisan" ]]; then
  echo "Error: run this from the Resumegen project root (artisan not found)." >&2
  exit 1
fi

cd "${APP_DIR}"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Error: run as root (needed to restart the queue worker service)." >&2
  exit 1
fi

as_www() {
  sudo -u www-data env HOME="${DEPLOY_HOME}" GIT_SSH_COMMAND="${GIT_SSH_COMMAND}" PATH="${PATH}" "$@"
}

echo "==> Maintenance mode on"
as_www php artisan down || true

# On success, bring the site back up. On failure, leave it in maintenance
# mode rather than serving broken/half-deployed code.
on_exit() {
  local status=$?
  if [[ $status -eq 0 ]]; then
    echo "==> Maintenance mode off"
    as_www php artisan up || true
  else
    echo "==> Deploy FAILED (exit ${status}). Site left in maintenance mode." >&2
    echo "    Check the output above for which step failed before fixing forward." >&2
    echo "    If migrations already ran, check 'php artisan migrate:status' first." >&2
  fi
}
trap on_exit EXIT

echo "==> Pulling latest main"
as_www git -C "${APP_DIR}" pull --ff-only origin main

echo "==> Installing PHP dependencies"
as_www composer install --working-dir="${APP_DIR}" --no-dev --optimize-autoloader --no-interaction

echo "==> Installing and building frontend assets"
as_www bash -c "cd '${APP_DIR}' && npm ci --legacy-peer-deps && npm run build"

echo "==> Running database migrations"
as_www php artisan migrate --force

echo "==> Caching config, routes, and views"
as_www php artisan config:cache
as_www php artisan route:cache
as_www php artisan view:cache

# Restart the queue worker if one is installed (no-op otherwise). This is
# the one step that genuinely needs root -- everything else already ran as
# www-data and never touched root privileges.
if systemctl list-units --type=service 2>/dev/null | grep -q resumegen-queue; then
  echo "==> Restarting queue worker"
  systemctl restart resumegen-queue
fi

echo "==> Deploy complete."
