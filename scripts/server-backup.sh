#!/usr/bin/env bash
# server-backup.sh — Full server config backup and restore
#
# Usage:
#   sudo ./server-backup.sh backup              Create a timestamped backup
#   sudo ./server-backup.sh restore [dir]       Restore from dir (default: latest)
#   ./server-backup.sh list                     List available backups with sizes
#   ./server-backup.sh verify [dir]             Check a backup is complete
#   sudo ./server-backup.sh cron-install        Install nightly 2am cron job
#
# What gets backed up:
#   /etc/apache2/                Apache virtual hosts, mods, SSL config
#   /etc/systemd/system/*.d/     Hardening drop-ins (e.g. harden.conf)
#   /etc/tmpfiles.d/             Runtime directory recreation entries
#   /etc/ufw/                    Firewall rules
#   /etc/letsencrypt/            SSL certs and private keys — keep this secure
#   /etc/php/                    PHP config and FPM pools
#   Crontabs                     All users' crontab entries
#   /var/www/html/**/.env        App environment files (secrets included)
#   /var/www/html/**/*.sqlite    SQLite databases
#   dpkg selections              Installed package list for reference
#
# Restore rebuilds the server config from scratch. After restore, you still
# need to: clone app repos from git, run composer install / npm run build,
# and run php artisan migrate per app. See MANIFEST.md in the backup.

set -euo pipefail

# ─── CONFIG ──────────────────────────────────────────────────────────────────

BACKUP_ROOT="/root/server-backups"
APP_ROOT="/var/www/html"
KEEP_DAYS=7
LOG_FILE="/var/log/server-backup.log"

# Set to an rsync-compatible destination to push each backup off-server.
# The backup root is synced (all retained backups), not just the latest.
# Examples:
#   user@backup-host:/backups/$(hostname)
#   s3://my-bucket/server-backups   (requires awscli + IAM role or credentials)
OFFSITE_DEST=""

# ─── HELPERS ─────────────────────────────────────────────────────────────────

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

die() {
    log "ERROR: $*"
    exit 1
}

require_root() {
    [[ $EUID -eq 0 ]] || die "This command must be run as root (use sudo)"
}

# Copy a path into the backup, preserving structure.
# $1 = source path   $2 = destination dir inside backup
archive() {
    local src="$1" dest="$2"
    if [[ -e "$src" ]]; then
        mkdir -p "$(dirname "$dest")"
        cp -a "$src" "$dest"
    else
        log "  WARN: not found — $src"
    fi
}

# ─── BACKUP ──────────────────────────────────────────────────────────────────

cmd_backup() {
    require_root
    mkdir -p "$BACKUP_ROOT"

    local ts; ts=$(date +%Y-%m-%d_%H-%M-%S)
    local dir="$BACKUP_ROOT/$ts"
    mkdir -p "$dir"

    log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log "Starting backup → $dir"
    log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    # Apache
    log "  [1/9] Apache config"
    archive /etc/apache2 "$dir/etc/apache2"

    # systemd drop-ins
    log "  [2/9] systemd drop-ins"
    mkdir -p "$dir/etc/systemd/system"
    find /etc/systemd/system -maxdepth 2 -name "*.conf" -not -path "*/default.target.wants/*" \
        2>/dev/null | while IFS= read -r f; do
        local rel="${f#/etc/systemd/system/}"
        mkdir -p "$dir/etc/systemd/system/$(dirname "$rel")"
        cp "$f" "$dir/etc/systemd/system/$rel"
    done

    # tmpfiles.d
    log "  [3/9] tmpfiles.d"
    archive /etc/tmpfiles.d "$dir/etc/tmpfiles.d"

    # UFW
    log "  [4/9] UFW firewall rules"
    archive /etc/ufw       "$dir/etc/ufw"
    archive /etc/default/ufw "$dir/etc/default/ufw"
    ufw status verbose > "$dir/ufw-status.txt" 2>/dev/null || true

    # SSL certs
    log "  [5/9] SSL certificates"
    archive /etc/letsencrypt "$dir/etc/letsencrypt"

    # PHP
    log "  [6/9] PHP config"
    archive /etc/php "$dir/etc/php"

    # Crontabs
    log "  [7/9] Crontabs"
    mkdir -p "$dir/crontabs"
    # Root
    crontab -l -u root 2>/dev/null > "$dir/crontabs/root" || echo "# empty" > "$dir/crontabs/root"
    # All users who have a crontab on disk
    if [[ -d /var/spool/cron/crontabs ]]; then
        for f in /var/spool/cron/crontabs/*; do
            [[ -f "$f" ]] || continue
            cp "$f" "$dir/crontabs/$(basename "$f")"
        done
    fi
    log "    saved: $(ls "$dir/crontabs" | tr '\n' ' ')"

    # App .env files — stored mirroring the real path under $dir/app-envs/
    log "  [8/9] App .env files"
    mkdir -p "$dir/app-envs"
    while IFS= read -r env_file; do
        local rel="${env_file#$APP_ROOT/}"        # e.g. resumegen/.env
        local dest="$dir/app-envs/$rel"
        mkdir -p "$(dirname "$dest")"
        cp "$env_file" "$dest"
        log "    saved: $APP_ROOT/$rel"
    done < <(find "$APP_ROOT" -maxdepth 4 -name ".env" \
        -not -path "*/vendor/*" -not -path "*/node_modules/*" 2>/dev/null || true)

    # SQLite databases — use .backup command for a consistent snapshot
    log "  [9/10] SQLite databases"
    mkdir -p "$dir/databases"
    local db_count=0
    while IFS= read -r db_file; do
        local rel="${db_file#$APP_ROOT/}"          # e.g. resumegen/database/database.sqlite
        local dest="$dir/databases/$rel"
        mkdir -p "$(dirname "$dest")"
        if command -v sqlite3 &>/dev/null; then
            sqlite3 "$db_file" ".backup '$dest'" 2>/dev/null && log "    saved (hot-backup): $db_file" \
                || { cp "$db_file" "$dest"; log "    saved (file copy): $db_file"; }
        else
            cp "$db_file" "$dest"
            log "    saved (file copy): $db_file"
        fi
        ((db_count++))
    done < <(find "$APP_ROOT" \( -name "*.sqlite" -o -name "*.sqlite3" -o -name "database.db" \) \
        -not -path "*/vendor/*" -not -path "*/node_modules/*" 2>/dev/null || true)
    [[ $db_count -eq 0 ]] && log "    no SQLite databases found"

    # WireGuard
    log "  [10/11] WireGuard config"
    archive /etc/wireguard "$dir/etc/wireguard"

    # Web app files
    # Excludes vendor/, node_modules/, and .git/ — all reproducible via
    # composer install / npm install / git clone and can be gigabytes.
    log "  [11/11] Web app files ($APP_ROOT)"
    mkdir -p "$dir/web-files"
    rsync -a \
        --exclude='vendor/' \
        --exclude='node_modules/' \
        --exclude='.git/' \
        "$APP_ROOT/" "$dir/web-files/"
    local web_size; web_size=$(du -sh "$dir/web-files" | cut -f1)
    log "    done ($web_size)"

    # Installed packages
    dpkg --get-selections > "$dir/packages.txt" 2>/dev/null || true
    apt-mark showmanual   > "$dir/packages-manual.txt" 2>/dev/null || true

    # Manifest
    local app_list=""
    while IFS= read -r app_dir; do
        local remote=""
        remote=$(git -C "$app_dir" remote get-url origin 2>/dev/null || echo "(no remote)")
        app_list+="  - $(basename "$app_dir")  →  $remote"$'\n'
    done < <(find "$APP_ROOT" -maxdepth 1 -mindepth 1 -type d 2>/dev/null || true)

    cat > "$dir/MANIFEST.md" <<MANIFEST
# Server Backup — $ts

Host: $(hostname)
IP:   $(hostname -I | awk '{print $1}')
Size: $(du -sh "$dir" 2>/dev/null | cut -f1) (calculated after manifest creation)

## Contents
| Path | What |
|------|------|
| etc/apache2/      | Apache virtual hosts, mods, SSL config |
| etc/systemd/      | Hardening drop-ins |
| etc/tmpfiles.d/   | Runtime dir recreation |
| etc/ufw/          | Firewall rules |
| etc/letsencrypt/  | SSL certs + private keys (sensitive) |
| etc/wireguard/    | WireGuard interface configs + private keys (sensitive) |
| etc/php/          | PHP + FPM config |
| crontabs/         | All user crontabs |
| app-envs/         | .env files from $APP_ROOT |
| databases/        | SQLite database snapshots |
| web-files/        | All web app files (excludes vendor/, node_modules/, .git/) |
| packages.txt      | All dpkg-installed packages |
| packages-manual.txt | Manually installed packages only |

## Apps found at time of backup
$app_list
## Restore command
    sudo $(realpath "$0") restore $dir

## Post-restore manual steps
1. Install required packages:
       sudo apt install apache2 php libapache2-mod-php certbot python3-certbot-apache ufw sqlite3 rsync
2. Run: composer install && npm run build  (per app — vendor/ and node_modules/ not in backup)
3. Restore SQLite databases from databases/ into each app's database/ directory
4. Verify SSL: certbot renew --dry-run
5. Run: php artisan migrate  (per app)
MANIFEST

    log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log "Backup complete"
    log "Location : $dir"
    log "Size     : $(du -sh "$dir" | cut -f1)"
    log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    # Update 'latest' symlink
    ln -sfn "$dir" "$BACKUP_ROOT/latest"

    # Prune old backups
    log "Pruning backups older than $KEEP_DAYS days"
    find "$BACKUP_ROOT" -maxdepth 1 -mindepth 1 -type d -name "????-??-??_??-??-??" \
        -mtime "+$KEEP_DAYS" | while IFS= read -r old; do
        log "  removing: $old"
        rm -rf "$old"
    done

    # Off-site sync
    if [[ -n "$OFFSITE_DEST" ]]; then
        log "Syncing to off-site: $OFFSITE_DEST"
        rsync -az --delete "$BACKUP_ROOT/" "$OFFSITE_DEST/" \
            && log "Off-site sync complete" \
            || log "WARN: off-site sync failed (backup is still local)"
    fi
}

# ─── RESTORE ─────────────────────────────────────────────────────────────────

cmd_restore() {
    require_root
    local src="${1:-}"
    [[ -z "$src" ]] && src="$BACKUP_ROOT/latest"
    [[ -d "$src" ]] || die "Backup not found: $src"
    src=$(realpath "$src")

    log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log "Restoring from: $src"
    log ""
    log "  This will overwrite live config files."
    log "  Press Ctrl-C within 10 seconds to abort."
    log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    sleep 10

    # /etc files — restore by mirroring the etc/ subtree
    if [[ -d "$src/etc" ]]; then
        log "  Restoring /etc config tree"
        # Merge, don't wipe — preserves anything not in the backup
        cp -a "$src/etc/." /etc/
    fi

    # systemd
    log "  Reloading systemd"
    systemctl daemon-reload

    # tmpfiles.d — create the runtime dirs now
    log "  Creating runtime directories from tmpfiles.d"
    systemd-tmpfiles --create 2>/dev/null || true

    # UFW
    if [[ -d "$src/etc/ufw" ]]; then
        log "  Enabling UFW"
        ufw --force enable
    fi

    # Fix letsencrypt permissions (cp -a should preserve, but be explicit)
    if [[ -d /etc/letsencrypt/archive ]]; then
        chmod 700 /etc/letsencrypt/archive 2>/dev/null || true
        chmod 700 /etc/letsencrypt/live    2>/dev/null || true
    fi

    # Crontabs
    if [[ -d "$src/crontabs" ]]; then
        log "  Restoring crontabs"
        for f in "$src/crontabs"/*; do
            [[ -f "$f" ]] || continue
            local user; user=$(basename "$f")
            if id "$user" &>/dev/null; then
                crontab -u "$user" "$f"
                log "    restored crontab: $user"
            else
                log "    SKIP (user doesn't exist yet): $user"
            fi
        done
    fi

    # .env files
    if [[ -d "$src/app-envs" ]]; then
        log "  Restoring .env files"
        find "$src/app-envs" -name ".env" | while IFS= read -r f; do
            local rel="${f#$src/app-envs/}"         # e.g. resumegen/.env
            local dest="$APP_ROOT/$rel"
            if [[ -d "$(dirname "$dest")" ]]; then
                cp "$f" "$dest"
                log "    restored: $dest"
            else
                # App not cloned yet — stage it
                local stage="$APP_ROOT/_pending-envs/$rel"
                mkdir -p "$(dirname "$stage")"
                cp "$f" "$stage"
                log "    STAGED (app dir missing): $stage"
            fi
        done
    fi

    # Web app files
    if [[ -d "$src/web-files" ]]; then
        log "  Restoring web app files → $APP_ROOT"
        mkdir -p "$APP_ROOT"
        rsync -a "$src/web-files/" "$APP_ROOT/"
        log "    done"
    fi

    # SQLite databases — these are data, so don't auto-overwrite silently.
    # Print instructions; operator decides which to restore.
    if [[ -d "$src/databases" ]] && compgen -G "$src/databases/*" > /dev/null 2>&1; then
        log ""
        log "  ┌─────────────────────────────────────────────────────────────┐"
        log "  │  SQLite databases NOT auto-restored (would overwrite data)  │"
        log "  │  Review and restore manually:                               │"
        log "  └─────────────────────────────────────────────────────────────┘"
        find "$src/databases" -type f | while IFS= read -r db; do
            local rel="${db#$src/databases/}"
            log "    cp \"$db\" \"$APP_ROOT/$rel\""
        done
        log ""
    fi

    # Restart Apache
    log "  Starting Apache"
    systemctl restart apache2 \
        && log "  Apache: OK" \
        || log "  Apache: FAILED — run: journalctl -xe | tail -40"

    log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log "Restore complete"
    log ""
    log "Remaining manual steps:"
    log "  1. apt install apache2 php libapache2-mod-php certbot python3-certbot-apache rsync"
    log "  2. composer install && npm run build  (per app — vendor/node_modules not in backup)"
    log "  3. Restore SQLite databases (commands printed above)"
    log "  4. php artisan migrate  (per app)"
    log "  5. certbot renew --dry-run"
    log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

# ─── LIST ────────────────────────────────────────────────────────────────────

cmd_list() {
    if [[ ! -d "$BACKUP_ROOT" ]]; then
        echo "No backups found (backup root doesn't exist: $BACKUP_ROOT)"
        exit 0
    fi

    echo ""
    echo "Backups in $BACKUP_ROOT:"
    echo ""

    local latest_target=""
    [[ -L "$BACKUP_ROOT/latest" ]] && latest_target=$(realpath "$BACKUP_ROOT/latest" 2>/dev/null || true)

    local found=0
    while IFS= read -r d; do
        local size; size=$(du -sh "$d" 2>/dev/null | cut -f1)
        local tag=""
        [[ "$d" == "$latest_target" ]] && tag=" ← latest"
        printf "  %-8s  %s%s\n" "$size" "$(basename "$d")" "$tag"
        ((found++))
    done < <(find "$BACKUP_ROOT" -maxdepth 1 -mindepth 1 -type d -name "????-??-??_??-??-??" | sort -r)

    [[ $found -eq 0 ]] && echo "  (none yet — run: sudo $0 backup)"
    echo ""
}

# ─── VERIFY ──────────────────────────────────────────────────────────────────

cmd_verify() {
    local dir="${1:-}"
    [[ -z "$dir" ]] && dir="$BACKUP_ROOT/latest"
    [[ -d "$dir" ]] || die "Not found: $dir"
    dir=$(realpath "$dir")

    echo ""
    echo "Verifying: $dir"
    echo ""

    local ok=0 missing=0

    check() {
        local label="$1" path="$2"
        if [[ -e "$dir/$path" ]]; then
            printf "  ✓  %s\n" "$label"
            ((ok++))
        else
            printf "  ✗  %s  (missing: %s)\n" "$label" "$path"
            ((missing++))
        fi
    }

    check "Apache config"       "etc/apache2"
    check "systemd drop-ins"    "etc/systemd"
    check "tmpfiles.d"          "etc/tmpfiles.d"
    check "UFW rules"           "etc/ufw"
    check "SSL certs"           "etc/letsencrypt"
    check "WireGuard config"    "etc/wireguard"
    check "PHP config"          "etc/php"
    check "Crontabs"            "crontabs"
    check "App .env files"      "app-envs"
    check "Web app files"       "web-files"
    check "Package list"        "packages.txt"
    check "Manifest"            "MANIFEST.md"

    echo ""

    local db_count; db_count=$(find "$dir/databases" -type f 2>/dev/null | wc -l)
    local env_count; env_count=$(find "$dir/app-envs" -name ".env" 2>/dev/null | wc -l)
    local web_size; web_size=$(du -sh "$dir/web-files" 2>/dev/null | cut -f1 || echo "—")

    printf "  .env files backed up:  %d\n" "$env_count"
    printf "  SQLite DBs backed up:  %d\n" "$db_count"
    printf "  Web files size:        %s\n" "$web_size"
    printf "  Size:                  %s\n" "$(du -sh "$dir" 2>/dev/null | cut -f1)"
    echo ""
    printf "  %d checks passed, %d missing\n" "$ok" "$missing"
    echo ""

    [[ $missing -eq 0 ]]
}

# ─── CRON INSTALL ────────────────────────────────────────────────────────────

cmd_cron_install() {
    require_root
    local script_path; script_path=$(realpath "$0")

    # Make the script executable
    chmod +x "$script_path"

    local cron_line="0 2 * * * $script_path backup >> $LOG_FILE 2>&1"

    if crontab -l -u root 2>/dev/null | grep -qF "$script_path"; then
        echo "Cron job already installed for root."
        echo ""
        crontab -l -u root | grep "$script_path"
    else
        ( crontab -l -u root 2>/dev/null || true; echo "$cron_line" ) | crontab -u root -
        echo "Cron job installed:"
        echo "  $cron_line"
        echo ""
        echo "Logs will write to: $LOG_FILE"
        echo "Run 'sudo $0 list' to see backups after the first run."
    fi
}

# ─── MAIN ────────────────────────────────────────────────────────────────────

case "${1:-help}" in
    backup)        cmd_backup ;;
    restore)       cmd_restore "${2:-}" ;;
    list)          cmd_list ;;
    verify)        cmd_verify "${2:-}" ;;
    cron-install)  cmd_cron_install ;;
    help|--help|-h)
        cat <<'USAGE'

server-backup.sh — Full server config backup and restore

COMMANDS
  backup              Create a timestamped backup now
  restore [dir]       Restore from a backup dir (default: latest)
  list                List available backups with sizes
  verify [dir]        Check a backup is complete (default: latest)
  cron-install        Install nightly 2am cron job (root)

EXAMPLES
  sudo ./server-backup.sh backup
  sudo ./server-backup.sh restore                   # from latest
  sudo ./server-backup.sh restore /root/server-backups/2026-06-29_02-00-00
  ./server-backup.sh list
  ./server-backup.sh verify
  sudo ./server-backup.sh cron-install

OFFSITE SYNC
  Edit the OFFSITE_DEST variable at the top of this file to push
  each backup to a remote host or S3 bucket via rsync after each run.

USAGE
        ;;
    *)
        echo "Unknown command: ${1:-}"
        echo "Run: $0 help"
        exit 1
        ;;
esac
