#!/bin/sh
set -e

# Create log directories
mkdir -p /var/log/supervisor
mkdir -p /var/www/storage/logs

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL..."
while ! pg_isready -h "${DB_HOST:-postgres}" -p "${DB_PORT:-5432}" -U "${DB_USERNAME:-postgres}" > /dev/null 2>&1; do
    echo "PostgreSQL is unavailable - sleeping"
    sleep 1
done
echo "PostgreSQL is up!"

# Create .env file if not exists (needed for artisan commands)
if [ ! -f /var/www/.env ]; then
    touch /var/www/.env
fi

# Generate APP_KEY if not set, otherwise write it to .env
# (ensures artisan commands work even before config:cache runs)
if [ -z "$APP_KEY" ]; then
    echo "Generating APP_KEY..."
    php artisan key:generate --force
else
    # Write APP_KEY into .env so artisan can always read it
    if grep -q "^APP_KEY=" /var/www/.env 2>/dev/null; then
        sed -i "s|^APP_KEY=.*|APP_KEY=$APP_KEY|" /var/www/.env
    else
        echo "APP_KEY=$APP_KEY" >> /var/www/.env
    fi
fi

# Run migrations and seeders (only on fresh start, be careful in production)
# Use --force for production
php artisan migrate --force

# Optimize Laravel
php artisan config:clear
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache

# Create storage link if not exists
php artisan storage:link || true

# Set proper permissions
chown -R www-data:www-data /var/www/storage
chown -R www-data:www-data /var/www/bootstrap/cache

# Execute the main command
exec "$@"
