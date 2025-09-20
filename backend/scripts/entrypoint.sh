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

echo "Starting application..."
exec "$@"