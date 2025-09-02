from django.urls import path
from . import views

# Public booking API patterns - no authentication required
urlpatterns = [
    # Service information
    path('services/', views.ServiceCatalogView.as_view(), name='service-catalog'),
    path('pricing-preview/', views.PricingPreviewView.as_view(), name='pricing-preview'),
    path('availability/', views.CalendarAvailabilityView.as_view(), name='calendar-availability'),
    
    # Guest booking
    path('guest-booking/', views.GuestBookingCreateView.as_view(), name='guest-booking-create'),
    
    # Booking status lookup
    path('booking-status/<str:booking_number>/', views.BookingStatusView.as_view(), name='booking-status'),
]