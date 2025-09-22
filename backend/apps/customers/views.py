from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import login, logout
from django.contrib.auth.models import User
from django.middleware.csrf import get_token
from django.views.decorators.csrf import ensure_csrf_cookie, csrf_exempt
from django.utils.decorators import method_decorator
from .models import CustomerProfile, SavedAddress
from .serializers import (
    CustomerRegistrationSerializer, 
    CustomerLoginSerializer,
    CustomerProfileSerializer,
    UserSerializer,
    SavedAddressSerializer
)


@method_decorator(ensure_csrf_cookie, name='dispatch')
class CustomerRegistrationView(generics.CreateAPIView):
    """Register new customer account"""
    serializer_class = CustomerRegistrationSerializer
    permission_classes = [permissions.AllowAny]
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        return Response({
            'message': 'Account created successfully',
            'user': UserSerializer(user).data,
            'customer_profile': CustomerProfileSerializer(user.customer_profile).data,
            'csrf_token': get_token(request)
        }, status=status.HTTP_201_CREATED)


@method_decorator(ensure_csrf_cookie, name='dispatch')
class CustomerLoginView(APIView):
    """Customer login endpoint"""
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        serializer = CustomerLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        user = serializer.validated_data['user']
        login(request, user)
        
        return Response({
            'message': 'Login successful',
            'user': UserSerializer(user).data,
            'customer_profile': CustomerProfileSerializer(user.customer_profile).data,
            'csrf_token': get_token(request)
        })


@method_decorator(csrf_exempt, name='dispatch')
class CustomerLogoutView(APIView):
    """Customer logout endpoint - CSRF exempt to handle logout failures gracefully"""
    permission_classes = [permissions.AllowAny]  # Changed from IsAuthenticated
    
    def post(self, request):
        # Logout even if user is not authenticated (cleanup)
        logout(request)
        return Response({'message': 'Logout successful'})


class CurrentUserView(APIView):
    """Get current authenticated user info"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        if hasattr(request.user, 'customer_profile'):
            return Response({
                'user': UserSerializer(request.user).data,
                'customer_profile': CustomerProfileSerializer(request.user.customer_profile).data,
                'csrf_token': get_token(request)
            })
        else:
            return Response({'error': 'Not a customer account'}, status=status.HTTP_403_FORBIDDEN)


class CSRFTokenView(APIView):
    """Get CSRF token for authenticated requests"""
    permission_classes = [permissions.AllowAny]
    
    @method_decorator(ensure_csrf_cookie)
    def get(self, request):
        return Response({
            'csrf_token': get_token(request)
        })


class CustomerProfileView(generics.RetrieveUpdateAPIView):
    """Customer profile management"""
    serializer_class = CustomerProfileSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_object(self):
        return self.request.user.customer_profile


class SavedAddressListCreateView(generics.ListCreateAPIView):
    """List and create saved addresses"""
    serializer_class = SavedAddressSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return self.request.user.saved_addresses.filter(is_active=True)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class SavedAddressDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update, delete saved address"""
    serializer_class = SavedAddressSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return self.request.user.saved_addresses.all()


class CustomerBookingListView(generics.ListAPIView):
    """Customer booking history"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return self.request.user.bookings.all().order_by('-created_at')
    
    def get(self, request, *args, **kwargs):
        bookings = self.get_queryset()
        booking_data = []
        
        for booking in bookings:
            booking_data.append({
                'id': str(booking.id),
                'booking_number': booking.booking_number,
                'service_type': booking.get_service_type_display(),
                'status': booking.get_status_display(),
                'pickup_date': booking.pickup_date,
                'total_price': booking.total_price_dollars,
                'created_at': booking.created_at
            })
        
        return Response({
            'bookings': booking_data,
            'total_count': len(booking_data)
        })


class CustomerNotesUpdateView(APIView):
    """Update customer notes - staff only"""
    permission_classes = [permissions.IsAuthenticated]
    
    def patch(self, request, customer_id):
        # Check if user is staff
        if not hasattr(request.user, 'staff_profile'):
            return Response({'error': 'Staff access required'}, status=status.HTTP_403_FORBIDDEN)
        
        try:
            customer_user = User.objects.get(id=customer_id)
            customer_profile = customer_user.customer_profile
        except (User.DoesNotExist, CustomerProfile.DoesNotExist):
            return Response({'error': 'Customer not found'}, status=status.HTTP_404_NOT_FOUND)
        
        notes = request.data.get('notes', '')
        customer_profile.notes = notes
        customer_profile.save()
        
        return Response({
            'message': 'Customer notes updated successfully',
            'notes': customer_profile.notes
        })