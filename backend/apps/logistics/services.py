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
            # ✅ IMPROVED: Better error logging
            error_detail = ''
            if hasattr(e, 'response') and e.response is not None:
                try:
                    error_detail = e.response.json()
                except:
                    error_detail = e.response.text
            
            logger.error(f"Onfleet API error ({method} {endpoint}): {e}")
            logger.error(f"Error details: {error_detail}")
            logger.error(f"Request data: {data}")
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
                'worker': None,  # No worker in mock mode
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
        
        elif endpoint.startswith('workers/'):
            # Mock worker lookup
            return {
                'id': endpoint.split('/')[-1],
                'name': 'Test Driver',
                'onDuty': True
            }
        
        return {'success': True, 'mock': True}
    
    def create_task(self, task_data: dict) -> dict:
        """Create task in Onfleet"""
        return self._make_request('POST', 'tasks', task_data)
    
    def get_organization_info(self) -> dict:
        """Get organization info"""
        return self._make_request('GET', 'organization')
    
    def get_worker(self, worker_id: str) -> dict:
        """Get worker details"""
        return self._make_request('GET', f'workers/{worker_id}')


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
            
            # 3. Save to database with correct status
            db_pickup = OnfleetTask.objects.create(
                booking=booking,
                task_type='pickup',
                environment=self.onfleet.environment,
                onfleet_task_id=pickup_response['id'],
                onfleet_short_id=pickup_response.get('shortId', ''),
                tracking_url=pickup_response.get('trackingURL', ''),
                recipient_name=booking.get_customer_name(),
                recipient_phone=self._get_customer_phone(booking),
                # ✅ FIX: Map Onfleet state to our status
                status=self._map_onfleet_state(pickup_response.get('state', 0)),
                # ✅ FIX: Save worker info if auto-assigned
                worker_id=pickup_response.get('worker', '') or '',
                worker_name=self._get_worker_name(pickup_response.get('worker'))
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
                # ✅ FIX: Map Onfleet state to our status
                status=self._map_onfleet_state(dropoff_response.get('state', 0)),
                # ✅ FIX: Save worker info if auto-assigned
                worker_id=dropoff_response.get('worker', '') or '',
                worker_name=self._get_worker_name(dropoff_response.get('worker'))
            )
            
            logger.info(f"✓ Onfleet tasks saved to database: {db_pickup.id}, {db_dropoff.id}")
            
            return db_pickup, db_dropoff
            
        except Exception as e:
            logger.error(f"Failed to create Onfleet tasks: {e}", exc_info=True)
            return None, None
    
    def _map_onfleet_state(self, state: int) -> str:
        """
        Map Onfleet state codes to our status values
        Onfleet states: 0=unassigned, 1=assigned, 2=active, 3=completed
        """
        mapping = {
            0: 'created',      # Unassigned
            1: 'assigned',     # Assigned to worker
            2: 'active',       # In progress
            3: 'completed'     # Completed
        }
        return mapping.get(state, 'created')
    
    def _get_worker_name(self, worker_id_or_obj) -> str:
        """Get worker name from ID or object"""
        if not worker_id_or_obj:
            return ''
        
        # If it's already a dict/object with name
        if isinstance(worker_id_or_obj, dict):
            return worker_id_or_obj.get('name', '')
        
        # If it's just an ID string, fetch from API
        try:
            worker = self.onfleet.get_worker(worker_id_or_obj)
            return worker.get('name', '')
        except Exception as e:
            logger.warning(f"Could not fetch worker name for {worker_id_or_obj}: {e}")
            return ''
    
    def _create_pickup_task(self, booking) -> dict:
        """Create pickup task"""
        # Get timing
        pickup_datetime = self._get_pickup_datetime(booking)
        complete_after = int(pickup_datetime.timestamp() * 1000)
        
        # Calculate pickup window (30 min before to 30 min after)
        window_start = pickup_datetime - timedelta(minutes=30)
        window_end = pickup_datetime + timedelta(minutes=30)
        
        task_data = {
            'destination': {
                'address': {
                    'number': booking.pickup_address.split(',')[0] if ',' in booking.pickup_address else '',
                    'street': booking.pickup_address.split(',')[1].strip() if ',' in booking.pickup_address else booking.pickup_address,
                    'city': booking.pickup_city or 'New York',
                    'state': booking.pickup_state or 'NY',
                    'postalCode': booking.pickup_zip or '',
                    'country': 'USA'
                }
            },
            'recipients': [{
                'name': booking.get_customer_name(),
                'phone': self._format_phone(self._get_customer_phone(booking)),
                'notes': booking.special_instructions or ''
            }],
            'completeAfter': int(window_start.timestamp() * 1000),
            'completeBefore': int(window_end.timestamp() * 1000),
            'pickupTask': True,
            'autoAssign': {'mode': 'distance'},
            'notes': self._format_task_notes(booking, 'pickup'),
            'metadata': [
                {'name': 'booking_number', 'type': 'string', 'value': booking.booking_number},
                {'name': 'task_type', 'type': 'string', 'value': 'pickup'},
                {'name': 'service_type', 'type': 'string', 'value': booking.service_type}
            ]
        }
        
        return self.onfleet.create_task(task_data)
    
    def _create_dropoff_task(self, booking, depends_on: str) -> dict:
        """Create dropoff task"""
        # Get timing
        dropoff_datetime = self._get_dropoff_datetime(booking)
        
        # Calculate dropoff window (30 min before to 1 hour after)
        window_start = dropoff_datetime - timedelta(minutes=30)
        window_end = dropoff_datetime + timedelta(hours=1)
        
        task_data = {
            'destination': {
                'address': {
                    'number': booking.dropoff_address.split(',')[0] if ',' in booking.dropoff_address else '',
                    'street': booking.dropoff_address.split(',')[1].strip() if ',' in booking.dropoff_address else booking.dropoff_address,
                    'city': booking.dropoff_city or 'New York',
                    'state': booking.dropoff_state or 'NY',
                    'postalCode': booking.dropoff_zip or '',
                    'country': 'USA'
                }
            },
            'recipients': [{
                'name': self._get_dropoff_recipient_name(booking),
                'phone': self._format_phone(self._get_dropoff_recipient_phone(booking)),
                'notes': booking.special_instructions or ''
            }],
            'completeAfter': int(window_start.timestamp() * 1000),
            'completeBefore': int(window_end.timestamp() * 1000),
            'pickupTask': False,
            'dependencies': [depends_on],  # Must complete pickup first
            'autoAssign': {'mode': 'distance'},
            'notes': self._format_task_notes(booking, 'dropoff'),
            'metadata': [
                {'name': 'booking_number', 'type': 'string', 'value': booking.booking_number},
                {'name': 'task_type', 'type': 'string', 'value': 'dropoff'},
                {'name': 'service_type', 'type': 'string', 'value': booking.service_type}
            ]
        }
        
        return self.onfleet.create_task(task_data)
    
    def _get_pickup_datetime(self, booking) -> datetime:
        """Get pickup datetime"""
        if booking.pickup_time:
            return datetime.combine(booking.pickup_date, booking.pickup_time, tzinfo=timezone.get_current_timezone())
        return datetime.combine(booking.pickup_date, dt_time(9, 0), tzinfo=timezone.get_current_timezone())
    
    def _get_dropoff_datetime(self, booking) -> datetime:
        """Get dropoff datetime"""
        if booking.dropoff_time:
            return datetime.combine(booking.dropoff_date, booking.dropoff_time, tzinfo=timezone.get_current_timezone())
        
        # Default: 2 hours after pickup
        pickup_dt = self._get_pickup_datetime(booking)
        return pickup_dt + timedelta(hours=2)
    
    def _format_task_notes(self, booking, task_type: str) -> str:
        """Format task notes for driver"""
        notes = [
            f"ToteTaxi Booking: {booking.booking_number}",
            f"Service: {booking.get_service_type_display()}",
            f"Task: {task_type.upper()}"
        ]
        
        if booking.service_type == 'luggage_transfer':
            notes.append(f"Items: {booking.luggage_count} pieces")
        elif booking.service_type == 'specialty_item':
            notes.append(f"Item: {booking.specialty_item_description or 'See details'}")
        elif booking.service_type == 'blade_transfer':
            notes.append(f"Airport: {booking.get_blade_airport_display()}")
            notes.append(f"Bags: {booking.blade_bag_count}")
        
        if booking.special_instructions:
            notes.append(f"Special: {booking.special_instructions}")
        
        return '\n'.join(notes)
    
    def _get_blade_contact(self, airport_code: str) -> Tuple[str, str]:
        """Get BLADE contact info by airport"""
        blade_contacts = {
            'JFK': ('BLADE JFK Terminal', '+12125551234'),
            'EWR': ('BLADE Newark Terminal', '+19735551234'),
            'LGA': ('BLADE LaGuardia Terminal', '+17185551234'),
        }
        return blade_contacts.get(airport_code, ('BLADE Terminal', '+12125551234'))
    
    def _get_customer_phone(self, booking) -> str:
        """Get customer phone number"""
        try:
            if hasattr(booking, 'customer') and booking.customer:
                if hasattr(booking.customer, 'profile'):
                    return booking.customer.profile.phone or ''
            return booking.customer_phone or ''
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
            _, blade_phone = self._get_blade_contact(booking.blade_airport)
            return blade_phone
        return self._get_customer_phone(booking)
    
    def _get_dropoff_recipient_name(self, booking) -> str:
        """Get recipient name for dropoff task"""
        if booking.service_type == 'blade_transfer':
            blade_name, _ = self._get_blade_contact(booking.blade_airport)
            return f"BLADE Team - {blade_name}"
        return booking.get_customer_name()
    
    def handle_webhook(self, webhook_data: dict) -> bool:
        """
        Process Onfleet webhook updates
        
        ✅ FIXED: OnFleet sends taskId at root level, not in data.id
        Reference: https://docs.onfleet.com/reference/webhook-payload-examples
        """
        from .models import OnfleetTask
        
        try:
            # ✅ FIX: OnFleet always sends taskId at root level for task-related webhooks
            task_id = webhook_data.get('taskId')
            
            # Fallback: check nested location (defensive programming)
            if not task_id:
                task_data = webhook_data.get('data', {})
                task_obj = task_data.get('task', {})
                task_id = task_obj.get('id')
            
            if not task_id:
                logger.warning("Webhook received without task ID")
                logger.debug(f"Webhook payload: {webhook_data}")
                return False
            
            # Find task in database
            try:
                onfleet_task = OnfleetTask.objects.get(onfleet_task_id=task_id)
            except OnfleetTask.DoesNotExist:
                logger.warning(f"Task not found in database: {task_id}")
                return False
            
            # Get event type
            trigger_id = webhook_data.get('triggerId')
            
            # ✅ FIX: Access task data from the correct nested location
            task_data = webhook_data.get('data', {})
            task_obj = task_data.get('task', {})
            
            # Handle different events
            if trigger_id == 0:  # Task Started
                onfleet_task.status = 'active'
                onfleet_task.started_at = timezone.now()
                worker = task_obj.get('worker')
                if worker:
                    if isinstance(worker, dict):
                        onfleet_task.worker_id = worker.get('id', '')
                        onfleet_task.worker_name = worker.get('name', '')
                    else:
                        onfleet_task.worker_id = worker
                        onfleet_task.worker_name = self._get_worker_name(worker)
                onfleet_task.save()
                logger.info(f"Task started: {task_id} ({onfleet_task.task_type})")
            
            elif trigger_id == 3:  # Task Completed (triggerId 3, not 1!)
                onfleet_task.status = 'completed'
                onfleet_task.completed_at = timezone.now()
                
                # Save proof of delivery
                completion = task_obj.get('completionDetails', {})
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
            
            elif trigger_id == 4:  # Task Failed
                onfleet_task.status = 'failed'
                completion = task_obj.get('completionDetails', {})
                onfleet_task.failure_reason = completion.get('failureReason', '')
                onfleet_task.failure_notes = completion.get('failureNotes', '')
                onfleet_task.save()
                logger.error(f"Task failed: {task_id} - {onfleet_task.failure_reason}")
            
            elif trigger_id == 8:  # Task Deleted
                onfleet_task.status = 'deleted'
                onfleet_task.save()
                logger.warning(f"Task deleted: {task_id}")
            
            elif trigger_id == 1:  # Task ETA Changed
                # ✅ FIX: ETA data may be at different levels depending on trigger
                eta_timestamp = task_obj.get('estimatedCompletionTime')
                if eta_timestamp:
                    onfleet_task.estimated_arrival = datetime.fromtimestamp(eta_timestamp / 1000, tz=timezone.get_current_timezone())
                    onfleet_task.save()
                    logger.info(f"Task ETA updated: {task_id}")
            
            elif trigger_id == 9:  # Task Assigned
                onfleet_task.status = 'assigned'
                
                # Worker can be in multiple places depending on webhook
                worker = task_obj.get('worker') or webhook_data.get('data', {}).get('worker')
                if worker:
                    if isinstance(worker, dict):
                        onfleet_task.worker_id = worker.get('id', '')
                        onfleet_task.worker_name = worker.get('name', '')
                    else:
                        onfleet_task.worker_id = worker
                        onfleet_task.worker_name = self._get_worker_name(worker)
                onfleet_task.save()
                logger.info(f"Task assigned: {task_id} to {onfleet_task.worker_name}")
            
            elif trigger_id == 10:  # Task Unassigned
                onfleet_task.status = 'created'
                onfleet_task.worker_id = ''
                onfleet_task.worker_name = ''
                onfleet_task.save()
                logger.info(f"Task unassigned: {task_id}")
            
            else:
                logger.info(f"Unhandled webhook trigger: {trigger_id} for task {task_id}")
            
            return True
            
        except Exception as e:
            logger.error(f"Webhook processing error: {e}", exc_info=True)
            logger.error(f"Webhook data: {webhook_data}")
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