# backend/apps/accounts/admin.py
from django.contrib import admin
from .models import StaffProfile, StaffAction

@admin.register(StaffProfile)
class StaffProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'role', 'department', 'can_approve_refunds', 'can_manage_staff', 'can_view_financial_reports')
    list_filter = ('role', 'department')
    search_fields = ('user__username', 'user__email')
    readonly_fields = ('created_at', 'updated_at')

@admin.register(StaffAction)
class StaffActionAdmin(admin.ModelAdmin):
    list_display = ('staff_user', 'action_type', 'created_at', 'ip_address')
    list_filter = ('action_type', 'created_at')
    search_fields = ('staff_user__username', 'description')
    readonly_fields = ('created_at',)
    ordering = ('-created_at',)