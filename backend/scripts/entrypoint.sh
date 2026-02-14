#!/bin/bash
set -e

echo "Starting ToteTaxi Backend..."

# CRITICAL FIX: Unset docker-compose DB variables on Fly.io
unset DB_HOST
unset DB_NAME
unset DB_USER
unset DB_PASSWORD
unset DB_PORT

# On Fly.io, migrations are handled by release_command and static files
# are collected in the Dockerfile build. Skip them here to avoid OOM
# on memory-constrained machines.
if [ -z "$FLY_APP_NAME" ]; then
    # Local Docker: wait for DB, run migrations, collectstatic
    if [ -n "$DB_HOST" ]; then
        echo "Waiting for postgres at $DB_HOST:${DB_PORT:-5432}..."
        while ! pg_isready -h "$DB_HOST" -p "${DB_PORT:-5432}" -U "${DB_USER:-postgres}"; do
          sleep 1
        done
        echo "PostgreSQL is ready!"
    fi

    echo "Running database migrations..."
    python manage.py migrate --no-input

    echo "Collecting static files..."
    python manage.py collectstatic --no-input --clear || true

    python manage.py createcachetable || true

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
fi

echo "Starting application..."
exec "$@"