import stripe
from django.conf import settings
from decimal import Decimal
from .models import Payment, PaymentAudit
from apps.bookings.models import Booking

# Mock Stripe for development - replace with real keys in production
stripe.api_key = "sk_test_mock_key_for_development"


class StripePaymentService:
    """Service layer for Stripe payment processing"""
    
    @staticmethod
    def create_payment_intent(booking, customer_email=None):
        """Create Stripe PaymentIntent for a booking"""
        try:
            # Mock PaymentIntent creation for development
            # In production, this would be: stripe.PaymentIntent.create(...)
            mock_intent = {
                'id': f'pi_mock_{booking.id.hex[:16]}',
                'client_secret': f'pi_mock_{booking.id.hex[:16]}_secret_mock',
                'amount': int(booking.total_price_cents),
                'currency': 'usd',
                'status': 'requires_payment_method'
            }
            
            # Create Payment record
            payment = Payment.objects.create(
                booking=booking,
                customer=booking.customer if hasattr(booking, 'customer') else None,
                amount_cents=booking.total_price_cents,
                stripe_payment_intent_id=mock_intent['id'],
                status='pending'
            )
            
            # Log payment creation
            PaymentAudit.log(
                action='payment_created',
                description=f'PaymentIntent created for booking {booking.booking_number}',
                payment=payment,
                user=None  # System action
            )
            
            return {
                'payment': payment,
                'client_secret': mock_intent['client_secret'],
                'payment_intent_id': mock_intent['id']
            }
            
        except Exception as e:
            # In production, this would catch actual Stripe exceptions
            raise Exception(f"Failed to create PaymentIntent: {str(e)}")
    
    @staticmethod
    def confirm_payment(payment_intent_id):
        """Mock payment confirmation - in production would verify with Stripe"""
        try:
            payment = Payment.objects.get(stripe_payment_intent_id=payment_intent_id)
            
            # Mock successful payment
            payment.status = 'succeeded'
            payment.stripe_charge_id = f'ch_mock_{payment.id.hex[:16]}'
            payment.save()
            
            # Update booking status
            booking = payment.booking
            booking.status = 'paid'
            booking.save()
            
            # Log payment success
            PaymentAudit.log(
                action='payment_succeeded',
                description=f'Payment confirmed for booking {booking.booking_number}',
                payment=payment,
                user=None
            )
            
            return payment
            
        except Payment.DoesNotExist:
            raise Exception("Payment not found")
    
    @staticmethod
    def create_refund(payment, amount_cents, reason, requested_by_user):
        """Create refund for a payment"""
        from .models import Refund
        
        try:
            # Mock refund creation
            mock_refund_id = f're_mock_{payment.id.hex[:16]}'
            
            refund = Refund.objects.create(
                payment=payment,
                amount_cents=amount_cents,
                reason=reason,
                requested_by=requested_by_user,
                stripe_refund_id=mock_refund_id,
                status='requested'
            )
            
            # Log refund request
            PaymentAudit.log(
                action='refund_requested',
                description=f'Refund requested for payment {payment.id}',
                payment=payment,
                refund=refund,
                user=requested_by_user
            )
            
            return refund
            
        except Exception as e:
            raise Exception(f"Failed to create refund: {str(e)}")