from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import Customer, CustomerProfile, SavedAddress, CustomerPaymentMethod

@admin.register(Customer)
class CustomerAdmin(UserAdmin):
    list_display = ('email', 'first_name', 'last_name', 'phone', 'is_active', 'created_at')
    list_filter = ('is_active', 'created_at')
    search_fields = ('email', 'first_name', 'last_name')
    ordering = ('-created_at',)
    
    # Customize the admin form
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Personal Info', {'fields': ('first_name', 'last_name', 'phone')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser')}),
        ('Stripe', {'fields': ('stripe_customer_id',)}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'first_name', 'last_name', 'phone', 'password1', 'password2'),
        }),
    )

@admin.register(CustomerProfile)
class CustomerProfileAdmin(admin.ModelAdmin):
    list_display = ('customer', 'total_bookings', 'total_spent_dollars', 'is_vip')
    list_filter = ('is_vip', 'preferred_pickup_time')
    search_fields = ('customer__email', 'customer__first_name', 'customer__last_name')

@admin.register(SavedAddress)
class SavedAddressAdmin(admin.ModelAdmin):
    list_display = ('customer', 'nickname', 'city', 'state', 'times_used', 'is_active')
    list_filter = ('state', 'is_active')
    search_fields = ('customer__email', 'nickname', 'city')

@admin.register(CustomerPaymentMethod)
class CustomerPaymentMethodAdmin(admin.ModelAdmin):
    list_display = ('customer', 'display_name', 'is_default', 'is_active')
    list_filter = ('card_brand', 'is_default', 'is_active')
    search_fields = ('customer__email', 'card_last_four')