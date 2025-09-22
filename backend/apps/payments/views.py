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
    """Handle Stripe webhooks - FIXED to update booking status"""
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
                    # FIXED: Confirm payment AND update booking status
                    payment = StripePaymentService.confirm_payment(payment_intent_id)
                    
                    if payment and payment.booking:
                        # Update booking status from pending to paid
                        if payment.booking.status == 'pending':
                            payment.booking.status = 'paid'
                            payment.booking.save()
                            print(f"✅ Booking {payment.booking.booking_number} status updated to 'paid'")
                        
                        # AUTO-COMPLETE certain booking types (optional - you can remove this)
                        # For now, let's auto-complete all paid bookings to test the flow
                        if payment.booking.status == 'paid':
                            payment.booking.status = 'completed'
                            payment.booking.save()
                            
                            # Update customer stats when booking completed
                            if payment.booking.customer and hasattr(payment.booking.customer, 'customer_profile'):
                                payment.booking.customer.customer_profile.add_booking_stats(payment.booking.total_price_cents)
                                print(f"✅ Updated customer stats for {payment.booking.customer.get_full_name()}: +${payment.booking.total_price_dollars}")
                    
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
                        
                        # Update booking status back to pending
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


class MockPaymentConfirmView(APIView):
    """FIXED Mock payment confirmation - now updates booking status and customer stats"""
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
                    # FIXED: Update booking status from pending to paid
                    if payment.booking.status == 'pending':
                        payment.booking.status = 'paid'
                        payment.booking.save()
                        print(f"✅ Mock payment: Booking {payment.booking.booking_number} status updated to 'paid'")
                    
                    # AUTO-COMPLETE for testing (you can remove this later for manual staff completion)
                    if payment.booking.status == 'paid':
                        payment.booking.status = 'completed'
                        payment.booking.save()
                        print(f"✅ Mock payment: Booking {payment.booking.booking_number} auto-completed")
                        
                        # Update customer stats when booking completed
                        if payment.booking.customer and hasattr(payment.booking.customer, 'customer_profile'):
                            payment.booking.customer.customer_profile.add_booking_stats(payment.booking.total_price_cents)
                            print(f"✅ Mock payment: Updated customer stats for {payment.booking.customer.get_full_name()}: +${payment.booking.total_price_dollars}")
                
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
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# Staff payment management views (existing functionality)
class PaymentListView(generics.ListAPIView):
    """List all payments - staff only"""
    serializer_class = PaymentSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        if not hasattr(self.request.user, 'staff_profile'):
            return Payment.objects.none()
        return Payment.objects.all().order_by('-created_at')


class RefundListView(generics.ListAPIView):
    """List all refunds - staff only"""
    serializer_class = RefundSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        if not hasattr(self.request.user, 'staff_profile'):
            return Refund.objects.none()
        return Refund.objects.all().order_by('-created_at')


class RefundCreateView(generics.CreateAPIView):
    """Create refund request - staff only"""
    serializer_class = RefundCreateSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def perform_create(self, serializer):
        if not hasattr(self.request.user, 'staff_profile'):
            raise permissions.PermissionDenied('Not a staff account')
        
        serializer.save(requested_by=self.request.user)

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
            # Confirm payment and update booking status
            payment = StripePaymentService.confirm_payment(payment_intent_id)
            
            return Response({
                'message': 'Payment confirmed successfully',
                'booking_status': payment.booking.status,
                'payment_status': payment.status
            })
            
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