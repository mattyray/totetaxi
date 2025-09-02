from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.http import HttpResponse
from .models import Payment, Refund
from .serializers import (
    PaymentIntentCreateSerializer,
    PaymentSerializer,
    PaymentConfirmSerializer,
    RefundCreateSerializer,
    RefundSerializer
)
from .services import StripePaymentService
from apps.bookings.models import Booking


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
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class PaymentStatusView(APIView):
    """Check payment status by booking number - no authentication required"""
    permission_classes = [permissions.AllowAny]
    
    def get(self, request, booking_number):
        try:
            booking = Booking.objects.get(booking_number=booking_number, deleted_at__isnull=True)
            payment = Payment.objects.filter(booking=booking).first()
            
            if not payment:
                return Response({
                    'booking_number': booking_number,
                    'payment_status': 'not_created',
                    'booking_status': booking.status
                })
            
            return Response({
                'booking_number': booking_number,
                'payment_status': payment.status,
                'booking_status': booking.status,
                'amount_dollars': payment.amount_dollars,
                'processed_at': payment.processed_at
            })
            
        except Booking.DoesNotExist:
            return Response(
                {'error': 'Booking not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )


@method_decorator(csrf_exempt, name='dispatch')
class StripeWebhookView(APIView):
    """Handle Stripe webhooks - no authentication required"""
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        # In production, you'd verify the webhook signature here
        # For development, we'll mock the webhook processing
        
        try:
            event_type = request.data.get('type', '')
            
            if event_type == 'payment_intent.succeeded':
                payment_intent = request.data.get('data', {}).get('object', {})
                payment_intent_id = payment_intent.get('id')
                
                if payment_intent_id:
                    # Confirm payment
                    payment = StripePaymentService.confirm_payment(payment_intent_id)
                    return Response({'status': 'success'})
            
            elif event_type == 'payment_intent.payment_failed':
                payment_intent = request.data.get('data', {}).get('object', {})
                payment_intent_id = payment_intent.get('id')
                
                if payment_intent_id:
                    try:
                        payment = Payment.objects.get(stripe_payment_intent_id=payment_intent_id)
                        payment.status = 'failed'
                        payment.failure_reason = payment_intent.get('last_payment_error', {}).get('message', 'Payment failed')
                        payment.save()
                        
                        # Update booking status
                        payment.booking.status = 'pending'
                        payment.booking.save()
                        
                    except Payment.DoesNotExist:
                        pass
            
            return Response({'status': 'received'})
            
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )


# Mock payment confirmation for testing (remove in production)
class MockPaymentConfirmView(APIView):
    """Mock payment confirmation for testing - no authentication required"""
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        serializer = PaymentConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        payment_intent_id = serializer.validated_data['payment_intent_id']
        status_value = serializer.validated_data['status']
        
        try:
            if status_value == 'succeeded':
                payment = StripePaymentService.confirm_payment(payment_intent_id)
                return Response({
                    'message': 'Payment confirmed successfully',
                    'payment': PaymentSerializer(payment).data
                })
            else:
                # Handle failed payment
                payment = Payment.objects.get(stripe_payment_intent_id=payment_intent_id)
                payment.status = 'failed'
                payment.failure_reason = serializer.validated_data.get('failure_reason', 'Payment failed')
                payment.save()
                
                return Response({
                    'message': 'Payment marked as failed',
                    'payment': PaymentSerializer(payment).data
                })
                
        except Payment.DoesNotExist:
            return Response(
                {'error': 'Payment not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )


class PaymentListView(generics.ListAPIView):
    """List payments - for authenticated staff only"""
    serializer_class = PaymentSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Payment.objects.all().order_by('-created_at')


class RefundCreateView(APIView):
    """Create refund request - for authenticated staff only"""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        serializer = RefundCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        payment_id = serializer.validated_data['payment_id']
        amount_cents = serializer.validated_data['amount_cents']
        reason = serializer.validated_data['reason']
        
        try:
            payment = Payment.objects.get(id=payment_id)
            refund = StripePaymentService.create_refund(
                payment=payment,
                amount_cents=amount_cents,
                reason=reason,
                requested_by_user=request.user
            )
            
            return Response({
                'message': 'Refund request created',
                'refund': RefundSerializer(refund).data
            }, status=status.HTTP_201_CREATED)
            
        except Payment.DoesNotExist:
            return Response(
                {'error': 'Payment not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class RefundListView(generics.ListAPIView):
    """List refunds - for authenticated staff only"""
    serializer_class = RefundSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Refund.objects.all().order_by('-created_at')