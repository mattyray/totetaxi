# backend/apps/customers/tests/test_ses_integration.py
import pytest
from django.core import mail
from django.conf import settings
from django.contrib.auth.models import User
from apps.customers.emails import send_welcome_email
from apps.customers.models import CustomerProfile


@pytest.fixture
def test_user(db):
    """Create test user"""
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


@pytest.mark.django_db
@pytest.mark.skipif(
    settings.EMAIL_BACKEND == 'django.core.mail.backends.console.EmailBackend',
    reason="SES integration tests only run with SES backend"
)
class TestSESIntegration:
    """Test SES-specific email behavior"""
    
    def setup_method(self):
        """Clear mail outbox before each test"""
        mail.outbox = []
    
    def test_email_from_verified_sender(self, test_user):
        """Test emails are from verified SES sender"""
        send_welcome_email(test_user)
        
        email = mail.outbox[0]
        # In production, ensure from_email matches SES verified identity
        assert 'totetaxi.com' in email.from_email.lower()
    
    def test_email_headers_for_ses(self, test_user):
        """Test email has proper headers for SES"""
        send_welcome_email(test_user)
        
        email = mail.outbox[0]
        # Basic email structure required by SES
        assert email.subject
        assert email.body
        assert email.to
        assert email.from_email


@pytest.mark.django_db
class TestEmailValidation:
    """Test email addresses are valid before sending"""
    
    def setup_method(self):
        """Clear mail outbox before each test"""
        mail.outbox = []
    
    def test_invalid_email_format(self, db):
        """Test handling of invalid email addresses"""
        # Django's User model will validate email on save
        # This test ensures our email functions handle edge cases
        user = User.objects.create_user(
            username='invaliduser',
            email='test@example.com',  # Valid email (Django validates on create)
            password='testpass123'
        )
        
        # Change email to invalid after creation to test error handling
        user.email = 'invalid-email'
        
        # Test that send_welcome_email handles this gracefully
        result = send_welcome_email(user)
        
        # Depending on your email backend, this might:
        # - Return False (handled gracefully)
        # - Raise an exception (caught by logger)
        # Either way, it shouldn't crash
        assert isinstance(result, bool)