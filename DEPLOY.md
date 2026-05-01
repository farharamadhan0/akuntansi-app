# Deployment Guide - Docker Cloud VPS

## Prerequisites

- Cloud VPS dengan Docker & Docker Compose terinstall
- Domain name (opsional tapi direkomendasikan)
- SSL Certificate (Let's Encrypt direkomendasikan untuk production)

## File yang Dibuat

```
├── Dockerfile                 # PHP-FPM + Nginx + Node.js build
├── docker-compose.yml         # Development setup
├── docker-compose.prod.yml    # Production setup
├── docker/
│   ├── nginx.conf            # Nginx configuration
│   ├── supervisord.conf      # Process manager
│   └── entrypoint.sh         # Container startup script
└── .dockerignore             # Exclude files from build
```

## Quick Start - Development

```bash
# 1. Copy environment file
cp .env.example .env

# 2. Generate APP_KEY
php artisan key:generate

# 3. Build dan jalankan
docker compose up -d --build

# 4. Akses aplikasi
# http://localhost
```

## Production Deployment

### 1. Siapkan Environment Variables

Buat file `.env` di VPS:

```env
APP_NAME=Emwal
APP_ENV=production
APP_KEY=base64:xxxxxxxxxxxxxxxx  # Generate dengan: php artisan key:generate --show
APP_DEBUG=false
APP_URL=https://your-domain.com

DB_CONNECTION=pgsql
DB_HOST=postgres
DB_PORT=5432
DB_DATABASE=akuntansi
DB_USERNAME=postgres
DB_PASSWORD=your_secure_password_here

SESSION_DRIVER=database
CACHE_STORE=database
QUEUE_CONNECTION=database

# Email (ganti sesuai provider, contoh Mailgun/SendGrid)
MAIL_MAILER=smtp
MAIL_HOST=smtp.mailgun.org
MAIL_PORT=587
MAIL_USERNAME=postmaster@your-domain.com
MAIL_PASSWORD=your_mail_password
MAIL_FROM_ADDRESS=noreply@your-domain.com
MAIL_FROM_NAME="${APP_NAME}"
```

### 2. Deploy ke VPS

```bash
# SSH ke VPS
ssh user@your-vps-ip

# Clone repo (atau upload via SCP/rsync)
git clone https://github.com/yourusername/akuntansi-app.git
cd akuntansi-app

# Buat .env file (edit sesuai konfigurasi)
nano .env

# Build dan jalankan production
docker compose -f docker-compose.prod.yml up -d --build

# Cek logs
docker compose -f docker-compose.prod.yml logs -f
```

### 3. Database Migration (First Time)

```bash
# Jalankan migrasi
docker compose -f docker-compose.prod.yml exec app php artisan migrate --force

# Seed data awal (jika ada seeder)
docker compose -f docker-compose.prod.yml exec app php artisan db:seed --force
```

### 4. SSL Certificate (Let's Encrypt)

```bash
# Install certbot
docker run -it --rm --name certbot \
  -v "/etc/letsencrypt:/etc/letsencrypt" \
  -v "/var/lib/letsencrypt:/var/lib/letsencrypt" \
  certbot/certbot certonly --standalone -d your-domain.com

# Copy certificate ke docker/nginx.conf (update path)
# atau gunakan reverse proxy seperti Traefik/Nginx Proxy Manager
```

## Maintenance Commands

```bash
# View logs
docker compose -f docker-compose.prod.yml logs -f app
docker compose -f docker-compose.prod.yml logs -f postgres

# Restart services
docker compose -f docker-compose.prod.yml restart

# Update aplikasi (setelah git pull)
docker compose -f docker-compose.prod.yml up -d --build

# Backup database
docker compose -f docker-compose.prod.yml exec postgres pg_dump -U postgres akuntansi > backup.sql

# Restore database
cat backup.sql | docker compose -f docker-compose.prod.yml exec -T postgres psql -U postgres akuntansi

# Clear cache
docker compose -f docker-compose.prod.yml exec app php artisan cache:clear
docker compose -f docker-compose.prod.yml exec app php artisan config:clear

# Queue worker restart
docker compose -f docker-compose.prod.yml restart queue
```

## Security Recommendations

1. **Ganti default password**: Pastikan DB_PASSWORD kuat
2. **Firewall**: Hanya buka port 80, 443, dan SSH
3. **Auto-updates**: Enable unattended-upgrades untuk security updates
4. **Fail2ban**: Install untuk proteksi brute force
5. **Database**: Backup otomatis dengan cron job

## Troubleshooting

### Container tidak start
```bash
docker compose -f docker-compose.prod.yml logs app
```

### Permission denied
```bash
docker compose -f docker-compose.prod.yml exec app chown -R www-data:www-data /var/www/storage
```

### Database connection failed
```bash
# Cek status postgres
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs postgres
```

### 500 Error
```bash
# Cek Laravel logs
docker compose -f docker-compose.prod.yml exec app cat storage/logs/laravel.log
```

## Update Aplikasi

```bash
# Pull latest code
git pull origin main

# Rebuild dan restart
docker compose -f docker-compose.prod.yml up -d --build

# Clear cache
docker compose -f docker-compose.prod.yml exec app php artisan optimize
```
