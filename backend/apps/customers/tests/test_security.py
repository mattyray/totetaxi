# backend/apps/customers/tests/test_security.py
import pytest
from rest_framework.test import APIClient
from django.contrib.auth.models import User
from apps.customers.models import CustomerProfile
from apps.accounts.models import StaffProfile


@pytest.fixture
def api_client():
    return APIClient()


@pytest.mark.django_db
class TestRateLimiting:
    """Test rate limiting on critical endpoints"""
    
    @pytest.mark.skip(reason="Rate limiting not configured in test environment")
    def test_password_reset_rate_limit(self, api_client):
        """Test password reset is rate limited (10/hour)"""
        # Make 11 requests
        for i in range(11):
            response = api_client.post('/api/customer/auth/password-reset/', {
                'email': f'test{i}@example.com'
            })
            
            if i < 10:
                assert response.status_code == 200
            else:
                # 11th request should be rate limited
                assert response.status_code == 429


@pytest.mark.django_db
class TestAuthenticationSecurity:
    """Test authentication security measures"""
    
    def test_cannot_have_both_customer_and_staff_profile(self, db):
        """Test hybrid accounts are prevented"""
        user = User.objects.create_user(
            username='hybrid@example.com',
            email='hybrid@example.com',
            password='testpass123'
        )
        
        # Create customer profile
        CustomerProfile.objects.create(user=user, phone='5551234567')
        
        # Trying to create staff profile should fail
        with pytest.raises(Exception):
            StaffProfile.objects.create(
                user=user,
                role='staff',
                phone='5559876543'
            )
    
    def test_staff_cannot_login_as_customer(self, api_client, db):
        """Test staff accounts cannot use customer login"""
        user = User.objects.create_user(
            username='staff@example.com',
            email='staff@example.com',
            password='testpass123',
            is_active=True
        )
        StaffProfile.objects.create(user=user, role='staff', phone='5551234567')
        
        # Get CSRF token
        csrf_response = api_client.get('/api/customer/csrf-token/')
        csrf_token = csrf_response.data['csrf_token']
        
        response = api_client.post('/api/customer/auth/login/', {
            'email': 'staff@example.com',
            'password': 'testpass123'
        }, HTTP_X_CSRFTOKEN=csrf_token)
        
        assert response.status_code == 400
        assert 'staff' in str(response.data).lower()
    
    def test_customer_profile_validation(self, db):
        """Test customer profile prevents hybrid accounts"""
        user = User.objects.create_user(
            username='test@example.com',
            email='test@example.com',
            password='testpass123'
        )
        
        # Create staff profile first
        StaffProfile.objects.create(user=user, role='staff', phone='5551234567')
        
        # Customer profile creation should fail
        with pytest.raises(Exception):
            CustomerProfile.objects.create(user=user, phone='5559876543')