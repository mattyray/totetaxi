# backend/apps/customers/tests/test_api.py
import pytest
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from apps.customers.models import CustomerProfile, EmailVerificationToken


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def verified_user(db):
    """Create a verified user with customer profile"""
    user = User.objects.create_user(
        username='test@example.com',  # ← FIX: Use email as username
        email='test@example.com',
        password='testpass123',
        first_name='Test',
        last_name='User',
        is_active=True
    )
    CustomerProfile.objects.create(user=user, phone='5551234567')
    return user


@pytest.mark.django_db
class TestAuthenticationAPI:
    """Test authentication endpoints"""
    
    def test_registration_success(self, api_client):
        """Test successful registration"""
        response = api_client.post('/api/customer/auth/register/', {
            'first_name': 'New',
            'last_name': 'User',
            'email': 'newuser@example.com',
            'phone': '5559876543',
            'password': 'newpass123',
            'password_confirm': 'newpass123'
        })
        
        assert response.status_code == 201
        assert 'message' in response.data
        assert 'verify' in response.data['message'].lower()
        
        # User should exist but be inactive
        user = User.objects.get(email='newuser@example.com')
        assert not user.is_active
        assert hasattr(user, 'customer_profile')
    
    def test_registration_duplicate_email(self, api_client, verified_user):
        """Test registration with duplicate email fails"""
        response = api_client.post('/api/customer/auth/register/', {
            'first_name': 'Duplicate',
            'last_name': 'User',
            'email': verified_user.email,
            'phone': '5559876543',
            'password': 'newpass123',
            'password_confirm': 'newpass123'
        })
        
        assert response.status_code == 400
    
    def test_registration_password_mismatch(self, api_client):
        """Test password confirmation validation"""
        response = api_client.post('/api/customer/auth/register/', {
            'first_name': 'Test',
            'last_name': 'User',
            'email': 'test@example.com',
            'phone': '5551234567',
            'password': 'password123',
            'password_confirm': 'different123'
        })
        
        assert response.status_code == 400
        assert 'password' in str(response.data).lower()
    
    def test_login_success(self, api_client, verified_user):
        """Test successful login"""
        # Get CSRF token first
        csrf_response = api_client.get('/api/customer/csrf-token/')
        csrf_token = csrf_response.data['csrf_token']
        
        response = api_client.post('/api/customer/auth/login/', {
            'email': 'test@example.com',
            'password': 'testpass123'
        }, HTTP_X_CSRFTOKEN=csrf_token)
        
        assert response.status_code == 200
        assert 'user' in response.data
        assert 'customer_profile' in response.data
        assert 'csrf_token' in response.data
    
    def test_login_unverified_user(self, api_client, db):
        """Test login with unverified email fails"""
        user = User.objects.create_user(
            username='unverified',
            email='unverified@example.com',
            password='testpass123',
            is_active=False
        )
        CustomerProfile.objects.create(user=user, phone='5551234567')
        
        # Get CSRF token first
        csrf_response = api_client.get('/api/customer/csrf-token/')
        csrf_token = csrf_response.data['csrf_token']
        
        response = api_client.post('/api/customer/auth/login/', {
            'email': 'unverified@example.com',
            'password': 'testpass123'
        }, HTTP_X_CSRFTOKEN=csrf_token)
        
        assert response.status_code == 400
        # Check for error message (could be 'error' or 'non_field_errors')
        error_msg = str(response.data).lower()
        assert 'verify' in error_msg or 'email' in error_msg
    
    def test_login_invalid_credentials(self, api_client, verified_user):
        """Test login with wrong password fails"""
        # Get CSRF token first
        csrf_response = api_client.get('/api/customer/csrf-token/')
        csrf_token = csrf_response.data['csrf_token']
        
        response = api_client.post('/api/customer/auth/login/', {
            'email': 'test@example.com',
            'password': 'wrongpassword'
        }, HTTP_X_CSRFTOKEN=csrf_token)
        
        assert response.status_code == 400
    
    def test_password_reset_request(self, api_client, verified_user):
        """Test password reset request"""
        response = api_client.post('/api/customer/auth/password-reset/', {
            'email': 'test@example.com'
        })
        
        assert response.status_code == 200
        assert 'message' in response.data
        
        # Token should be created
        from apps.customers.models import PasswordResetToken
        token = PasswordResetToken.objects.filter(user=verified_user).first()
        assert token is not None
        assert token.is_valid()
    
    def test_password_reset_nonexistent_email(self, api_client):
        """Test password reset with non-existent email (security)"""
        response = api_client.post('/api/customer/auth/password-reset/', {
            'email': 'nonexistent@example.com'
        })
        
        # Should return 200 to not reveal if email exists
        assert response.status_code == 200
    
    def test_email_verification(self, api_client, db):
        """Test email verification endpoint"""
        user = User.objects.create_user(
            username='unverified',
            email='unverified@example.com',
            password='testpass123',
            is_active=False
        )
        CustomerProfile.objects.create(user=user, phone='5551234567')
        token = EmailVerificationToken.create_token(user)
        
        response = api_client.post('/api/customer/auth/verify-email/', {
            'token': token.token
        })
        
        assert response.status_code == 200
        user.refresh_from_db()
        assert user.is_active
    
    def test_current_user_authenticated(self, api_client, verified_user):
        """Test getting current user when authenticated"""
        api_client.force_authenticate(user=verified_user)
        
        response = api_client.get('/api/customer/auth/user/')
        
        assert response.status_code == 200
        assert response.data['user']['email'] == verified_user.email
    
    def test_current_user_unauthenticated(self, api_client):
        """Test getting current user when not authenticated"""
        response = api_client.get('/api/customer/auth/user/')
        
        assert response.status_code == 403


@pytest.mark.django_db
class TestProfileAPI:
    """Test customer profile endpoints"""
    
    def test_get_profile(self, api_client, verified_user):
        """Test getting customer profile"""
        api_client.force_authenticate(user=verified_user)
        
        response = api_client.get('/api/customer/profile/')
        
        assert response.status_code == 200
        assert response.data['phone'] == '5551234567'
    
    def test_update_profile(self, api_client, verified_user):
        """Test updating customer profile"""
        api_client.force_authenticate(user=verified_user)
        
        response = api_client.patch('/api/customer/profile/', {
            'phone': '5559999999',
            'email_notifications': False
        })
        
        assert response.status_code == 200
        verified_user.customer_profile.refresh_from_db()
        assert verified_user.customer_profile.phone == '5559999999'
        assert not verified_user.customer_profile.email_notifications