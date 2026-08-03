#!/usr/bin/env bash
# Install PostgreSQL and start it on Ubuntu.
#
# Usage:
#   sudo ./scripts/install-postgresql.sh

set -euo pipefail

if [[ ${EUID} -ne 0 ]]; then
  echo "Error: run this script with sudo or as root." >&2
  exit 1
fi

if [[ ! -r /etc/os-release ]]; then
  echo "Error: cannot determine the operating system." >&2
  exit 1
fi

# shellcheck disable=SC1091
source /etc/os-release
if [[ ${ID:-} != "ubuntu" ]]; then
  echo "Error: this script supports Ubuntu only (detected: ${PRETTY_NAME:-unknown})." >&2
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive

echo "==> Updating package lists"
apt-get update

echo "==> Installing PostgreSQL"
apt-get install --yes postgresql postgresql-contrib

echo "==> Enabling and starting PostgreSQL"
systemctl enable --now postgresql

prompt_identifier() {
  local label="$1" default="$2" value

  while true; do
    read -r -p "${label} [${default}]: " value
    value="${value:-$default}"
    if [[ "$value" =~ ^[a-z_][a-z0-9_]*$ ]]; then
      printf '%s' "$value"
      return
    fi
    echo "Use lowercase letters, numbers, and underscores; start with a letter or underscore." >&2
  done
}

echo "==> Configure PostgreSQL login"
DB_NAME="$(prompt_identifier 'Database name' 'resumegen')"
DB_USER="$(prompt_identifier 'Login username' 'resumegen')"

while true; do
  read -r -s -p "Password for ${DB_USER}: " DB_PASSWORD
  echo
  read -r -s -p "Confirm password: " DB_PASSWORD_CONFIRM
  echo
  if [[ -n "$DB_PASSWORD" && "$DB_PASSWORD" == "$DB_PASSWORD_CONFIRM" ]]; then
    break
  fi
  echo "Passwords must be non-empty and match. Try again." >&2
done

if runuser --user postgres -- psql --tuples-only --no-align --command="SELECT 1 FROM pg_roles WHERE rolname = '${DB_USER}'" | grep -q '^1$'; then
  echo "==> Updating existing PostgreSQL role: ${DB_USER}"
else
  echo "==> Creating PostgreSQL role: ${DB_USER}"
  runuser --user postgres -- psql --command="CREATE ROLE \"${DB_USER}\" LOGIN;"
fi

# Send the password through standard input so it does not appear in the process list.
escaped_password="${DB_PASSWORD//\'/\'\'}"
printf 'ALTER ROLE "%s" PASSWORD '\''%s'\'';\n' "$DB_USER" "$escaped_password" \
  | runuser --user postgres -- psql --set=ON_ERROR_STOP=1

if runuser --user postgres -- psql --tuples-only --no-align --command="SELECT 1 FROM pg_database WHERE datname = '${DB_NAME}'" | grep -q '^1$'; then
  echo "==> Keeping existing database: ${DB_NAME}"
else
  echo "==> Creating database: ${DB_NAME}"
  runuser --user postgres -- createdb --owner="$DB_USER" "$DB_NAME"
fi

echo "==> Verifying PostgreSQL"
systemctl is-active --quiet postgresql
runuser --user postgres -- psql --dbname="$DB_NAME" --command='SELECT version();'

unset DB_PASSWORD DB_PASSWORD_CONFIRM

echo "PostgreSQL installation complete."
echo "Database: ${DB_NAME}"
echo "Username: ${DB_USER}"
echo "Password: set (not displayed)"
