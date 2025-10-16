# backend/apps/bookings/tests/test_tasks.py
import pytest
from django.utils import timezone
from datetime import timedelta
from django.core import mail
from apps.bookings.models import Booking, Address, GuestCheckout
from apps.bookings.tasks import send_booking_reminders


@pytest.fixture
def test_addresses(db):
    """Create pickup and delivery addresses"""
    pickup = Address.objects.create(
        address_line_1='123 Pickup St',
        city='New York',
        state='NY',
        zip_code='10001'
    )
    delivery = Address.objects.create(
        address_line_1='456 Delivery Ave',
        city='New York',
        state='NY',
        zip_code='10002'
    )
    return pickup, delivery


@pytest.mark.django_db
class TestBookingReminderTask:
    """Test Celery reminder task"""
    
    def setup_method(self):
        mail.outbox = []
        Booking.objects.all().delete()
    
    def test_sends_reminders_for_tomorrow_bookings(self, test_addresses):
        """Test reminders sent for bookings tomorrow"""
        pickup, delivery = test_addresses
        tomorrow = timezone.now().date() + timedelta(days=1)
        
        guest = GuestCheckout.objects.create(
            first_name='Test',
            last_name='User',
            email='test@example.com',
            phone='5551234567'
        )
        
        booking = Booking.objects.create(
            guest_checkout=guest,
            service_type='mini_move',
            pickup_address=pickup,
            delivery_address=delivery,
            pickup_date=tomorrow,
            total_price_cents=99500,
            status='confirmed',
            reminder_sent_at=None
        )
        
        result = send_booking_reminders()
        
        assert result['sent'] == 1
        assert result['failed'] == 0
        assert len(mail.outbox) == 1
        
        booking.refresh_from_db()
        assert booking.reminder_sent_at is not None
    
    def test_no_reminders_for_past_bookings(self, test_addresses):
        """Test no reminders sent for past bookings"""
        pickup, delivery = test_addresses
        yesterday = timezone.now().date() - timedelta(days=1)
        
        guest = GuestCheckout.objects.create(
            first_name='Test',
            last_name='User',
            email='test@example.com',
            phone='5551234567'
        )
        
        Booking.objects.create(
            guest_checkout=guest,
            service_type='mini_move',
            pickup_address=pickup,
            delivery_address=delivery,
            pickup_date=yesterday,
            total_price_cents=99500,
            status='confirmed',
            reminder_sent_at=None
        )
        
        result = send_booking_reminders()
        
        assert result['sent'] == 0
        assert len(mail.outbox) == 0
    
    def test_no_duplicate_reminders(self, test_addresses):
        """Test reminder not sent twice"""
        pickup, delivery = test_addresses
        tomorrow = timezone.now().date() + timedelta(days=1)
        
        guest = GuestCheckout.objects.create(
            first_name='Test',
            last_name='User',
            email='test@example.com',
            phone='5551234567'
        )
        
        Booking.objects.create(
            guest_checkout=guest,
            service_type='mini_move',
            pickup_address=pickup,
            delivery_address=delivery,
            pickup_date=tomorrow,
            total_price_cents=99500,
            status='confirmed',
            reminder_sent_at=timezone.now()
        )
        
        result = send_booking_reminders()
        
        assert result['sent'] == 0
        assert len(mail.outbox) == 0
    
    def test_only_confirmed_bookings_get_reminders(self, test_addresses):
        """Test only confirmed/paid bookings get reminders"""
        pickup, delivery = test_addresses
        tomorrow = timezone.now().date() + timedelta(days=1)
        
        # Cancelled booking
        guest1 = GuestCheckout.objects.create(
            first_name='Cancelled',
            last_name='User',
            email='cancelled@example.com',
            phone='5551234567'
        )
        
        Booking.objects.create(
            guest_checkout=guest1,
            service_type='mini_move',
            pickup_address=pickup,
            delivery_address=delivery,
            pickup_date=tomorrow,
            total_price_cents=99500,
            status='cancelled',
            reminder_sent_at=None
        )
        
        # Confirmed booking
        guest2 = GuestCheckout.objects.create(
            first_name='Confirmed',
            last_name='User',
            email='confirmed@example.com',
            phone='5559876543'
        )
        
        Booking.objects.create(
            guest_checkout=guest2,
            service_type='mini_move',
            pickup_address=pickup,
            delivery_address=delivery,
            pickup_date=tomorrow,
            total_price_cents=99500,
            status='confirmed',
            reminder_sent_at=None
        )
        
        result = send_booking_reminders()
        
        assert result['sent'] == 1
        assert len(mail.outbox) == 1
        assert mail.outbox[0].to == ['confirmed@example.com']
    
    def test_handles_multiple_bookings(self, test_addresses):
        """Test task handles multiple bookings correctly"""
        pickup, delivery = test_addresses
        tomorrow = timezone.now().date() + timedelta(days=1)
        
        for i in range(3):
            guest = GuestCheckout.objects.create(
                first_name='Test',
                last_name=f'User{i}',
                email=f'test{i}@example.com',
                phone='5551234567'
            )
            
            Booking.objects.create(
                guest_checkout=guest,
                service_type='mini_move',
                pickup_address=pickup,
                delivery_address=delivery,
                pickup_date=tomorrow,
                total_price_cents=99500,
                status='confirmed',
                reminder_sent_at=None
            )
        
        result = send_booking_reminders()
        
        assert result['sent'] == 3
        assert len(mail.outbox) == 3