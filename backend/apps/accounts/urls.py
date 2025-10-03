from django.urls import path
from . import views

# Staff API patterns
urlpatterns = [
    # Authentication
    path('auth/login/', views.StaffLoginView.as_view(), name='staff-login'),
    path('auth/logout/', views.StaffLogoutView.as_view(), name='staff-logout'),
    path('csrf-token/', views.StaffCSRFTokenView.as_view(), name='staff-csrf-token'),  # ADD THIS

    
    # Dashboard and operations
    path('dashboard/', views.StaffDashboardView.as_view(), name='staff-dashboard'),
    path('bookings/', views.BookingManagementView.as_view(), name='staff-bookings'),
    path('bookings/<uuid:booking_id>/', views.BookingDetailView.as_view(), name='staff-booking-detail'),
    
    # Customer management
    path('customers/', views.CustomerManagementView.as_view(), name='staff-customers'),
    path('customers/<int:customer_id>/', views.CustomerDetailView.as_view(), name='staff-customer-detail'),
    path('customers/<int:customer_id>/notes/', views.CustomerNotesUpdateView.as_view(), name='staff-customer-notes'),
]