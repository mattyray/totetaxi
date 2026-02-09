# apps/payments/tests/test_refunds.py
"""
Test refund processing
CRITICAL: Refund bugs = customer disputes + lost trust
"""
import pytest
from unittest.mock import patch, MagicMock
from datetime import date, timedelta
from django.test import TestCase
from django.contrib.auth.models import User

from apps.payments.services import StripePaymentService
from apps.payments.models import Payment, Refund, PaymentAudit
from apps.bookings.models import Booking, Address, GuestCheckout
from apps.services.models import MiniMovePackage


@pytest.mark.django_db
class TestRefundProcessing(TestCase):
    """Test refund creation and processing"""
    
    def setUp(self):
        """Create paid booking with successful payment"""
        self.package = MiniMovePackage.objects.create(
            package_type='petite',
            name='Petite Move',
            base_price_cents=15000,
            max_items=10,
            max_weight_per_item_lbs=50,
            is_active=True
        )
        
        self.guest = GuestCheckout.objects.create(
            first_name="Test",
            last_name="Customer",
            email="test@totetaxi.com",
            phone="212-555-0100"
        )
        
        self.pickup = Address.objects.create(
            address_line_1="123 Main St",
            city="New York",
            state="NY",
            zip_code="10001"
        )
        
        self.delivery = Address.objects.create(
            address_line_1="456 Park Ave",
            city="New York",
            state="NY",
            zip_code="10002"
        )
        
        self.booking = Booking.objects.create(
            service_type='mini_move',
            mini_move_package=self.package,
            guest_checkout=self.guest,
            pickup_address=self.pickup,
            delivery_address=self.delivery,
            pickup_date=date.today() + timedelta(days=7),
            pickup_time='morning',
            status='paid'
        )
        
        # Create successful payment
        self.payment = Payment.objects.create(
            booking=self.booking,
            amount_cents=15000,
            stripe_payment_intent_id='pi_paid_test',
            stripe_charge_id='ch_paid_test',
            status='succeeded'
        )
        
        # Create staff user for refund requests
        self.staff_user = User.objects.create_user(
            username='staff',
            email='staff@totetaxi.com',
            password='staffpass123'
        )
    
    @patch('stripe.Refund.create')
    def test_full_refund_processes_correctly(self, mock_refund_create):
        """Test full refund via Stripe"""
        # Mock Stripe refund response
        mock_refund_create.return_value = MagicMock(
            id='re_test123',
            amount=15000,
            status='succeeded'
        )
        
        # Process refund
        refund = StripePaymentService.create_refund(
            payment=self.payment,
            amount_cents=15000,
            reason='Customer requested cancellation',
            requested_by_user=self.staff_user
        )
        
        # Verify Stripe was called correctly
        mock_refund_create.assert_called_once()
        call_kwargs = mock_refund_create.call_args.kwargs
        assert call_kwargs['payment_intent'] == 'pi_paid_test'
        assert call_kwargs['amount'] == 15000
        assert call_kwargs['reason'] == 'requested_by_customer'
        
        # Verify refund record created
        assert refund.amount_cents == 15000
        assert refund.stripe_refund_id == 're_test123'
        assert refund.status == 'completed'
        assert refund.requested_by == self.staff_user
        
        # Verify payment marked as refunded
        self.payment.refresh_from_db()
        assert self.payment.status == 'refunded'
        
        # Verify audit log
        assert PaymentAudit.objects.filter(
            refund=refund,
            action='refund_completed'
        ).exists()
        
        print(f"✅ Full refund processed: ${refund.amount_dollars}")
    
    @patch('stripe.Refund.create')
    def test_partial_refund_processes_correctly(self, mock_refund_create):
        """Test partial refund (e.g., 50% refund)"""
        mock_refund_create.return_value = MagicMock(
            id='re_partial',
            amount=7500,
            status='succeeded'
        )
        
        # Process partial refund (50%)
        refund = StripePaymentService.create_refund(
            payment=self.payment,
            amount_cents=7500,
            reason='Partial service provided',
            requested_by_user=self.staff_user
        )
        
        # Verify correct amount refunded
        assert refund.amount_cents == 7500
        assert refund.amount_dollars == 75.0

        # Verify payment marked as partially refunded (not fully refunded)
        self.payment.refresh_from_db()
        assert self.payment.status == 'partially_refunded'

        print(f"✅ Partial refund processed: ${refund.amount_dollars}")
    
    @patch('stripe.Refund.create')
    def test_refund_reason_stored_correctly(self, mock_refund_create):
        """Test that refund reason is stored"""
        mock_refund_create.return_value = MagicMock(
            id='re_reason_test',
            amount=15000,
            status='succeeded'
        )
        
        reason = "Service cancelled due to weather conditions"
        
        refund = StripePaymentService.create_refund(
            payment=self.payment,
            amount_cents=15000,
            reason=reason,
            requested_by_user=self.staff_user
        )
        
        assert refund.reason == reason
        print(f"✅ Refund reason stored: {refund.reason}")
    
    @patch('stripe.Refund.create')
    def test_stripe_error_handled_gracefully(self, mock_refund_create):
        """Test that Stripe errors are handled"""
        import stripe
        
        # Mock Stripe error
        mock_refund_create.side_effect = stripe.error.CardError(
            message='Insufficient funds',
            param='amount',
            code='insufficient_funds'
        )
        
        # Attempt refund (should raise exception with Stripe error)
        with pytest.raises(Exception) as exc_info:
            StripePaymentService.create_refund(
                payment=self.payment,
                amount_cents=15000,
                reason='Test refund',
                requested_by_user=self.staff_user
            )
        
        assert 'Stripe refund error' in str(exc_info.value)
        
        # Verify no refund record created
        assert not Refund.objects.filter(payment=self.payment).exists()
        
        # Verify payment status unchanged
        self.payment.refresh_from_db()
        assert self.payment.status == 'succeeded'
        
        print("✅ Stripe error handled correctly")