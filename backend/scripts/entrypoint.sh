#!/bin/bash
set -e

echo "Starting ToteTaxi Backend..."

# Wait for database if DB_HOST is set
if [ -n "$DB_HOST" ]; then
    echo "Waiting for postgres at $DB_HOST:${DB_PORT:-5432}..."
    while ! pg_isready -h "$DB_HOST" -p "${DB_PORT:-5432}" -U "${DB_USER:-postgres}"; do
      sleep 1
    done
    echo "PostgreSQL is ready!"
fi

# Run migrations
echo "Running database migrations..."
python manage.py migrate --no-input

# Create superuser if needed (optional)
# python manage.py shell -c "from django.contrib.auth import get_user_model; User = get_user_model(); User.objects.filter(username='admin').exists() or User.objects.create_superuser('admin', 'admin@totetaxi.com', 'changeme123')"

echo "Starting application..."
exec "$@"