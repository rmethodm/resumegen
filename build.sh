#!/usr/bin/env bash

set -euo pipefail

APP_DIR="${PWD}"

# Verify the current directory is a Laravel application
if [[ ! -f "${APP_DIR}/artisan" ]]; then
  echo "Error: No Laravel app found in ${APP_DIR} (artisan not found)."
  exit 1
fi

if [[ ! -f "${APP_DIR}/composer.json" ]]; then
  echo "Error: No Laravel app found in ${APP_DIR} (composer.json not found)."
  exit 1
fi

if [[ ! -f "${APP_DIR}/package.json" ]]; then
  echo "Error: package.json not found in ${APP_DIR}."
  exit 1
fi

if ! command -v php >/dev/null 2>&1; then
  echo "Error: php is not installed or not in PATH."
  exit 1
fi

if ! command -v composer >/dev/null 2>&1; then
  echo "Error: composer is not installed or not in PATH."
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "Error: npm is not installed or not in PATH."
  exit 1
fi

echo "Updating Composer dependencies..."
composer update

echo "Clearing compiled views..."
php artisan view:clear

echo "Caching Blade views..."
php artisan view:cache

echo "Building frontend assets..."
npm run build

echo "Build tasks completed."
