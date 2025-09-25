from django.contrib import admin
from django.contrib.auth.models import User
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.core.exceptions import ValidationError
from django.contrib import messages
from .models import CustomerProfile, SavedAddress, CustomerPaymentMethod


class CustomerProfileInline(admin.StackedInline):
    model = CustomerProfile
    can_delete = False
    verbose_name_plural = 'Customer Profile'
    readonly_fields = ('total_bookings', 'total_spent_cents', 'last_booking_at', 'created_at', 'updated_at')
    
    def save_model(self, request, obj, form, change):
        try:
            super().save_model(request, obj, form, change)
        except ValidationError as e:
            messages.error(request, f"Cannot save customer profile: {e}")
            raise


class CustomUserAdmin(BaseUserAdmin):
    inlines = (CustomerProfileInline,)
    
    def get_inline_instances(self, request, obj=None):
        """Only show CustomerProfile inline for users without staff profiles"""
        if obj and hasattr(obj, 'staff_profile'):
            return []
        return super().get_inline_instances(request, obj)


# Re-register UserAdmin
admin.site.unregister(User)
admin.site.register(User, CustomUserAdmin)


@admin.register(CustomerProfile)
class CustomerProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'user_email', 'total_bookings', 'total_spent_dollars', 'is_vip', 'last_booking_at', 'created_at')
    list_filter = ('is_vip', 'preferred_pickup_time', 'email_notifications', 'created_at')
    search_fields = ('user__email', 'user__first_name', 'user__last_name', 'phone')
    readonly_fields = ('total_bookings', 'total_spent_cents', 'last_booking_at', 'created_at', 'updated_at')
    
    def user_email(self, obj):
        return obj.user.email
    user_email.short_description = 'Email'
    user_email.admin_order_field = 'user__email'
    
    def save_model(self, request, obj, form, change):
        try:
            super().save_model(request, obj, form, change)
        except ValidationError as e:
            messages.error(request, f"Cannot save: {e}")
            raise


@admin.register(SavedAddress)
class SavedAddressAdmin(admin.ModelAdmin):
    list_display = ('user', 'nickname', 'city', 'state', 'times_used', 'is_active', 'created_at')
    list_filter = ('state', 'is_active', 'city', 'created_at')
    search_fields = ('user__email', 'nickname', 'city', 'address_line_1')
    readonly_fields = ('times_used', 'last_used_at', 'created_at', 'updated_at')
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user')


@admin.register(CustomerPaymentMethod)
class CustomerPaymentMethodAdmin(admin.ModelAdmin):
    list_display = ('user', 'display_name', 'is_default', 'is_active', 'created_at')
    list_filter = ('card_brand', 'is_default', 'is_active', 'created_at')
    search_fields = ('user__email', 'card_last_four')
    readonly_fields = ('stripe_payment_method_id', 'created_at')
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user')