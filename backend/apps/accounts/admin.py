from django.contrib import admin
from django.core.exceptions import ValidationError
from django.contrib import messages
from .models import StaffProfile, StaffAction


@admin.register(StaffProfile)
class StaffProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'user_email', 'role', 'department', 'can_approve_refunds', 'can_manage_staff', 'is_active', 'created_at')
    list_filter = ('role', 'department', 'is_active', 'created_at')
    search_fields = ('user__username', 'user__email', 'user__first_name', 'user__last_name')
    readonly_fields = ('can_approve_refunds', 'can_manage_staff', 'can_view_financial_reports', 'is_account_locked', 'created_at', 'updated_at')
    
    fieldsets = (
        ('User Information', {
            'fields': ('user', 'role', 'department', 'phone')
        }),
        ('Permissions', {
            'fields': ('can_approve_refunds', 'can_manage_staff', 'can_view_financial_reports'),
            'classes': ('collapse',)
        }),
        ('Security', {
            'fields': ('login_attempts', 'account_locked_until', 'is_account_locked', 'last_login_ip'),
            'classes': ('collapse',)
        }),
        ('Management', {
            'fields': ('is_active', 'hire_date', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def user_email(self, obj):
        return obj.user.email
    user_email.short_description = 'Email'
    user_email.admin_order_field = 'user__email'
    
    def save_model(self, request, obj, form, change):
        try:
            super().save_model(request, obj, form, change)
        except ValidationError as e:
            messages.error(request, f"Cannot save staff profile: {e}")
            raise
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user')


@admin.register(StaffAction)
class StaffActionAdmin(admin.ModelAdmin):
    list_display = ('staff_user', 'action_type', 'created_at', 'ip_address', 'customer_id', 'booking_id')
    list_filter = ('action_type', 'created_at')
    search_fields = ('staff_user__username', 'staff_user__email', 'description', 'ip_address')
    readonly_fields = ('staff_user', 'action_type', 'description', 'ip_address', 'user_agent', 'customer_id', 'booking_id', 'created_at')
    ordering = ('-created_at',)
    
    def has_add_permission(self, request):
        # Staff actions should only be created programmatically
        return False
    
    def has_change_permission(self, request, obj=None):
        # Staff actions should be immutable audit logs
        return False
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('staff_user')