# backend/apps/accounts/views.py
from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import login, logout, authenticate
from django.contrib.auth.models import User
from django.middleware.csrf import get_token
from django.views.decorators.csrf import ensure_csrf_cookie
from django.utils.decorators import method_decorator
from django.shortcuts import get_object_or_404
from django.db.models import Q, Count
from django_ratelimit.decorators import ratelimit
from .models import StaffProfile, StaffAction
from .serializers import (
    StaffLoginSerializer,
    StaffProfileSerializer,
    StaffUserSerializer,
    StaffActionSerializer
)
from apps.bookings.models import Booking
from apps.customers.models import CustomerProfile
from apps.payments.models import Payment, Refund


@method_decorator(ratelimit(key='ip', rate='5/m', method='POST', block=True), name='post')
@method_decorator(ratelimit(key='header:user-agent', rate='10/m', method='POST', block=True), name='post')
class StaffLoginView(APIView):
    """Staff authentication endpoint with rate limiting protection"""
    permission_classes = [permissions.AllowAny]
    
    @method_decorator(ensure_csrf_cookie)
    def post(self, request):
        serializer = StaffLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        username = serializer.validated_data['username']
        password = serializer.validated_data['password']
        
        user = authenticate(username=username, password=password)
        
        if user and user.is_active:
            # Check if user has staff profile
            if not hasattr(user, 'staff_profile'):
                return Response(
                    {'error': 'This is not a staff account'}, 
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Check if account is locked
            if user.staff_profile.is_account_locked:
                return Response(
                    {'error': 'Account is temporarily locked. Contact administrator.'}, 
                    status=status.HTTP_403_FORBIDDEN
                )
            
            login(request, user)
            
            # Log successful login
            StaffAction.log_action(
                staff_user=user,
                action_type='login',
                description=f'Staff user {user.username} logged in successfully',
                request=request
            )
            
            # Reset failed login attempts
            user.staff_profile.login_attempts = 0
            user.staff_profile.save()
            
            return Response({
                'message': 'Login successful',
                'user': StaffUserSerializer(user).data,
                'staff_profile': StaffProfileSerializer(user.staff_profile).data,
                'csrf_token': get_token(request)
            })
        else:
            # Handle failed login attempt
            if user:
                staff_profile = getattr(user, 'staff_profile', None)
                if staff_profile:
                    staff_profile.login_attempts += 1
                    if staff_profile.login_attempts >= 5:
                        staff_profile.lock_account(minutes=30)
                    staff_profile.save()
            
            return Response(
                {'error': 'Invalid username or password'}, 
                status=status.HTTP_401_UNAUTHORIZED
            )


@method_decorator(ratelimit(key='user', rate='10/m', method='POST', block=True), name='post')
class StaffLogoutView(APIView):
    """Staff logout endpoint with rate limiting"""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        # Log logout action
        StaffAction.log_action(
            staff_user=request.user,
            action_type='logout',
            description=f'Staff user {request.user.username} logged out',
            request=request
        )
        
        logout(request)
        return Response({'message': 'Logout successful'})


@method_decorator(ratelimit(key='user', rate='30/m', method='GET', block=True), name='get')
class StaffDashboardView(APIView):
    """Staff operations dashboard with KPIs and rate limiting"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        if not hasattr(request.user, 'staff_profile'):
            return Response(
                {'error': 'Not a staff account'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Log dashboard access
        StaffAction.log_action(
            staff_user=request.user,
            action_type='view_dashboard',
            description='Accessed staff dashboard',
            request=request
        )
        
        # Get booking statistics
        total_bookings = Booking.objects.filter(deleted_at__isnull=True).count()
        pending_bookings = Booking.objects.filter(status='pending', deleted_at__isnull=True).count()
        confirmed_bookings = Booking.objects.filter(status='confirmed', deleted_at__isnull=True).count()
        paid_bookings = Booking.objects.filter(status='paid', deleted_at__isnull=True).count()
        completed_bookings = Booking.objects.filter(status='completed', deleted_at__isnull=True).count()
        
        # Get payment statistics
        total_payments = Payment.objects.filter(status='succeeded').count()
        pending_payments = Payment.objects.filter(status='pending').count()
        failed_payments = Payment.objects.filter(status='failed').count()
        
        # Calculate revenue
        from django.db.models import Sum
        total_revenue_cents = Payment.objects.filter(status='succeeded').aggregate(
            total=Sum('amount_cents')
        )['total'] or 0
        
        # Get recent bookings needing attention
        urgent_bookings = Booking.objects.filter(
            status__in=['pending', 'confirmed'],
            deleted_at__isnull=True
        ).order_by('pickup_date', 'created_at')[:10]
        
        # Get customer statistics
        total_customers = CustomerProfile.objects.count()
        vip_customers = CustomerProfile.objects.filter(is_vip=True).count()
        
        return Response({
            'staff_info': {
                'name': request.user.get_full_name(),
                'role': request.user.staff_profile.role,
                'permissions': {
                    'can_approve_refunds': request.user.staff_profile.can_approve_refunds,
                    'can_manage_staff': request.user.staff_profile.can_manage_staff,
                    'can_view_financial_reports': request.user.staff_profile.can_view_financial_reports
                }
            },
            'booking_stats': {
                'total_bookings': total_bookings,
                'pending_bookings': pending_bookings,
                'confirmed_bookings': confirmed_bookings,
                'paid_bookings': paid_bookings,
                'completed_bookings': completed_bookings
            },
            'payment_stats': {
                'total_payments': total_payments,
                'pending_payments': pending_payments,
                'failed_payments': failed_payments,
                'total_revenue_dollars': total_revenue_cents / 100
            },
            'customer_stats': {
                'total_customers': total_customers,
                'vip_customers': vip_customers
            },
            'urgent_bookings': self._serialize_urgent_bookings(urgent_bookings)
        })
    
    def _serialize_urgent_bookings(self, bookings):
        """Serialize urgent bookings for dashboard"""
        urgent_data = []
        for booking in bookings:
            urgent_data.append({
                'id': str(booking.id),
                'booking_number': booking.booking_number,
                'customer_name': booking.get_customer_name(),
                'customer_email': booking.get_customer_email(),
                'service_type': booking.get_service_type_display(),
                'pickup_date': booking.pickup_date,
                'status': booking.get_status_display(),
                'total_price_dollars': booking.total_price_dollars,
                'created_at': booking.created_at
            })
        return urgent_data


@method_decorator(ratelimit(key='user', rate='20/m', method='GET', block=True), name='get')
class CustomerManagementView(APIView):
    """Staff customer management with rate limiting - list and search customers"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        if not hasattr(request.user, 'staff_profile'):
            return Response({'error': 'Not a staff account'}, status=status.HTTP_403_FORBIDDEN)
        
        # Get query parameters
        search = request.query_params.get('search', '')
        vip = request.query_params.get('vip', '')
        
        # Start with all customer profiles
        customers = User.objects.filter(customer_profile__isnull=False).select_related('customer_profile')
        
        # Apply search filter
        if search:
            customers = customers.filter(
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(email__icontains=search) |
                Q(customer_profile__phone__icontains=search)
            )
        
        # Apply VIP filter
        if vip == 'true':
            customers = customers.filter(customer_profile__is_vip=True)
        elif vip == 'false':
            customers = customers.filter(customer_profile__is_vip=False)
        
        # Serialize customer data
        customer_data = []
        for user in customers[:100]:  # Limit to 100 results
            profile = user.customer_profile
            
            # Get recent bookings
            recent_bookings = user.bookings.filter(deleted_at__isnull=True).order_by('-created_at')[:5]
            
            customer_data.append({
                'id': user.id,
                'name': user.get_full_name(),
                'email': user.email,
                'phone': profile.phone,
                'is_vip': profile.is_vip,
                'total_bookings': profile.total_bookings,
                'total_spent_dollars': profile.total_spent_dollars,
                'last_booking_at': profile.last_booking_at,
                'created_at': profile.created_at,
                'notes': profile.notes,
                'recent_bookings': [{
                    'id': str(booking.id),
                    'booking_number': booking.booking_number,
                    'service_type': booking.get_service_type_display(),
                    'status': booking.status,
                    'total_price_dollars': booking.total_price_dollars,
                    'created_at': booking.created_at
                } for booking in recent_bookings],
                'saved_addresses': [{
                    'id': str(addr.id),
                    'address_line_1': addr.address_line_1,
                    'city': addr.city,
                    'state': addr.state,
                    'is_primary': addr.times_used > 0
                } for addr in user.saved_addresses.filter(is_active=True)[:3]]
            })
        
        return Response({
            'customers': customer_data,
            'total_count': customers.count(),
            'filters': {
                'search': search,
                'vip': vip
            }
        })


@method_decorator(ratelimit(key='user', rate='15/m', method='GET', block=True), name='get')
class CustomerDetailView(APIView):
    """Staff view for individual customer details with rate limiting"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request, customer_id):
        if not hasattr(request.user, 'staff_profile'):
            return Response({'error': 'Not a staff account'}, status=status.HTTP_403_FORBIDDEN)
        
        try:
            user = User.objects.get(id=customer_id, customer_profile__isnull=False)
            profile = user.customer_profile
        except User.DoesNotExist:
            return Response({'error': 'Customer not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Log viewing customer data
        StaffAction.log_action(
            staff_user=request.user,
            action_type='view_customer',
            description=f'Viewed customer {user.get_full_name()} ({user.email})',
            request=request,
            customer_id=user.id
        )
        
        # Get all bookings
        all_bookings = user.bookings.filter(deleted_at__isnull=True).order_by('-created_at')
        
        return Response({
            'id': user.id,
            'name': user.get_full_name(),
            'email': user.email,
            'phone': profile.phone,
            'is_vip': profile.is_vip,
            'total_bookings': profile.total_bookings,
            'total_spent_dollars': profile.total_spent_dollars,
            'last_booking_at': profile.last_booking_at,
            'created_at': profile.created_at,
            'notes': profile.notes,
            'recent_bookings': [{
                'id': str(booking.id),
                'booking_number': booking.booking_number,
                'service_type': booking.get_service_type_display(),
                'status': booking.status,
                'total_price_dollars': booking.total_price_dollars,
                'created_at': booking.created_at
            } for booking in all_bookings],
            'saved_addresses': [{
                'id': str(addr.id),
                'address_line_1': addr.address_line_1,
                'address_line_2': addr.address_line_2,
                'city': addr.city,
                'state': addr.state,
                'zip_code': addr.zip_code,
                'is_primary': addr.times_used > 0
            } for addr in user.saved_addresses.filter(is_active=True)]
        })


@method_decorator(ratelimit(key='user', rate='5/m', method='PATCH', block=True), name='patch')
class CustomerNotesUpdateView(APIView):
    """Update customer notes with rate limiting - staff only"""
    permission_classes = [permissions.IsAuthenticated]
    
    def patch(self, request, customer_id):
        if not hasattr(request.user, 'staff_profile'):
            return Response({'error': 'Staff access required'}, status=status.HTTP_403_FORBIDDEN)
        
        try:
            user = User.objects.get(id=customer_id, customer_profile__isnull=False)
            profile = user.customer_profile
        except User.DoesNotExist:
            return Response({'error': 'Customer not found'}, status=status.HTTP_404_NOT_FOUND)
        
        notes = request.data.get('notes', '')
        old_notes = profile.notes
        
        profile.notes = notes
        profile.save()
        
        # Log notes update
        StaffAction.log_action(
            staff_user=request.user,
            action_type='modify_customer',
            description=f'Updated notes for customer {user.get_full_name()}',
            request=request,
            customer_id=user.id
        )
        
        return Response({
            'message': 'Customer notes updated successfully',
            'notes': profile.notes
        })


@method_decorator(ratelimit(key='user', rate='30/m', method='GET', block=True), name='get')
class BookingManagementView(APIView):
    """Enhanced staff booking management with rate limiting and date range support"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """List all bookings with enhanced filtering including date ranges"""
        if not hasattr(request.user, 'staff_profile'):
            return Response({'error': 'Not a staff account'}, status=status.HTTP_403_FORBIDDEN)
        
        # Get query parameters
        status_filter = request.query_params.get('status', None)
        date_filter = request.query_params.get('date', None)
        start_date = request.query_params.get('start_date', None)
        end_date = request.query_params.get('end_date', None)
        search = request.query_params.get('search', None)
        
        # Build queryset
        bookings = Booking.objects.filter(deleted_at__isnull=True).order_by('-created_at')
        
        if status_filter:
            bookings = bookings.filter(status=status_filter)
        
        if date_filter:
            bookings = bookings.filter(pickup_date=date_filter)
        
        # Date range filtering for calendar
        if start_date and end_date:
            bookings = bookings.filter(
                pickup_date__gte=start_date,
                pickup_date__lte=end_date
            )
        elif start_date:
            bookings = bookings.filter(pickup_date__gte=start_date)
        elif end_date:
            bookings = bookings.filter(pickup_date__lte=end_date)
        
        if search:
            bookings = bookings.filter(
                Q(booking_number__icontains=search) |
                Q(customer__email__icontains=search) |
                Q(guest_checkout__email__icontains=search) |
                Q(customer__first_name__icontains=search) |
                Q(customer__last_name__icontains=search) |
                Q(guest_checkout__first_name__icontains=search) |
                Q(guest_checkout__last_name__icontains=search)
            )
        
        # Serialize bookings
        booking_data = []
        for booking in bookings[:50]:  # Limit to 50 results
            booking_data.append({
                'id': str(booking.id),
                'booking_number': booking.booking_number,
                'customer_name': booking.get_customer_name(),
                'customer_email': booking.get_customer_email(),
                'service_type': booking.get_service_type_display(),
                'pickup_date': booking.pickup_date,
                'pickup_time': booking.get_pickup_time_display(),
                'status': booking.get_status_display(),
                'total_price_dollars': booking.total_price_dollars,
                'payment_status': self._get_payment_status(booking),
                'created_at': booking.created_at,
                'coi_required': booking.coi_required
            })
        
        return Response({
            'bookings': booking_data,
            'total_count': bookings.count(),
            'filters': {
                'status': status_filter,
                'date': date_filter,
                'start_date': start_date,
                'end_date': end_date,
                'search': search
            }
        })
    
    def _get_payment_status(self, booking):
        """Get payment status for booking"""
        payment = booking.payments.first()
        return payment.status if payment else 'not_created'


@method_decorator(ratelimit(key='user', rate='20/m', method='GET', block=True), name='get')
@method_decorator(ratelimit(key='user', rate='10/m', method='PATCH', block=True), name='patch')
class BookingDetailView(APIView):
    """Staff view for individual booking details and management with rate limiting"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request, booking_id):
        if not hasattr(request.user, 'staff_profile'):
            return Response({'error': 'Not a staff account'}, status=status.HTTP_403_FORBIDDEN)
        
        try:
            booking = Booking.objects.get(id=booking_id, deleted_at__isnull=True)
        except Booking.DoesNotExist:
            return Response({'error': 'Booking not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Log viewing booking data
        StaffAction.log_action(
            staff_user=request.user,
            action_type='view_booking',
            description=f'Viewed booking {booking.booking_number}',
            request=request,
            booking_id=booking.id
        )
        
        # Get payment information
        payment = booking.payments.first()
        payment_data = None
        if payment:
            payment_data = {
                'id': str(payment.id),
                'status': payment.status,
                'amount_dollars': payment.amount_dollars,
                'stripe_payment_intent_id': payment.stripe_payment_intent_id,
                'processed_at': payment.processed_at,
                'failure_reason': payment.failure_reason
            }
        
        # Get customer information
        customer_data = None
        if booking.customer:
            customer_data = {
                'id': booking.customer.id,
                'name': booking.customer.get_full_name(),
                'email': booking.customer.email,
                'phone': getattr(booking.customer.customer_profile, 'phone', ''),
                'is_vip': getattr(booking.customer.customer_profile, 'is_vip', False),
                'total_bookings': getattr(booking.customer.customer_profile, 'total_bookings', 0),
                'total_spent_dollars': getattr(booking.customer.customer_profile, 'total_spent_dollars', 0)
            }
        
        return Response({
            'booking': {
                'id': str(booking.id),
                'booking_number': booking.booking_number,
                'service_type': booking.get_service_type_display(),
                'status': booking.status,
                'pickup_date': booking.pickup_date,
                'pickup_time': booking.get_pickup_time_display(),
                'pickup_address': {
                    'address_line_1': booking.pickup_address.address_line_1,
                    'address_line_2': booking.pickup_address.address_line_2,
                    'city': booking.pickup_address.city,
                    'state': booking.pickup_address.state,
                    'zip_code': booking.pickup_address.zip_code
                },
                'delivery_address': {
                    'address_line_1': booking.delivery_address.address_line_1,
                    'address_line_2': booking.delivery_address.address_line_2,
                    'city': booking.delivery_address.city,
                    'state': booking.delivery_address.state,
                    'zip_code': booking.delivery_address.zip_code
                },
                'special_instructions': booking.special_instructions,
                'coi_required': booking.coi_required,
                'total_price_dollars': booking.total_price_dollars,
                'pricing_breakdown': booking.get_pricing_breakdown(),
                'created_at': booking.created_at,
                'updated_at': booking.updated_at
            },
            'customer': customer_data,
            'guest_checkout': {
                'first_name': booking.guest_checkout.first_name if booking.guest_checkout else None,
                'last_name': booking.guest_checkout.last_name if booking.guest_checkout else None,
                'email': booking.guest_checkout.email if booking.guest_checkout else None,
                'phone': booking.guest_checkout.phone if booking.guest_checkout else None
            } if booking.guest_checkout else None,
            'payment': payment_data
        })
    
    def patch(self, request, booking_id):
        """Update booking status and details"""
        if not hasattr(request.user, 'staff_profile'):
            return Response({'error': 'Not a staff account'}, status=status.HTTP_403_FORBIDDEN)
        
        try:
            booking = Booking.objects.get(id=booking_id, deleted_at__isnull=True)
        except Booking.DoesNotExist:
            return Response({'error': 'Booking not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Get update data
        new_status = request.data.get('status')
        staff_notes = request.data.get('staff_notes', '')
        
        old_status = booking.status
        
        # Update booking
        if new_status and new_status != old_status:
            booking.status = new_status
            booking.save()
            
            # Log status change
            StaffAction.log_action(
                staff_user=request.user,
                action_type='modify_booking',
                description=f'Changed booking {booking.booking_number} status from {old_status} to {new_status}. Notes: {staff_notes}',
                request=request,
                booking_id=booking.id
            )
        
        return Response({
            'message': 'Booking updated successfully',
            'booking': {
                'id': str(booking.id),
                'booking_number': booking.booking_number,
                'status': booking.status,
                'updated_at': booking.updated_at
            }
        })