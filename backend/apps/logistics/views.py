# apps/logistics/views.py
from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
import hmac
import hashlib
import logging

from .services import ToteTaxiOnfleetIntegration
from .models import OnfleetTask

logger = logging.getLogger(__name__)


class LogisticsSummaryView(APIView):
    """Simple logistics overview for staff dashboard"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        if not hasattr(request.user, 'staff_profile'):
            return Response({'error': 'Staff access required'}, status=403)
        
        try:
            integration = ToteTaxiOnfleetIntegration()
            summary = integration.get_dashboard_summary()
            
            return Response({
                'success': True,
                'data': summary,
                'timestamp': timezone.now()
            })
            
        except Exception as e:
            logger.error(f"Error in logistics summary: {e}")
            return Response({
                'error': 'Failed to fetch logistics data',
                'details': str(e)
            }, status=500)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def sync_onfleet_status(request):
    """Manual sync button for staff dashboard"""
    if not hasattr(request.user, 'staff_profile'):
        return Response({'error': 'Staff access required'}, status=403)
    
    try:
        # Get recent incomplete tasks
        recent_tasks = OnfleetTask.objects.filter(
            status__in=['created', 'assigned', 'active'],
            created_at__gte=timezone.now() - timezone.timedelta(days=7)
        )
        
        synced_count = 0
        for task in recent_tasks:
            # In production, you'd fetch current status from Onfleet API
            # For now, just update the sync timestamp
            task.last_synced = timezone.now()
            task.save()
            synced_count += 1
        
        return Response({
            'success': True,
            'message': f'Synced {synced_count} tasks',
            'synced_count': synced_count,
            'timestamp': timezone.now()
        })
        
    except Exception as e:
        logger.error(f"Sync error: {e}")
        return Response({
            'error': f'Sync failed: {str(e)}'
        }, status=500)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def create_task_manually(request):
    """Manually create Onfleet task for a booking"""
    if not hasattr(request.user, 'staff_profile'):
        return Response({'error': 'Staff access required'}, status=403)
    
    booking_id = request.data.get('booking_id')
    if not booking_id:
        return Response({'error': 'booking_id required'}, status=400)
    
    try:
        from apps.bookings.models import Booking
        booking = Booking.objects.get(id=booking_id, deleted_at__isnull=True)
        
        integration = ToteTaxiOnfleetIntegration()
        pickup, dropoff = integration.create_tasks_for_booking(booking)
        
        if pickup and dropoff:
            return Response({
                'success': True,
                'message': f'Created Onfleet tasks for {booking.booking_number}',
                'pickup_task': {
                    'id': str(pickup.id),
                    'onfleet_task_id': pickup.onfleet_task_id,
                    'tracking_url': pickup.tracking_url,
                },
                'dropoff_task': {
                    'id': str(dropoff.id),
                    'onfleet_task_id': dropoff.onfleet_task_id,
                    'tracking_url': dropoff.tracking_url,
                }
            })
        else:
            return Response({
                'error': 'Failed to create Onfleet tasks'
            }, status=500)
            
    except Exception as e:
        logger.error(f"Manual task creation error: {e}")
        return Response({
            'error': f'Task creation failed: {str(e)}'
        }, status=500)


@method_decorator(csrf_exempt, name='dispatch')
class OnfleetWebhookView(APIView):
    """Handle Onfleet webhook notifications"""
    permission_classes = []  # Webhooks don't use session auth
    
    def post(self, request):
        try:
            # Check if this is Onfleet's verification request (during webhook creation)
            if self._is_verification_request(request):
                return self._handle_verification(request)
            
            # Normal webhook processing
            webhook_data = request.data
            integration = ToteTaxiOnfleetIntegration()
            
            success = integration.handle_webhook(webhook_data)
            
            if success:
                return Response({
                    'success': True,
                    'message': 'Webhook processed successfully',
                    'timestamp': timezone.now()
                })
            else:
                return Response({
                    'success': False,
                    'message': 'Webhook processing failed'
                }, status=400)
                
        except Exception as e:
            logger.error(f"Webhook error: {e}")
            return Response({
                'error': 'Webhook processing failed',
                'details': str(e)
            }, status=500)
    
    def _is_verification_request(self, request):
        """Check if this is Onfleet's webhook verification request"""
        # Onfleet sends a verification check with a specific format
        # It includes a 'check' parameter in the request
        check_value = request.data.get('check')
        return check_value is not None
    
    def _handle_verification(self, request):
        """
        Handle Onfleet's webhook verification challenge.
        
        During webhook creation, Onfleet sends:
        POST /webhook-url
        { "check": "some-random-value" }
        
        We must respond with:
        200 OK
        some-random-value (plain text, same value they sent)
        """
        check_value = request.data.get('check')
        
        logger.info(f"Onfleet webhook verification received: {check_value}")
        
        # Return the check value as plain text
        from django.http import HttpResponse
        return HttpResponse(check_value, content_type='text/plain', status=200)


class TaskStatusView(APIView):
    """Get status of Onfleet tasks"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        if not hasattr(request.user, 'staff_profile'):
            return Response({'error': 'Staff access required'}, status=403)
        
        # Get query params
        booking_id = request.query_params.get('booking_id')
        date_filter = request.query_params.get('date')
        
        try:
            tasks = OnfleetTask.objects.all()
            
            if booking_id:
                tasks = tasks.filter(booking_id=booking_id)
            
            if date_filter:
                tasks = tasks.filter(created_at__date=date_filter)
            
            tasks = tasks.select_related('booking').order_by('-created_at')[:50]
            
            task_data = []
            for task in tasks:
                task_data.append({
                    'id': str(task.id),
                    'booking_number': task.booking.booking_number,
                    'customer_name': task.booking.get_customer_name(),
                    'task_type': task.task_type,
                    'onfleet_task_id': task.onfleet_task_id,
                    'onfleet_short_id': task.onfleet_short_id,
                    'tracking_url': task.tracking_url,
                    'recipient_name': task.recipient_name,
                    'recipient_phone': task.recipient_phone,
                    'status': task.status,
                    'worker_name': task.worker_name,
                    'environment': task.environment,
                    'created_at': task.created_at,
                    'last_synced': task.last_synced,
                    'linked_to': str(task.linked_task.id) if task.linked_task else None
                })
            
            return Response({
                'success': True,
                'tasks': task_data,
                'count': len(task_data)
            })
            
        except Exception as e:
            logger.error(f"Error fetching tasks: {e}")
            return Response({
                'error': 'Failed to fetch tasks',
                'details': str(e)
            }, status=500)