from django.contrib import admin
from .models import Booking, Address, GuestCheckout

@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = (
        'booking_number', 
        'get_customer_name', 
        'service_type', 
        'get_service_details',
        'status', 
        'pickup_date', 
        'total_price_dollars'
    )
    list_filter = ('service_type', 'status', 'pickup_date', 'coi_required')
    search_fields = ('booking_number', 'customer__email', 'guest_checkout__email')
    readonly_fields = ('booking_number', 'base_price_cents', 'surcharge_cents', 'coi_fee_cents', 'total_price_cents', 'created_at', 'updated_at')
    
    fieldsets = (
        ('Customer Info', {
            'fields': ('customer', 'guest_checkout')
        }),
        ('Service Selection', {
            'fields': (
                'service_type', 
                'mini_move_package', 
                'standard_delivery_item_count',
                'is_same_day_delivery',
                'specialty_items'
            )
        }),
        ('Booking Details', {
            'fields': ('pickup_date', 'pickup_time', 'pickup_address', 'delivery_address')
        }),
        ('Requirements', {
            'fields': ('special_instructions', 'coi_required')
        }),
        ('Calculated Pricing', {
            'fields': ('base_price_cents', 'surcharge_cents', 'coi_fee_cents', 'total_price_cents'),
            'classes': ('collapse',)
        }),
        ('Status', {
            'fields': ('status',)
        }),
        ('System Info', {
            'fields': ('booking_number', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )
    
    filter_horizontal = ('specialty_items',)  # Nice interface for many-to-many
    
    def get_customer_name(self, obj):
        return obj.get_customer_name()
    get_customer_name.short_description = 'Customer'
    
    def get_service_details(self, obj):
        if obj.service_type == 'mini_move' and obj.mini_move_package:
            return obj.mini_move_package.name
        elif obj.service_type == 'standard_delivery' and obj.standard_delivery_item_count:
            return f"{obj.standard_delivery_item_count} items"
        elif obj.service_type == 'specialty_item':
            items = list(obj.specialty_items.all())
            return ", ".join([item.name for item in items[:2]]) + ("..." if len(items) > 2 else "")
        return "Not configured"
    get_service_details.short_description = 'Service Details'

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