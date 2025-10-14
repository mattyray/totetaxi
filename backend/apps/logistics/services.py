# apps/logistics/services.py
import requests
from django.conf import settings
from django.utils import timezone
from datetime import datetime, timedelta, time as dt_time
from typing import Dict, Optional, Tuple
import logging

logger = logging.getLogger(__name__)


class OnfleetService:
    """Low-level Onfleet API wrapper"""
    
    def __init__(self):
        self.api_key = getattr(settings, 'ONFLEET_API_KEY', '')
        self.base_url = 'https://onfleet.com/api/v2'
        self.mock_mode = getattr(settings, 'ONFLEET_MOCK_MODE', True)
        self.environment = getattr(settings, 'ONFLEET_ENVIRONMENT', 'sandbox')
    
    def _make_request(self, method: str, endpoint: str, data: dict = None) -> dict:
        """Make authenticated request to Onfleet API"""
        if self.mock_mode:
            return self._mock_response(method, endpoint, data)
        
        url = f"{self.base_url}/{endpoint}"
        auth = (self.api_key, '')
        headers = {'Content-Type': 'application/json'}
        
        try:
            if method == 'GET':
                response = requests.get(url, auth=auth, headers=headers)
            elif method == 'POST':
                response = requests.post(url, auth=auth, headers=headers, json=data)
            elif method == 'PUT':
                response = requests.put(url, auth=auth, headers=headers, json=data)
            elif method == 'DELETE':
                response = requests.delete(url, auth=auth, headers=headers)
            
            response.raise_for_status()
            return response.json()
        
        except requests.RequestException as e:
            logger.error(f"Onfleet API error ({method} {endpoint}): {e}")
            raise
    
    def _mock_response(self, method: str, endpoint: str, data: dict = None) -> dict:
        """Mock responses for development"""
        if endpoint == 'tasks' and method == 'POST':
            # Extract metadata for better mock IDs
            task_metadata = data.get('metadata', [])
            booking_number = next(
                (m['value'] for m in task_metadata if m.get('name') == 'booking_number'),
                'unknown'
            )
            task_type = next(
                (m['value'] for m in task_metadata if m.get('name') == 'task_type'),
                'unknown'
            )
            
            mock_id = f'mock_{task_type}_{hash(booking_number) % 10000:04d}'
            
            return {
                'id': mock_id,
                'shortId': f'mt{hash(booking_number) % 1000:03d}',
                'trackingURL': f'https://onf.lt/mock{hash(f"{booking_number}{task_type}") % 10000:04d}',
                'state': 0,  # 0 = unassigned
                'merchant': 'mock_org_id',
                'creator': 'mock_admin_id',
                'pickupTask': data.get('pickupTask', False),
                'dependencies': data.get('dependencies', [])
            }
        
        elif endpoint == 'organization':
            return {
                'id': 'mock_org_id',
                'name': f'ToteTaxi ({self.environment.upper()} - MOCK MODE)',
                'activeTasks': 5,
                'workers': [
                    {'id': 'mock_worker_1', 'name': 'Test Driver 1', 'onDuty': True},
                    {'id': 'mock_worker_2', 'name': 'Test Driver 2', 'onDuty': False}
                ]
            }
        
        return {'success': True, 'mock': True}
    
    def create_task(self, task_data: dict) -> dict:
        """Create task in Onfleet"""
        return self._make_request('POST', 'tasks', task_data)
    
    def get_organization_info(self) -> dict:
        """Get organization info"""
        return self._make_request('GET', 'organization')


class ToteTaxiOnfleetIntegration:
    """High-level integration manager for ToteTaxi + Onfleet"""
    
    def __init__(self):
        self.onfleet = OnfleetService()
    
    def create_tasks_for_booking(self, booking) -> Tuple[Optional['OnfleetTask'], Optional['OnfleetTask']]:
        """
        Create 2 linked Onfleet tasks (pickup + dropoff) for a booking
        Returns: (pickup_task, dropoff_task) or (None, None) on failure
        """
        from .models import OnfleetTask
        
        try:
            # Check if tasks already exist
            existing_tasks = OnfleetTask.objects.filter(booking=booking)
            if existing_tasks.exists():
                logger.warning(f"Booking {booking.booking_number} already has Onfleet tasks")
                pickup = existing_tasks.filter(task_type='pickup').first()
                dropoff = existing_tasks.filter(task_type='dropoff').first()
                return pickup, dropoff
            
            logger.info(f"Creating Onfleet tasks for booking {booking.booking_number}")
            
            # 1. Create pickup task
            pickup_response = self._create_pickup_task(booking)
            logger.info(f"✓ Pickup task created: {pickup_response['id']}")
            
            # 2. Create dropoff task (depends on pickup)
            dropoff_response = self._create_dropoff_task(booking, depends_on=pickup_response['id'])
            logger.info(f"✓ Dropoff task created: {dropoff_response['id']}")
            
            # 3. Save to database
            db_pickup = OnfleetTask.objects.create(
                booking=booking,
                task_type='pickup',
                environment=self.onfleet.environment,
                onfleet_task_id=pickup_response['id'],
                onfleet_short_id=pickup_response.get('shortId', ''),
                tracking_url=pickup_response.get('trackingURL', ''),
                recipient_name=booking.get_customer_name(),
                recipient_phone=self._get_customer_phone(booking),
                status='created'
            )
            
            db_dropoff = OnfleetTask.objects.create(
                booking=booking,
                task_type='dropoff',
                environment=self.onfleet.environment,
                onfleet_task_id=dropoff_response['id'],
                onfleet_short_id=dropoff_response.get('shortId', ''),
                tracking_url=dropoff_response.get('trackingURL', ''),
                recipient_name=self._get_dropoff_recipient_name(booking),
                recipient_phone=self._get_dropoff_recipient_phone(booking),
                linked_task=db_pickup,
                status='created'
            )
            
            logger.info(f"✓ Successfully created 2 tasks for booking {booking.booking_number}")
            logger.info(f"  Pickup tracking: {db_pickup.tracking_url}")
            logger.info(f"  Dropoff tracking: {db_dropoff.tracking_url}")
            
            return db_pickup, db_dropoff
            
        except Exception as e:
            logger.error(f"Failed to create Onfleet tasks for {booking.booking_number}: {e}", exc_info=True)
            return None, None
    
    def _create_pickup_task(self, booking) -> dict:
        """Create Onfleet pickup task"""
        
        # Calculate time windows
        pickup_datetime = self._get_pickup_datetime(booking)
        pickup_complete_after = int(pickup_datetime.timestamp() * 1000)
        pickup_complete_before = int((pickup_datetime + timedelta(hours=3)).timestamp() * 1000)
        
        task_data = {
            "pickupTask": True,
            "destination": {
                "address": {
                    "unparsed": self._format_address(booking.pickup_address),
                },
                "notes": self._format_destination_notes(booking.pickup_address, booking.special_instructions)
            },
            "recipients": [{
                "name": booking.get_customer_name(),
                "phone": self._format_phone(self._get_customer_phone(booking)),
                "notes": f"Booking #{booking.booking_number}",
                "skipSMSNotifications": False
            }],
            "completeAfter": pickup_complete_after,
            "completeBefore": pickup_complete_before,
            "notes": self._format_task_notes(booking, 'pickup'),
            "metadata": [
                {"name": "booking_id", "type": "string", "value": str(booking.id)},
                {"name": "booking_number", "type": "string", "value": booking.booking_number},
                {"name": "service_type", "type": "string", "value": booking.service_type},
                {"name": "task_type", "type": "string", "value": "pickup"},
                {"name": "environment", "type": "string", "value": self.onfleet.environment}
            ],
            "completionRequirements": {
                "photo": True,
                "notes": True,  # For item count
            },
            "autoAssign": {
                "mode": "manual"
            }
        }
        
        return self.onfleet.create_task(task_data)
    
    def _create_dropoff_task(self, booking, depends_on: str) -> dict:
        """Create Onfleet dropoff task (linked to pickup)"""
        
        # Determine recipient based on service type
        is_blade = booking.service_type == 'blade_transfer'
        
        if is_blade:
            recipient_name = "BLADE Team"
            recipient_phone = getattr(settings, 'BLADE_PHONE_NUMBER', '+1234567890')
            destination_address = f"{booking.blade_airport} Airport - BLADE Terminal"
            destination_notes = "BLADE Terminal - Check in with agent"
        else:
            recipient_name = booking.get_customer_name()
            recipient_phone = self._format_phone(self._get_customer_phone(booking))
            destination_address = self._format_address(booking.delivery_address)
            destination_notes = self._format_destination_notes(booking.delivery_address)
        
        # Calculate dropoff deadline
        dropoff_deadline = self._calculate_dropoff_deadline(booking)
        
        task_data = {
            "pickupTask": False,
            "dependencies": [depends_on],  # Link to pickup task
            "destination": {
                "address": {
                    "unparsed": destination_address,
                },
                "notes": destination_notes
            },
            "recipients": [{
                "name": recipient_name,
                "phone": recipient_phone,
                "notes": f"Booking #{booking.booking_number}",
                "skipSMSNotifications": False
            }],
            "completeBefore": int(dropoff_deadline.timestamp() * 1000),
            "notes": self._format_task_notes(booking, 'dropoff'),
            "metadata": [
                {"name": "booking_id", "type": "string", "value": str(booking.id)},
                {"name": "booking_number", "type": "string", "value": booking.booking_number},
                {"name": "service_type", "type": "string", "value": booking.service_type},
                {"name": "task_type", "type": "string", "value": "dropoff"},
                {"name": "environment", "type": "string", "value": self.onfleet.environment}
            ],
            "completionRequirements": {
                "signature": True,
                "photo": True,
                "notes": True,
            },
            "autoAssign": {
                "mode": "manual"
            }
        }
        
        return self.onfleet.create_task(task_data)
    
    def _format_task_notes(self, booking, task_type: str) -> str:
        """Generate detailed task notes for driver"""
        prefix = "🔵 PICKUP" if task_type == 'pickup' else "🟢 DROPOFF"
        
        if booking.service_type == 'blade_transfer' and task_type == 'dropoff':
            prefix = "🚁 BLADE DROPOFF"
        
        lines = [
            f"{prefix} - {booking.service_type.upper().replace('_', ' ')}",
            f"Booking: {booking.booking_number}",
            ""
        ]
        
        # Service-specific details
        if booking.service_type == 'mini_move' and booking.mini_move_package:
            lines.append(f"Package: {booking.mini_move_package.name}")
            if booking.include_packing:
                lines.append("⚠️ PACKING SERVICE INCLUDED")
            if booking.include_unpacking:
                lines.append("⚠️ UNPACKING SERVICE INCLUDED")
        
        elif booking.service_type == 'blade_transfer':
            lines.extend([
                f"✈️ Flight: {booking.blade_flight_date} @ {booking.blade_flight_time}",
                f"Airport: {booking.blade_airport}",
                f"Bag Count: {booking.blade_bag_count}",
                f"⏰ READY TIME: {booking.blade_ready_time} (3hrs before flight)"
            ])
        
        elif booking.service_type == 'specialty_item':
            items = ', '.join([item.name for item in booking.specialty_items.all()])
            lines.append(f"Items: {items}")
        
        elif booking.service_type == 'standard_delivery':
            if booking.standard_delivery_item_count:
                lines.append(f"Item Count: {booking.standard_delivery_item_count}")
            if booking.is_same_day_delivery:
                lines.append("⚠️ SAME-DAY DELIVERY")
        
        if booking.coi_required:
            lines.append("📋 COI REQUIRED")
        
        if booking.special_instructions:
            lines.extend(["", "Special Instructions:", booking.special_instructions])
        
        return '\n'.join(lines)
    
    def _format_address(self, address) -> str:
        """Format address for Onfleet"""
        parts = [
            address.address_line_1,
            address.city,
            address.state,
            address.zip_code
        ]
        return ', '.join(filter(None, parts))
    
    def _format_destination_notes(self, address, special_instructions: str = '') -> str:
        """Format destination notes"""
        notes = []
        if address.address_line_2:
            notes.append(f"Building: {address.address_line_2}")
        if special_instructions:
            notes.append(special_instructions)
        return '\n'.join(notes) if notes else ''
    
    def _get_customer_phone(self, booking) -> str:
        """Get customer phone number"""
        try:
            if booking.customer and hasattr(booking.customer, 'customer_profile'):
                return booking.customer.customer_profile.phone or ''
            elif booking.guest_checkout:
                return booking.guest_checkout.phone or ''
        except Exception as e:
            logger.warning(f"Could not get customer phone: {e}")
        return ''
    
    def _format_phone(self, phone_str: str) -> str:
        """Format phone number to E.164 format (+12125550100)"""
        if not phone_str:
            return '+1234567890'  # Fallback for testing
        
        # Remove all non-digits
        digits = ''.join(c for c in phone_str if c.isdigit())
        
        # Add +1 for US numbers
        if len(digits) == 10:
            return f'+1{digits}'
        elif len(digits) == 11 and digits[0] == '1':
            return f'+{digits}'
        else:
            return f'+{digits}' if not phone_str.startswith('+') else phone_str
    
    def _get_dropoff_recipient_phone(self, booking) -> str:
        """Get recipient phone for dropoff task"""
        if booking.service_type == 'blade_transfer':
            return getattr(settings, 'BLADE_PHONE_NUMBER', '+1234567890')
        return self._get_customer_phone(booking)
    
    def _get_dropoff_recipient_name(self, booking) -> str:
        """Get recipient name for dropoff task"""
        if booking.service_type == 'blade_transfer':
            return "BLADE Team"
        return booking.get_customer_name()
    
    def _get_pickup_datetime(self, booking) -> datetime:
        """Get pickup datetime from booking"""
        # Map pickup time strings to actual times
        time_mapping = {
            'morning': dt_time(8, 0),
            'morning_specific': dt_time(9, 0),
            'no_time_preference': dt_time(8, 0),
        }
        
        pickup_time = time_mapping.get(booking.pickup_time, dt_time(8, 0))
        pickup_datetime = datetime.combine(booking.pickup_date, pickup_time)
        
        # Make timezone-aware
        if timezone.is_naive(pickup_datetime):
            pickup_datetime = timezone.make_aware(pickup_datetime)
        
        return pickup_datetime
    
    def _calculate_dropoff_deadline(self, booking) -> datetime:
        """Calculate dropoff deadline based on service type"""
        if booking.service_type == 'blade_transfer':
            # BLADE: Deliver 3 hours before flight time
            flight_datetime = datetime.combine(booking.blade_flight_date, booking.blade_flight_time)
            if timezone.is_naive(flight_datetime):
                flight_datetime = timezone.make_aware(flight_datetime)
            return flight_datetime - timedelta(hours=3)
        
        elif booking.is_same_day_delivery:
            # Same-day: Deliver within 8 hours of booking
            return booking.created_at + timedelta(hours=8)
        
        else:
            # Standard: Deliver by 8 PM next day
            deadline = datetime.combine(booking.pickup_date + timedelta(days=1), dt_time(20, 0))
            if timezone.is_naive(deadline):
                deadline = timezone.make_aware(deadline)
            return deadline
    
    def handle_webhook(self, webhook_data: dict) -> bool:
        """Process Onfleet webhook updates"""
        from .models import OnfleetTask
        
        try:
            task_data = webhook_data.get('data', {})
            task_id = task_data.get('id')
            
            if not task_id:
                logger.warning("Webhook received without task ID")
                return False
            
            # Find task in database
            try:
                onfleet_task = OnfleetTask.objects.get(onfleet_task_id=task_id)
            except OnfleetTask.DoesNotExist:
                logger.warning(f"Task not found in database: {task_id}")
                return False
            
            # Get event type
            trigger_id = webhook_data.get('triggerId')
            
            # Handle different events
            if trigger_id == 0:  # Task Started
                onfleet_task.status = 'active'
                onfleet_task.started_at = timezone.now()
                worker = task_data.get('worker', {})
                if worker:
                    onfleet_task.worker_id = worker.get('id', '')
                    onfleet_task.worker_name = worker.get('name', '')
                onfleet_task.save()
                logger.info(f"Task started: {task_id} ({onfleet_task.task_type})")
            
            elif trigger_id == 1:  # Task Completed
                onfleet_task.status = 'completed'
                onfleet_task.completed_at = timezone.now()
                
                # Save proof of delivery
                completion = task_data.get('completionDetails', {})
                onfleet_task.signature_url = completion.get('signatureUploadId', '')
                onfleet_task.photo_urls = [p.get('uploadId', '') for p in completion.get('photoUploadIds', [])]
                onfleet_task.delivery_notes = completion.get('notes', '')
                onfleet_task.save()
                
                # If this is the DROPOFF task, mark booking as completed
                if onfleet_task.task_type == 'dropoff':
                    booking = onfleet_task.booking
                    booking.status = 'completed'
                    booking.save()
                    logger.info(f"✓ Booking {booking.booking_number} completed")
                
                logger.info(f"Task completed: {task_id} ({onfleet_task.task_type})")
            
            elif trigger_id == 2:  # Task Failed
                onfleet_task.status = 'failed'
                completion = task_data.get('completionDetails', {})
                onfleet_task.failure_reason = completion.get('failureReason', '')
                onfleet_task.failure_notes = completion.get('failureNotes', '')
                onfleet_task.save()
                logger.error(f"Task failed: {task_id} - {onfleet_task.failure_reason}")
            
            elif trigger_id == 3:  # Task Deleted
                onfleet_task.status = 'deleted'
                onfleet_task.save()
                logger.warning(f"Task deleted: {task_id}")
            
            elif trigger_id == 6:  # Task ETA Changed
                eta_timestamp = task_data.get('estimatedCompletionTime')
                if eta_timestamp:
                    onfleet_task.estimated_arrival = datetime.fromtimestamp(eta_timestamp / 1000)
                    onfleet_task.save()
            
            return True
            
        except Exception as e:
            logger.error(f"Webhook processing error: {e}", exc_info=True)
            return False
    
    def get_dashboard_summary(self) -> dict:
        """Get logistics summary for staff dashboard"""
        from .models import OnfleetTask
        from apps.bookings.models import Booking
        from datetime import date
        
        try:
            today = date.today()
            
            todays_bookings = Booking.objects.filter(
                pickup_date=today,
                deleted_at__isnull=True
            )
            
            onfleet_tasks = OnfleetTask.objects.filter(
                created_at__date=today,
                environment=self.onfleet.environment
            )
            
            onfleet_org = self.onfleet.get_organization_info()
            
            return {
                'totetaxi_stats': {
                    'total_bookings': todays_bookings.count(),
                    'confirmed_bookings': todays_bookings.filter(status='confirmed').count(),
                    'completed_bookings': todays_bookings.filter(status='completed').count(),
                },
                'onfleet_stats': {
                    'active_tasks': onfleet_org.get('activeTasks', 0),
                    'available_workers': len([w for w in onfleet_org.get('workers', []) if w.get('onDuty')]),
                    'organization_name': onfleet_org.get('name', 'Unknown')
                },
                'integration_stats': {
                    'tasks_created_today': onfleet_tasks.count(),
                    'pickup_tasks': onfleet_tasks.filter(task_type='pickup').count(),
                    'dropoff_tasks': onfleet_tasks.filter(task_type='dropoff').count(),
                    'tasks_completed_today': onfleet_tasks.filter(status='completed').count(),
                    'tasks_active': onfleet_tasks.filter(status__in=['assigned', 'active']).count(),
                },
                'environment': self.onfleet.environment,
                'mock_mode': self.onfleet.mock_mode
            }
            
        except Exception as e:
            logger.error(f"Error getting dashboard summary: {e}")
            return {
                'error': 'Failed to fetch logistics data',
                'environment': self.onfleet.environment,
                'mock_mode': self.onfleet.mock_mode
            }
    
    # LEGACY METHOD: Keep for backward compatibility
    def create_delivery_task(self, booking):
        """
        Legacy method - now creates 2 tasks instead of 1
        Returns the pickup task for backward compatibility
        """
        pickup, dropoff = self.create_tasks_for_booking(booking)
        return pickup
    


    