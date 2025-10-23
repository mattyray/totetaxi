# backend/apps/customers/tests/test_emails.py
import pytest
from django.core import mail
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta
from apps.customers.emails import (
    send_welcome_email,
    send_password_reset_email,
    send_email_verification,
    send_booking_confirmation_email,
    send_booking_status_update_email,
    send_booking_reminder_email
)
from apps.customers.models import CustomerProfile, EmailVerificationToken, PasswordResetToken
from apps.bookings.models import Booking, Address, GuestCheckout
from unittest.mock import patch


@pytest.fixture
def test_user(db):
    """Create test user with customer profile"""
    user = User.objects.create_user(
        username='testuser',
        email='test@example.com',
        password='testpass123',
        first_name='Test',
        last_name='User'
    )
    CustomerProfile.objects.create(
        user=user,
        phone='5551234567'
    )
    return user


@pytest.fixture
def test_address(db):
    """Create test address"""
    return Address.objects.create(
        address_line_1='123 Test St',
        city='New York',
        state='NY',
        zip_code='10001'
    )


@pytest.fixture
def test_booking_with_guest(db, test_address):
    """Create test booking with guest checkout"""
    # Create second address for delivery
    delivery_address = Address.objects.create(
        address_line_1='456 Delivery Ave',
        city='New York',
        state='NY',
        zip_code='10002'
    )
    
    # Create guest checkout
    guest = GuestCheckout.objects.create(
        first_name='Guest',
        last_name='User',
        email='guest@example.com',
        phone='5559876543'
    )
    
    # Create booking
    booking = Booking.objects.create(
        guest_checkout=guest,
        service_type='mini_move',
        pickup_address=test_address,
        delivery_address=delivery_address,
        pickup_date=timezone.now().date() + timedelta(days=1),
        total_price_cents=99500,
        status='confirmed'
    )
    return booking


@pytest.mark.django_db
class TestEmailFunctions:
    """Test email sending functions"""
    
    def setup_method(self):
        """Clear mail outbox before each test"""
        mail.outbox = []
    
    def test_welcome_email_sent(self, test_user):
        """Test welcome email is sent with correct content"""
        result = send_welcome_email(test_user)
        
        assert result is True
        assert len(mail.outbox) == 1
        
        email = mail.outbox[0]
        assert email.subject == 'Welcome to Tote Taxi!'
        assert email.to == ['test@example.com']
        assert 'Test User' in email.body or 'test@example.com' in email.body
        assert 'Tote Taxi' in email.body
    
    def test_welcome_email_handles_no_name(self, db):
        """Test welcome email works when user has no full name"""
        user = User.objects.create_user(
            username='noname',
            email='noname@example.com',
            password='testpass123'
        )
        
        result = send_welcome_email(user)
        
        assert result is True
        assert len(mail.outbox) == 1
        assert 'noname@example.com' in mail.outbox[0].body
    
    def test_email_verification_sent(self, test_user):
        """Test verification email is sent with token"""
        token = EmailVerificationToken.create_token(test_user)
        verify_url = f"https://totetaxi.netlify.app/verify-email?token={token.token}"
        
        result = send_email_verification(test_user, token.token, verify_url)
        
        assert result is True
        assert len(mail.outbox) == 1
        
        email = mail.outbox[0]
        assert email.subject == 'Verify Your Tote Taxi Account'
        assert email.to == ['test@example.com']
        assert verify_url in email.body
        assert token.token in email.body
        assert '48 hours' in email.body
    
    def test_password_reset_email_sent(self, test_user):
        """Test password reset email with token"""
        token = PasswordResetToken.create_token(test_user)
        reset_url = f"https://totetaxi.netlify.app/reset-password?token={token.token}"
        
        result = send_password_reset_email(test_user, token.token, reset_url)
        
        assert result is True
        assert len(mail.outbox) == 1
        
        email = mail.outbox[0]
        assert email.subject == 'Reset Your Tote Taxi Password'
        assert email.to == ['test@example.com']
        assert reset_url in email.body
        assert '24 hours' in email.body
    
    def test_booking_confirmation_email(self, test_booking_with_guest):
        """Test booking confirmation email"""
        booking = test_booking_with_guest
        
        result = send_booking_confirmation_email(booking)
        
        assert result is True
        assert len(mail.outbox) == 1
        
        email = mail.outbox[0]
        assert booking.booking_number in email.subject
        assert email.to == ['guest@example.com']
        assert booking.booking_number in email.body
        assert '123 Test St' in email.body
        assert '456 Delivery Ave' in email.body
    
    def test_booking_status_update_email(self, test_booking_with_guest):
        """Test booking status update email"""
        booking = test_booking_with_guest
        
        result = send_booking_status_update_email(
            booking, 
            old_status='pending', 
            new_status='confirmed'
        )
        
        assert result is True
        assert len(mail.outbox) == 1
        
        email = mail.outbox[0]
        assert 'Update' in email.subject
        assert email.to == ['guest@example.com']
        assert 'pending' in email.body.lower()
        assert 'confirmed' in email.body.lower()
    
    def test_booking_reminder_email(self, test_booking_with_guest):
        """Test 24-hour reminder email"""
        booking = test_booking_with_guest
        
        result = send_booking_reminder_email(booking)
        
        assert result is True
        assert len(mail.outbox) == 1
        
        email = mail.outbox[0]
        assert 'Reminder' in email.subject
        assert 'Tomorrow' in email.subject or 'tomorrow' in email.body.lower()
        assert email.to == ['guest@example.com']
        
        # Check reminder timestamp was set
        booking.refresh_from_db()
        assert booking.reminder_sent_at is not None
    
    def test_reminder_not_sent_twice(self, db, test_address):
        """Test reminder email is not sent twice"""
        delivery_address = Address.objects.create(
            address_line_1='456 Delivery Ave',
            city='New York',
            state='NY',
            zip_code='10002'
        )
        
        guest = GuestCheckout.objects.create(
            first_name='Guest',
            last_name='User',
            email='guest@example.com',
            phone='5559876543'
        )
        
        booking = Booking.objects.create(
            guest_checkout=guest,
            service_type='mini_move',
            pickup_address=test_address,
            delivery_address=delivery_address,
            pickup_date=timezone.now().date() + timedelta(days=1),
            total_price_cents=99500,
            status='confirmed',
            reminder_sent_at=timezone.now()  # Already sent
        )
        
        result = send_booking_reminder_email(booking)
        
        assert result is False
        assert len(mail.outbox) == 0
    
    @patch('apps.customers.emails.send_mail')
    def test_email_failure_handling(self, mock_send_mail, test_user):
        """Test email failure is handled gracefully"""
        mock_send_mail.side_effect = Exception("SMTP Error")
        
        result = send_welcome_email(test_user)
        
        assert result is False


@pytest.mark.django_db
class TestEmailContent:
    """Test email content and formatting"""
    
    def setup_method(self):
        mail.outbox = []
    
    def test_email_has_from_address(self, test_user):
        """Test all emails have correct from address"""
        send_welcome_email(test_user)
        
        email = mail.outbox[0]
        assert 'totetaxi.com' in email.from_email.lower()
    
    def test_email_is_plain_text(self, test_user):
        """Test emails are plain text (not HTML)"""
        send_welcome_email(test_user)
        
        email = mail.outbox[0]
        assert email.content_subtype == 'plain'
    
    def test_verification_url_format(self, test_user):
        """Test verification URL is properly formatted"""
        token = EmailVerificationToken.create_token(test_user)
        verify_url = f"https://totetaxi.netlify.app/verify-email?token={token.token}"
        
        send_email_verification(test_user, token.token, verify_url)
        
        email = mail.outbox[0]
        assert 'https://' in email.body
        assert 'totetaxi.netlify.app' in email.body
        assert f'token={token.token}' in email.body
    
    def test_no_html_in_plain_text(self, test_user):
        """Test plain text emails don't contain HTML tags"""
        send_welcome_email(test_user)
        
        email = mail.outbox[0]
        assert '<html>' not in email.body.lower()
        assert '<body>' not in email.body.lower()
        assert '<p>' not in email.body