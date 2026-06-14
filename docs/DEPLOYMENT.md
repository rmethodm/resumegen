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

OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini

STRIPE_KEY=pk_...
STRIPE_SECRET=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
# + the 6 Stripe price IDs (Part 10)
```

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

**HTTPS** (required — Stripe webhooks + secure cookies):

```bash
sudo apt install -y certbot python3-certbot-apache
sudo certbot --apache -d yourdomain.com -d www.yourdomain.com
```

After SSL, ensure `APP_URL` uses `https://` and re-run `php artisan config:cache`.

---

## Part 9 — Scheduler & queue

**Scheduler (required)** — drives daily commands (revenue snapshot, prune jobs):

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

## Part 10 — Stripe

Checkout 402s until the 6 price IDs are set. Create 3 products (Starter/Pro/Agency),
each with a monthly + yearly price ($9/$79, $19/$149, $49/$399), then add to `.env`:

```ini
STRIPE_STARTER_MONTHLY_PRICE_ID=price_...
STRIPE_STARTER_YEARLY_PRICE_ID=price_...
STRIPE_PRO_MONTHLY_PRICE_ID=price_...
STRIPE_PRO_YEARLY_PRICE_ID=price_...
STRIPE_AGENCY_MONTHLY_PRICE_ID=price_...
STRIPE_AGENCY_YEARLY_PRICE_ID=price_...
```

Add a webhook endpoint `https://yourdomain.com/stripe/webhook` in the Stripe Dashboard,
copy its signing secret into `STRIPE_WEBHOOK_SECRET`, then `php artisan config:cache`.
(Confirm exact env var names against `config/services.php`.)

---

## Part 11 — Deploying updates

On the laptop: commit and push to `main`. On the server, run the deploy script:

```bash
cd /var/www/resumegen
./deploy.sh
```

`deploy.sh` pulls `main`, runs `composer install --no-dev`, `npm ci && npm run build`,
`migrate --force`, re-caches config/routes/views, restarts the queue worker if present,
and toggles maintenance mode around the whole run.
