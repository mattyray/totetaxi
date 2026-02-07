# backend/apps/customers/booking_views.py
from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.conf import settings
import logging
import json
import stripe

from .models import CustomerProfile, SavedAddress, CustomerPaymentMethod
from apps.bookings.models import Booking, Address, check_same_day_restriction  # ← ADDED IMPORT
from apps.payments.models import Payment
from apps.payments.services import StripePaymentService
from .emails import send_booking_confirmation_email
from .serializers import SavedAddressSerializer
from .booking_serializers import (
    AuthenticatedBookingCreateSerializer,
    CustomerBookingDetailSerializer,
    QuickBookingSerializer,
    PaymentIntentCreateSerializer
)
from django.utils.decorators import method_decorator
from django_ratelimit.decorators import ratelimit

logger = logging.getLogger(__name__)

# Initialize Stripe
stripe.api_key = settings.STRIPE_SECRET_KEY


@method_decorator(ratelimit(key='ip', rate='10/h', method='POST', block=True), name='post')
class CreatePaymentIntentView(APIView):
    """
    Create payment intent BEFORE booking
    This separates payment from booking creation to avoid pending bookings
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        logger.info("Payment intent request received")
        
        serializer = PaymentIntentCreateSerializer(
            data=request.data,
            context={'user': request.user if request.user.is_authenticated else None}
        )
        
        if not serializer.is_valid():
            logger.warning(f"Payment intent validation failed: {serializer.errors}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        # Calculate total amount from validated data
        validated_data = serializer.validated_data
        amount_cents = validated_data['calculated_total_cents']
        customer_email = validated_data.get('customer_email')
        
        try:
            # Create Stripe payment intent
            payment_intent = stripe.PaymentIntent.create(
                amount=amount_cents,
                currency='usd',
                payment_method_types=['card'],
                metadata={
                    'service_type': validated_data['service_type'],
                    'customer_email': customer_email,
                }
            )
            
            logger.info(f"Payment intent created: {payment_intent.id} for ${amount_cents / 100}")
            
            return Response({
                'client_secret': payment_intent.client_secret,
                'payment_intent_id': payment_intent.id,
                'amount_dollars': amount_cents / 100
            }, status=status.HTTP_200_OK)
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error creating payment intent: {str(e)}")
            return Response(
                {'error': 'Payment initialization failed'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class CustomerBookingCreateView(APIView):
    """
    Create booking AFTER payment succeeds
    Requires payment_intent_id and verifies payment before creating booking
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        logger.info(f"Booking create request from user: {request.user.email}")

        # Ensure user has customer profile
        if not hasattr(request.user, 'customer_profile'):
            logger.warning(f"User {request.user.email} has no customer profile")
            return Response(
                {'error': 'This is not a customer account'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Verify payment_intent_id is provided
        payment_intent_id = request.data.get('payment_intent_id')
        if not payment_intent_id:
            return Response(
                {'error': 'payment_intent_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # ========== C2: PaymentIntent reuse prevention ==========
        if Payment.objects.filter(
            stripe_payment_intent_id=payment_intent_id,
            booking__isnull=False,
        ).exists():
            logger.warning(f"PI reuse attempt by {request.user.email}: {payment_intent_id}")
            return Response(
                {'error': 'This payment has already been used for a booking'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Verify payment with Stripe
        try:
            payment_intent = stripe.PaymentIntent.retrieve(payment_intent_id)

            if payment_intent.status != 'succeeded':
                logger.warning(f"Payment not succeeded for {request.user.email}: {payment_intent.status}")
                return Response(
                    {'error': 'Payment has not succeeded'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            logger.info(f"Payment verified: {payment_intent_id} - ${payment_intent.amount / 100}")

        except stripe.error.StripeError as e:
            logger.error(f"Stripe verification failed: {str(e)}")
            return Response(
                {'error': 'Payment verification failed'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = AuthenticatedBookingCreateSerializer(
            data=request.data,
            context={'user': request.user}
        )

        if not serializer.is_valid():
            logger.warning(f"Booking validation failed for {request.user.email}: {serializer.errors}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        # ========== SAME-DAY RESTRICTION CHECK ==========
        pickup_date = serializer.validated_data.get('pickup_date')
        if pickup_date:
            is_blocked, error_message = check_same_day_restriction(pickup_date)
            if is_blocked:
                return Response({
                    'error': 'same_day_restriction',
                    'message': error_message,
                    'contact_phone': '(631) 595-5100'
                }, status=status.HTTP_400_BAD_REQUEST)
        # ========== END RESTRICTION CHECK ==========

        try:
            booking = serializer.save()
            logger.info(f"Booking created: {booking.booking_number} by {request.user.email}")

            # ========== C1: Payment amount verification ==========
            if payment_intent.amount != booking.total_price_cents:
                logger.error(
                    f"Payment amount mismatch: PI={payment_intent.amount}, "
                    f"booking={booking.total_price_cents} for {booking.booking_number}"
                )
                booking.status = 'cancelled'
                booking.save()
                return Response(
                    {'error': 'Payment amount does not match booking total'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Create payment record
            charge_id = getattr(payment_intent, 'latest_charge', None)
            if not isinstance(charge_id, str):
                charge_id = ''
            Payment.objects.create(
                booking=booking,
                customer=request.user,
                amount_cents=payment_intent.amount,
                stripe_payment_intent_id=payment_intent_id,
                stripe_charge_id=charge_id,
                status='succeeded',
                processed_at=timezone.now(),
            )
            logger.info(f"Payment record created for booking {booking.booking_number}")

            # Update booking status to paid since payment already succeeded
            booking.status = 'paid'
            booking.save()

        except Exception as e:
            logger.error(f"Error creating booking for {request.user.email}: {str(e)}", exc_info=True)
            return Response(
                {'error': 'An error occurred while creating the booking'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        response_data = {
            'message': 'Booking created successfully',
            'booking': CustomerBookingDetailSerializer(booking).data
        }

        return Response(response_data, status=status.HTTP_201_CREATED)


class QuickRebookView(APIView):
    """Quickly rebook a previous booking with minimal changes"""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, booking_id):
        try:
            original_booking = Booking.objects.get(
                id=booking_id,
                customer=request.user,
                deleted_at__isnull=True
            )
        except Booking.DoesNotExist:
            return Response(
                {'error': 'Original booking not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = QuickBookingSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Calculate pricing for payment intent
        new_booking_data = {
            'service_type': original_booking.service_type,
            'mini_move_package_id': str(original_booking.mini_move_package.id) if original_booking.mini_move_package else None,
            'standard_delivery_item_count': original_booking.standard_delivery_item_count,
            'is_same_day_delivery': serializer.validated_data.get('is_same_day_delivery', False),
            'pickup_date': serializer.validated_data['pickup_date'],
            'coi_required': serializer.validated_data.get('coi_required', original_booking.coi_required),
        }
        
        return Response({
            'message': 'Ready to create payment',
            'booking_data': new_booking_data
        }, status=status.HTTP_200_OK)


class CustomerBookingDetailView(generics.RetrieveAPIView):
    """Get detailed booking information for authenticated customer"""
    serializer_class = CustomerBookingDetailSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return self.request.user.bookings.filter(
            deleted_at__isnull=True
        ).select_related(
            'mini_move_package',
            'pickup_address',
            'delivery_address',
            'guest_checkout'
        ).prefetch_related(
            'specialty_items',
            'onfleet_tasks'
        )
    
    def get_object(self):
        booking_id = self.kwargs.get('booking_id')
        return get_object_or_404(self.get_queryset(), id=booking_id)


class CustomerDashboardView(APIView):
    """Enhanced customer dashboard with booking insights"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        if not hasattr(request.user, 'customer_profile'):
            return Response(
                {'error': 'This is not a customer account'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        customer_profile = request.user.customer_profile
        
        all_bookings = request.user.bookings.filter(
            deleted_at__isnull=True,
            status__in=['paid', 'confirmed', 'completed']
        ).select_related(
            'mini_move_package',
            'pickup_address',
            'delivery_address',
            'guest_checkout'
        ).prefetch_related(
            'specialty_items',
            'onfleet_tasks'
        ).order_by('-created_at')
        
        recent_bookings = all_bookings[:5]
        
        pending_bookings = all_bookings.filter(status__in=['confirmed']).count()
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
            'recent_bookings': CustomerBookingDetailSerializer(recent_bookings, many=True).data,
            'saved_addresses_count': saved_addresses.count(),
            'payment_methods_count': payment_methods.count(),
            'popular_addresses': SavedAddressSerializer(popular_addresses, many=True).data
        })


class BookingPreferencesView(APIView):
    """Manage customer booking preferences"""
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
        """Return the most-used saved address.

        Note: address_type is accepted for labeling but not filtered —
        SavedAddress has no address_type field.
        """
        most_used = self.request.user.saved_addresses.filter(
            is_active=True
        ).order_by('-times_used').first()
        return SavedAddressSerializer(most_used).data if most_used else None