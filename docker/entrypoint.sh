#!/bin/sh
set -e

# Create log directories
mkdir -p /var/log/supervisor
mkdir -p /var/www/storage/logs

# Wait for PostgreSQL to be ready
while ! nc -z "${DB_HOST:-postgres}" "${DB_PORT:-5432}" > /dev/null 2>&1; do
    echo "PostgreSQL is unavailable - sleeping"
    sleep 1
done
echo "PostgreSQL is up!"

# Generate APP_KEY if not set
if [ -z "$APP_KEY" ]; then
    echo "Generating APP_KEY..."
    php artisan key:generate --force
fi

# Run migrations and seeders (only on fresh start, be careful in production)
# Use --force for production
php artisan migrate --force

# Optimize Laravel
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
