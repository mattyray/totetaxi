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
from apps.bookings.models import Booking, Address
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

logger = logging.getLogger(__name__)

# Initialize Stripe
stripe.api_key = settings.STRIPE_SECRET_KEY


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
                {'error': f'Payment initialization failed: {str(e)}'}, 
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
        
        # Verify payment with Stripe
        try:
            payment_intent = stripe.PaymentIntent.retrieve(payment_intent_id)
            
            if payment_intent.status != 'succeeded':
                logger.warning(f"Payment not succeeded for {request.user.email}: {payment_intent.status}")
                return Response(
                    {'error': f'Payment has not succeeded. Status: {payment_intent.status}'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            logger.info(f"Payment verified: {payment_intent_id} - ${payment_intent.amount / 100}")
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe verification failed: {str(e)}")
            return Response(
                {'error': f'Payment verification failed: {str(e)}'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = AuthenticatedBookingCreateSerializer(
            data=request.data,
            context={'user': request.user}
        )
        
        if not serializer.is_valid():
            logger.warning(f"Booking validation failed for {request.user.email}: {serializer.errors}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            booking = serializer.save()
            logger.info(f"Booking created: {booking.booking_number} by {request.user.email}")
            
            # Create payment record immediately
            payment, created = Payment.objects.get_or_create(
                stripe_payment_intent_id=payment_intent_id,
                defaults={
                    'booking': booking,
                    'amount_cents': payment_intent.amount,
                    'status': 'succeeded',
                    'stripe_charge_id': payment_intent.get('latest_charge', ''),
                    'processed_at': timezone.now()
                }
            )
            
            if created:
                logger.info(f"Payment record created for booking {booking.booking_number}")
            else:
                logger.info(f"Payment record already exists for booking {booking.booking_number}")
            
            # Update booking status to paid since payment already succeeded
            booking.status = 'paid'
            booking.save()

            # Send booking confirmation email
            logger.info(f"Sending booking confirmation email to {booking.get_customer_email()}")
            send_booking_confirmation_email(booking)
            
        except Exception as e:
            logger.error(f"Error creating booking for {request.user.email}: {str(e)}", exc_info=True)
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
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
        return self.request.user.bookings.filter(deleted_at__isnull=True)
    
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
        
        # Only show completed and paid bookings (no pending clutter)
        all_bookings = request.user.bookings.filter(
            deleted_at__isnull=True,
            status__in=['paid', 'confirmed', 'completed']
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
        most_used = self.request.user.saved_addresses.filter(is_active=True).order_by('-times_used').first()
        return SavedAddressSerializer(most_used).data if most_used else None