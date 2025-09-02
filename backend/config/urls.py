from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/customer/', include('apps.customers.urls')),
    path('api/public/', include('apps.bookings.urls')),  # Add this line
]