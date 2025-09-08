from django.contrib import admin
from django.utils.html import format_html
from .models import (
    MiniMovePackage, 
    OrganizingService,
    StandardDeliveryConfig, 
    SpecialtyItem, 
    SurchargeRule, 
    VanSchedule
)


@admin.register(MiniMovePackage)
class MiniMovePackageAdmin(admin.ModelAdmin):
    list_display = ('name', 'package_type', 'base_price_dollars', 'max_items', 'coi_included', 'is_most_popular', 'is_active', 'get_organizing_services')
    list_filter = ('package_type', 'coi_included', 'is_most_popular', 'is_active')
    search_fields = ('name', 'description')
    ordering = ('base_price_cents',)
    
    fieldsets = (
        ('Package Details', {
            'fields': ('package_type', 'name', 'description', 'is_most_popular', 'is_active')
        }),
        ('Pricing', {
            'fields': ('base_price_cents', 'coi_included', 'coi_fee_cents')
        }),
        ('Limits & Features', {
            'fields': ('max_items', 'max_weight_per_item_lbs', 'priority_scheduling', 'protective_wrapping')
        })
    )
    
    def get_organizing_services(self, obj):
        """Show available organizing services for this tier"""
        organizing_services = OrganizingService.objects.filter(
            mini_move_tier=obj.package_type,
            is_active=True
        )
        if organizing_services.exists():
            services = []
            for service in organizing_services:
                service_type = "📦 Packing" if service.is_packing_service else "📤 Unpacking"
                services.append(f"{service_type}: ${service.price_dollars}")
            return format_html("<br>".join(services))
        return "❌ No organizing services"
    get_organizing_services.short_description = 'Available Organizing Services'


@admin.register(OrganizingService)
class OrganizingServiceAdmin(admin.ModelAdmin):
    list_display = (
        'name', 
        'get_tier_badge', 
        'get_service_type_badge', 
        'price_dollars', 
        'duration_hours', 
        'organizer_count',
        'supplies_allowance_dollars',
        'is_active'
    )
    list_filter = ('mini_move_tier', 'is_packing_service', 'is_active')
    search_fields = ('name', 'description')
    ordering = ('mini_move_tier', 'is_packing_service', 'price_cents')
    
    fieldsets = (
        ('Service Details', {
            'fields': ('service_type', 'mini_move_tier', 'name', 'description', 'is_active')
        }),
        ('Pricing & Specs', {
            'fields': ('price_cents', 'duration_hours', 'organizer_count')
        }),
        ('Service Classification', {
            'fields': ('is_packing_service', 'supplies_allowance_cents')
        })
    )
    
    readonly_fields = ('service_type',)  # Auto-generated based on tier + type
    
    def get_tier_badge(self, obj):
        """Display tier with color coding"""
        colors = {
            'petite': '#fbbf24',    # Yellow
            'standard': '#3b82f6',  # Blue  
            'full': '#10b981'       # Green
        }
        color = colors.get(obj.mini_move_tier, '#6b7280')
        return format_html(
            '<span style="background: {}; color: white; padding: 2px 8px; border-radius: 4px; font-weight: bold;">{}</span>',
            color,
            obj.mini_move_tier.title()
        )
    get_tier_badge.short_description = 'Move Tier'
    
    def get_service_type_badge(self, obj):
        """Display service type with icon"""
        if obj.is_packing_service:
            return format_html(
                '<span style="color: #059669;">📦 Packing</span>'
            )
        else:
            return format_html(
                '<span style="color: #0284c7;">📤 Unpacking</span>'
            )
    get_service_type_badge.short_description = 'Service Type'
    
    def save_model(self, request, obj, form, change):
        """Auto-generate service_type based on tier and packing/unpacking"""
        service_prefix = f"{obj.mini_move_tier}_"
        service_suffix = "packing" if obj.is_packing_service else "unpacking"
        obj.service_type = service_prefix + service_suffix
        super().save_model(request, obj, form, change)


@admin.register(StandardDeliveryConfig)
class StandardDeliveryConfigAdmin(admin.ModelAdmin):
    list_display = ('price_per_item_dollars', 'minimum_items', 'minimum_charge_dollars', 'same_day_flat_rate_dollars', 'is_active')
    fieldsets = (
        ('Per-Item Pricing', {
            'fields': ('price_per_item_cents', 'minimum_items', 'minimum_charge_cents')
        }),
        ('Same-Day Delivery', {
            'fields': ('same_day_flat_rate_cents',)
        }),
        ('Constraints', {
            'fields': ('max_weight_per_item_lbs', 'is_active')
        })
    )
    
    def same_day_flat_rate_dollars(self, obj):
        return f"${obj.same_day_flat_rate_cents / 100:.0f}"
    same_day_flat_rate_dollars.short_description = 'Same-Day Rate'


@admin.register(SpecialtyItem)
class SpecialtyItemAdmin(admin.ModelAdmin):
    list_display = ('name', 'item_type', 'price_dollars', 'requires_van_schedule', 'special_handling', 'is_active')
    list_filter = ('item_type', 'requires_van_schedule', 'special_handling', 'is_active')
    search_fields = ('name', 'description')
    
    fieldsets = (
        ('Item Details', {
            'fields': ('item_type', 'name', 'description', 'is_active')
        }),
        ('Pricing', {
            'fields': ('price_cents',)
        }),
        ('Requirements', {
            'fields': ('requires_van_schedule', 'special_handling')
        })
    )


@admin.register(SurchargeRule)
class SurchargeRuleAdmin(admin.ModelAdmin):
    list_display = ('name', 'surcharge_type', 'calculation_type', 'get_surcharge_display', 'get_applies_to', 'is_active')
    list_filter = ('surcharge_type', 'calculation_type', 'is_active', 'applies_saturday', 'applies_sunday')
    search_fields = ('name', 'description')
    
    fieldsets = (
        ('Rule Details', {
            'fields': ('surcharge_type', 'name', 'description', 'is_active')
        }),
        ('Calculation', {
            'fields': ('calculation_type', 'percentage', 'fixed_amount_cents')
        }),
        ('Date Rules', {
            'fields': ('specific_date', 'applies_saturday', 'applies_sunday'),
            'description': 'Set specific date OR weekend days, not both'
        })
    )
    
    def get_surcharge_display(self, obj):
        if obj.calculation_type == 'percentage' and obj.percentage:
            return format_html('<span style="color: #059669; font-weight: bold;">{}%</span>', obj.percentage)
        elif obj.calculation_type == 'fixed_amount' and obj.fixed_amount_cents:
            return format_html('<span style="color: #dc2626; font-weight: bold;">${}</span>', obj.fixed_amount_cents / 100)
        return "❌ Not configured"
    get_surcharge_display.short_description = 'Surcharge Amount'
    
    def get_applies_to(self, obj):
        """Show when this surcharge applies"""
        applies_to = []
        if obj.specific_date:
            applies_to.append(f"📅 {obj.specific_date}")
        if obj.applies_saturday:
            applies_to.append("🗓️ Saturdays")
        if obj.applies_sunday:
            applies_to.append("🗓️ Sundays")
        
        if applies_to:
            return format_html("<br>".join(applies_to))
        return "❓ No dates set"
    get_applies_to.short_description = 'Applies To'


@admin.register(VanSchedule)
class VanScheduleAdmin(admin.ModelAdmin):
    list_display = ('date', 'get_availability_status', 'total_bookings', 'max_capacity', 'get_capacity_bar', 'allows_specialty_items')
    list_filter = ('is_available', 'date')
    search_fields = ('notes',)
    date_hierarchy = 'date'
    ordering = ('-date',)
    
    fieldsets = (
        ('Schedule', {
            'fields': ('date', 'is_available', 'max_capacity')
        }),
        ('Current Bookings', {
            'fields': ('mini_moves_booked', 'specialty_items_booked'),
            'description': 'These are automatically updated when bookings are created'
        }),
        ('Notes', {
            'fields': ('notes',)
        })
    )
    
    readonly_fields = ('mini_moves_booked', 'specialty_items_booked')
    
    def get_availability_status(self, obj):
        if not obj.is_available:
            return format_html('<span style="color: #dc2626; font-weight: bold;">❌ Unavailable</span>')
        elif obj.has_capacity:
            return format_html('<span style="color: #059669; font-weight: bold;">✅ Available</span>')
        else:
            return format_html('<span style="color: #d97706; font-weight: bold;">⚠️ Full</span>')
    get_availability_status.short_description = 'Status'
    
    def get_capacity_bar(self, obj):
        """Visual capacity bar"""
        if obj.max_capacity == 0:
            return "No capacity set"
        
        percentage = (obj.total_bookings / obj.max_capacity) * 100
        percentage = min(percentage, 100)  # Cap at 100%
        
        if percentage < 50:
            color = '#059669'  # Green
        elif percentage < 80:
            color = '#d97706'  # Orange
        else:
            color = '#dc2626'  # Red
        
        return format_html(
            '<div style="width: 100px; background: #e5e7eb; border-radius: 4px; overflow: hidden;">'
            '<div style="width: {}%; background: {}; height: 20px; border-radius: 4px;"></div>'
            '</div>'
            '<small>{}/{}</small>',
            percentage, color, obj.total_bookings, obj.max_capacity
        )
    get_capacity_bar.short_description = 'Capacity'


# Custom admin site customization
admin.site.site_header = "ToteTaxi Admin"
admin.site.site_title = "ToteTaxi Admin Portal"
admin.site.index_title = "Welcome to ToteTaxi Administration"