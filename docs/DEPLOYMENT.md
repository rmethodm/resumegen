# Deployment Guide

How to ship Resumegen from your laptop to a production web server via GitHub.

**Target stack:** Ubuntu/Debian · Apache · PostgreSQL · PHP 8.5+ · Node 20+ · SSH (root/sudo).

> ⚠️ **Existing servers must upgrade PHP to 8.5 before deploying this branch.** `composer.json`
> now requires `^8.5`; `composer install` will fatal against an older PHP. Upgrading a live
> server's PHP version is a manual prerequisite — not scripted here — do it (and confirm
> Apache/PHP-FPM picks up the new version) before running a deploy from this branch.

Secrets never go to GitHub — `.env`, `.env.production`, `auth.json`, and `storage/*.key`
are gitignored. You create them fresh on the server. `.env.example` is the committed template.

---

## Part 1 — Laptop → GitHub

```bash
git add -A
git commit -m "your change"
git push origin main
```

Confirm the push at https://github.com/rmethodm/resumegen.

---

## Part 2 — One-time server setup

SSH in as a sudo user.

```bash
# System update
sudo apt update && sudo apt upgrade -y

# Apache + PHP 8.5 + required extensions
sudo apt install -y software-properties-common
sudo add-apt-repository -y ppa:ondrej/php
sudo apt update
sudo apt install -y apache2 \
  php8.5 libapache2-mod-php8.5 php8.5-cli \
  php8.5-pgsql php8.5-mbstring php8.5-xml php8.5-curl \
  php8.5-zip php8.5-gd php8.5-bcmath php8.5-intl \
  php8.5-imagick ghostscript unzip git

# Composer
curl -sS https://getcomposer.org/installer | php
sudo mv composer.phar /usr/local/bin/composer

# Node 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt install -y nodejs

# PostgreSQL
sudo apt install -y postgresql postgresql-contrib
```

**Imagick must read PDFs** (resume thumbnails render the PDF's first page). If thumbnails
fall back to placeholders, allow PDF in ImageMagick's policy:

```bash
sudo sed -i 's/.*<policy domain="coder" rights="none" pattern="PDF".*/  <policy domain="coder" rights="read|write" pattern="PDF" \/>/' /etc/ImageMagick-6/policy.xml 2>/dev/null || true
php -r "echo extension_loaded('imagick') ? 'imagick OK' : 'imagick MISSING', PHP_EOL;"
```

> Production requires the **Imagick PHP extension + Ghostscript binary** for thumbnails.

---

## Part 3 — Create the PostgreSQL database

```bash
sudo -u postgres psql
```

```sql
CREATE DATABASE resumegen;
CREATE USER resumegen_user WITH ENCRYPTED PASSWORD 'CHANGE_ME_STRONG_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE resumegen TO resumegen_user;
ALTER DATABASE resumegen OWNER TO resumegen_user;
\q
```

---

## Part 4 — GitHub → Server (clone)

```bash
cd /var/www
sudo git clone https://github.com/rmethodm/resumegen.git
sudo chown -R $USER:$USER /var/www/resumegen
cd /var/www/resumegen
```

> The live production box uses `/var/www/resumegen.app` (note the `.app` suffix), not
> `/var/www/resumegen` — `deploy.sh` and the CI `deploy` job below both hardcode that path.
> Match it, or update both if you deliberately choose a different path.

**Private repo?** Add a read-only deploy key instead:

```bash
ssh-keygen -t ed25519 -C "resumegen-server" -f ~/.ssh/id_ed25519 -N ""
cat ~/.ssh/id_ed25519.pub
# Paste into GitHub → repo → Settings → Deploy keys → Add key
# Then clone via SSH: git clone git@github.com:rmethodm/resumegen.git
```

---

## Part 5 — Install dependencies & build

```bash
composer install --no-dev --optimize-autoloader
npm ci
npm run build
```

> Always `composer install` (locked versions) on a server — never `composer update`.

---

## Part 6 — Configure `.env`

```bash
cp .env.example .env
php artisan key:generate
nano .env
```

Minimum production values:

```ini
APP_NAME=Resumegen
APP_ENV=production
APP_DEBUG=false
APP_URL=https://yourdomain.com
LOG_STACK=daily
LOG_LEVEL=warning
# Support admin (Inertia, not Filament). Must match DNS + TLS host below.
APP_ADMIN_DOMAIN=admin.yourdomain.com
# Leave null so product and admin each keep host-only session cookies.
# Admins log in on the admin host. Do not set SESSION_DOMAIN unless you
# intentionally want a shared cookie across subdomains (extra CSRF care).
SESSION_DOMAIN=null
SESSION_SECURE_COOKIE=true

DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=resumegen
DB_USERNAME=resumegen_user
DB_PASSWORD=CHANGE_ME_STRONG_PASSWORD

QUEUE_CONNECTION=sync          # simplest; see Part 9 for a background worker

# Registration requires email verification (MustVerifyEmail) — a broken
# mailer means nobody can log in. This app ships resend/resend-laravel:
MAIL_MAILER=resend
RESEND_API_KEY=re_...
MAIL_FROM_ADDRESS="hello@yourdomain.com"
```

> No billing env keys. `STRIPE_*` stays gone. Optional AI uses `AI_ENABLED` /
> `OPENAI_API_KEY` only when you intentionally turn AI on (see `config/ai.php`).
> If you see dead keys from old Filament/billing installs, delete them — but keep
> **`APP_ADMIN_DOMAIN`** for the support admin.

Then:

```bash
php artisan migrate --force
php artisan storage:link
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

**Promote the first support admin** (after migrate — needs `users.is_admin`):

```bash
php artisan tinker --execute \
  'App\Models\User::where("email", "you@yourdomain.com")->update(["is_admin" => true]);'
```

Never mass-assign `is_admin` from the product UI; tinker/seeder only.

> ⚠️ After editing `.env` again later you MUST re-run `php artisan config:cache`
> (or `config:clear`) — cached config ignores `.env` changes otherwise.

---

## Part 7 — File permissions

```bash
sudo chown -R www-data:www-data /var/www/resumegen/storage /var/www/resumegen/bootstrap/cache
sudo chmod -R 775 /var/www/resumegen/storage /var/www/resumegen/bootstrap/cache
```

---

## Part 8 — Apache virtual host

Laravel serves from `public/`, never the project root.

`/etc/apache2/sites-available/resumegen.conf`:

```apache
<VirtualHost *:80>
    ServerName yourdomain.com
    ServerAlias www.yourdomain.com admin.yourdomain.com
    DocumentRoot /var/www/resumegen/public

    <Directory /var/www/resumegen/public>
        AllowOverride All
        Require all granted
    </Directory>

    ErrorLog ${APACHE_LOG_DIR}/resumegen-error.log
    CustomLog ${APACHE_LOG_DIR}/resumegen-access.log combined
</VirtualHost>
```

Same `DocumentRoot` for apex and admin — Laravel picks admin routes by `Host`
(`APP_ADMIN_DOMAIN`). No second codebase.

```bash
sudo a2enmod rewrite
sudo a2ensite resumegen.conf
sudo a2dissite 000-default.conf
sudo systemctl reload apache2
```

**DNS:** A/AAAA (or CNAME) for `admin.yourdomain.com` → same box as apex.

**HTTPS** (required — secure cookies). Include the admin host on the cert:

```bash
sudo apt install -y certbot python3-certbot-apache
sudo certbot --apache -d yourdomain.com -d www.yourdomain.com -d admin.yourdomain.com
```

After SSL, ensure `APP_URL` uses `https://` and re-run `php artisan config:cache`.

---

## Part 9 — Scheduler & queue

**Scheduler (currently optional)** — `routes/console.php` has no scheduled commands today;
the old nudge commands (`resumes:nudge-stale`, `resumes:nudge-views`) were deleted with
their feature but the schedule entries lingered until 2026-08-04. Set up cron anyway so
future scheduled commands work without a separate ops step; check `routes/console.php` for
the current list rather than this doc:

```bash
sudo crontab -e -u www-data
```

```cron
* * * * * cd /var/www/resumegen && php artisan schedule:run >> /dev/null 2>&1
```

**Queue** — `QUEUE_CONNECTION=sync` runs jobs inline (zero setup). For background sending,
set `QUEUE_CONNECTION=database`, re-cache config, and install a worker:

`/etc/systemd/system/resumegen-queue.service`:

```ini
[Unit]
Description=Resumegen queue worker
After=network.target

[Service]
User=www-data
Restart=always
ExecStart=/usr/bin/php /var/www/resumegen/artisan queue:work --sleep=3 --tries=3

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable --now resumegen-queue
```

---

## Part 10 — Deploying updates

The `deploy` job in `.github/workflows/ci.yml` runs on a **self-hosted GitHub Actions
runner living on the production box itself** (`[self-hosted, resumegen-prod]`, registered
as the `github-runner` system user). There is no build-on-CI-then-rsync step and no SSH —
Hostinger's network firewall drops inbound SSH from GitHub-hosted runner IPs before it
reaches `sshd`, so the job instead runs locally on the server via a narrowly-scoped sudoers
rule (`/etc/sudoers.d/github-runner`) permitting exactly one command as root:

```bash
sudo /var/www/resumegen.app/deploy.sh
```

`deploy.sh` itself pulls `main`, installs Composer/npm dependencies, builds the frontend,
migrates, re-caches config/routes/views, restarts the queue worker if present, and toggles
maintenance mode around the run (staying down on failure rather than serving broken code).

Deploy only fires from a manual trigger — Actions tab "Run workflow" or
`gh workflow run ci.yml` — never from a bare push to `main`. (Required-reviewer
environment protection needs a paid GitHub plan; manual `workflow_dispatch` is
the free-plan substitute, per the comment in `.github/workflows/ci.yml`.) The
`deploy` job needs the `test` job to pass first. No `SSH_HOST`/`SSH_USER`/`SSH_PRIVATE_KEY`
secrets are used — the runner already lives on the box; only a `production`
environment (for the manual-approval gate) is configured in GitHub repo settings.

**Support admin subdomain (required for ops UI).** Filament is gone; a thin Inertia
support admin lives on `APP_ADMIN_DOMAIN` (e.g. `admin.yourdomain.com`). After
deploy:

1. DNS + TLS for that host (Part 8).
2. `.env` has `APP_ADMIN_DOMAIN=admin.yourdomain.com` then `php artisan config:cache`.
3. Promote yourself: `users.is_admin = true` via tinker (Part 6).
4. Open `https://admin.yourdomain.com/login` and sign in **on that host**
   (host-only sessions — apex login does not carry over).

Capabilities: search users, force-verify email, resend verification, disable/enable
login (data kept), revoke Sanctum tokens, view action log. No resume edit, no
impersonation, no taxonomy CMS, no billing.

**Manual deploy (no CI):** `deploy.sh` is self-sufficient — it pulls `main`, installs
Composer/npm dependencies, builds the frontend, migrates, re-caches, and fixes
`storage`/`bootstrap/cache` ownership. SSH in as root, `cd` to the project root, and run
`./deploy.sh` directly any time you want to skip GitHub Actions entirely (e.g. CI is down,
or you're deploying a branch that hasn't been pushed).
