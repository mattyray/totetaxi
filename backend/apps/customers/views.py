# backend/apps/customers/views.py
from rest_framework import generics, status, permissions
from django.conf import settings
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import login, logout
from django.contrib.auth.models import User
from django.middleware.csrf import get_token
from django.views.decorators.csrf import ensure_csrf_cookie, csrf_exempt
from django.utils.decorators import method_decorator
from django.core.exceptions import ValidationError
from django_ratelimit.decorators import ratelimit
from .models import CustomerProfile, SavedAddress
from .serializers import (
    CustomerRegistrationSerializer, 
    CustomerLoginSerializer,
    CustomerProfileSerializer,
    UserSerializer,
    SavedAddressSerializer
)


@method_decorator(ratelimit(key='ip', rate='5/m', method='POST', block=True), name='create')
@method_decorator(ratelimit(key='header:user-agent', rate='10/m', method='POST', block=True), name='create')
@method_decorator(ensure_csrf_cookie, name='dispatch')
class CustomerRegistrationView(generics.CreateAPIView):
    """Register new customer account with hybrid account prevention and rate limiting"""
    serializer_class = CustomerRegistrationSerializer
    permission_classes = [permissions.AllowAny]
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Check if user already exists with staff profile
        email = serializer.validated_data['email']
        try:
            existing_user = User.objects.get(email__iexact=email)
            if hasattr(existing_user, 'staff_profile'):
                return Response(
                    {'error': 'This email is already registered as a staff account. Please use a different email or contact support.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        except User.DoesNotExist:
            pass  # This is what we want - new email
        
        try:
            user = serializer.save()
            # Automatically log in the user after registration
            login(request, user)
        except ValidationError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        return Response({
            'message': 'Account created successfully',
            'user': UserSerializer(user).data,
            'customer_profile': CustomerProfileSerializer(user.customer_profile).data,
            'csrf_token': get_token(request)
        }, status=status.HTTP_201_CREATED)

@method_decorator(ratelimit(key='ip', rate='10/m', method='POST', block=True), name='post')
@method_decorator(ratelimit(key='header:user-agent', rate='15/m', method='POST', block=True), name='post')
@method_decorator(ensure_csrf_cookie, name='dispatch')
class CustomerLoginView(APIView):
    """Customer login endpoint with profile type validation and rate limiting"""
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        serializer = CustomerLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        user = serializer.validated_data['user']
        
        # Ensure user has customer profile (not staff)
        if not hasattr(user, 'customer_profile'):
            if hasattr(user, 'staff_profile'):
                return Response(
                    {'error': 'This is a staff account. Please use the staff login.'},
                    status=status.HTTP_403_FORBIDDEN
                )
            else:
                return Response(
                    {'error': 'Account does not have a customer profile.'},
                    status=status.HTTP_403_FORBIDDEN
                )
        
        # Additional security: Check for hybrid accounts
        try:
            CustomerProfile.ensure_single_profile_type(user)
        except ValidationError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        login(request, user)
        
        return Response({
            'message': 'Login successful',
            'user': UserSerializer(user).data,
            'customer_profile': CustomerProfileSerializer(user.customer_profile).data,
            'session_id': request.session.session_key,
            'csrf_token': get_token(request)
        })

@method_decorator(ratelimit(key='user_or_ip', rate='20/m', method='POST', block=True), name='post')
@method_decorator(csrf_exempt, name='dispatch')
class CustomerLogoutView(APIView):
    """Enhanced customer logout endpoint with complete session cleanup and rate limiting"""
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        # Always logout, even if not authenticated (cleanup)
        logout(request)
        
        # Force session cleanup
        if hasattr(request, 'session'):
            request.session.flush()
        
        response = Response({'message': 'Logout successful'})
        
        # Clear all possible auth cookies
        auth_cookies = ['sessionid', 'csrftoken']
        for cookie_name in auth_cookies:
            response.delete_cookie(cookie_name)
            # Also try with domain
            response.delete_cookie(cookie_name, domain='.totetaxi.com')
        
        return response


@method_decorator(ratelimit(key='user', rate='60/m', method='GET', block=True), name='get')
class CurrentUserView(APIView):
    """Get current authenticated user info with profile validation and rate limiting"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        # Ensure profile integrity
        try:
            CustomerProfile.ensure_single_profile_type(request.user)
        except ValidationError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        
        if hasattr(request.user, 'customer_profile'):
            return Response({
                'user': UserSerializer(request.user).data,
                'customer_profile': CustomerProfileSerializer(request.user.customer_profile).data,
                'csrf_token': get_token(request)
            })
        else:
            return Response({'error': 'Not a customer account'}, status=status.HTTP_403_FORBIDDEN)


@method_decorator(ratelimit(key='ip', rate='100/m', method='GET', block=True), name='get')
class CSRFTokenView(APIView):
    """Get CSRF token for authenticated requests with rate limiting"""
    permission_classes = [permissions.AllowAny]
    
    @method_decorator(ensure_csrf_cookie)
    def get(self, request):
        return Response({
            'csrf_token': get_token(request)
        })


@method_decorator(ratelimit(key='user', rate='30/m', method=['GET', 'PATCH'], block=True), name='dispatch')
class CustomerProfileView(generics.RetrieveUpdateAPIView):
    """Customer profile management with validation and rate limiting"""
    serializer_class = CustomerProfileSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_object(self):
        # Ensure profile integrity
        try:
            CustomerProfile.ensure_single_profile_type(self.request.user)
        except ValidationError as e:
            from django.http import Http404
            raise Http404(str(e))
        
        return self.request.user.customer_profile


@method_decorator(ratelimit(key='user', rate='20/m', method=['GET', 'POST'], block=True), name='dispatch')
class SavedAddressListCreateView(generics.ListCreateAPIView):
    """List and create saved addresses with rate limiting"""
    serializer_class = SavedAddressSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return self.request.user.saved_addresses.filter(is_active=True)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


@method_decorator(ratelimit(key='user', rate='15/m', method=['GET', 'PATCH', 'DELETE'], block=True), name='dispatch')
class SavedAddressDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update, delete saved address with rate limiting"""
    serializer_class = SavedAddressSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return self.request.user.saved_addresses.all()


@method_decorator(ratelimit(key='user', rate='30/m', method='GET', block=True), name='get')
class CustomerBookingListView(generics.ListAPIView):
    """Customer booking history with rate limiting"""
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


@method_decorator(ratelimit(key='user', rate='5/m', method='PATCH', block=True), name='patch')
class CustomerNotesUpdateView(APIView):
    """Update customer notes with rate limiting - staff only"""
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


@method_decorator(ratelimit(key='user', rate='20/m', method='GET', block=True), name='get')
class CustomerDashboardView(APIView):
    """Enhanced customer dashboard with booking insights and rate limiting"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        if not hasattr(request.user, 'customer_profile'):
            return Response(
                {'error': 'This is not a customer account'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        customer_profile = request.user.customer_profile
        
        all_bookings = request.user.bookings.filter(deleted_at__isnull=True).order_by('-created_at')
        recent_bookings = all_bookings[:5]
        
        pending_bookings = all_bookings.filter(status__in=['pending', 'confirmed']).count()
        completed_bookings = all_bookings.filter(status='completed').count()
        
        saved_addresses = request.user.saved_addresses.filter(is_active=True)
        payment_methods = request.user.payment_methods.filter(is_active=True)
        
        popular_addresses = saved_addresses.order_by('-times_used')[:3]
        
        return Response({
            'customer_profile': {
                'name': request.user.get_full_name(),
                'email': request.user.email,
                'phone': customer_profile.phone,
                'is_vip': customer_profile.is_vip,
                'total_bookings': customer_profile.total_bookings,
                'total_spent_dollars': customer_profile.total_spent_dollars,
                'last_booking_at': customer_profile.last_booking_at
            },
            'booking_summary': {
                'pending_bookings': pending_bookings,
                'completed_bookings': completed_bookings,
                'total_bookings': all_bookings.count()
            },
            'recent_bookings': [],
            'saved_addresses_count': saved_addresses.count(),
            'payment_methods_count': payment_methods.count(),
            'popular_addresses': SavedAddressSerializer(popular_addresses, many=True).data
        })


@method_decorator(ratelimit(key='user', rate='15/m', method='GET', block=True), name='get')
class BookingPreferencesView(APIView):
    """Manage customer booking preferences with rate limiting"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        customer_profile = request.user.customer_profile
        
        return Response({
            'preferred_pickup_time': customer_profile.preferred_pickup_time,
            'email_notifications': customer_profile.email_notifications,
            'sms_notifications': customer_profile.sms_notifications,
            'default_addresses': {
                'most_used_pickup': self._get_most_used_address('pickup'),
                'most_used_delivery': self._get_most_used_address('delivery')
            }
        })
    
    def _get_most_used_address(self, address_type):
        most_used = self.request.user.saved_addresses.filter(is_active=True).order_by('-times_used').first()
        return SavedAddressSerializer(most_used).data if most_used else None
    
    # Add this to the end of backend/apps/customers/views.py

@method_decorator(ratelimit(key='ip', rate='10/m', method='GET', block=True), name='get')
@method_decorator(ensure_csrf_cookie, name='dispatch')
class MobileDebugView(APIView):
    """Mobile debugging view to diagnose cookie and authentication issues"""
    permission_classes = [permissions.AllowAny]
    
    def get(self, request):
        import logging
        logger = logging.getLogger(__name__)
        
        # Get request details
        origin = request.META.get('HTTP_ORIGIN', 'NO_ORIGIN')
        host = request.META.get('HTTP_HOST', 'NO_HOST')
        user_agent = request.META.get('HTTP_USER_AGENT', 'NO_UA')
        
        # Log detailed request information
        logger.info(f"Mobile Debug Request:")
        logger.info(f"  Origin: {origin}")
        logger.info(f"  Host: {host}")
        logger.info(f"  User-Agent: {user_agent}")
        logger.info(f"  Session Key: {request.session.session_key}")
        logger.info(f"  User Authenticated: {request.user.is_authenticated}")
        logger.info(f"  Cookies in request: {dict(request.COOKIES)}")
        
        # Force session creation if none exists
        if not request.session.session_key:
            request.session.create()
            logger.info(f"Created new session: {request.session.session_key}")
        
        # Prepare response data
        response_data = {
            'debug_info': {
                'timestamp': request.META.get('HTTP_X_FORWARDED_FOR', request.META.get('REMOTE_ADDR')),
                'origin': origin,
                'host': host,
                'session_key': request.session.session_key,
                'csrf_token': get_token(request),
                'cookies_received': dict(request.COOKIES),
                'user_authenticated': request.user.is_authenticated,
                'user_id': request.user.id if request.user.is_authenticated else None,
                'cors_settings': {
                    'allowed_origins': getattr(settings, 'CORS_ALLOWED_ORIGINS', []),
                    'trusted_origins': getattr(settings, 'CSRF_TRUSTED_ORIGINS', []),
                },
                'cookie_settings': {
                    'session_samesite': getattr(settings, 'SESSION_COOKIE_SAMESITE', 'unknown'),
                    'csrf_samesite': getattr(settings, 'CSRF_COOKIE_SAMESITE', 'unknown'),
                    'session_secure': getattr(settings, 'SESSION_COOKIE_SECURE', 'unknown'),
                    'csrf_secure': getattr(settings, 'CSRF_COOKIE_SECURE', 'unknown'),
                }
            }
        }
        
        # Create response
        response = Response(response_data)
        
        # Manually set cookies with explicit mobile-friendly settings
        if request.session.session_key:
            response.set_cookie(
                'totetaxi_sessionid',
                request.session.session_key,
                max_age=60 * 60 * 24 * 30,  # 30 days
                secure=True,
                httponly=True,
                samesite='None',
                domain=None
            )
            logger.info(f"Set custom session cookie: {request.session.session_key}")
        
        # Set CSRF cookie explicitly
        csrf_token = get_token(request)
        response.set_cookie(
            'csrftoken',
            csrf_token,
            max_age=60 * 60 * 24 * 7,  # 1 week
            secure=True,
            httponly=False,
            samesite='None',
            domain=None
        )
        logger.info(f"Set CSRF cookie: {csrf_token[:10]}...")
        
        # Add CORS headers manually
        response['Access-Control-Allow-Origin'] = origin
        response['Access-Control-Allow-Credentials'] = 'true'
        response['Vary'] = 'Origin'
        
        return response