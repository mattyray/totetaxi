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
    
    echo "Creating superuser if needed..."
    python manage.py shell -c "
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(email='admin@totetaxi.com').exists():
    User.objects.create_superuser(
        email='admin@totetaxi.com', 
        first_name='Admin', 
        last_name='User',
        phone='+1234567890',
        password='admin123'
    )
    print('Superuser created: admin@totetaxi.com/admin123')
else:
    print('Superuser already exists')
" || echo "Superuser creation failed, continuing..."
else
    echo "No manage.py found, skipping Django setup commands"
fi

exec "$@"