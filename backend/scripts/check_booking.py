import django, os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.logistics.models import OnfleetTask
from apps.bookings.models import Booking

import sys
bn = sys.argv[1] if len(sys.argv) > 1 else None
b = Booking.objects.get(booking_number=bn) if bn else Booking.objects.order_by('-created_at').first()
print(f'Booking: {b.booking_number} | {b.status} | {b.service_type}')
print(f'Direction: {getattr(b, "transfer_direction", "?")}')
print(f'Airport: {b.blade_airport} | Terminal: {getattr(b, "blade_terminal", None)}')
print()

tasks = OnfleetTask.objects.filter(booking=b).order_by('task_type')
for t in tasks:
    print(f'--- {t.task_type.upper()} ---')
    print(f'  onfleet_task_id: {t.onfleet_task_id}')
    print(f'  short_id: {t.onfleet_short_id}')
    print(f'  status: {t.status}')
    print(f'  environment: {t.environment}')
    print(f'  worker_id: {t.worker_id}')
    print(f'  worker_name: {t.worker_name}')
    print(f'  recipient_name: {t.recipient_name}')
    print(f'  recipient_phone: {t.recipient_phone}')
    print(f'  tracking_url: {t.tracking_url}')
    print(f'  created_at: {t.created_at}')
    print(f'  started_at: {t.started_at}')
    print(f'  completed_at: {t.completed_at}')
    print()
