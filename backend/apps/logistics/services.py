# apps/logistics/services.py - FIXED VERSION
import requests
from django.conf import settings
from django.utils import timezone
from datetime import time
from typing import Dict, Optional
import logging

logger = logging.getLogger(__name__)


class OnfleetService:
    """Simple Onfleet API wrapper for ToteTaxi integration"""
    
    def __init__(self):
        self.api_key = getattr(settings, 'ONFLEET_API_KEY', '')
        self.base_url = 'https://onfleet.com/api/v2'
        self.mock_mode = getattr(settings, 'ONFLEET_MOCK_MODE', True)
    
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
            
            response.raise_for_status()
            return response.json()
        
        except requests.RequestException as e:
            logger.error(f"Onfleet API error: {e}")
            raise
    
    def _mock_response(self, method: str, endpoint: str, data: dict = None) -> dict:
        """Mock responses for development"""
        if endpoint == 'tasks' and method == 'POST':
            booking_number = data.get('metadata', [{}])[0].get('value', 'unknown')
            return {
                'id': f'mock_task_{hash(booking_number) % 10000}',
                'shortId': f'mt{hash(booking_number) % 1000:03d}',
                'trackingURL': f'https://onf.lt/mock{hash(booking_number) % 10000}',
                'state': 0,
                'merchant': 'mock_org_id',
                'creator': 'mock_admin_id'
            }
        elif endpoint == 'organization':
            return {
                'id': 'mock_org_id',
                'name': 'ToteTaxi (Test Mode)',
                'activeTasks': 3,
                'workers': [
                    {'id': 'mock_worker_1', 'name': 'Test Driver 1', 'onDuty': True},
                    {'id': 'mock_worker_2', 'name': 'Test Driver 2', 'onDuty': True}
                ]
            }
        return {'success': True, 'mock': True}
    
    def _get_customer_phone(self, booking):
        """Get customer phone number - works for both authenticated and guest"""
        try:
            # Authenticated customer
            if booking.customer and hasattr(booking.customer, 'customer_profile'):
                phone = booking.customer.customer_profile.phone
                return phone if phone else ''
            
            # Guest checkout (when we have them)
            elif booking.guest_checkout:
                # Try common phone field names
                for field_name in ['phone', 'customer_phone', 'phone_number']:
                    if hasattr(booking.guest_checkout, field_name):
                        phone = getattr(booking.guest_checkout, field_name)
                        if phone:
                            return phone
            
            return ''
        except Exception as e:
            logger.warning(f"Could not get phone for booking {booking.booking_number}: {e}")
            return ''
    
    def _convert_pickup_time(self, pickup_time_str):
        """Convert string pickup time to time object"""
        time_mapping = {
            'morning': time(9, 0),      # 9:00 AM
            'afternoon': time(14, 0),   # 2:00 PM  
            'evening': time(18, 0)      # 6:00 PM
        }
        return time_mapping.get(pickup_time_str, time(9, 0))
    
    def create_task_from_booking(self, booking) -> dict:
        """Create Onfleet task from ToteTaxi booking"""
        customer_phone = self._get_customer_phone(booking)
        
        task_data = {
            'destination': {
                'address': {
                    'unparsed': f"{booking.delivery_address.address_line_1}, {booking.delivery_address.city}, {booking.delivery_address.state} {booking.delivery_address.zip_code}"
                }
            },
            'recipients': [{
                'name': booking.get_customer_name(),
                'phone': customer_phone,
                'notes': f"ToteTaxi customer - {booking.get_service_type_display()}"
            }],
            'notes': f"ToteTaxi Booking #{booking.booking_number}\nService: {booking.get_service_type_display()}\nInstructions: {booking.special_instructions or 'None'}",
            'metadata': [{
                'name': 'totetaxi_booking_number',
                'type': 'string',
                'value': booking.booking_number,
                'visibility': ['api']
            }, {
                'name': 'totetaxi_booking_id',
                'type': 'string', 
                'value': str(booking.id),
                'visibility': ['api']
            }]
        }
        
        # Handle timing - convert string pickup times
        if booking.pickup_date and booking.pickup_time:
            try:
                pickup_time = self._convert_pickup_time(booking.pickup_time)
                pickup_datetime = timezone.datetime.combine(
                    booking.pickup_date, 
                    pickup_time,
                    tzinfo=timezone.get_current_timezone()
                )
                task_data['completeAfter'] = int(pickup_datetime.timestamp() * 1000)
            except Exception as e:
                logger.warning(f"Could not set timing for booking {booking.booking_number}: {e}")
        
        return self._make_request('POST', 'tasks', task_data)
    
    def get_organization_info(self) -> dict:
        """Get basic organization info for dashboard"""
        return self._make_request('GET', 'organization')


class ToteTaxiOnfleetIntegration:
    """High-level integration manager for ToteTaxi + Onfleet"""
    
    def __init__(self):
        self.onfleet = OnfleetService()
    
    def create_delivery_task(self, booking) -> Optional['OnfleetTask']:
        """Create Onfleet task when ToteTaxi booking is confirmed"""
        from .models import OnfleetTask
        
        try:
            if hasattr(booking, 'onfleet_task'):
                logger.warning(f"Booking {booking.booking_number} already has Onfleet task")
                return booking.onfleet_task
            
            onfleet_response = self.onfleet.create_task_from_booking(booking)
            
            onfleet_task = OnfleetTask.objects.create(
                booking=booking,
                onfleet_task_id=onfleet_response['id'],
                onfleet_short_id=onfleet_response.get('shortId', ''),
                tracking_url=onfleet_response.get('trackingURL', ''),
                status='created'
            )
            
            logger.info(f"Created Onfleet task {onfleet_task.onfleet_task_id} for booking {booking.booking_number}")
            return onfleet_task
            
        except Exception as e:
            logger.error(f"Failed to create Onfleet task for booking {booking.booking_number}: {e}")
            return None
    
    def handle_webhook(self, webhook_data: dict) -> bool:
        """Process Onfleet webhook updates"""
        from .models import OnfleetTask
        
        try:
            task_data = webhook_data.get('data', {}).get('task', {})
            
            if not task_data.get('id'):
                return False
            
            onfleet_task = OnfleetTask.objects.get(onfleet_task_id=task_data['id'])
            onfleet_state = task_data.get('state')
            
            if onfleet_state is not None:
                onfleet_task.sync_status_from_onfleet(onfleet_state)
                return True
            
            return False
            
        except OnfleetTask.DoesNotExist:
            logger.warning(f"Onfleet task {task_data.get('id')} not found")
            return False
        except Exception as e:
            logger.error(f"Webhook processing error: {e}")
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
            
            onfleet_tasks = OnfleetTask.objects.filter(created_at__date=today)
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
                    'tasks_completed_today': onfleet_tasks.filter(status='completed').count(),
                    'tasks_active': onfleet_tasks.filter(status__in=['assigned', 'active']).count(),
                }
            }
            
        except Exception as e:
            logger.error(f"Error getting dashboard summary: {e}")
            return {
                'error': 'Failed to fetch logistics data',
                'totetaxi_stats': {'total_bookings': 0, 'confirmed_bookings': 0, 'completed_bookings': 0},
                'onfleet_stats': {'active_tasks': 0, 'available_workers': 0, 'organization_name': 'Error'},
                'integration_stats': {'tasks_created_today': 0, 'tasks_completed_today': 0, 'tasks_active': 0}
            }