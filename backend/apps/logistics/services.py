import logging
import re
import time
from datetime import datetime, timedelta, time as dt_time
from typing import Dict, Optional, Tuple

import requests
from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)


def parse_street_address(address_line_1: str) -> Tuple[str, str]:
    """Parse a full street address into street number and street name for Onfleet."""
    if not address_line_1:
        return "", ""
    
    address_line_1 = address_line_1.strip()
    pattern = r'^(\d+(?:[A-Z]|[-\s]*[A-Z]|[-\s]*\d+/\d+)?)\s+(.+)'
    match = re.match(pattern, address_line_1, re.IGNORECASE)
    
    if match:
        return match.group(1).strip(), match.group(2).strip()
    else:
        return "", address_line_1


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
            error_detail = ''
            if hasattr(e, 'response') and e.response is not None:
                try:
                    error_detail = e.response.json()
                except Exception:
                    error_detail = e.response.text

            logger.error(f"Onfleet API error ({method} {endpoint}): {e}")
            logger.error(f"Error details: {error_detail}")
            logger.error(f"Request data: {data}")
            raise

    def _mock_response(self, method: str, endpoint: str, data: dict = None) -> dict:
        """Mock responses for development"""
        if endpoint == 'tasks' and method == 'POST':
            task_metadata = data.get('metadata', [])
            booking_number = next((m['value'] for m in task_metadata if m.get('name') == 'booking_number'), 'unknown')
            task_type = next((m['value'] for m in task_metadata if m.get('name') == 'task_type'), 'unknown')

            mock_id = f'mock_{task_type}_{hash(booking_number) % 10000:04d}'

            return {
                'id': mock_id,
                'shortId': f'mt{hash(booking_number) % 1000:03d}',
                'trackingURL': f'https://onf.lt/mock{hash(f"{booking_number}{task_type}") % 10000:04d}',
                'state': 0,
                'worker': None,
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
            return {
                'id': endpoint.split('/')[-1],
                'name': 'Test Driver',
                'onDuty': True
            }

        return {'success': True, 'mock': True}

    def create_task(self, task_data: dict) -> dict:
        return self._make_request('POST', 'tasks', task_data)

    def get_organization_info(self) -> dict:
        return self._make_request('GET', 'organization')

    def get_worker(self, worker_id: str) -> dict:
        return self._make_request('GET', f'workers/{worker_id}')


class ToteTaxiOnfleetIntegration:
    """High-level integration manager for ToteTaxi + Onfleet"""

    def __init__(self):
        self.onfleet = OnfleetService()

    def create_tasks_for_booking(self, booking) -> Tuple[Optional['OnfleetTask'], Optional['OnfleetTask']]:
        from .models import OnfleetTask

        try:
            existing = OnfleetTask.objects.filter(booking=booking)
            if existing.exists():
                logger.warning(f"Booking {booking.booking_number} already has Onfleet tasks")
                return existing.filter(task_type='pickup').first(), existing.filter(task_type='dropoff').first()

            logger.info(f"Creating Onfleet tasks for booking {booking.booking_number}")

            pickup_response = self._create_pickup_task(booking)
            logger.info(f"✓ Pickup task created: {pickup_response['id']}")

            dropoff_response = self._create_dropoff_task(booking, depends_on=pickup_response['id'])
            logger.info(f"✓ Dropoff task created: {dropoff_response['id']}")

            # Determine pickup recipient for DB record
            is_from_airport = (booking.service_type == 'blade_transfer'
                               and getattr(booking, 'transfer_direction', 'to_airport') == 'from_airport')
            if is_from_airport:
                contact_name, contact_phone = self._get_blade_contact(
                    booking.blade_airport, getattr(booking, 'blade_terminal', None))
                pickup_recipient_name = f"Airport Transfer - {contact_name}"
                pickup_recipient_phone = self._format_phone(contact_phone)
            else:
                pickup_recipient_name = booking.get_customer_name()
                pickup_recipient_phone = self._format_phone(self._get_customer_phone(booking))

            db_pickup = OnfleetTask.objects.create(
                booking=booking,
                task_type='pickup',
                environment=self.onfleet.environment,
                onfleet_task_id=pickup_response['id'],
                onfleet_short_id=pickup_response.get('shortId', ''),
                tracking_url=pickup_response.get('trackingURL', ''),
                recipient_name=pickup_recipient_name,
                recipient_phone=pickup_recipient_phone,
                status=self._map_onfleet_state(pickup_response.get('state', 0)),
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
                recipient_phone=self._format_phone(self._get_dropoff_recipient_phone(booking)),
                linked_task=db_pickup,
                status=self._map_onfleet_state(dropoff_response.get('state', 0)),
                worker_id=dropoff_response.get('worker', '') or '',
                worker_name=self._get_worker_name(dropoff_response.get('worker'))
            )

            logger.info(f"✓ Onfleet tasks saved to database: {db_pickup.id}, {db_dropoff.id}")
            return db_pickup, db_dropoff

        except Exception as e:
            logger.error(f"Failed to create Onfleet tasks: {e}", exc_info=True)
            return None, None

    def _map_onfleet_state(self, state: int) -> str:
        return {
            0: 'created',
            1: 'assigned',
            2: 'active',
            3: 'completed',
        }.get(state, 'created')

    def _get_worker_name(self, worker_id_or_obj) -> str:
        if not worker_id_or_obj:
            return ''
        if isinstance(worker_id_or_obj, dict):
            return worker_id_or_obj.get('name', '')
        try:
            worker = self.onfleet.get_worker(worker_id_or_obj)
            return worker.get('name', '')
        except Exception as e:
            logger.warning(f"Could not fetch worker name for {worker_id_or_obj}: {e}")
            return ''

    def _create_pickup_task(self, booking) -> dict:
        pickup_datetime = self._get_pickup_datetime(booking)
        window_start = pickup_datetime - timedelta(minutes=30)
        window_end = pickup_datetime + timedelta(minutes=30)

        # Determine pickup recipient based on direction
        is_from_airport = (booking.service_type == 'blade_transfer'
                           and getattr(booking, 'transfer_direction', 'to_airport') == 'from_airport')
        if is_from_airport:
            # From airport: pickup is at airport, recipient is airport terminal contact
            contact_name, contact_phone = self._get_blade_contact(
                booking.blade_airport, getattr(booking, 'blade_terminal', None))
            recipient_name = f"Airport Transfer - {contact_name}"
            recipient_phone = self._format_phone(contact_phone)
            destination = self._get_airport_destination(booking.blade_airport)
        else:
            recipient_name = booking.get_customer_name()
            recipient_phone = self._format_phone(self._get_customer_phone(booking))
            street_number, street_name = parse_street_address(booking.pickup_address.address_line_1)
            destination = {
                'address': {
                    'number': street_number,
                    'street': street_name,
                    'apartment': getattr(booking.pickup_address, 'address_line_2', '') or '',
                    'city': booking.pickup_address.city,
                    'state': booking.pickup_address.state,
                    'postalCode': booking.pickup_address.zip_code,
                    'country': 'USA'
                }
            }

        task_data = {
            'destination': destination,
            'recipients': [{
                'name': recipient_name,
                'phone': recipient_phone,
                'notes': booking.special_instructions or ''
            }],
            'completeAfter': int(window_start.timestamp() * 1000),
            'completeBefore': int(window_end.timestamp() * 1000),
            'pickupTask': True,
            'autoAssign': {'mode': 'off'},
            'notes': self._format_task_notes(booking, 'pickup'),
            'metadata': [
                {'name': 'booking_number', 'type': 'string', 'value': booking.booking_number},
                {'name': 'task_type', 'type': 'string', 'value': 'pickup'},
                {'name': 'service_type', 'type': 'string', 'value': booking.service_type}
            ]
        }
        return self.onfleet.create_task(task_data)

    def _create_dropoff_task(self, booking, depends_on: str) -> dict:
        dropoff_datetime = self._get_dropoff_datetime(booking)
        window_start = dropoff_datetime - timedelta(minutes=30)
        window_end = dropoff_datetime + timedelta(hours=1)

        # To airport: dropoff is at airport; from airport: dropoff is at customer
        is_to_airport = (booking.service_type == 'blade_transfer'
                         and getattr(booking, 'transfer_direction', 'to_airport') == 'to_airport')
        if is_to_airport:
            destination = self._get_airport_destination(booking.blade_airport)
        else:
            street_number, street_name = parse_street_address(booking.delivery_address.address_line_1)
            destination = {
                'address': {
                    'number': street_number,
                    'street': street_name,
                    'apartment': getattr(booking.delivery_address, 'address_line_2', '') or '',
                    'city': booking.delivery_address.city,
                    'state': booking.delivery_address.state,
                    'postalCode': booking.delivery_address.zip_code,
                    'country': 'USA'
                }
            }

        task_data = {
            'destination': destination,
            'recipients': [{
                'name': self._get_dropoff_recipient_name(booking),
                'phone': self._format_phone(self._get_dropoff_recipient_phone(booking)),
                'notes': booking.special_instructions or ''
            }],
            'completeAfter': int(window_start.timestamp() * 1000),
            'completeBefore': int(window_end.timestamp() * 1000),
            'pickupTask': False,
            'dependencies': [depends_on],
            'autoAssign': {'mode': 'off'},
            'notes': self._format_task_notes(booking, 'dropoff'),
            'metadata': [
                {'name': 'booking_number', 'type': 'string', 'value': booking.booking_number},
                {'name': 'task_type', 'type': 'string', 'value': 'dropoff'},
                {'name': 'service_type', 'type': 'string', 'value': booking.service_type}
            ]
        }
        return self.onfleet.create_task(task_data)

    def _get_pickup_datetime(self, booking) -> datetime:
        if booking.service_type == 'blade_transfer':
            direction = getattr(booking, 'transfer_direction', 'to_airport')
            if direction == 'from_airport' and booking.blade_flight_time:
                # From airport: pickup at arrival time
                pickup_time_obj = booking.blade_flight_time
                pickup_date = booking.blade_flight_date or booking.pickup_date
                return timezone.make_aware(
                    datetime.combine(pickup_date, pickup_time_obj),
                    timezone.get_current_timezone()
                )
            elif getattr(booking, 'blade_ready_time', None):
                pickup_time_obj = booking.blade_ready_time
            else:
                pickup_time_obj = dt_time(8, 0)
        elif booking.pickup_time == 'morning_specific' and getattr(booking, 'specific_pickup_hour', None):
            pickup_time_obj = dt_time(hour=booking.specific_pickup_hour, minute=0)
        else:
            pickup_times = {
                'morning': dt_time(8, 0),
                'afternoon': dt_time(14, 0),
                'evening': dt_time(18, 0),
                'night': dt_time(22, 0)
            }
            pickup_time_obj = pickup_times.get(booking.pickup_time, dt_time(8, 0))

        return timezone.make_aware(
            datetime.combine(booking.pickup_date, pickup_time_obj),
            timezone.get_current_timezone()
        )

    def _get_dropoff_datetime(self, booking) -> datetime:
        pickup = self._get_pickup_datetime(booking)
        return pickup + timedelta(hours=2)

    def _format_task_notes(self, booking, task_type: str) -> str:
        base_notes = f"ToteTaxi Booking: {booking.booking_number}\n"
        base_notes += f"Service: {booking.get_service_type_display()}\n"
        base_notes += f"Task: {task_type.upper()}\n"

        if booking.service_type == 'blade_transfer':
            direction = getattr(booking, 'transfer_direction', 'to_airport')
            terminal = getattr(booking, 'blade_terminal', None)
            terminal_str = f" Terminal {terminal}" if terminal else ""

            if direction == 'to_airport':
                if task_type == 'pickup':
                    base_notes += f"Origin: Customer Location\n"
                    base_notes += f"Destination: {booking.blade_airport}{terminal_str}\n"
                    base_notes += f"Flight Departure: {booking.blade_flight_time}\n"
                else:
                    base_notes += f"Airport: {booking.blade_airport}{terminal_str}\n"
                    base_notes += f"Flight Departure: {booking.blade_flight_time}\n"
            else:  # from_airport
                if task_type == 'pickup':
                    base_notes += f"Origin: {booking.blade_airport}{terminal_str}\n"
                    base_notes += f"Flight Arrival: {booking.blade_flight_time}\n"
                else:
                    base_notes += f"Destination: Customer Location\n"

            base_notes += f"Bags: {booking.blade_bag_count}\n"
            base_notes += f"Flight Date: {booking.blade_flight_date}\n"
        else:
            base_notes += f"Item: {getattr(booking, 'item_description', 'See details')}"

        return base_notes

    # Real geocodable addresses + coordinates for airport terminals
    AIRPORT_DESTINATIONS = {
        'JFK': {
            'number': '',
            'street': 'JFK Access Road',
            'city': 'Jamaica',
            'state': 'NY',
            'postalCode': '11430',
            'country': 'USA',
            'location': [-73.7781, 40.6413],  # [lng, lat] per Onfleet spec
        },
        'EWR': {
            'number': '',
            'street': 'Newark Liberty International Airport',
            'city': 'Newark',
            'state': 'NJ',
            'postalCode': '07114',
            'country': 'USA',
            'location': [-74.1745, 40.6895],
        },
    }

    def _get_airport_destination(self, airport_code: str) -> dict:
        """Return an Onfleet-geocodable destination dict for an airport."""
        addr = self.AIRPORT_DESTINATIONS.get(airport_code, self.AIRPORT_DESTINATIONS['JFK'])
        return {
            'address': {
                'number': addr['number'],
                'street': addr['street'],
                'city': addr['city'],
                'state': addr['state'],
                'postalCode': addr['postalCode'],
                'country': addr['country'],
            },
            'location': addr['location'],
        }

    def _get_blade_contact(self, airport_code: str, terminal: str = None) -> Tuple[str, str]:
        terminal_str = f" T{terminal}" if terminal else ""
        blade_contacts = {
            'JFK': (f'JFK Terminal{terminal_str}', '+17184569876'),
            'EWR': (f'Newark Terminal{terminal_str}', '+19739876543'),
            'LGA': (f'LaGuardia Terminal{terminal_str}', '+17185551234')
        }
        return blade_contacts.get(airport_code, ('Airport Terminal', '+12125551234'))

    def _get_customer_phone(self, booking) -> str:
        try:
            if getattr(booking, 'customer', None) and getattr(booking.customer, 'profile', None):
                return booking.customer.profile.phone or ''
            if getattr(booking, 'guest_checkout', None):
                return booking.guest_checkout.phone or ''
            return ''
        except Exception as e:
            logger.warning(f"Could not get customer phone: {e}")
            return ''

    def _format_phone(self, phone_str: str) -> str:
        if not phone_str:
            return '+1234567890'
        digits = ''.join(c for c in phone_str if c.isdigit())
        if len(digits) == 10:
            return f'+1{digits}'
        if len(digits) == 11 and digits[0] == '1':
            return f'+{digits}'
        return f'+{digits}' if not phone_str.startswith('+') else phone_str

    def _get_dropoff_recipient_phone(self, booking) -> str:
        if booking.service_type == 'blade_transfer':
            direction = getattr(booking, 'transfer_direction', 'to_airport')
            if direction == 'from_airport':
                # From airport: dropoff is at customer
                return self._get_customer_phone(booking)
            # To airport: dropoff is at airport
            _, blade_phone = self._get_blade_contact(
                booking.blade_airport, getattr(booking, 'blade_terminal', None))
            return blade_phone
        return self._get_customer_phone(booking)

    def _get_dropoff_recipient_name(self, booking) -> str:
        if booking.service_type == 'blade_transfer':
            direction = getattr(booking, 'transfer_direction', 'to_airport')
            if direction == 'from_airport':
                # From airport: dropoff is at customer
                return booking.get_customer_name()
            # To airport: dropoff is at airport
            blade_name, _ = self._get_blade_contact(
                booking.blade_airport, getattr(booking, 'blade_terminal', None))
            return f"Airport Transfer - {blade_name}"
        return booking.get_customer_name()

    def handle_webhook(self, webhook_data: dict) -> bool:
        from .models import OnfleetTask

        try:
            task_id = webhook_data.get('taskId') or webhook_data.get('data', {}).get('task', {}).get('id')
            if not task_id:
                logger.warning("Webhook received without task ID")
                logger.debug(f"Webhook payload: {webhook_data}")
                return False

            # Retry logic to handle race condition where webhook arrives
            # before DB transaction commits the OnfleetTask record
            onfleet_task = None
            max_retries = 5
            retry_delays = [0.1, 0.3, 0.5, 1.0, 2.0]  # exponential backoff

            for attempt in range(max_retries):
                try:
                    onfleet_task = OnfleetTask.objects.get(onfleet_task_id=task_id)
                    break  # Found it, exit retry loop
                except OnfleetTask.DoesNotExist:
                    if attempt < max_retries - 1:
                        delay = retry_delays[attempt]
                        logger.debug(
                            f"Task {task_id} not found in database, "
                            f"retry {attempt + 1}/{max_retries} in {delay}s"
                        )
                        time.sleep(delay)
                    else:
                        logger.debug(f"Task not found in database after {max_retries} retries: {task_id} (likely created outside ToteTaxi)")
                        return False

            if not onfleet_task:
                return False

            trigger_id = webhook_data.get('triggerId')
            task_obj = webhook_data.get('data', {}).get('task', {})

            if trigger_id == 0:
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

            elif trigger_id == 3:
                onfleet_task.status = 'completed'
                onfleet_task.completed_at = timezone.now()
                completion = task_obj.get('completionDetails', {})
                onfleet_task.signature_url = completion.get('signatureUploadId', '')
                onfleet_task.photo_urls = [p.get('uploadId', '') for p in completion.get('photoUploadIds', [])]
                onfleet_task.delivery_notes = completion.get('notes', '')
                onfleet_task.save()

                if onfleet_task.task_type == 'dropoff':
                    booking = onfleet_task.booking
                    booking.status = 'completed'
                    booking.save(_skip_pricing=True)
                    logger.info(f"✓ Booking {booking.booking_number} completed")

                logger.info(f"Task completed: {task_id} ({onfleet_task.task_type})")

            elif trigger_id == 4:
                onfleet_task.status = 'failed'
                completion = task_obj.get('completionDetails', {})
                onfleet_task.failure_reason = completion.get('failureReason', '')
                onfleet_task.failure_notes = completion.get('failureNotes', '')
                onfleet_task.save()
                logger.error(f"Task failed: {task_id} - {onfleet_task.failure_reason}")

            elif trigger_id == 8:
                onfleet_task.status = 'deleted'
                onfleet_task.save()
                logger.warning(f"Task deleted: {task_id}")

            elif trigger_id == 1:
                eta_ts = task_obj.get('estimatedCompletionTime')
                if eta_ts:
                    onfleet_task.estimated_arrival = datetime.fromtimestamp(eta_ts / 1000, tz=timezone.get_current_timezone())
                    onfleet_task.save()
                    logger.info(f"Task ETA updated: {task_id}")

            elif trigger_id == 9:
                onfleet_task.status = 'assigned'
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

            elif trigger_id == 10:
                onfleet_task.status = 'created'
                onfleet_task.worker_id = ''
                onfleet_task.worker_name = ''
                onfleet_task.save()
                logger.info(f"Task unassigned: {task_id}")

            elif trigger_id == 7:
                # taskUpdated - fires when task is updated (assignment, feedback, attachments)
                # Update worker info if present
                worker = task_obj.get('worker') or webhook_data.get('data', {}).get('worker')
                if worker:
                    if isinstance(worker, dict):
                        onfleet_task.worker_id = worker.get('id', '')
                        onfleet_task.worker_name = worker.get('name', '')
                    else:
                        onfleet_task.worker_id = worker
                        onfleet_task.worker_name = self._get_worker_name(worker)

                # Update ETA if present
                eta_ts = task_obj.get('estimatedCompletionTime')
                if eta_ts:
                    onfleet_task.estimated_arrival = datetime.fromtimestamp(
                        eta_ts / 1000, tz=timezone.get_current_timezone()
                    )

                # Update state if present
                state = task_obj.get('state')
                if state is not None:
                    onfleet_task.status = self._map_onfleet_state(state)

                onfleet_task.save()
                logger.info(f"Task updated: {task_id} ({onfleet_task.task_type})")

            else:
                logger.info(f"Unhandled webhook trigger: {trigger_id} for task {task_id}")

            return True

        except Exception as e:
            logger.error(f"Webhook processing error: {e}", exc_info=True)
            logger.error(f"Webhook data: {webhook_data}")
            return False

    def get_dashboard_summary(self) -> dict:
        from .models import OnfleetTask
        from datetime import date

        try:
            today = date.today()
            onfleet_tasks = OnfleetTask.objects.filter(created_at__date=today, environment=self.onfleet.environment)
            onfleet_org = self.onfleet.get_organization_info()

            # Task counts for summary
            active_count = onfleet_tasks.filter(status__in=['assigned', 'active']).count()
            tasks_today = onfleet_tasks.count()
            completed_today = onfleet_tasks.filter(status='completed').count()
            pending_count = onfleet_tasks.filter(status='created').count()

            # Calculate completion rate
            completion_rate = 0
            if tasks_today > 0:
                completion_rate = round((completed_today / tasks_today) * 100, 1)

            return {
                # Top-level stats for frontend dashboard cards
                'active_tasks': active_count,
                'tasks_today': tasks_today,
                'completed_today': completed_today,
                'pending_tasks': pending_count,
                'completion_rate': completion_rate,
                # Detailed breakdowns
                'onfleet_stats': {
                    'active_tasks': onfleet_org.get('activeTasks', 0),
                    'available_workers': len([w for w in onfleet_org.get('workers', []) if w.get('onDuty')]),
                    'organization_name': onfleet_org.get('name', 'Unknown')
                },
                'integration_stats': {
                    'tasks_created_today': tasks_today,
                    'pickup_tasks': onfleet_tasks.filter(task_type='pickup').count(),
                    'dropoff_tasks': onfleet_tasks.filter(task_type='dropoff').count(),
                },
                'environment': self.onfleet.environment,
                'mock_mode': self.onfleet.mock_mode
            }

        except Exception as e:
            logger.error(f"Error getting dashboard summary: {e}")
            return {
                'error': 'Failed to fetch logistics data',
                'active_tasks': 0,
                'tasks_today': 0,
                'completed_today': 0,
                'pending_tasks': 0,
                'completion_rate': 0,
                'environment': self.onfleet.environment,
                'mock_mode': self.onfleet.mock_mode
            }

    def create_delivery_task(self, booking):
        pickup, dropoff = self.create_tasks_for_booking(booking)
        return pickup