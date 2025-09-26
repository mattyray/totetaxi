#!/bin/bash
set -e

echo "Starting ToteTaxi Backend..."

# CRITICAL FIX: Unset docker-compose DB variables on Fly.io
unset DB_HOST
unset DB_NAME
unset DB_USER
unset DB_PASSWORD
unset DB_PORT

# Wait for database if DB_HOST is set (won't happen after unset)
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

# Collect static files (in case not done in Dockerfile)
echo "Collecting static files..."
python manage.py collectstatic --no-input --clear || true

# Create cache table if needed
python manage.py createcachetable || true

# Create superuser if specified (optional)
if [ -n "$DJANGO_SUPERUSER_EMAIL" ] && [ -n "$DJANGO_SUPERUSER_PASSWORD" ]; then
    echo "Creating superuser..."
    python manage.py shell -c "
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(email='$DJANGO_SUPERUSER_EMAIL').exists():
    User.objects.create_superuser('$DJANGO_SUPERUSER_EMAIL', '$DJANGO_SUPERUSER_EMAIL', '$DJANGO_SUPERUSER_PASSWORD')
    print('Superuser created')
else:
    print('Superuser already exists')
" || true
fi

echo "Starting application..."
exec "$@"