from django.contrib import admin
from .models import Booking, Address, GuestCheckout

@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = ('booking_number', 'get_customer_name', 'service_type', 'status', 'pickup_date', 'total_price_dollars')
    list_filter = ('service_type', 'status', 'pickup_date')
    search_fields = ('booking_number', 'customer__email', 'guest_checkout__email')
    readonly_fields = ('booking_number', 'created_at', 'updated_at')
    
    fieldsets = (
        ('Customer Info', {
            'fields': ('customer', 'guest_checkout')
        }),
        ('Service Details', {
            'fields': ('service_type', 'pickup_date', 'pickup_time')
        }),
        ('Addresses', {
            'fields': ('pickup_address', 'delivery_address')
        }),
        ('Requirements', {
            'fields': ('special_instructions', 'coi_required')
        }),
        ('Pricing & Status', {
            'fields': ('total_price_cents', 'status')
        }),
        ('System Info', {
            'fields': ('booking_number', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )
    
    def get_customer_name(self, obj):
        return obj.get_customer_name()
    get_customer_name.short_description = 'Customer'

@admin.register(Address)
class AddressAdmin(admin.ModelAdmin):
    list_display = ('address_line_1', 'city', 'state', 'customer', 'created_at')
    list_filter = ('state', 'city')
    search_fields = ('address_line_1', 'city', 'customer__email')

@admin.register(GuestCheckout)
class GuestCheckoutAdmin(admin.ModelAdmin):
    list_display = ('first_name', 'last_name', 'email', 'phone', 'created_at')
    search_fields = ('first_name', 'last_name', 'email')
    readonly_fields = ('created_at',)