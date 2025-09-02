from django.contrib import admin
from django.contrib.auth.models import User
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import CustomerProfile, SavedAddress, CustomerPaymentMethod


class CustomerProfileInline(admin.StackedInline):
    model = CustomerProfile
    can_delete = False
    verbose_name_plural = 'Customer Profile'


class CustomUserAdmin(BaseUserAdmin):
    inlines = (CustomerProfileInline,)


# Re-register UserAdmin
admin.site.unregister(User)
admin.site.register(User, CustomUserAdmin)


@admin.register(CustomerProfile)
class CustomerProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'total_bookings', 'total_spent_dollars', 'is_vip', 'last_booking_at')
    list_filter = ('is_vip', 'preferred_pickup_time', 'email_notifications')
    search_fields = ('user__email', 'user__first_name', 'user__last_name')
    readonly_fields = ('total_bookings', 'total_spent_cents', 'last_booking_at', 'created_at', 'updated_at')


@admin.register(SavedAddress)
class SavedAddressAdmin(admin.ModelAdmin):
    list_display = ('user', 'nickname', 'city', 'state', 'times_used', 'is_active')
    list_filter = ('state', 'is_active', 'city')
    search_fields = ('user__email', 'nickname', 'city', 'address_line_1')
    readonly_fields = ('times_used', 'last_used_at', 'created_at', 'updated_at')


@admin.register(CustomerPaymentMethod)
class CustomerPaymentMethodAdmin(admin.ModelAdmin):
    list_display = ('user', 'display_name', 'is_default', 'is_active', 'created_at')
    list_filter = ('card_brand', 'is_default', 'is_active')
    search_fields = ('user__email', 'card_last_four')
    readonly_fields = ('stripe_payment_method_id', 'created_at')