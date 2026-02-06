# backend/apps/payments/views.py
import stripe
import logging
import time
from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.http import HttpResponse
from django.conf import settings
from django.utils import timezone
from django.core.cache import cache
from django.db import transaction, models  # ADDED models HERE
from django.contrib.auth import get_user_model  # NEW

from .models import Payment, Refund, PaymentAudit
from .serializers import (
    PaymentIntentCreateSerializer,
    PaymentSerializer,
    PaymentConfirmSerializer,
    RefundCreateSerializer,
    RefundSerializer
)
from .services import StripePaymentService
from apps.bookings.models import Booking
from apps.accounts.models import StaffProfile, StaffAction  # NEW

logger = logging.getLogger(__name__)


def _get_system_staff_user():
    """
    Ensure we have a system staff user for webhook-originated actions.
    Prevents IntegrityError when StaffAction.staff_user is NOT NULL.
    """
    User = get_user_model()
    user, _ = User.objects.get_or_create(
        username='system_webhook',
        defaults={'email': 'system@totetaxi.com', 'is_active': True}
    )
    StaffProfile.objects.get_or_create(
        user=user,
        defaults={'role': 'staff', 'phone': '0000000000'}
    )
    return user


class PaymentIntentCreateView(APIView):
    """Create Stripe PaymentIntent for a booking - no authentication required for guest bookings"""
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        serializer = PaymentIntentCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        booking_id = serializer.validated_data['booking_id']
        customer_email = serializer.validated_data.get('customer_email')
        
        try:
            booking = Booking.objects.get(id=booking_id, deleted_at__isnull=True)
            
            # Check if payment already exists
            existing_payment = Payment.objects.filter(booking=booking).first()
            if existing_payment and existing_payment.status == 'succeeded':
                return Response(
                    {'error': 'Booking is already paid'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Create PaymentIntent
            payment_data = StripePaymentService.create_payment_intent(
                booking=booking,
                customer_email=customer_email
            )
            
            return Response({
                'payment_intent_id': payment_data['payment_intent_id'],
                'client_secret': payment_data['client_secret'],
                'amount_cents': booking.total_price_cents,
                'amount_dollars': booking.total_price_dollars,
                'booking_number': booking.booking_number
            })
            
        except Booking.DoesNotExist:
            return Response(
                {'error': 'Booking not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Error creating payment intent: {str(e)}", exc_info=True)
            return Response(
                {'error': 'Failed to create payment intent'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class PaymentStatusView(APIView):
    """Check payment status by booking UUID — non-guessable, minimal data."""
    permission_classes = [permissions.AllowAny]

    def get(self, request, booking_lookup):
        import uuid as _uuid
        try:
            booking_uuid = _uuid.UUID(str(booking_lookup))
        except ValueError:
            return Response(
                {'error': 'Booking not found'},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            booking = Booking.objects.get(id=booking_uuid, deleted_at__isnull=True)
            payment = Payment.objects.filter(booking=booking).first()

            if not payment:
                return Response({
                    'payment_status': 'not_created',
                    'booking_status': booking.status,
                })

            return Response({
                'payment_status': payment.status,
                'booking_status': booking.status,
            })

        except Booking.DoesNotExist:
            return Response(
                {'error': 'Booking not found'},
                status=status.HTTP_404_NOT_FOUND,
            )


@method_decorator(csrf_exempt, name='dispatch')
class StripeWebhookView(APIView):
    """
    Production webhook handler for Stripe events
    - Verifies webhook signatures
    - Handles payment_intent.succeeded and payment_intent.payment_failed
    - Idempotent (won't process same event twice)
    - Comprehensive logging and audit trail
    """
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        payload = request.body
        sig_header = request.META.get('HTTP_STRIPE_SIGNATURE')
        
        # Verify webhook signature
        try:
            event = stripe.Webhook.construct_event(
                payload, 
                sig_header, 
                settings.STRIPE_WEBHOOK_SECRET
            )
        except ValueError:
            logger.error("Webhook: Invalid payload")
            return Response(
                {'error': 'Invalid payload'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        except stripe.error.SignatureVerificationError:
            logger.error("Webhook: Invalid signature")
            return Response(
                {'error': 'Invalid signature'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Extract event data
        event_id = event['id']
        event_type = event['type']
        
        # Idempotency check - prevent processing same event twice
        cache_key = f'stripe_event_{event_id}'
        if cache.get(cache_key):
            logger.info(f"Webhook: Event {event_id} already processed, skipping")
            return Response({'status': 'already_processed'}, status=status.HTTP_200_OK)
        
        # Mark event as processed (cache for 24 hours)
        cache.set(cache_key, True, timeout=86400)
        
        logger.info(f"Webhook: Processing event {event_id} of type {event_type}")
        
        # Handle different event types
        if event_type == 'payment_intent.succeeded':
            return self._handle_payment_succeeded(event)
        elif event_type == 'payment_intent.payment_failed':
            return self._handle_payment_failed(event)
        else:
            logger.info(f"Webhook: Unhandled event type {event_type}")
            return Response({'status': 'ignored'}, status=status.HTTP_200_OK)
    
    def _handle_payment_succeeded(self, event):
        """Handle successful payment - update Payment and Booking status"""
        payment_intent = event['data']['object']
        payment_intent_id = payment_intent['id']

        try:
            # Find payment record with retry logic to handle race condition
            # where webhook arrives before DB transaction commits
            payment = None
            max_retries = 5
            retry_delays = [0.1, 0.3, 0.5, 1.0, 2.0]  # exponential backoff in seconds

            for attempt in range(max_retries):
                try:
                    payment = Payment.objects.select_related('booking').get(
                        stripe_payment_intent_id=payment_intent_id
                    )
                    break  # Found it, exit retry loop
                except Payment.DoesNotExist:
                    if attempt < max_retries - 1:
                        delay = retry_delays[attempt]
                        logger.info(
                            f"Webhook: Payment not found for {payment_intent_id}, "
                            f"retry {attempt + 1}/{max_retries} in {delay}s"
                        )
                        time.sleep(delay)
                    else:
                        raise  # Re-raise on final attempt

            if not payment:
                raise Payment.DoesNotExist()
            
            # Skip if already processed
            if payment.status == 'succeeded':
                logger.info(f"Webhook: Payment {payment.id} already marked as succeeded")
                return Response({'status': 'already_succeeded'}, status=status.HTTP_200_OK)
            
            # Update payment status
            payment.status = 'succeeded'
            payment.stripe_charge_id = payment_intent.get('latest_charge', '')
            payment.processed_at = timezone.now()
            payment.save()
            
            # Update booking status from pending to paid
            booking = payment.booking
            if booking.status == 'pending':
                old_status = booking.status
                booking.status = 'paid'
                booking.save()
                
                logger.info(
                    f"Webhook: Booking {booking.booking_number} status updated: "
                    f"{old_status} → {booking.status}"
                )
                
                # Create audit log (system action, no user)
                StaffAction.objects.create(
                    staff_user=_get_system_staff_user(),  # ← use system staff user
                    action_type='modify_booking',
                    description=(
                        f"Booking {booking.booking_number} automatically confirmed via Stripe webhook. "
                        f"Payment: ${payment.amount_dollars:.2f}"
                    ),
                    ip_address='127.0.0.1',
                    user_agent='Stripe Webhook',
                    booking_id=booking.id
                )
            
            # Log payment audit
            PaymentAudit.log(
                action='payment_succeeded',
                description=(
                    f"Payment succeeded for booking {booking.booking_number} "
                    f"via Stripe webhook (Event: {event['id']})"
                ),
                payment=payment,
                user=None
            )
            
            logger.info(
                f"Webhook: Successfully processed payment_intent.succeeded for "
                f"booking {booking.booking_number}"
            )
            
            return Response({
                'status': 'success',
                'booking_number': booking.booking_number,
                'booking_status': booking.status
            }, status=status.HTTP_200_OK)
            
        except Payment.DoesNotExist:
            logger.error(
                f"Webhook: Payment not found for payment_intent_id {payment_intent_id}"
            )
            return Response(
                {'error': 'Payment not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(
                f"Webhook: Error processing payment_intent.succeeded: {str(e)}",
                exc_info=True
            )
            return Response(
                {'error': 'Payment processing failed'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _handle_payment_failed(self, event):
        """Handle failed payment - mark as failed, keep booking pending"""
        payment_intent = event['data']['object']
        payment_intent_id = payment_intent['id']

        try:
            # Find payment record with retry logic to handle race condition
            payment = None
            max_retries = 5
            retry_delays = [0.1, 0.3, 0.5, 1.0, 2.0]

            for attempt in range(max_retries):
                try:
                    payment = Payment.objects.select_related('booking').get(
                        stripe_payment_intent_id=payment_intent_id
                    )
                    break
                except Payment.DoesNotExist:
                    if attempt < max_retries - 1:
                        delay = retry_delays[attempt]
                        logger.info(
                            f"Webhook: Payment not found for failed intent {payment_intent_id}, "
                            f"retry {attempt + 1}/{max_retries} in {delay}s"
                        )
                        time.sleep(delay)
                    else:
                        raise

            if not payment:
                raise Payment.DoesNotExist()
            
            # Update payment to failed
            payment.status = 'failed'
            payment.failure_reason = payment_intent.get(
                'last_payment_error', {}
            ).get('message', 'Payment failed')
            payment.save()
            
            # Keep booking as pending so customer can retry
            booking = payment.booking
            if booking.status != 'pending':
                booking.status = 'pending'
                booking.save()
            
            # Log audit
            PaymentAudit.log(
                action='payment_failed',
                description=(
                    f"Payment failed for booking {booking.booking_number}. "
                    f"Reason: {payment.failure_reason}"
                ),
                payment=payment,
                user=None
            )
            
            logger.warning(
                f"Webhook: Payment failed for booking {booking.booking_number}. "
                f"Reason: {payment.failure_reason}"
            )
            
            return Response({
                'status': 'payment_failed',
                'booking_number': booking.booking_number,
                'reason': payment.failure_reason
            }, status=status.HTTP_200_OK)
            
        except Payment.DoesNotExist:
            logger.error(
                f"Webhook: Payment not found for failed payment_intent {payment_intent_id}"
            )
            return Response(
                {'error': 'Payment not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(
                f"Webhook: Error processing payment_intent.payment_failed: {str(e)}",
                exc_info=True
            )
            return Response(
                {'error': 'Payment processing failed'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class MockPaymentConfirmView(APIView):
    """Mock payment confirmation for testing - disable in production"""
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        serializer = PaymentConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        payment_intent_id = serializer.validated_data['payment_intent_id']
        status_value = serializer.validated_data['status']
        
        try:
            if status_value == 'succeeded':
                # Confirm payment (updates Payment record)
                payment = StripePaymentService.confirm_payment(payment_intent_id)
                
                if payment and payment.booking:
                    # Update booking status from pending to paid
                    if payment.booking.status == 'pending':
                        payment.booking.status = 'paid'
                        payment.booking.save()
                        logger.info(f"Mock payment: Booking {payment.booking.booking_number} status updated to 'paid'")
                
                return Response({
                    'message': 'Payment confirmed successfully',
                    'payment': PaymentSerializer(payment).data,
                    'booking_status': payment.booking.status if payment else 'unknown'
                })
            else:
                # Handle failed payment
                payment = Payment.objects.get(stripe_payment_intent_id=payment_intent_id)
                payment.status = 'failed'
                payment.failure_reason = serializer.validated_data.get('failure_reason', 'Payment failed')
                payment.save()
                
                # Keep booking as pending for failed payments
                payment.booking.status = 'pending'
                payment.booking.save()
                
                return Response({
                    'message': 'Payment marked as failed',
                    'payment': PaymentSerializer(payment).data,
                    'booking_status': payment.booking.status
                })
                
        except Payment.DoesNotExist:
            return Response(
                {'error': 'Payment not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Mock payment error: {str(e)}", exc_info=True)
            return Response(
                {'error': 'Payment processing failed'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class PaymentConfirmView(APIView):
    """Confirm payment after Stripe processes it - called from frontend"""
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        payment_intent_id = request.data.get('payment_intent_id')
        
        if not payment_intent_id:
            return Response(
                {'error': 'payment_intent_id is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Service handles payment update, booking status, customer stats
            payment = StripePaymentService.confirm_payment(payment_intent_id)
            
            if not payment:
                return Response(
                    {'error': 'Payment confirmation failed'}, 
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
            return Response({
                'message': 'Payment confirmed successfully',
                'booking_status': payment.booking.status if payment.booking else None,
                'payment_status': payment.status
            })
            
        except Payment.DoesNotExist:
            return Response(
                {'error': 'Payment not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Payment confirm error: {str(e)}", exc_info=True)
            return Response(
                {'error': 'Payment confirmation failed'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# Staff payment management views
class PaymentListView(generics.ListAPIView):
    """List all payments - staff only"""
    serializer_class = PaymentSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        if not hasattr(self.request.user, 'staff_profile'):
            return Payment.objects.none()
        return Payment.objects.all().order_by('-created_at')


class RefundListView(generics.ListAPIView):
    """List all refunds - staff only, optionally filter by booking"""
    serializer_class = RefundSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        if not hasattr(self.request.user, 'staff_profile'):
            return Refund.objects.none()
        
        queryset = Refund.objects.select_related(
            'payment__booking', 'requested_by', 'approved_by'
        ).order_by('-created_at')
        
        # Filter by booking if provided
        booking_id = self.request.query_params.get('booking_id')
        if booking_id:
            queryset = queryset.filter(payment__booking__id=booking_id)
        
        # Filter by payment if provided
        payment_id = self.request.query_params.get('payment_id')
        if payment_id:
            queryset = queryset.filter(payment__id=payment_id)
        
        return queryset


class RefundCreateView(generics.CreateAPIView):
    """Create refund request - staff only"""
    serializer_class = RefundCreateSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def perform_create(self, serializer):
        if not hasattr(self.request.user, 'staff_profile'):
            raise permissions.PermissionDenied('Not a staff account')
        
        serializer.save(requested_by=self.request.user)


class RefundProcessView(APIView):
    """Process refund immediately - staff only (direct refund, no approval)"""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        # Verify staff
        if not hasattr(request.user, 'staff_profile'):
            return Response(
                {'error': 'Not a staff account'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Validate input
        payment_id = request.data.get('payment_id')
        amount_cents = request.data.get('amount_cents')
        reason = request.data.get('reason', 'No reason provided').strip()
        
        if not payment_id or not amount_cents:
            return Response(
                {'error': 'payment_id and amount_cents are required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            amount_cents = int(amount_cents)
            if amount_cents <= 0:
                raise ValueError("Amount must be positive")
        except (ValueError, TypeError):
            return Response(
                {'error': 'Invalid amount_cents'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # REMOVED THE 10 CHARACTER MINIMUM CHECK
        
        try:
            # Get payment
            payment = Payment.objects.select_related('booking').get(id=payment_id)
            
            # Validate payment status
            if payment.status != 'succeeded':
                return Response(
                    {'error': f'Cannot refund payment with status: {payment.status}'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Validate amount
            if amount_cents > payment.amount_cents:
                return Response(
                    {'error': f'Refund amount cannot exceed payment amount (${payment.amount_dollars})'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Check if already refunded
            existing_refunds_total = Refund.objects.filter(
                payment=payment,
                status='completed'
            ).aggregate(total=models.Sum('amount_cents'))['total'] or 0
            
            if existing_refunds_total + amount_cents > payment.amount_cents:
                remaining = payment.amount_cents - existing_refunds_total
                return Response(
                    {'error': f'Only ${remaining/100:.2f} remaining to refund'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Process refund via Stripe
            with transaction.atomic():
                refund = StripePaymentService.create_refund(
                    payment=payment,
                    amount_cents=amount_cents,
                    reason=reason,
                    requested_by_user=request.user
                )
                
                logger.info(
                    f"Refund processed by {request.user.get_full_name()}: "
                    f"${amount_cents/100:.2f} for booking {payment.booking.booking_number}"
                )
            
            # Return success with refund details
            return Response({
                'message': 'Refund processed successfully',
                'refund': RefundSerializer(refund).data
            }, status=status.HTTP_201_CREATED)
            
        except Payment.DoesNotExist:
            return Response(
                {'error': 'Payment not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Refund processing error: {str(e)}", exc_info=True)
            return Response(
                {'error': 'Refund processing failed'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
