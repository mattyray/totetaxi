from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse
from django.db import connection


def health_check(request):
    try:
        connection.ensure_connection()
        return JsonResponse({"status": "ok"})
    except Exception:
        return JsonResponse({"status": "error"}, status=503)


urlpatterns = [
    path('health/', health_check),
    path('admin/', admin.site.urls),

    # Public + customer
    path('api/customer/', include('apps.customers.urls')),
    path('api/public/', include('apps.bookings.urls')),

    # Payments (includes Stripe webhook)
    path('api/payments/', include('apps.payments.urls')),

    # Staff
    path('api/staff/', include('apps.accounts.urls')),
    path('api/staff/logistics/', include('apps.logistics.urls')),

    # AI Assistant
    path('api/assistant/', include('apps.assistant.urls')),
]
