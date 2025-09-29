# backend/apps/customers/urls.py
from django.urls import path
from . import views, booking_views

# API patterns with both authentication and booking functionality
urlpatterns = [
    # CSRF token endpoint
    path('csrf-token/', views.CSRFTokenView.as_view(), name='csrf-token'),
    
    # DEBUG endpoint
    
    # Authentication endpoints
    path('auth/register/', views.CustomerRegistrationView.as_view(), name='customer-register'),
    path('auth/login/', views.CustomerLoginView.as_view(), name='customer-login'),
    path('auth/logout/', views.CustomerLogoutView.as_view(), name='customer-logout'),
    path('auth/user/', views.CurrentUserView.as_view(), name='current-user'),
    
    # Profile management
    path('profile/', views.CustomerProfileView.as_view(), name='customer-profile'),
    path('addresses/', views.SavedAddressListCreateView.as_view(), name='saved-addresses'),
    path('addresses/<uuid:pk>/', views.SavedAddressDetailView.as_view(), name='saved-address-detail'),
    
    # Enhanced customer dashboard and preferences
    path('dashboard/', views.CustomerDashboardView.as_view(), name='customer-dashboard'),
    path('preferences/', views.BookingPreferencesView.as_view(), name='booking-preferences'),
    
    # Authenticated booking management
    path('bookings/', views.CustomerBookingListView.as_view(), name='customer-bookings'),
    path('bookings/create/', booking_views.CustomerBookingCreateView.as_view(), name='customer-booking-create'),
    path('bookings/<uuid:booking_id>/', booking_views.CustomerBookingDetailView.as_view(), name='customer-booking-detail'),
    path('bookings/<uuid:booking_id>/rebook/', booking_views.QuickRebookView.as_view(), name='quick-rebook'),
    
    # Staff-only customer notes management
    path('<int:customer_id>/notes/', views.CustomerNotesUpdateView.as_view(), name='customer-notes-update'),
]