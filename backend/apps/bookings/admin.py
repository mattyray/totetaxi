from django.contrib import admin
from django.utils.html import format_html
from .models import Booking, Address, GuestCheckout, BookingSpecialtyItem
from django.utils import timezone
from django.contrib import messages


class BookingSpecialtyItemInline(admin.TabularInline):
    """Inline admin for specialty items with quantities"""
    model = BookingSpecialtyItem
    extra = 1
    fields = ('specialty_item', 'quantity', 'get_subtotal')
    readonly_fields = ('get_subtotal',)
    
    def get_subtotal(self, obj):
        if obj.id:
            return f"${obj.subtotal_dollars}"
        return "—"
    get_subtotal.short_description = 'Subtotal'


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = (
        'booking_number', 
        'get_customer_name', 
        'service_type', 
        'get_service_details',
        'get_organizing_services',
        'status', 
        'pickup_date', 
        'total_price_dollars',
        'visibility_status'
    )
    list_filter = (
        'service_type', 
        'status', 
        'pickup_date', 
        'coi_required', 
        'include_packing', 
        'include_unpacking',
        ('deleted_at', admin.EmptyFieldListFilter),
    )
    search_fields = ('booking_number', 'customer__email', 'guest_checkout__email')
    readonly_fields = (
        'booking_number', 'base_price_cents', 'surcharge_cents', 
        'coi_fee_cents', 'organizing_total_cents', 'total_price_cents', 
        'created_at', 'updated_at'
    )
    
    inlines = [BookingSpecialtyItemInline]
    
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
            )
        }),
        ('Organizing Services', {
            'fields': ('include_packing', 'include_unpacking'),
            'classes': ('wide',),
            'description': 'Professional packing and unpacking services (Mini Moves only)'
        }),
        ('Booking Details', {
            'fields': ('pickup_date', 'pickup_time', 'pickup_address', 'delivery_address')
        }),
        ('Requirements', {
            'fields': ('special_instructions', 'coi_required')
        }),
        ('Calculated Pricing', {
            'fields': ('base_price_cents', 'surcharge_cents', 'coi_fee_cents', 'organizing_total_cents', 'total_price_cents'),
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
    
    actions = ['soft_delete_selected', 'restore_selected']
    
    def get_queryset(self, request):
        """Show all bookings when filter is used, otherwise show only active ones"""
        qs = super().get_queryset(request)
        # If user is specifically filtering by deleted_at, show all results
     #   if 'deleted_at__isnull' in request.GET:
      #      return qs  # Let the filter handle it
        # Otherwise only show active bookings by default
       # return qs.filter(deleted_at__isnull=True)
    
    def get_customer_name(self, obj):
        return obj.get_customer_name()
    get_customer_name.short_description = 'Customer'
    
    def get_service_details(self, obj):
        if obj.service_type == 'mini_move' and obj.mini_move_package:
            return obj.mini_move_package.name
        elif obj.service_type == 'standard_delivery' and obj.standard_delivery_item_count:
            return f"{obj.standard_delivery_item_count} items"
        elif obj.service_type == 'specialty_item':
            booking_items = obj.bookingspecialtyitem_set.all()
            items_list = [f"{bi.quantity}x {bi.specialty_item.name}" for bi in booking_items[:2]]
            return ", ".join(items_list) + ("..." if len(booking_items) > 2 else "")
        return "Not configured"
    get_service_details.short_description = 'Service Details'
    
    def get_organizing_services(self, obj):
        """Show organizing services for this booking"""
        if obj.service_type != 'mini_move':
            return "—"
        
        services = []
        if obj.include_packing:
            services.append("📦 Packing")
        if obj.include_unpacking:
            services.append("📤 Unpacking")
        
        if services:
            services_text = " + ".join(services)
            return format_html(
                '<span style="color: #059669; font-weight: bold;">{}</span><br>'
                '<small style="color: #6b7280;">${}</small>',
                services_text,
                obj.organizing_total_dollars
            )
        return format_html('<span style="color: #9ca3af;">None</span>')
    get_organizing_services.short_description = 'Organizing Services'
    
    def visibility_status(self, obj):
        """Show if booking is visible in staff dashboard"""
        if obj.deleted_at:
            return format_html('<span style="color: red;">🙈 Hidden</span>')
        return format_html('<span style="color: green;">👁️ Visible</span>')
    visibility_status.short_description = 'Dashboard Status'
    
    def soft_delete_selected(self, request, queryset):
        count = queryset.filter(deleted_at__isnull=True).update(deleted_at=timezone.now())
        self.message_user(request, f'Hidden {count} bookings from staff dashboard')
    soft_delete_selected.short_description = "Hide selected bookings from dashboard"
    
    def restore_selected(self, request, queryset):
        count = queryset.filter(deleted_at__isnull=False).update(deleted_at=None)
        self.message_user(request, f'Restored {count} bookings to dashboard')
    restore_selected.short_description = "Restore hidden bookings"


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