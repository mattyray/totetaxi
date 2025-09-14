# apps/logistics/views.py
from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
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
        task = integration.create_delivery_task(booking)
        
        if task:
            return Response({
                'success': True,
                'message': f'Created Onfleet task for {booking.booking_number}',
                'task': {
                    'id': str(task.id),
                    'onfleet_task_id': task.onfleet_task_id,
                    'tracking_url': task.tracking_url,
                    'status': task.status
                }
            })
        else:
            return Response({
                'error': 'Failed to create Onfleet task'
            }, status=500)
            
    except Booking.DoesNotExist:
        return Response({'error': 'Booking not found'}, status=404)
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
            # TODO: In production, verify webhook signature here
            # webhook_secret = getattr(settings, 'ONFLEET_WEBHOOK_SECRET', None)
            
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
                    'onfleet_task_id': task.onfleet_task_id,
                    'onfleet_short_id': task.onfleet_short_id,
                    'tracking_url': task.tracking_url,
                    'status': task.status,
                    'created_at': task.created_at,
                    'last_synced': task.last_synced
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