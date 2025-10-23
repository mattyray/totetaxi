# apps/logistics/views.py
from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.http import HttpResponse
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
    """
    Handle Onfleet webhook notifications
    
    Onfleet webhook flow:
    1. Verification: GET /webhook?check=value → respond with value (plain text)
    2. Events: POST /webhook with JSON payload → process and return 200 OK
    """
    permission_classes = []  # Webhooks don't use session auth
    authentication_classes = []  # No authentication required
    
    def get(self, request):
        """
        Handle Onfleet's webhook verification (sent as GET request)
        Onfleet sends: GET /webhook/?check=some-random-value
        We respond with: 200 OK, plain text "some-random-value"
        """
        check_value = request.query_params.get('check') or request.GET.get('check')
        
        if not check_value:
            logger.warning("Webhook verification failed: no check parameter")
            return Response({'error': 'Missing check parameter'}, status=400)
        
        logger.info(f"✅ Onfleet webhook verification successful: {check_value}")
        return HttpResponse(check_value, content_type='text/plain', status=200)
    
    def post(self, request):
        """
        Handle actual webhook events from Onfleet
        
        ✅ CRITICAL: Always return 200 OK for webhook processing
        Even if processing fails, return 200 to prevent Onfleet retries
        """
        try:
            webhook_data = request.data
            trigger_id = webhook_data.get('triggerId')
            task_id = webhook_data.get('taskId')
            
            logger.info(f"📨 Onfleet webhook received - Trigger: {trigger_id}, Task: {task_id}")
            
            # Process the webhook
            integration = ToteTaxiOnfleetIntegration()
            success = integration.handle_webhook(webhook_data)
            
            # ✅ FIX: Always return 200 OK, regardless of processing result
            # This prevents Onfleet from retrying failed webhooks
            response_data = {
                'success': success,
                'trigger_id': trigger_id,
                'task_id': task_id,
                'timestamp': timezone.now(),
                'message': 'Webhook processed successfully' if success else 'Webhook processing failed but acknowledged'
            }
            
            if success:
                logger.info(f"✅ Webhook processed successfully - Trigger: {trigger_id}")
            else:
                logger.warning(f"⚠️  Webhook processing failed but acknowledged - Trigger: {trigger_id}")
            
            return Response(response_data, status=200)  # ✅ Always 200
                
        except Exception as e:
            logger.error(f"❌ Webhook error: {e}", exc_info=True)
            
            # ✅ Even on exception, return 200 to prevent retries
            return Response({
                'success': False,
                'error': 'Webhook processing failed',
                'details': str(e),
                'timestamp': timezone.now()
            }, status=200)  # ✅ Still 200, not 500


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