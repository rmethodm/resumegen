# Deployment Guide

How to ship Resumegen from your laptop to a production web server via GitHub.

**Target stack:** Ubuntu/Debian · Apache · PostgreSQL · PHP 8.3+ · Node 20+ · SSH (root/sudo).

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

# Apache + PHP 8.3 + required extensions
sudo apt install -y software-properties-common
sudo add-apt-repository -y ppa:ondrej/php
sudo apt update
sudo apt install -y apache2 \
  php8.3 libapache2-mod-php8.3 php8.3-cli \
  php8.3-pgsql php8.3-mbstring php8.3-xml php8.3-curl \
  php8.3-zip php8.3-gd php8.3-bcmath php8.3-intl \
  php8.3-imagick ghostscript unzip git

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

DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=resumegen
DB_USERNAME=resumegen_user
DB_PASSWORD=CHANGE_ME_STRONG_PASSWORD

QUEUE_CONNECTION=sync          # simplest; see Part 9 for a background worker

MAIL_MAILER=smtp
MAIL_HOST=...
MAIL_PORT=587
MAIL_USERNAME=...
MAIL_PASSWORD=...
MAIL_FROM_ADDRESS="hello@yourdomain.com"
```

> There are no AI, billing or admin env keys. `OPENAI_*`, `STRIPE_*` and `APP_ADMIN_DOMAIN`
> were removed with those features — if you see them in an old `.env`, delete them.

Then:

```bash
php artisan migrate --force
php artisan storage:link
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

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
    ServerAlias www.yourdomain.com
    DocumentRoot /var/www/resumegen/public

    <Directory /var/www/resumegen/public>
        AllowOverride All
        Require all granted
    </Directory>

    ErrorLog ${APACHE_LOG_DIR}/resumegen-error.log
    CustomLog ${APACHE_LOG_DIR}/resumegen-access.log combined
</VirtualHost>
```

```bash
sudo a2enmod rewrite
sudo a2ensite resumegen.conf
sudo a2dissite 000-default.conf
sudo systemctl reload apache2
```

**HTTPS** (required — secure cookies):

```bash
sudo apt install -y certbot python3-certbot-apache
sudo certbot --apache -d yourdomain.com -d www.yourdomain.com
```

After SSL, ensure `APP_URL` uses `https://` and re-run `php artisan config:cache`.

---

## Part 9 — Scheduler & queue

**Scheduler (required)** — drives the remaining recurring commands, `resumes:nudge-stale`
(daily) and `resumes:nudge-views` (weekly). Everything else that used to be scheduled —
`system-events:prune`, `jobs:run-alerts`, `ai:cost-alert`, the revenue snapshot — is gone
with its feature; check `routes/console.php` for the current list rather than this doc:

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

Deploys are build-once-in-CI, then rsynced to the server — the server never runs
Composer or npm itself.

Deploy only fires from a manual trigger — Actions tab "Run workflow" or
`gh workflow run ci.yml` — never from a bare push to `main`. (Required-reviewer
environment protection needs a paid GitHub plan; manual `workflow_dispatch` is
the free-plan substitute, per the comment in `.github/workflows/ci.yml`.) The
`deploy` job needs the `test` job to pass first, then:

1. Builds `vendor/` (`composer install --no-dev`) and `public/build` (`npm ci && npm run build`) on the runner.
2. `rsync`s the result to `/var/www/resumegen` on the server, excluding `.env`,
   `storage/app/` (user-uploaded media — never deleted), `storage/logs/`,
   `storage/framework/{cache,sessions,views}/`, `node_modules/`, and `.git/`.
3. SSHes in and runs `./deploy.sh`, which migrates, re-caches config/routes/views,
   restarts the queue worker if present, and toggles maintenance mode around the run
   (staying down on failure rather than serving broken code).

Requires repo secrets `SSH_HOST`, `SSH_USER`, `SSH_PRIVATE_KEY` and a `production`
environment configured in GitHub repo settings.

**No admin subdomain.** The Filament panel was deleted on 2026-07-21 — one vhost on the
apex domain is the whole app. If an old DNS record or vhost still points at
`admin.<domain>`, remove it.

**Manual deploy (no CI):** build locally the same way, rsync with the same excludes,
then SSH in and run `./deploy.sh` yourself.
