# backend/apps/bookings/urls.py
from django.urls import path
from . import views

# Public booking API patterns - no authentication required
urlpatterns = [
    # Service information
    path('services/', views.ServiceCatalogView.as_view(), name='service-catalog'),
    path('pricing-preview/', views.PricingPreviewView.as_view(), name='pricing-preview'),
    path('availability/', views.CalendarAvailabilityView.as_view(), name='calendar-availability'),
    
    # NEW: Organizing service endpoints
    path('services/mini-moves-with-organizing/', views.ServiceCatalogWithOrganizingView.as_view(), name='mini-moves-with-organizing'),
    path('services/organizing-by-tier/', views.OrganizingServicesByTierView.as_view(), name='organizing-by-tier'),
    path('services/organizing/<uuid:service_id>/', views.OrganizingServiceDetailView.as_view(), name='organizing-service-detail'),
    
    # Guest booking
    path('guest-booking/', views.GuestBookingCreateView.as_view(), name='guest-booking-create'),
    
    # Booking status lookup
    path('booking-status/<str:booking_number>/', views.BookingStatusView.as_view(), name='booking-status'),
    path('calendar/availability/', views.CalendarAvailabilityView.as_view(), name='calendar-availability'),
    path('fix-organizing-services/', views.FixOrganizingServicesView.as_view()),
    
    # NEW: ZIP code validation endpoint
    path('validate-zip/', views.ValidateZipCodeView.as_view(), name='validate-zip'),
]