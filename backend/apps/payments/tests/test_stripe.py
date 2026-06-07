# backend/apps/payments/tests/test_stripe.py
import pytest
from unittest.mock import patch, Mock
from rest_framework.test import APIClient
from django.contrib.auth.models import User
from django.core.cache import cache
from apps.customers.models import CustomerProfile
from apps.payments.models import Payment
from apps.bookings.models import Booking, Address, GuestCheckout
from apps.services.models import MiniMovePackage
from django.utils import timezone
from datetime import timedelta
from django.test import override_settings


@pytest.fixture
def test_booking(db):
    """Create test booking"""
    pickup = Address.objects.create(
        address_line_1='123 Test St',
        city='New York',
        state='NY',
        zip_code='10001'
    )
    delivery = Address.objects.create(
        address_line_1='456 Test Ave',
        city='New York',
        state='NY',
        zip_code='10002'
    )
    
    package, _ = MiniMovePackage.objects.get_or_create(
        package_type='petite',
        defaults={
            'name': 'Petite',
            'base_price_cents': 99500,
            'max_items': 15,
            'is_active': True
        }
    )
    
    guest = GuestCheckout.objects.create(
        first_name='Test',
        last_name='User',
        email='test@example.com',
        phone='5551234567'
    )
    
    booking = Booking.objects.create(
        guest_checkout=guest,
        service_type='mini_move',
        mini_move_package=package,
        pickup_address=pickup,
        delivery_address=delivery,
        pickup_date=timezone.now().date() + timedelta(days=2),
        status='pending'
    )
    
    return booking


@pytest.mark.django_db
class TestPaymentIntents:
    """Test payment intent creation"""
    
    @patch('stripe.PaymentIntent.create')
    def test_create_payment_intent_guest(self, mock_stripe):
        """Test creating payment intent for guest booking"""
        client = APIClient()
        
        # Get or create package
        package, _ = MiniMovePackage.objects.get_or_create(
            package_type='petite',
            defaults={
                'name': 'Petite',
                'base_price_cents': 99500,
                'max_items': 15,
                'is_active': True
            }
        )
        
        mock_stripe.return_value = Mock(
            id='pi_test_123',
            client_secret='pi_test_123_secret',
            amount=99500
        )
        
        response = client.post('/api/public/create-payment-intent/', {
            'service_type': 'mini_move',
            'mini_move_package_id': str(package.id),
            'pickup_date': (timezone.now().date() + timedelta(days=2)).isoformat(),
            'first_name': 'Guest',
            'last_name': 'User',
            'email': 'guest@example.com',
            'phone': '5559876543'
        }, format='json')
        
        assert response.status_code == 200
        assert 'client_secret' in response.data
        assert 'payment_intent_id' in response.data
        
        mock_stripe.assert_called_once()

# backend/apps/payments/test# backend/apps/payments/tests/test_stripe.py
# backend/apps/payments/tests/test_stripe.py

@pytest.mark.django_db
class TestStripeWebhooks:
    """Test Stripe webhook handling"""

    def setup_method(self):
        cache.clear()

    @patch('stripe.Webhook.construct_event')
    @patch('apps.logistics.models.create_onfleet_tasks_on_payment')  # ← Mock the signal
    def test_payment_succeeded_webhook(self, mock_signal, mock_construct, test_booking, settings):
        """Test handling payment_intent.succeeded webhook"""
        client = APIClient()
        
        # Mock signal to do nothing
        mock_signal.return_value = None
        
        # Create payment record
        payment = Payment.objects.create(
            booking=test_booking,
            stripe_payment_intent_id='pi_test_123',
            amount_cents=99500,
            status='processing'
        )
        
        # Mock webhook event
        mock_construct.return_value = {
            'id': 'evt_test_123',
            'type': 'payment_intent.succeeded',
            'data': {
                'object': {
                    'id': 'pi_test_123',
                    'latest_charge': 'ch_test_456',
                    'amount': 99500
                }
            }
        }
        
        response = client.post('/api/payments/webhook/', 
            data={},
            content_type='application/json',
            HTTP_STRIPE_SIGNATURE='test_signature'
        )
        
        assert response.status_code == 200
        
        # Verify payment updated
        payment.refresh_from_db()
        assert payment.status == 'succeeded'
        
        # Verify booking updated
        test_booking.refresh_from_db()
        assert test_booking.status == 'paid'

    @patch('stripe.Webhook.construct_event')
    def test_webhook_payment_not_found_returns_200(self, mock_construct):
        """M10: Webhook should return 200 even when Payment record not found."""
        client = APIClient()

        mock_construct.return_value = {
            'id': 'evt_not_found_test',
            'type': 'payment_intent.succeeded',
            'data': {
                'object': {
                    'id': 'pi_nonexistent_999',
                    'latest_charge': 'ch_test',
                    'amount': 99500,
                }
            }
        }

        response = client.post(
            '/api/payments/webhook/',
            data={},
            content_type='application/json',
            HTTP_STRIPE_SIGNATURE='test_signature',
        )

        # Must return 200 to prevent Stripe retries
        assert response.status_code == 200

    @patch('stripe.Webhook.construct_event')
    def test_webhook_failed_payment_not_found_returns_200(self, mock_construct):
        """M10: Failed payment webhook should also return 200 when Payment not found."""
        client = APIClient()

        mock_construct.return_value = {
            'id': 'evt_failed_not_found',
            'type': 'payment_intent.payment_failed',
            'data': {
                'object': {
                    'id': 'pi_nonexistent_888',
                    'last_payment_error': {'message': 'Card declined'},
                }
            }
        }

        response = client.post(
            '/api/payments/webhook/',
            data={},
            content_type='application/json',
            HTTP_STRIPE_SIGNATURE='test_signature',
        )

        assert response.status_code == 200


# ============================================================
# H7: Celery webhook task tests
# ============================================================

@pytest.mark.django_db
class TestWebhookCeleryTasks:
    """H7: Webhook processing moved to Celery tasks."""

    def setup_method(self):
        cache.clear()

    def test_webhook_returns_200_immediately(self, test_booking):
        """Webhook should return 200 right away (task runs async)."""
        client = APIClient()
        Payment.objects.create(
            booking=test_booking,
            stripe_payment_intent_id='pi_celery_test',
            amount_cents=99500,
            status='pending',
        )

        with patch('stripe.Webhook.construct_event') as mock_construct:
            mock_construct.return_value = {
                'id': 'evt_celery_200',
                'type': 'payment_intent.succeeded',
                'data': {
                    'object': {
                        'id': 'pi_celery_test',
                        'latest_charge': 'ch_celery',
                        'amount': 99500,
                    }
                },
            }
            response = client.post(
                '/api/payments/webhook/',
                data={},
                content_type='application/json',
                HTTP_STRIPE_SIGNATURE='test_signature',
            )

        assert response.status_code == 200
        assert response.data['status'] == 'processing'

    @patch('apps.logistics.models.create_onfleet_tasks_on_payment')
    def test_payment_succeeded_task_processes_payment(self, mock_signal, test_booking):
        """Task should update payment and booking status."""
        from apps.payments.tasks import process_payment_succeeded

        mock_signal.return_value = None
        payment = Payment.objects.create(
            booking=test_booking,
            stripe_payment_intent_id='pi_task_succeed',
            amount_cents=99500,
            status='pending',
        )

        event_data = {
            'id': 'evt_task_test',
            'type': 'payment_intent.succeeded',
            'data': {
                'object': {
                    'id': 'pi_task_succeed',
                    'latest_charge': 'ch_task',
                    'amount': 99500,
                }
            },
        }

        result = process_payment_succeeded(event_data)
        assert result['status'] == 'success'

        payment.refresh_from_db()
        assert payment.status == 'succeeded'

        test_booking.refresh_from_db()
        assert test_booking.status == 'paid'

    @patch('apps.logistics.models.create_onfleet_tasks_on_payment')
    def test_payment_failed_task_processes_payment(self, mock_signal, test_booking):
        """Failed payment task should mark payment as failed."""
        from apps.payments.tasks import process_payment_failed

        mock_signal.return_value = None
        payment = Payment.objects.create(
            booking=test_booking,
            stripe_payment_intent_id='pi_task_fail',
            amount_cents=99500,
            status='pending',
        )

        event_data = {
            'id': 'evt_fail_test',
            'type': 'payment_intent.payment_failed',
            'data': {
                'object': {
                    'id': 'pi_task_fail',
                    'last_payment_error': {'message': 'Insufficient funds'},
                }
            },
        }

        result = process_payment_failed(event_data)
        assert result['status'] == 'payment_failed'

        payment.refresh_from_db()
        assert payment.status == 'failed'
        assert 'Insufficient funds' in payment.failure_reason

    def test_payment_succeeded_task_retries_on_missing(self, db):
        """Task should retry when an APP payment's record doesn't exist yet.

        The booking-app metadata (booking_token/service_type) marks this as a
        wizard payment, so the task waits for the booking-creation flow to create
        the Payment record rather than giving up immediately.
        """
        from apps.payments.tasks import process_payment_succeeded
        from celery.exceptions import Retry

        event_data = {
            'id': 'evt_retry_test',
            'type': 'payment_intent.succeeded',
            'data': {
                'object': {
                    'id': 'pi_does_not_exist',
                    'latest_charge': 'ch_none',
                    'amount': 99500,
                    'metadata': {'booking_token': 'tok_abc', 'service_type': 'mini_move'},
                }
            },
        }

        with pytest.raises(Retry):
            process_payment_succeeded(event_data)

    def test_payment_succeeded_task_ignores_non_app_payment(self, db):
        """INC-003: a PI with no booking-app metadata (e.g. a Stripe Invoice or
        manual charge) must NOT retry or raise the orphaned-payment alert."""
        from apps.payments.tasks import process_payment_succeeded

        event_data = {
            'id': 'evt_invoice_test',
            'type': 'payment_intent.succeeded',
            'data': {
                'object': {
                    'id': 'pi_invoice_no_metadata',
                    'latest_charge': 'ch_inv',
                    'amount': 16331,
                    'metadata': {},
                }
            },
        }

        # Should return cleanly (no Retry raised, no orphan alert)
        result = process_payment_succeeded(event_data)
        assert result['status'] == 'ignored_non_app'

# ============================================================
# INC-003: Orphan alert email end-to-end
# ============================================================

@pytest.mark.django_db
class TestOrphanAlertEmail:
    """Verify the succeeded-orphan alert actually builds recipients and sends."""

    def setup_method(self):
        cache.clear()

    @override_settings(
        EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend',
        BOOKING_EMAIL_BCC=['ops@totetaxi.com', 'admin@totetaxi.com'],
        DEFAULT_FROM_EMAIL='Tote Taxi <noreply@totetaxi.com>',
    )
    @patch('apps.payments.tasks.stripe.PaymentIntent.retrieve')
    def test_alert_sends_email_with_list_bcc(self, mock_retrieve):
        """A succeeded Payment with no booking, aged into the window, emails the
        BCC list. Regression guard: BOOKING_EMAIL_BCC is a list, not a string."""
        from apps.payments.tasks import alert_succeeded_orphans
        from apps.payments.models import PaymentAudit
        from django.core import mail

        mock_retrieve.return_value = {
            'metadata': {'customer_email': 'orphan@example.com', 'service_type': 'mini_move'}
        }

        p = Payment.objects.create(
            amount_cents=99500,
            stripe_payment_intent_id='pi_orphan_alert_test',
            status='succeeded',
        )
        # Backdate into the 10-min–48-h alert window (bypass auto_now_add)
        Payment.objects.filter(id=p.id).update(
            created_at=timezone.now() - timedelta(minutes=20)
        )

        result = alert_succeeded_orphans()

        assert result['alerted'] == 1
        assert result['email_sent'] is True
        assert len(mail.outbox) == 1
        assert set(mail.outbox[0].recipients()) == {'ops@totetaxi.com', 'admin@totetaxi.com'}
        assert PaymentAudit.objects.filter(action='orphan_alert_sent', payment=p).exists()

    @override_settings(
        EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend',
        BOOKING_EMAIL_BCC=['ops@totetaxi.com'],
    )
    @patch('apps.payments.tasks.stripe.PaymentIntent.retrieve')
    def test_alert_no_op_when_no_orphans(self, mock_retrieve):
        """No succeeded orphans in window → no email, clean return."""
        from apps.payments.tasks import alert_succeeded_orphans
        from django.core import mail

        result = alert_succeeded_orphans()
        assert result['alerted'] == 0
        assert len(mail.outbox) == 0
