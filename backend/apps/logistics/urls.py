# apps/logistics/urls.py
from django.urls import path
from . import views

app_name = 'logistics'

urlpatterns = [
    # Staff dashboard endpoints
    path('summary/', views.LogisticsSummaryView.as_view(), name='logistics-summary'),
    path('sync/', views.sync_onfleet_status, name='sync-onfleet'),
    path('tasks/', views.TaskStatusView.as_view(), name='task-status'),
    path('create-task/', views.create_task_manually, name='create-task'),
    
    # Webhook endpoint (for Onfleet to call)
    path('webhook/', views.OnfleetWebhookView.as_view(), name='onfleet-webhook'),
]