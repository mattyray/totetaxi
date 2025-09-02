from django.urls import path
from . import views

# Staff API patterns
urlpatterns = [
    # Authentication
    path('auth/login/', views.StaffLoginView.as_view(), name='staff-login'),
    path('auth/logout/', views.StaffLogoutView.as_view(), name='staff-logout'),
    
    # Dashboard and operations
    path('dashboard/', views.StaffDashboardView.as_view(), name='staff-dashboard'),
    path('bookings/', views.BookingManagementView.as_view(), name='staff-bookings'),
    path('bookings/<uuid:booking_id>/', views.BookingDetailView.as_view(), name='staff-booking-detail'),
]