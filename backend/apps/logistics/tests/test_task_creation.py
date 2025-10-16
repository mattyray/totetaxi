# backend/apps/logistics/tests/test_task_creation.py
"""
Test Onfleet task creation for ToteTaxi bookings
CRITICAL: Task creation bugs = failed deliveries + customer complaints
"""
import pytest
from unittest.mock import patch, MagicMock
from datetime import date, timedelta, time as dt_time
from django.test import TestCase
from django.contrib.auth.models import User
from django.utils import timezone

from apps.logistics.services import ToteTaxiOnfleetIntegration, OnfleetService
from apps.logistics.models import OnfleetTask
from apps.bookings.models import Booking, Address, GuestCheckout
from apps.services.models import MiniMovePackage


@pytest.fixture
def test_booking(db):
    """Create test booking with guest checkout"""
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


@pytest.fixture
def blade_booking(db):
    """Create BLADE transfer booking"""
    pickup = Address.objects.create(
        address_line_1='123 Main St',
        city='New York',
        state='NY',
        zip_code='10001'
    )
    
    delivery = Address.objects.create(
        address_line_1='JFK Airport',
        city='New York',
        state='NY',
        zip_code='11430'
    )
    
    guest = GuestCheckout.objects.create(
        first_name='Blade',
        last_name='Customer',
        email='blade@example.com',
        phone='5559876543'
    )
    
    booking = Booking.objects.create(
        service_type='blade_transfer',
        guest_checkout=guest,
        pickup_address=pickup,
        delivery_address=delivery,
        pickup_date=timezone.now().date() + timedelta(days=2),
        blade_airport='JFK',
        blade_bag_count=3,
        blade_flight_date=timezone.now().date() + timedelta(days=2),
        blade_flight_time=dt_time(14, 0),
        total_price_cents=22500,
        status='paid'
    )
    
    return booking


@pytest.mark.django_db
class TestOnfleetTaskCreation:
    """Test creating pickup + dropoff tasks for bookings"""
    
    def test_creates_two_tasks_for_booking(self, test_booking):
        """Test that two tasks (pickup + dropoff) are created"""
        integration = ToteTaxiOnfleetIntegration()
        pickup, dropoff = integration.create_tasks_for_booking(test_booking)
        
        assert pickup is not None
        assert dropoff is not None
        assert pickup.task_type == 'pickup'
        assert dropoff.task_type == 'dropoff'
        assert pickup.booking == test_booking
        assert dropoff.booking == test_booking
    
    def test_tasks_are_linked(self, test_booking):
        """Test that dropoff task is linked to pickup task"""
        integration = ToteTaxiOnfleetIntegration()
        pickup, dropoff = integration.create_tasks_for_booking(test_booking)
        
        assert dropoff.linked_task == pickup
        assert pickup.linked_task is None  # Pickup not linked to anything
    
    def test_prevents_duplicate_task_creation(self, test_booking):
        """Test that creating tasks twice returns existing tasks"""
        integration = ToteTaxiOnfleetIntegration()
        
        # Create tasks first time
        pickup1, dropoff1 = integration.create_tasks_for_booking(test_booking)
        
        # Try to create again
        pickup2, dropoff2 = integration.create_tasks_for_booking(test_booking)
        
        # Should return same tasks
        assert pickup1.id == pickup2.id
        assert dropoff1.id == dropoff2.id
        
        # Should only have 2 tasks total
        assert OnfleetTask.objects.filter(booking=test_booking).count() == 2
    
    def test_pickup_task_has_correct_recipient(self, test_booking):
        """Test pickup task recipient is the customer"""
        integration = ToteTaxiOnfleetIntegration()
        pickup, dropoff = integration.create_tasks_for_booking(test_booking)
        
        assert pickup.recipient_name == 'Test Customer'
        assert pickup.recipient_phone == '+15551234567' or '5551234567' in pickup.recipient_phone
    
    def test_dropoff_task_has_correct_recipient(self, test_booking):
        """Test dropoff task recipient is the customer (normal delivery)"""
        integration = ToteTaxiOnfleetIntegration()
        pickup, dropoff = integration.create_tasks_for_booking(test_booking)
        
        assert dropoff.recipient_name == 'Test Customer'
        assert dropoff.recipient_phone == '+15551234567' or '5551234567' in dropoff.recipient_phone
    
    def test_tasks_have_tracking_urls(self, test_booking):
        """Test that both tasks have tracking URLs"""
        integration = ToteTaxiOnfleetIntegration()
        pickup, dropoff = integration.create_tasks_for_booking(test_booking)
        
        assert pickup.tracking_url
        assert dropoff.tracking_url
        assert 'onf.lt' in pickup.tracking_url or 'mock' in pickup.tracking_url
        assert 'onf.lt' in dropoff.tracking_url or 'mock' in dropoff.tracking_url
    
    def test_tasks_have_onfleet_task_ids(self, test_booking):
        """Test that both tasks have Onfleet task IDs"""
        integration = ToteTaxiOnfleetIntegration()
        pickup, dropoff = integration.create_tasks_for_booking(test_booking)
        
        assert pickup.onfleet_task_id
        assert dropoff.onfleet_task_id
        assert pickup.onfleet_task_id != dropoff.onfleet_task_id
    
    def test_tasks_default_to_created_status(self, test_booking):
        """Test tasks are created with 'created' status in mock mode"""
        integration = ToteTaxiOnfleetIntegration()
        pickup, dropoff = integration.create_tasks_for_booking(test_booking)
        
        assert pickup.status == 'created'
        assert dropoff.status == 'created'
    
    def test_tasks_have_environment_set(self, test_booking):
        """Test tasks have environment field set"""
        integration = ToteTaxiOnfleetIntegration()
        pickup, dropoff = integration.create_tasks_for_booking(test_booking)
        
        assert pickup.environment in ['sandbox', 'production']
        assert dropoff.environment in ['sandbox', 'production']


@pytest.mark.django_db
class TestBLADETransferTasks:
    """Test BLADE transfer special handling"""
    
    def test_blade_dropoff_recipient_is_blade_team(self, blade_booking):
        """Test BLADE dropoff goes to BLADE team, not customer"""
        integration = ToteTaxiOnfleetIntegration()
        pickup, dropoff = integration.create_tasks_for_booking(blade_booking)
        
        # Pickup is still customer
        assert 'Blade Customer' in pickup.recipient_name
        
        # Dropoff is BLADE team
        assert 'BLADE' in dropoff.recipient_name
        assert 'Bowie Tam' in dropoff.recipient_name or 'Nathan' in dropoff.recipient_name
    
    def test_blade_dropoff_has_blade_phone(self, blade_booking):
        """Test BLADE dropoff has BLADE team phone number"""
        integration = ToteTaxiOnfleetIntegration()
        pickup, dropoff = integration.create_tasks_for_booking(blade_booking)
        
        # JFK should have Bowie Tam's number
        assert '+17185410177' in dropoff.recipient_phone or '7185410177' in dropoff.recipient_phone
    
    def test_blade_ewr_gets_nathan_contact(self, db):
        """Test EWR airport gets Nathan's contact"""
        pickup = Address.objects.create(
            address_line_1='123 Main St',
            city='New York',
            state='NY',
            zip_code='10001'
        )
        
        delivery = Address.objects.create(
            address_line_1='EWR Airport',
            city='Newark',
            state='NJ',
            zip_code='07114'
        )
        
        guest = GuestCheckout.objects.create(
            first_name='Blade',
            last_name='Customer',
            email='blade@example.com',
            phone='5559876543'
        )
        
        booking = Booking.objects.create(
            service_type='blade_transfer',
            guest_checkout=guest,
            pickup_address=pickup,
            delivery_address=delivery,
            pickup_date=timezone.now().date() + timedelta(days=2),
            blade_airport='EWR',  # Newark
            blade_bag_count=2,
            blade_flight_date=timezone.now().date() + timedelta(days=2),
            blade_flight_time=dt_time(16, 0),
            total_price_cents=15000,
            status='paid'
        )
        
        integration = ToteTaxiOnfleetIntegration()
        pickup, dropoff = integration.create_tasks_for_booking(booking)
        
        assert 'Nathan' in dropoff.recipient_name
        assert '+19083992284' in dropoff.recipient_phone or '9083992284' in dropoff.recipient_phone


@pytest.mark.django_db
class TestTaskCreationSignal:
    """Test automatic task creation via Django signal"""
    
    def test_signal_creates_tasks_on_paid_status(self, test_booking):
        """Test signal auto-creates tasks when booking is marked paid"""
        # Booking fixture already has status='paid', but tasks created before signal
        # Create a new booking with pending status
        test_booking.status = 'pending_payment'
        test_booking.save()
        
        # Delete any existing tasks
        OnfleetTask.objects.filter(booking=test_booking).delete()
        
        # Change status to paid (should trigger signal)
        test_booking.status = 'paid'
        test_booking.save()
        
        # Check tasks were created
        tasks = OnfleetTask.objects.filter(booking=test_booking)
        assert tasks.count() == 2
        assert tasks.filter(task_type='pickup').exists()
        assert tasks.filter(task_type='dropoff').exists()
    
    def test_signal_creates_tasks_on_confirmed_status(self, test_booking):
        """Test signal works with 'confirmed' status too"""
        test_booking.status = 'pending_payment'
        test_booking.save()
        
        OnfleetTask.objects.filter(booking=test_booking).delete()
        
        test_booking.status = 'confirmed'
        test_booking.save()
        
        tasks = OnfleetTask.objects.filter(booking=test_booking)
        assert tasks.count() == 2
    
    def test_signal_does_not_duplicate_tasks(self, test_booking):
        """Test signal doesn't create duplicate tasks"""
        # Ensure tasks exist
        integration = ToteTaxiOnfleetIntegration()
        integration.create_tasks_for_booking(test_booking)
        
        initial_count = OnfleetTask.objects.filter(booking=test_booking).count()
        
        # Update booking (should not create more tasks)
        test_booking.status = 'paid'
        test_booking.save()
        
        final_count = OnfleetTask.objects.filter(booking=test_booking).count()
        assert final_count == initial_count == 2


@pytest.mark.django_db
class TestStatusMapping:
    """Test Onfleet state to status mapping"""
    
    def test_map_onfleet_state_unassigned(self):
        """Test state 0 maps to 'created'"""
        integration = ToteTaxiOnfleetIntegration()
        assert integration._map_onfleet_state(0) == 'created'
    
    def test_map_onfleet_state_assigned(self):
        """Test state 1 maps to 'assigned'"""
        integration = ToteTaxiOnfleetIntegration()
        assert integration._map_onfleet_state(1) == 'assigned'
    
    def test_map_onfleet_state_active(self):
        """Test state 2 maps to 'active'"""
        integration = ToteTaxiOnfleetIntegration()
        assert integration._map_onfleet_state(2) == 'active'
    
    def test_map_onfleet_state_completed(self):
        """Test state 3 maps to 'completed'"""
        integration = ToteTaxiOnfleetIntegration()
        assert integration._map_onfleet_state(3) == 'completed'
    
    def test_map_onfleet_state_unknown(self):
        """Test unknown state defaults to 'created'"""
        integration = ToteTaxiOnfleetIntegration()
        assert integration._map_onfleet_state(999) == 'created'


@pytest.mark.django_db
class TestMockMode:
    """Test mock mode behavior"""
    
    def test_mock_mode_enabled_by_default(self):
        """Test mock mode is enabled in test environment"""
        service = OnfleetService()
        assert service.mock_mode is True
    
    def test_mock_mode_returns_mock_data(self, test_booking):
        """Test mock mode returns predictable mock data"""
        integration = ToteTaxiOnfleetIntegration()
        pickup, dropoff = integration.create_tasks_for_booking(test_booking)
        
        # Mock IDs should start with 'mock_'
        assert pickup.onfleet_task_id.startswith('mock_')
        assert dropoff.onfleet_task_id.startswith('mock_')
    
    def test_mock_organization_info(self):
        """Test mock organization info"""
        service = OnfleetService()
        org_info = service.get_organization_info()
        
        assert 'MOCK MODE' in org_info['name']
        assert 'workers' in org_info
        assert len(org_info['workers']) >= 2


@pytest.mark.django_db
class TestPhoneFormatting:
    """Test phone number formatting"""
    
    def test_format_phone_adds_country_code(self):
        """Test 10-digit phone gets +1 prefix"""
        integration = ToteTaxiOnfleetIntegration()
        formatted = integration._format_phone('5551234567')
        assert formatted == '+15551234567'
    
    def test_format_phone_handles_dashes(self):
        """Test phone with dashes is cleaned"""
        integration = ToteTaxiOnfleetIntegration()
        formatted = integration._format_phone('555-123-4567')
        assert formatted == '+15551234567'
    
    def test_format_phone_handles_parentheses(self):
        """Test phone with parentheses is cleaned"""
        integration = ToteTaxiOnfleetIntegration()
        formatted = integration._format_phone('(555) 123-4567')
        assert formatted == '+15551234567'
    
    def test_format_phone_handles_spaces(self):
        """Test phone with spaces is cleaned"""
        integration = ToteTaxiOnfleetIntegration()
        formatted = integration._format_phone('555 123 4567')
        assert formatted == '+15551234567'
    
    def test_format_phone_preserves_existing_country_code(self):
        """Test phone that already has +1 is preserved"""
        integration = ToteTaxiOnfleetIntegration()
        formatted = integration._format_phone('+15551234567')
        assert formatted == '+15551234567'
    
    def test_format_phone_empty_string_fallback(self):
        """Test empty phone returns fallback"""
        integration = ToteTaxiOnfleetIntegration()
        formatted = integration._format_phone('')
        assert formatted == '+1234567890'  # Fallback for testing


@pytest.mark.django_db
class TestUniqueConstraint:
    """Test database constraints"""
    
    def test_cannot_create_duplicate_pickup_task(self, test_booking):
        """Test unique constraint prevents duplicate pickup tasks"""
        integration = ToteTaxiOnfleetIntegration()
        pickup, dropoff = integration.create_tasks_for_booking(test_booking)
        
        # Try to create another pickup task directly
        with pytest.raises(Exception):
            OnfleetTask.objects.create(
                booking=test_booking,
                task_type='pickup',
                onfleet_task_id='duplicate_pickup',
                environment='sandbox'
            )
    
    def test_cannot_create_duplicate_dropoff_task(self, test_booking):
        """Test unique constraint prevents duplicate dropoff tasks"""
        integration = ToteTaxiOnfleetIntegration()
        pickup, dropoff = integration.create_tasks_for_booking(test_booking)
        
        # Try to create another dropoff task directly
        with pytest.raises(Exception):
            OnfleetTask.objects.create(
                booking=test_booking,
                task_type='dropoff',
                onfleet_task_id='duplicate_dropoff',
                environment='sandbox'
            )