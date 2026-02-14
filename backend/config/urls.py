from django.contrib import admin
from django.urls import path, include

urlpatterns = [
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
