# backend/apps/payments/services.py
import stripe
import logging
from django.conf import settings
from django.utils import timezone
from decimal import Decimal

from .models import Payment, PaymentAudit
from apps.bookings.models import Booking

logger = logging.getLogger(__name__)

stripe.api_key = settings.STRIPE_SECRET_KEY


class StripePaymentService:
    """Service layer for Stripe payment processing"""
    
    @staticmethod
    def create_payment_intent(booking, customer_email=None):
        """Create Stripe PaymentIntent for a booking"""
        try:
            intent = stripe.PaymentIntent.create(
                amount=int(booking.total_price_cents),
                currency='usd',
                metadata={
                    'booking_id': str(booking.id),
                    'booking_number': booking.booking_number,
                },
                receipt_email=customer_email or (booking.customer.email if hasattr(booking, 'customer') and booking.customer else None),
            )
            
            payment = Payment.objects.create(
                booking=booking,
                customer=booking.customer if hasattr(booking, 'customer') and booking.customer else None,
                amount_cents=booking.total_price_cents,
                stripe_payment_intent_id=intent.id,
                status='pending'
            )
            
            PaymentAudit.log(
                action='payment_created',
                description=f'PaymentIntent created for booking {booking.booking_number}',
                payment=payment,
                user=None
            )
            
            return {
                'payment': payment,
                'client_secret': intent.client_secret,
                'payment_intent_id': intent.id
            }
            
        except stripe.error.StripeError as e:
            raise Exception(f"Stripe error: {str(e)}")
        except Exception as e:
            raise Exception(f"Failed to create PaymentIntent: {str(e)}")
    
    @staticmethod
    def confirm_payment(payment_intent_id):
        """Verify payment with Stripe and update records - CRITICAL: Updates customer stats"""
        try:
            intent = stripe.PaymentIntent.retrieve(payment_intent_id)
            
            payment = Payment.objects.get(stripe_payment_intent_id=payment_intent_id)
            
            if intent.status == 'succeeded':
                payment.status = 'succeeded'
                payment.stripe_charge_id = intent.latest_charge if hasattr(intent, 'latest_charge') else ''
                payment.processed_at = timezone.now()
                payment.save()
                
                booking = payment.booking
                if booking.status == 'pending':
                    booking.status = 'paid'
                    booking.save()
                
                try:
                    if booking.customer and hasattr(booking.customer, 'customer_profile'):
                        booking.customer.customer_profile.add_booking_stats(
                            booking.total_price_cents
                        )
                        logger.info(f"Updated customer stats: {booking.customer.get_full_name()} - +${booking.total_price_dollars}")
                except Exception as stats_error:
                    logger.warning(f"Failed to update customer stats: {stats_error}")
                
                PaymentAudit.log(
                    action='payment_succeeded',
                    description=f'Payment confirmed for booking {booking.booking_number}',
                    payment=payment,
                    user=None
                )
                
                return payment
            else:
                payment.status = 'failed'
                payment.failure_reason = f"Payment status: {intent.status}"
                payment.save()
                raise Exception(f"Payment not successful: {intent.status}")
            
        except Payment.DoesNotExist:
            raise Exception("Payment not found")
        except stripe.error.StripeError as e:
            raise Exception(f"Stripe error: {str(e)}")
    
    @staticmethod
    def create_refund(payment, amount_cents, reason, requested_by_user):
        """Create refund for a payment"""
        from .models import Refund
        
        try:
            refund = stripe.Refund.create(
                payment_intent=payment.stripe_payment_intent_id,
                amount=amount_cents,
                reason='requested_by_customer',
            )
            
            refund_record = Refund.objects.create(
                payment=payment,
                amount_cents=amount_cents,
                reason=reason,
                requested_by=requested_by_user,
                stripe_refund_id=refund.id,
                status='completed'
            )
            
            payment.status = 'refunded'
            payment.save()
            
            PaymentAudit.log(
                action='refund_completed',
                description=f'Refund completed for payment {payment.id}',
                payment=payment,
                refund=refund_record,
                user=requested_by_user
            )
            
            return refund_record
            
        except stripe.error.StripeError as e:
            raise Exception(f"Stripe refund error: {str(e)}")