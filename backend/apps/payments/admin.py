from django.contrib import admin
from .models import Payment, Refund, PaymentAudit

@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = (
        'booking', 
        'get_customer_name', 
        'amount_dollars', 
        'status', 
        'created_at',
        'processed_at'
    )
    list_filter = ('status', 'created_at')
    search_fields = (
        'booking__booking_number', 
        'customer__email', 
        'stripe_payment_intent_id',
        'stripe_charge_id'
    )
    readonly_fields = ('created_at', 'updated_at')
    
    fieldsets = (
        ('Booking & Customer', {
            'fields': ('booking', 'customer')
        }),
        ('Payment Details', {
            'fields': ('amount_cents', 'status', 'failure_reason')
        }),
        ('Stripe Integration', {
            'fields': ('stripe_payment_intent_id', 'stripe_charge_id')
        }),
        ('Timestamps', {
            'fields': ('processed_at', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )
    
    def get_customer_name(self, obj):
        if obj.customer:
            return obj.customer.full_name
        else:
            return obj.booking.get_customer_name()
    get_customer_name.short_description = 'Customer'

@admin.register(Refund)
class RefundAdmin(admin.ModelAdmin):
    list_display = (
        'payment',
        'amount_dollars',
        'status',
        'requested_by',
        'approved_by',
        'created_at'
    )
    list_filter = ('status', 'created_at')
    search_fields = (
        'payment__booking__booking_number',
        'reason',
        'requested_by__email'
    )
    readonly_fields = ('created_at', 'approved_at', 'completed_at')
    
    fieldsets = (
        ('Refund Details', {
            'fields': ('payment', 'amount_cents', 'reason')
        }),
        ('Approval Workflow', {
            'fields': ('status', 'requested_by', 'approved_by')
        }),
        ('Stripe Integration', {
            'fields': ('stripe_refund_id',)
        }),
        ('Timestamps', {
            'fields': ('approved_at', 'completed_at', 'created_at'),
            'classes': ('collapse',)
        })
    )
    
    actions = ['approve_refunds']
    
    def approve_refunds(self, request, queryset):
        """Bulk approve refunds"""
        approved_count = 0
        for refund in queryset.filter(status='requested'):
            refund.approve(request.user)
            approved_count += 1
        
        self.message_user(
            request, 
            f'Successfully approved {approved_count} refund(s).'
        )
    approve_refunds.short_description = "Approve selected refunds"

@admin.register(PaymentAudit)
class PaymentAuditAdmin(admin.ModelAdmin):
    list_display = ('action', 'description', 'user', 'created_at')
    list_filter = ('action', 'created_at')
    search_fields = ('description', 'user__email')
    readonly_fields = ('created_at',)
    
    # Make it read-only (audit logs shouldn't be edited)
    def has_add_permission(self, request):
        return False
    
    def has_change_permission(self, request, obj=None):
        return False
    
    def has_delete_permission(self, request, obj=None):
        return False