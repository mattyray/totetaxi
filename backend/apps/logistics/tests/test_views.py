# backend/apps/logistics/tests/test_views.py
"""
Test logistics API endpoints
CRITICAL: API bugs = broken staff dashboard + manual task creation failures
"""
import pytest
from datetime import timedelta
from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework.test import APIClient

from apps.logistics.models import OnfleetTask
from apps.logistics.services import ToteTaxiOnfleetIntegration
from apps.bookings.models import Booking, Address, GuestCheckout
from apps.services.models import MiniMovePackage
from apps.accounts.models import StaffProfile


@pytest.fixture
def staff_user(db):
    """Create staff user with profile"""
    user = User.objects.create_user(
        username='staff@example.com',
        email='staff@example.com',
        password='staffpass123',
        is_active=True
    )
    StaffProfile.objects.create(
        user=user,
        role='staff',
        phone='5551234567'
    )
    return user


@pytest.fixture
def staff_client(staff_user):
    """Create authenticated staff API client"""
    client = APIClient()
    client.force_authenticate(user=staff_user)
    return client


@pytest.fixture
def regular_user(db):
    """Create regular (non-staff) user"""
    user = User.objects.create_user(
        username='customer@example.com',
        email='customer@example.com',
        password='customerpass123',
        is_active=True
    )
    return user


@pytest.fixture
def test_booking(db):
    """Create test booking"""
    package = MiniMovePackage.objects.create(
        package_type='petite',
        name='Petite Move',
        base_price_cents=15000,
        max_items=10,
        is_active=True
    )
    
    pickup = Address.objects.create(
        address_line_1='123 Main St',
        city='New York',
        state='NY',
        zip_code='10001'
    )
    
    delivery = Address.objects.create(
        address_line_1='456 Park Ave',
        city='New York',
        state='NY',
        zip_code='10002'
    )
    
    guest = GuestCheckout.objects.create(
        first_name='Test',
        last_name='Customer',
        email='test@example.com',
        phone='5551234567'
    )
    
    booking = Booking.objects.create(
        service_type='mini_move',
        mini_move_package=package,
        guest_checkout=guest,
        pickup_address=pickup,
        delivery_address=delivery,
        pickup_date=timezone.now().date() + timedelta(days=2),
        pickup_time='morning',
        total_price_cents=15000,
        status='paid'
    )
    
    return booking


@pytest.mark.django_db
class TestLogisticsSummaryView:
    """Test GET /api/staff/logistics/summary/"""
    
    def test_summary_requires_authentication(self):
        """Test unauthenticated request is rejected"""
        client = APIClient()
        response = client.get('/api/staff/logistics/summary/')
        
        assert response.status_code == 403
    
    def test_summary_requires_staff_profile(self, regular_user):
        """Test non-staff user is rejected"""
        client = APIClient()
        client.force_authenticate(user=regular_user)
        
        response = client.get('/api/staff/logistics/summary/')
        
        assert response.status_code == 403
        assert 'staff' in str(response.data).lower()
    
    def test_summary_returns_data_for_staff(self, staff_client):
        """Test staff user gets summary data"""
        response = staff_client.get('/api/staff/logistics/summary/')
        
        assert response.status_code == 200
        assert response.data['success'] is True
        assert 'data' in response.data
        assert 'timestamp' in response.data
    
    def test_summary_includes_totetaxi_stats(self, staff_client):
        """Test summary includes ToteTaxi booking stats"""
        response = staff_client.get('/api/staff/logistics/summary/')
        
        data = response.data['data']
        assert 'totetaxi_stats' in data
        assert 'total_bookings' in data['totetaxi_stats']
        assert 'confirmed_bookings' in data['totetaxi_stats']
        assert 'completed_bookings' in data['totetaxi_stats']
    
    def test_summary_includes_onfleet_stats(self, staff_client):
        """Test summary includes Onfleet stats"""
        response = staff_client.get('/api/staff/logistics/summary/')
        
        data = response.data['data']
        assert 'onfleet_stats' in data
        assert 'active_tasks' in data['onfleet_stats']
        assert 'available_workers' in data['onfleet_stats']
        assert 'organization_name' in data['onfleet_stats']
    
    def test_summary_includes_integration_stats(self, staff_client, test_booking):
        """Test summary includes integration stats"""
        # Create tasks for today
        integration = ToteTaxiOnfleetIntegration()
        integration.create_tasks_for_booking(test_booking)
        
        response = staff_client.get('/api/staff/logistics/summary/')
        
        data = response.data['data']
        assert 'integration_stats' in data
        assert 'tasks_created_today' in data['integration_stats']
        assert 'pickup_tasks' in data['integration_stats']
        assert 'dropoff_tasks' in data['integration_stats']
        assert data['integration_stats']['tasks_created_today'] >= 2
    
    def test_summary_includes_environment(self, staff_client):
        """Test summary includes environment and mock_mode"""
        response = staff_client.get('/api/staff/logistics/summary/')
        
        data = response.data['data']
        assert 'environment' in data
        assert 'mock_mode' in data
        assert data['environment'] in ['sandbox', 'production']
        assert isinstance(data['mock_mode'], bool)


@pytest.mark.django_db
class TestManualTaskCreation:
    """Test POST /api/staff/logistics/create-task/"""
    
    def test_create_task_requires_authentication(self):
        """Test unauthenticated request is rejected"""
        client = APIClient()
        response = client.post('/api/staff/logistics/create-task/', {
            'booking_id': 'test-id'
        })
        
        assert response.status_code == 403
    
    def test_create_task_requires_staff_profile(self, regular_user):
        """Test non-staff user is rejected"""
        client = APIClient()
        client.force_authenticate(user=regular_user)
        
        response = client.post('/api/staff/logistics/create-task/', {
            'booking_id': 'test-id'
        })
        
        assert response.status_code == 403
    
    def test_create_task_requires_booking_id(self, staff_client):
        """Test booking_id is required"""
        response = staff_client.post('/api/staff/logistics/create-task/', {})
        
        assert response.status_code == 400
        assert 'booking_id' in str(response.data).lower()
    
    def test_create_task_for_valid_booking(self, staff_client, test_booking):
        """Test creating tasks for valid booking"""
        # Ensure no tasks exist
        OnfleetTask.objects.filter(booking=test_booking).delete()
        
        response = staff_client.post('/api/staff/logistics/create-task/', {
            'booking_id': str(test_booking.id)
        })
        
        assert response.status_code == 200
        assert response.data['success'] is True
        assert 'pickup_task' in response.data
        assert 'dropoff_task' in response.data
        
        # Verify tasks were created
        tasks = OnfleetTask.objects.filter(booking=test_booking)
        assert tasks.count() == 2
    
    def test_create_task_returns_task_details(self, staff_client, test_booking):
        """Test response includes task IDs and tracking URLs"""
        OnfleetTask.objects.filter(booking=test_booking).delete()
        
        response = staff_client.post('/api/staff/logistics/create-task/', {
            'booking_id': str(test_booking.id)
        })
        
        assert 'id' in response.data['pickup_task']
        assert 'onfleet_task_id' in response.data['pickup_task']
        assert 'tracking_url' in response.data['pickup_task']
        
        assert 'id' in response.data['dropoff_task']
        assert 'onfleet_task_id' in response.data['dropoff_task']
        assert 'tracking_url' in response.data['dropoff_task']
    
    def test_create_task_for_nonexistent_booking(self, staff_client):
        """Test error when booking doesn't exist"""
        response = staff_client.post('/api/staff/logistics/create-task/', {
            'booking_id': '00000000-0000-0000-0000-000000000000'
        })
        
        assert response.status_code == 500
        assert 'error' in response.data


@pytest.mark.django_db
class TestSyncOnfleetStatus:
    """Test POST /api/staff/logistics/sync/"""
    
    def test_sync_requires_authentication(self):
        """Test unauthenticated request is rejected"""
        client = APIClient()
        response = client.post('/api/staff/logistics/sync/')
        
        assert response.status_code == 403
    
    def test_sync_requires_staff_profile(self, regular_user):
        """Test non-staff user is rejected"""
        client = APIClient()
        client.force_authenticate(user=regular_user)
        
        response = client.post('/api/staff/logistics/sync/')
        
        assert response.status_code == 403
    
    def test_sync_updates_recent_tasks(self, staff_client, test_booking):
        """Test sync updates last_synced timestamp"""
        integration = ToteTaxiOnfleetIntegration()
        pickup, dropoff = integration.create_tasks_for_booking(test_booking)
        
        # Clear sync timestamps
        pickup.last_synced = None
        pickup.save()
        dropoff.last_synced = None
        dropoff.save()
        
        response = staff_client.post('/api/staff/logistics/sync/')
        
        assert response.status_code == 200
        assert response.data['success'] is True
        assert response.data['synced_count'] >= 2
        
        # Check tasks were synced
        pickup.refresh_from_db()
        dropoff.refresh_from_db()
        assert pickup.last_synced is not None
        assert dropoff.last_synced is not None
    
    def test_sync_only_syncs_incomplete_tasks(self, staff_client, test_booking):
        """Test sync only touches incomplete tasks"""
        integration = ToteTaxiOnfleetIntegration()
        pickup, dropoff = integration.create_tasks_for_booking(test_booking)
        
        # Mark pickup as completed
        pickup.status = 'completed'
        pickup.save()
        
        response = staff_client.post('/api/staff/logistics/sync/')
        
        assert response.status_code == 200
        # Should only sync the dropoff task (still 'created')
        assert response.data['synced_count'] >= 1


@pytest.mark.django_db
class TestTaskStatusView:
    """Test GET /api/staff/logistics/tasks/"""
    
    def test_tasks_requires_authentication(self):
        """Test unauthenticated request is rejected"""
        client = APIClient()
        response = client.get('/api/staff/logistics/tasks/')
        
        assert response.status_code == 403
    
    def test_tasks_requires_staff_profile(self, regular_user):
        """Test non-staff user is rejected"""
        client = APIClient()
        client.force_authenticate(user=regular_user)
        
        response = client.get('/api/staff/logistics/tasks/')
        
        assert response.status_code == 403
    
    def test_tasks_returns_list(self, staff_client, test_booking):
        """Test returns list of tasks"""
        integration = ToteTaxiOnfleetIntegration()
        integration.create_tasks_for_booking(test_booking)
        
        response = staff_client.get('/api/staff/logistics/tasks/')
        
        assert response.status_code == 200
        assert response.data['success'] is True
        assert 'tasks' in response.data
        assert 'count' in response.data
        assert response.data['count'] >= 2
    
    def test_tasks_include_booking_info(self, staff_client, test_booking):
        """Test task list includes booking details"""
        integration = ToteTaxiOnfleetIntegration()
        integration.create_tasks_for_booking(test_booking)
        
        response = staff_client.get('/api/staff/logistics/tasks/')
        
        tasks = response.data['tasks']
        assert len(tasks) >= 2
        
        task = tasks[0]
        assert 'booking_number' in task
        assert 'customer_name' in task
        assert 'task_type' in task
        assert 'status' in task
        assert 'tracking_url' in task
    
    def test_tasks_can_filter_by_booking(self, staff_client, test_booking):
        """Test filtering tasks by booking_id"""
        integration = ToteTaxiOnfleetIntegration()
        integration.create_tasks_for_booking(test_booking)
        
        response = staff_client.get(
            f'/api/staff/logistics/tasks/?booking_id={test_booking.id}'
        )
        
        assert response.status_code == 200
        assert response.data['count'] == 2  # Should only return this booking's tasks
    
    def test_tasks_can_filter_by_date(self, staff_client, test_booking):
        """Test filtering tasks by date"""
        integration = ToteTaxiOnfleetIntegration()
        integration.create_tasks_for_booking(test_booking)
        
        today = timezone.now().date()
        response = staff_client.get(f'/api/staff/logistics/tasks/?date={today}')
        
        assert response.status_code == 200
        assert response.data['count'] >= 2


@pytest.mark.django_db
class TestWebhookView:
    """Test webhook endpoint"""
    
    def test_webhook_get_verification(self):
        """Test GET request for webhook verification"""
        client = APIClient()
        
        response = client.get('/api/staff/logistics/webhook/?check=test_value_123')
        
        assert response.status_code == 200
        assert response.content.decode() == 'test_value_123'
        assert response['Content-Type'] == 'text/plain'
    
    def test_webhook_get_without_check_fails(self):
        """Test GET without check parameter fails"""
        client = APIClient()
        
        response = client.get('/api/staff/logistics/webhook/')
        
        assert response.status_code == 400
    
    def test_webhook_post_processes_event(self, test_booking):
        """Test POST webhook processes event"""
        client = APIClient()
        
        # Create tasks first
        integration = ToteTaxiOnfleetIntegration()
        pickup, dropoff = integration.create_tasks_for_booking(test_booking)
        
        # Assigned = triggerId 9
        webhook_data = {
            'triggerId': 9,
            'taskId': pickup.onfleet_task_id,
            'data': {
                'task': {'id': pickup.onfleet_task_id},
                'worker': 'worker_123'
            }
        }
        
        response = client.post(
            '/api/staff/logistics/webhook/',
            webhook_data,
            format='json'
        )
        
        assert response.status_code == 200
        assert response.data['success'] is True
        
        # Verify task was updated
        pickup.refresh_from_db()
        assert pickup.status == 'assigned'
        assert pickup.worker_id == 'worker_123'
    
    def test_webhook_csrf_exempt(self, test_booking):
        """Test webhook doesn't require CSRF token"""
        client = APIClient()
        # Don't set CSRF token
        
        integration = ToteTaxiOnfleetIntegration()
        pickup, dropoff = integration.create_tasks_for_booking(test_booking)
        
        webhook_data = {
            'triggerId': 0,
            'taskId': pickup.onfleet_task_id,
            'data': {
                'task': {'id': pickup.onfleet_task_id}
            }
        }
        
        # Should work without CSRF
        response = client.post(
            '/api/staff/logistics/webhook/',
            webhook_data,
            format='json'
        )
        
        # Should not get CSRF error
        assert response.status_code != 403
