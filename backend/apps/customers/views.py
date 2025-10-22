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
from django.core.mail import send_mail

from .emails import send_welcome_email, send_password_reset_email, send_email_verification
from .models import CustomerProfile, SavedAddress, PasswordResetToken, EmailVerificationToken
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
    """Register new customer account - requires email verification"""
    serializer_class = CustomerRegistrationSerializer
    permission_classes = [permissions.AllowAny]
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        email = serializer.validated_data['email']
        try:
            existing_user = User.objects.get(email__iexact=email)
            if hasattr(existing_user, 'staff_profile'):
                return Response(
                    {'error': 'This email is already registered as a staff account. Please use a different email or contact support.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            # If user exists but not verified, resend verification
            if not existing_user.is_active and hasattr(existing_user, 'email_verification'):
                verification_token = existing_user.email_verification
                if not verification_token.verified:
                    # Resend verification email
                    frontend_url = settings.FRONTEND_URL or 'https://totetaxi.netlify.app'
                    verify_url = f'{frontend_url}/verify-email?token={verification_token.token}'
                    send_email_verification(existing_user, verification_token.token, verify_url)
                    return Response({
                        'message': 'A verification email has been sent. Please check your inbox.'
                    }, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            pass
        
        try:
            # Create inactive user
            user = serializer.save()
            user.is_active = False  # Inactive until email verified
            user.save()
            
            # Create verification token
            verification_token = EmailVerificationToken.create_token(user)
            
            # Send verification email
            frontend_url = settings.FRONTEND_URL or 'https://totetaxi.netlify.app'
            verify_url = f'{frontend_url}/verify-email?token={verification_token.token}'
            send_email_verification(user, verification_token.token, verify_url)
            
        except ValidationError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        return Response({
            'message': 'Registration successful! Please check your email to verify your account.',
            'email': user.email
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
    
@method_decorator(ratelimit(key='ip', rate='10/h', method='POST', block=True), name='post')
class EmailVerificationView(APIView):
    """Verify email with token"""
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        token = request.data.get('token', '').strip()
        
        if not token:
            return Response(
                {'error': 'Verification token is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            verification = EmailVerificationToken.objects.get(token=token)
            
            if not verification.is_valid():
                return Response(
                    {'error': 'This verification link has expired. Please register again.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Activate user
            user = verification.user
            user.is_active = True
            user.save()
            
            # Mark as verified
            verification.verified = True
            verification.save()
            
            # Send welcome email now
            send_welcome_email(user)
            
            return Response({
                'message': 'Email verified successfully! You can now log in.',
                'email': user.email
            })
            
        except EmailVerificationToken.DoesNotExist:
            return Response(
                {'error': 'Invalid verification link.'},
                status=status.HTTP_400_BAD_REQUEST
            )

@method_decorator(ratelimit(key='ip', rate='3/h', method='POST', block=True), name='post')
class ResendVerificationView(APIView):
    """Resend verification email - rate limited to prevent abuse"""
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        
        if not email:
            return Response(
                {'error': 'Email is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            user = User.objects.get(email__iexact=email)
            
            # Check if user is already active
            if user.is_active:
                return Response({
                    'message': 'This account is already verified. Please log in.'
                })
            
            # Check if user has staff profile (shouldn't happen but safety check)
            if hasattr(user, 'staff_profile'):
                return Response({
                    'message': 'If an unverified account exists with this email, a new verification link has been sent.'
                })
            
            # Check if verification token exists
            try:
                verification = user.email_verification
                
                # If still valid, resend same token
                if verification.is_valid():
                    frontend_url = settings.FRONTEND_URL or 'https://totetaxi.netlify.app'
                    verify_url = f'{frontend_url}/verify-email?token={verification.token}'
                    send_email_verification(user, verification.token, verify_url)
                else:
                    # Token expired, create new one
                    verification.delete()
                    new_verification = EmailVerificationToken.create_token(user)
                    frontend_url = settings.FRONTEND_URL or 'https://totetaxi.netlify.app'
                    verify_url = f'{frontend_url}/verify-email?token={new_verification.token}'
                    send_email_verification(user, new_verification.token, verify_url)
                    
            except EmailVerificationToken.DoesNotExist:
                # No verification token exists, create new one
                new_verification = EmailVerificationToken.create_token(user)
                frontend_url = settings.FRONTEND_URL or 'https://totetaxi.netlify.app'
                verify_url = f'{frontend_url}/verify-email?token={new_verification.token}'
                send_email_verification(user, new_verification.token, verify_url)
            
            return Response({
                'message': 'If an unverified account exists with this email, a new verification link has been sent.'
            })
            
        except User.DoesNotExist:
            # Don't reveal if user doesn't exist (security)
            return Response({
                'message': 'If an unverified account exists with this email, a new verification link has been sent.'
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
        
        # ✅ FIX: Serialize the recent bookings properly
        from .booking_serializers import CustomerBookingDetailSerializer
        
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
            'recent_bookings': CustomerBookingDetailSerializer(recent_bookings, many=True).data,  # ✅ FIXED!
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
    
# Add these imports at the top

# Add these new views at the end of the file

@method_decorator(csrf_exempt, name='dispatch')  # ← ADD THIS LINE
@method_decorator(ratelimit(key='ip', rate='10/h', method='POST', block=True), name='post')  # ← CHANGED from 3/h to 10/h
class PasswordResetRequestView(APIView):
    """Request password reset - sends email with reset link"""
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        
        if not email:
            return Response(
                {'error': 'Email is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            user = User.objects.get(email__iexact=email)
            
            # Only allow password reset for customer accounts
            if not hasattr(user, 'customer_profile'):
                # Don't reveal if account exists
                return Response({
                    'message': 'If an account exists with this email, you will receive password reset instructions.'
                })
            
            # Create reset token
            reset_token_obj = PasswordResetToken.create_token(user)
            
            # Build reset URL (frontend URL)
            frontend_url = settings.FRONTEND_URL or 'https://totetaxi.netlify.app'
            reset_url = f'{frontend_url}/reset-password?token={reset_token_obj.token}'
            
            # Send email
            send_password_reset_email(user, reset_token_obj.token, reset_url)
            
            return Response({
                'message': 'If an account exists with this email, you will receive password reset instructions.'
            })
            
        except User.DoesNotExist:
            # Don't reveal if account doesn't exist (security best practice)
            return Response({
                'message': 'If an account exists with this email, you will receive password reset instructions.'
            })
        
# 2. Password Reset Confirm View - Around line 405
@method_decorator(csrf_exempt, name='dispatch')  # ← ADD THIS LINE
@method_decorator(ratelimit(key='ip', rate='10/h', method='POST', block=True), name='post')  # ← CHANGED from 5/h to 10/h
class PasswordResetConfirmView(APIView):
    """Confirm password reset with token"""
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        token = request.data.get('token', '').strip()
        new_password = request.data.get('new_password', '')
        
        if not token or not new_password:
            return Response(
                {'error': 'Token and new password are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if len(new_password) < 8:
            return Response(
                {'error': 'Password must be at least 8 characters'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            reset_token = PasswordResetToken.objects.get(token=token)
            
            if not reset_token.is_valid():
                return Response(
                    {'error': 'This reset link has expired or been used. Please request a new one.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Reset the password
            user = reset_token.user
            user.set_password(new_password)
            user.save()
            
            # Mark token as used
            reset_token.used = True
            reset_token.save()
            
            # Invalidate all other sessions
            if hasattr(user, 'session_set'):
                user.session_set.all().delete()
            
            return Response({
                'message': 'Password reset successful. You can now log in with your new password.'
            })
            
        except PasswordResetToken.DoesNotExist:
            return Response(
                {'error': 'Invalid reset link. Please request a new one.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        


@method_decorator(ratelimit(key='ip', rate='5/h', method='POST', block=True), name='post')
@method_decorator(ensure_csrf_cookie, name='dispatch')
class ContactFormView(APIView):
    """
    Contact form endpoint - sends email to info@totetaxi.com
    Rate limited to 5 submissions per hour per IP to prevent spam
    """
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        # Get form data
        name = request.data.get('name', '').strip()
        email = request.data.get('email', '').strip()
        phone = request.data.get('phone', '').strip()
        subject_type = request.data.get('subject', 'General')
        message = request.data.get('message', '').strip()
        
        # Validate required fields
        errors = {}
        if not name:
            errors['name'] = 'Name is required'
        if not email:
            errors['email'] = 'Email is required'
        if not message:
            errors['message'] = 'Message is required'
        
        if errors:
            return Response({'errors': errors}, status=status.HTTP_400_BAD_REQUEST)
        
        # Build email content
        email_subject = f'Contact Form: {subject_type} - {name}'
        email_body = f"""
New contact form submission from Tote Taxi website:

Name: {name}
Email: {email}
Phone: {phone or 'Not provided'}
Subject: {subject_type}

Message:
{message}

---
This message was sent from the Tote Taxi contact form.
Reply directly to: {email}
"""
        
        try:
            # Send email to info@totetaxi.com
            send_mail(
                subject=email_subject,
                message=email_body,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=['info@totetaxi.com'],
                fail_silently=False,
            )
            
            return Response({
                'message': 'Thank you for contacting us! We will respond within 24 hours.'
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f'Failed to send contact form email: {str(e)}')
            return Response(
                {'error': 'Failed to send message. Please try again or email us directly at info@totetaxi.com'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )