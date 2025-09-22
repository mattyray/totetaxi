from django.urls import path
from . import views

urlpatterns = [
    # Public payment endpoints
    path('create-intent/', views.PaymentIntentCreateView.as_view(), name='payment-intent-create'),
    path('status/<str:booking_number>/', views.PaymentStatusView.as_view(), name='payment-status'),
    path('webhook/', views.StripeWebhookView.as_view(), name='stripe-webhook'),
    path('confirm/', views.PaymentConfirmView.as_view(), name='payment-confirm'),  # NEW
    
    # Mock endpoints (testing only)
    path('mock-confirm/', views.MockPaymentConfirmView.as_view(), name='mock-payment-confirm'),
    
    # Staff endpoints
    path('payments/', views.PaymentListView.as_view(), name='payment-list'),
    path('refunds/', views.RefundListView.as_view(), name='refund-list'),
    path('refunds/create/', views.RefundCreateView.as_view(), name='refund-create'),
]