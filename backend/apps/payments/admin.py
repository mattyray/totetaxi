from django.contrib import admin
from django.utils.html import format_html
from .models import Payment, Refund, PaymentAudit

@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = (
        'booking', 
        'get_customer_name', 
        'amount_dollars', 
        'status', 
        'get_status_badge',
        'created_at',
        'processed_at'
    )
    list_filter = ('status', 'created_at', 'processed_at')
    search_fields = (
        'booking__booking_number', 
        'customer__email', 
        'stripe_payment_intent_id',
        'stripe_charge_id'
    )
    readonly_fields = ('created_at', 'updated_at', 'processed_at')
    
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
    
    def get_status_badge(self, obj):
        colors = {
            'pending': 'orange',
            'succeeded': 'green',
            'failed': 'red',
            'refunded': 'blue'
        }
        color = colors.get(obj.status, 'gray')
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            color,
            obj.get_status_display()
        )
    get_status_badge.short_description = 'Status'

@admin.register(Refund)
class RefundAdmin(admin.ModelAdmin):
    list_display = (
        'payment',
        'get_booking_number',
        'amount_dollars',
        'status',
        'get_status_badge',
        'requested_by',
        'approved_by',
        'created_at'
    )
    list_filter = ('status', 'created_at', 'approved_at')
    search_fields = (
        'payment__booking__booking_number',
        'reason',
        'requested_by__email',
        'approved_by__email'
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
    
    actions = ['approve_refunds', 'deny_refunds']
    
    def get_booking_number(self, obj):
        return obj.payment.booking.booking_number
    get_booking_number.short_description = 'Booking #'
    
    def get_status_badge(self, obj):
        colors = {
            'requested': 'orange',
            'approved': 'green',
            'denied': 'red',
            'completed': 'blue'
        }
        color = colors.get(obj.status, 'gray')
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            color,
            obj.get_status_display()
        )
    get_status_badge.short_description = 'Status'
    
    def approve_refunds(self, request, queryset):
        """Bulk approve refunds (only if user is admin)"""
        if not request.user.can_approve_refunds:
            self.message_user(request, 'Only admin users can approve refunds.', level='ERROR')
            return
        
        approved_count = 0
        for refund in queryset.filter(status='requested'):
            try:
                refund.approve(request.user)
                approved_count += 1
            except ValueError as e:
                self.message_user(request, str(e), level='ERROR')
        
        if approved_count > 0:
            self.message_user(
                request, 
                f'Successfully approved {approved_count} refund(s).'
            )
    approve_refunds.short_description = "Approve selected refunds"
    
    def deny_refunds(self, request, queryset):
        """Bulk deny refunds"""
        if not request.user.can_approve_refunds:
            self.message_user(request, 'Only admin users can deny refunds.', level='ERROR')
            return
        
        denied_count = queryset.filter(status='requested').update(status='denied')
        self.message_user(
            request, 
            f'Successfully denied {denied_count} refund(s).'
        )
    deny_refunds.short_description = "Deny selected refunds"

@admin.register(PaymentAudit)
class PaymentAuditAdmin(admin.ModelAdmin):
    list_display = ('action', 'get_short_description', 'user', 'created_at')
    list_filter = ('action', 'created_at')
    search_fields = ('description', 'user__email')
    readonly_fields = ('created_at',)
    
    fieldsets = (
        ('Action Details', {
            'fields': ('action', 'description')
        }),
        ('Related Records', {
            'fields': ('payment', 'refund')
        }),
        ('User & Timestamp', {
            'fields': ('user', 'created_at')
        })
    )
    
    def get_short_description(self, obj):
        return obj.description[:50] + ('...' if len(obj.description) > 50 else '')
    get_short_description.short_description = 'Description'
    
    # Make it mostly read-only (audit logs shouldn't be edited)
    def has_add_permission(self, request):
        return False
    
    def has_change_permission(self, request, obj=None):
        return False
    
    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser  # Only superusers can delete audit logs