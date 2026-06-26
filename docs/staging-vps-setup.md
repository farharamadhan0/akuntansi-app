# Staging VPS Setup

Panduan ini untuk deploy staging aplikasi Laravel + Inertia React + Vite di Ubuntu 24.04.

## Asumsi

- Domain staging: `staging.emwal.id`
- App path: `/var/www/akuntansi-staging`
- PHP: 8.4
- Database: PostgreSQL
- Web server: Nginx + PHP-FPM
- Queue: Laravel database queue via Supervisor

Ganti nilai domain, database, user, dan repository sesuai kebutuhan.

## 1. Server bootstrap

Login sebagai user sudo, lalu jalankan:

```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y nginx postgresql postgresql-contrib supervisor git unzip curl ca-certificates software-properties-common
```

Install PHP 8.4 dan extension yang umum dibutuhkan Laravel:

```bash
sudo add-apt-repository ppa:ondrej/php -y
sudo apt update
sudo apt install -y php8.4-fpm php8.4-cli php8.4-common php8.4-pgsql php8.4-mbstring php8.4-xml php8.4-curl php8.4-zip php8.4-bcmath php8.4-intl
```

Install Composer:

```bash
curl -sS https://getcomposer.org/installer -o composer-setup.php
php composer-setup.php
sudo mv composer.phar /usr/local/bin/composer
rm composer-setup.php
```

Install Node.js LTS:

```bash
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt install -y nodejs
```

## 2. Database PostgreSQL

```bash
sudo -u postgres psql
```

Di prompt PostgreSQL:

```sql
CREATE DATABASE akuntansi_staging;
CREATE USER akuntansi_staging WITH ENCRYPTED PASSWORD 'change-this-password';
GRANT ALL PRIVILEGES ON DATABASE akuntansi_staging TO akuntansi_staging;
\c akuntansi_staging
GRANT ALL ON SCHEMA public TO akuntansi_staging;
\q
```

## 3. Clone aplikasi

```bash
sudo mkdir -p /var/www/akuntansi-staging
sudo chown -R $USER:www-data /var/www/akuntansi-staging
git clone REPO_URL /var/www/akuntansi-staging
cd /var/www/akuntansi-staging
```

Install dependency dan build asset:

```bash
composer install --no-dev --optimize-autoloader
npm ci
npm run build
```

## 4. Environment staging

```bash
cp .env.example .env
php artisan key:generate
nano .env
```

Minimal nilai staging:

```env
APP_NAME=Emwal
APP_ENV=staging
APP_DEBUG=false
APP_URL=https://staging.emwal.id

LOG_LEVEL=warning

DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=akuntansi_staging
DB_USERNAME=akuntansi_staging
DB_PASSWORD=change-this-password

SESSION_DRIVER=database
CACHE_STORE=database
QUEUE_CONNECTION=database

MAIL_MAILER=log

GOOGLE_REDIRECT_URI="${APP_URL}/auth/google/callback"
DEV_EMAILS=

TELEGRAM_FEEDBACK_NOTIFICATIONS_ENABLED=false
TELEGRAM_ERROR_NOTIFICATIONS_ENABLED=false
```

Jalankan migrasi dan optimasi:

```bash
php artisan migrate --force
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

Permission storage/cache:

```bash
sudo chown -R www-data:www-data storage bootstrap/cache
sudo chmod -R ug+rw storage bootstrap/cache
```

Jika app memakai file publik:

```bash
php artisan storage:link
```

## 5. Nginx

Buat config:

```bash
sudo nano /etc/nginx/sites-available/akuntansi-staging
```

Isi:

```nginx
server {
    listen 80;
    server_name staging.emwal.id;
    root /var/www/akuntansi-staging/public;

    index index.php index.html;

    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";

    charset utf-8;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location = /favicon.ico { access_log off; log_not_found off; }
    location = /robots.txt  { access_log off; log_not_found off; }

    error_page 404 /index.php;

    location ~ ^/index\.php(/|$) {
        fastcgi_pass unix:/run/php/php8.4-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
        fastcgi_hide_header X-Powered-By;
    }

    location ~ /\.(?!well-known).* {
        deny all;
    }
}
```

Enable site:

```bash
sudo ln -s /etc/nginx/sites-available/akuntansi-staging /etc/nginx/sites-enabled/akuntansi-staging
sudo nginx -t
sudo systemctl reload nginx
```

## 6. HTTPS

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d staging.emwal.id
```

## 7. Queue worker

Buat Supervisor config:

```bash
sudo nano /etc/supervisor/conf.d/akuntansi-staging-worker.conf
```

Isi:

```ini
[program:akuntansi-staging-worker]
process_name=%(program_name)s_%(process_num)02d
command=php /var/www/akuntansi-staging/artisan queue:work database --sleep=3 --tries=3 --max-time=3600
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
user=www-data
numprocs=1
redirect_stderr=true
stdout_logfile=/var/www/akuntansi-staging/storage/logs/worker.log
stopwaitsecs=3600
```

Reload Supervisor:

```bash
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl status
```

## 8. Deploy ulang

Setiap rilis staging:

```bash
cd /var/www/akuntansi-staging
git pull
composer install --no-dev --optimize-autoloader
npm ci
npm run build
php artisan migrate --force
php artisan optimize:clear
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan queue:restart
sudo supervisorctl restart akuntansi-staging-worker:*
sudo systemctl reload php8.4-fpm
sudo systemctl reload nginx
```

## 9. Quick checks

```bash
php artisan about
php artisan migrate:status
sudo nginx -t
sudo systemctl status php8.4-fpm --no-pager
sudo supervisorctl status
tail -n 100 storage/logs/laravel.log
```

Pastikan juga:

- DNS `staging.emwal.id` mengarah ke IP VPS.
- OAuth Google menambahkan redirect URI `https://staging.emwal.id/auth/google/callback`.
- Data staging tidak memakai database production.
- `APP_DEBUG=false` di staging yang dapat diakses publik.

powered by ramacita