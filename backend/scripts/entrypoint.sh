#!/bin/bash

# Exit on any failure
set -e

echo "Waiting for postgres..."
while ! pg_isready -h db -p 5432 -U postgres; do
  sleep 1
done
echo "PostgreSQL started"

# Only run migrations and collectstatic if manage.py exists
if [ -f "manage.py" ]; then
    echo "Running migrations..."
    python manage.py migrate --no-input
    
    echo "Collecting static files..."
    python manage.py collectstatic --no-input --clear || echo "Collectstatic failed, continuing..."
else
    echo "No manage.py found, skipping Django setup commands"
fi

exec "$@"