from django.urls import path
from . import views

urlpatterns = [
    path('chat/', views.ChatView.as_view(), name='assistant-chat'),
    path('health/', views.HealthCheckView.as_view(), name='assistant-health'),
]
