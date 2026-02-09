# backend/apps/payments/urls.py
from django.urls import path
from django.conf import settings
from . import views

urlpatterns = [
    # Public payment endpoints
    path('create-intent/', views.PaymentIntentCreateView.as_view(), name='payment-intent-create'),
    path('status/<str:booking_lookup>/', views.PaymentStatusView.as_view(), name='payment-status'),
    path('webhook/', views.StripeWebhookView.as_view(), name='stripe-webhook'),
    
    # Staff endpoints
    path('payments/', views.PaymentListView.as_view(), name='payment-list'),
    path('refunds/', views.RefundListView.as_view(), name='refund-list'),
    path('refunds/create/', views.RefundCreateView.as_view(), name='refund-create'),
    path('refunds/process/', views.RefundProcessView.as_view(), name='refund-process'),
]

# Mock endpoints (only available in DEBUG mode)
if settings.DEBUG:
    urlpatterns.append(
        path('mock-confirm/', views.MockPaymentConfirmView.as_view(), name='mock-payment-confirm')
    )