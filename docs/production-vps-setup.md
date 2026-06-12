# Production VPS Setup

Panduan ini untuk deploy production aplikasi Laravel + Inertia React + Vite di Ubuntu 24.04.

## Asumsi

- Domain production: `emwal.id`
- App path: `/var/www/akuntansi-production`
- PHP: 8.4
- Database: PostgreSQL
- Web server: Nginx + PHP-FPM
- Queue: Laravel database queue via Supervisor

Ganti nilai repository, database, password, mail, OAuth, dan token sesuai kebutuhan production.

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
CREATE DATABASE akuntansi_production;
CREATE USER akuntansi_production WITH ENCRYPTED PASSWORD 'change-this-password';
GRANT ALL PRIVILEGES ON DATABASE akuntansi_production TO akuntansi_production;
\c akuntansi_production
GRANT ALL ON SCHEMA public TO akuntansi_production;
\q
```

## 3. Clone aplikasi

```bash
sudo mkdir -p /var/www/akuntansi-production
sudo chown -R $USER:www-data /var/www/akuntansi-production
git clone REPO_URL /var/www/akuntansi-production
cd /var/www/akuntansi-production
```

Install dependency dan build asset:

```bash
composer install --no-dev --optimize-autoloader
npm ci
npm run build
```

## 4. Environment production

```bash
cp .env.example .env
php artisan key:generate
nano .env
```

Minimal nilai production:

```env
APP_NAME=Emwal
APP_ENV=production
APP_DEBUG=false
APP_URL=https://emwal.id

LOG_CHANNEL=stack
LOG_STACK=single
LOG_LEVEL=warning

DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=akuntansi_production
DB_USERNAME=akuntansi_production
DB_PASSWORD=change-this-password

SESSION_DRIVER=database
SESSION_LIFETIME=120
SESSION_ENCRYPT=false
SESSION_PATH=/
SESSION_DOMAIN=.emwal.id

CACHE_STORE=database
QUEUE_CONNECTION=database
FILESYSTEM_DISK=local

MAIL_MAILER=log
MAIL_FROM_ADDRESS="hello@emwal.id"
MAIL_FROM_NAME="${APP_NAME}"

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI="${APP_URL}/auth/google/callback"

TELEGRAM_FEEDBACK_NOTIFICATIONS_ENABLED=false
TELEGRAM_FEEDBACK_BOT_TOKEN=
TELEGRAM_FEEDBACK_CHAT_ID=

TELEGRAM_ERROR_NOTIFICATIONS_ENABLED=false
TELEGRAM_ERROR_BOT_TOKEN=
TELEGRAM_ERROR_CHAT_ID=

DEV_EMAILS=
VITE_APP_NAME="${APP_NAME}"
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
sudo nano /etc/nginx/sites-available/akuntansi-production
```

Isi:

```nginx
server {
    listen 80;
    server_name emwal.id www.emwal.id;
    root /var/www/akuntansi-production/public;

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
sudo ln -s /etc/nginx/sites-available/akuntansi-production /etc/nginx/sites-enabled/akuntansi-production
sudo nginx -t
sudo systemctl reload nginx
```

## 6. HTTPS

Pastikan DNS `emwal.id` dan `www.emwal.id` sudah mengarah ke IP VPS, lalu jalankan:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d emwal.id -d www.emwal.id
```

## 7. Queue worker

Buat Supervisor config:

```bash
sudo nano /etc/supervisor/conf.d/akuntansi-production-worker.conf
```

Isi:

```ini
[program:akuntansi-production-worker]
process_name=%(program_name)s_%(process_num)02d
command=php /var/www/akuntansi-production/artisan queue:work database --sleep=3 --tries=3 --max-time=3600
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
user=www-data
numprocs=1
redirect_stderr=true
stdout_logfile=/var/www/akuntansi-production/storage/logs/worker.log
stopwaitsecs=3600
```

Reload Supervisor:

```bash
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl status
```

## 8. Deploy ulang

Sebelum deploy production, pastikan backup database sudah aman.

Backup manual:

```bash
pg_dump -U akuntansi_production -h 127.0.0.1 akuntansi_production > ~/akuntansi-production-$(date +%F-%H%M).sql
```

Setiap rilis production:

```bash
cd /var/www/akuntansi-production
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
sudo supervisorctl restart akuntansi-production-worker:*
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

- DNS `emwal.id` dan `www.emwal.id` mengarah ke IP VPS.
- OAuth Google menambahkan redirect URI `https://emwal.id/auth/google/callback`.
- Production memakai database sendiri, bukan database staging.
- `APP_DEBUG=false`.
- `.env` tidak pernah di-commit ke Git.
- Backup database production dibuat sebelum migrasi besar.
