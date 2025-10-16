# backend/apps/logistics/tests/test_webhooks.py
"""
Test Onfleet webhook handling
CRITICAL: Webhook bugs = missed status updates + incorrect booking states
"""
import pytest
from unittest.mock import patch
from datetime import datetime
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.logistics.services import ToteTaxiOnfleetIntegration
from apps.logistics.models import OnfleetTask
from apps.bookings.models import Booking, Address, GuestCheckout
from apps.services.models import MiniMovePackage
from datetime import timedelta


@pytest.fixture
def test_booking_with_tasks(db):
    """Create test booking with Onfleet tasks"""
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
    
    # Create tasks
    integration = ToteTaxiOnfleetIntegration()
    pickup_task, dropoff_task = integration.create_tasks_for_booking(booking)
    
    return booking, pickup_task, dropoff_task


@pytest.mark.django_db
class TestWebhookTaskStarted:
    """Test webhook for task started (trigger ID 0)"""
    
    def test_task_started_updates_status(self, test_booking_with_tasks):
        """Test task started webhook updates status to 'active'"""
        booking, pickup_task, dropoff_task = test_booking_with_tasks
        
        webhook_data = {
            'triggerId': 0,  # Task Started
            'data': {
                'id': pickup_task.onfleet_task_id,
                'worker': {
                    'id': 'worker_123',
                    'name': 'John Driver'
                }
            }
        }
        
        integration = ToteTaxiOnfleetIntegration()
        success = integration.handle_webhook(webhook_data)
        
        assert success is True
        
        pickup_task.refresh_from_db()
        assert pickup_task.status == 'active'
        assert pickup_task.started_at is not None
        assert pickup_task.worker_id == 'worker_123'
        assert pickup_task.worker_name == 'John Driver'
    
    def test_task_started_sets_timestamp(self, test_booking_with_tasks):
        """Test task started sets started_at timestamp"""
        booking, pickup_task, dropoff_task = test_booking_with_tasks
        
        assert pickup_task.started_at is None
        
        webhook_data = {
            'triggerId': 0,
            'data': {
                'id': pickup_task.onfleet_task_id,
                'worker': {}
            }
        }
        
        integration = ToteTaxiOnfleetIntegration()
        integration.handle_webhook(webhook_data)
        
        pickup_task.refresh_from_db()
        assert pickup_task.started_at is not None
        assert isinstance(pickup_task.started_at, datetime)


@pytest.mark.django_db
class TestWebhookTaskCompleted:
    """Test webhook for task completed (trigger ID 1)"""
    
    def test_pickup_completed_does_not_complete_booking(self, test_booking_with_tasks):
        """Test pickup completion doesn't mark booking as completed"""
        booking, pickup_task, dropoff_task = test_booking_with_tasks
        
        webhook_data = {
            'triggerId': 1,  # Task Completed
            'data': {
                'id': pickup_task.onfleet_task_id,
                'completionDetails': {
                    'signatureUploadId': 'sig_123',
                    'photoUploadIds': [{'uploadId': 'photo_456'}],
                    'notes': 'Picked up successfully'
                }
            }
        }
        
        integration = ToteTaxiOnfleetIntegration()
        integration.handle_webhook(webhook_data)
        
        pickup_task.refresh_from_db()
        assert pickup_task.status == 'completed'
        assert pickup_task.completed_at is not None
        
        # Booking should still be 'paid', not 'completed'
        booking.refresh_from_db()
        assert booking.status == 'paid'
    
    def test_dropoff_completed_marks_booking_completed(self, test_booking_with_tasks):
        """Test dropoff completion marks booking as completed"""
        booking, pickup_task, dropoff_task = test_booking_with_tasks
        
        webhook_data = {
            'triggerId': 1,  # Task Completed
            'data': {
                'id': dropoff_task.onfleet_task_id,
                'completionDetails': {
                    'signatureUploadId': 'sig_789',
                    'photoUploadIds': [{'uploadId': 'photo_abc'}],
                    'notes': 'Delivered successfully'
                }
            }
        }
        
        integration = ToteTaxiOnfleetIntegration()
        integration.handle_webhook(webhook_data)
        
        dropoff_task.refresh_from_db()
        assert dropoff_task.status == 'completed'
        assert dropoff_task.completed_at is not None
        
        # Booking should now be 'completed'
        booking.refresh_from_db()
        assert booking.status == 'completed'
    
    def test_completed_saves_proof_of_delivery(self, test_booking_with_tasks):
        """Test completion saves signature and photos"""
        booking, pickup_task, dropoff_task = test_booking_with_tasks
        
        webhook_data = {
            'triggerId': 1,
            'data': {
                'id': dropoff_task.onfleet_task_id,
                'completionDetails': {
                    'signatureUploadId': 'sig_xyz',
                    'photoUploadIds': [
                        {'uploadId': 'photo_1'},
                        {'uploadId': 'photo_2'}
                    ],
                    'notes': 'Left at door'
                }
            }
        }
        
        integration = ToteTaxiOnfleetIntegration()
        integration.handle_webhook(webhook_data)
        
        dropoff_task.refresh_from_db()
        assert dropoff_task.signature_url == 'sig_xyz'
        assert dropoff_task.photo_urls == ['photo_1', 'photo_2']
        assert dropoff_task.delivery_notes == 'Left at door'


@pytest.mark.django_db
class TestWebhookTaskFailed:
    """Test webhook for task failed (trigger ID 2)"""
    
    def test_task_failed_updates_status(self, test_booking_with_tasks):
        """Test failed webhook updates status and saves reason"""
        booking, pickup_task, dropoff_task = test_booking_with_tasks
        
        webhook_data = {
            'triggerId': 2,  # Task Failed
            'data': {
                'id': pickup_task.onfleet_task_id,
                'completionDetails': {
                    'failureReason': 'CUSTOMER_UNAVAILABLE',
                    'failureNotes': 'Customer not home, rescheduling'
                }
            }
        }
        
        integration = ToteTaxiOnfleetIntegration()
        success = integration.handle_webhook(webhook_data)
        
        assert success is True
        
        pickup_task.refresh_from_db()
        assert pickup_task.status == 'failed'
        assert pickup_task.failure_reason == 'CUSTOMER_UNAVAILABLE'
        assert pickup_task.failure_notes == 'Customer not home, rescheduling'


@pytest.mark.django_db
class TestWebhookTaskDeleted:
    """Test webhook for task deleted (trigger ID 3)"""
    
    def test_task_deleted_updates_status(self, test_booking_with_tasks):
        """Test deleted webhook updates status to 'deleted'"""
        booking, pickup_task, dropoff_task = test_booking_with_tasks
        
        webhook_data = {
            'triggerId': 3,  # Task Deleted
            'data': {
                'id': pickup_task.onfleet_task_id
            }
        }
        
        integration = ToteTaxiOnfleetIntegration()
        success = integration.handle_webhook(webhook_data)
        
        assert success is True
        
        pickup_task.refresh_from_db()
        assert pickup_task.status == 'deleted'


@pytest.mark.django_db
class TestWebhookTaskETAChanged:
    """Test webhook for ETA changed (trigger ID 6)"""
    
    def test_eta_changed_updates_estimated_arrival(self, test_booking_with_tasks):
        """Test ETA webhook updates estimated_arrival field"""
        booking, pickup_task, dropoff_task = test_booking_with_tasks
        
        # Set ETA to 2 hours from now (timestamp in milliseconds)
        future_time = timezone.now() + timedelta(hours=2)
        eta_timestamp = int(future_time.timestamp() * 1000)
        
        webhook_data = {
            'triggerId': 6,  # Task ETA Changed
            'data': {
                'id': pickup_task.onfleet_task_id,
                'estimatedCompletionTime': eta_timestamp
            }
        }
        
        integration = ToteTaxiOnfleetIntegration()
        integration.handle_webhook(webhook_data)
        
        pickup_task.refresh_from_db()
        assert pickup_task.estimated_arrival is not None
        
        # Check it's approximately correct (within 1 minute)
        time_diff = abs((pickup_task.estimated_arrival - future_time).total_seconds())
        assert time_diff < 60


@pytest.mark.django_db
class TestWebhookTaskAssigned:
    """Test webhook for task assigned (trigger ID 8)"""
    
    def test_task_assigned_updates_worker(self, test_booking_with_tasks):
        """Test assigned webhook updates worker info"""
        booking, pickup_task, dropoff_task = test_booking_with_tasks
        
        webhook_data = {
            'triggerId': 8,  # Task Assigned
            'data': {
                'id': pickup_task.onfleet_task_id,
                'worker': 'worker_456'  # Can be string or dict
            }
        }
        
        integration = ToteTaxiOnfleetIntegration()
        success = integration.handle_webhook(webhook_data)
        
        assert success is True
        
        pickup_task.refresh_from_db()
        assert pickup_task.status == 'assigned'
        assert pickup_task.worker_id == 'worker_456'
    
    def test_task_assigned_with_worker_dict(self, test_booking_with_tasks):
        """Test assigned webhook with worker as dictionary"""
        booking, pickup_task, dropoff_task = test_booking_with_tasks
        
        webhook_data = {
            'triggerId': 8,
            'data': {
                'id': dropoff_task.onfleet_task_id,
                'worker': {
                    'id': 'worker_789',
                    'name': 'Jane Driver'
                }
            }
        }
        
        integration = ToteTaxiOnfleetIntegration()
        integration.handle_webhook(webhook_data)
        
        dropoff_task.refresh_from_db()
        assert dropoff_task.status == 'assigned'
        assert dropoff_task.worker_id == 'worker_789'


@pytest.mark.django_db
class TestWebhookErrorHandling:
    """Test webhook error handling"""
    
    def test_webhook_with_nonexistent_task_returns_false(self, test_booking_with_tasks):
        """Test webhook for non-existent task ID returns False"""
        webhook_data = {
            'triggerId': 1,
            'data': {
                'id': 'nonexistent_task_id'
            }
        }
        
        integration = ToteTaxiOnfleetIntegration()
        success = integration.handle_webhook(webhook_data)
        
        assert success is False
    
    def test_webhook_without_task_id_returns_false(self, test_booking_with_tasks):
        """Test webhook without task ID returns False"""
        webhook_data = {
            'triggerId': 1,
            'data': {}  # No task ID
        }
        
        integration = ToteTaxiOnfleetIntegration()
        success = integration.handle_webhook(webhook_data)
        
        assert success is False
    
    def test_webhook_handles_unknown_trigger_gracefully(self, test_booking_with_tasks):
        """Test webhook with unknown trigger ID doesn't crash"""
        booking, pickup_task, dropoff_task = test_booking_with_tasks
        
        webhook_data = {
            'triggerId': 999,  # Unknown trigger
            'data': {
                'id': pickup_task.onfleet_task_id
            }
        }
        
        integration = ToteTaxiOnfleetIntegration()
        
        # Should not raise exception
        try:
            success = integration.handle_webhook(webhook_data)
            # May return True or False, but shouldn't crash
            assert isinstance(success, bool)
        except Exception:
            pytest.fail("Webhook handling raised exception for unknown trigger")