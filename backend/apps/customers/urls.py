from django.urls import path
from . import views

# API patterns
urlpatterns = [
    # CSRF token endpoint
    path('csrf-token/', views.CSRFTokenView.as_view(), name='csrf-token'),
    
    # Authentication endpoints
    path('auth/register/', views.CustomerRegistrationView.as_view(), name='customer-register'),
    path('auth/login/', views.CustomerLoginView.as_view(), name='customer-login'),
    path('auth/logout/', views.CustomerLogoutView.as_view(), name='customer-logout'),
    path('auth/user/', views.CurrentUserView.as_view(), name='current-user'),
    
    # Profile management
    path('profile/', views.CustomerProfileView.as_view(), name='customer-profile'),
    path('addresses/', views.SavedAddressListCreateView.as_view(), name='saved-addresses'),
    path('addresses/<uuid:pk>/', views.SavedAddressDetailView.as_view(), name='saved-address-detail'),
    path('bookings/', views.CustomerBookingListView.as_view(), name='customer-bookings'),
]