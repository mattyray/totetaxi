# backend/apps/services/admin.py
from django.contrib import admin
from django.utils.html import format_html
from .models import (
    MiniMovePackage, 
    OrganizingService,
    StandardDeliveryConfig, 
    SpecialtyItem, 
    SurchargeRule
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
    
    readonly_fields = ('service_type',)
    
    def get_tier_badge(self, obj):
        colors = {
            'petite': '#fbbf24',
            'standard': '#3b82f6',
            'full': '#10b981'
        }
        color = colors.get(obj.mini_move_tier, '#6b7280')
        return format_html(
            '<span style="background: {}; color: white; padding: 2px 8px; border-radius: 4px; font-weight: bold;">{}</span>',
            color,
            obj.mini_move_tier.title()
        )
    get_tier_badge.short_description = 'Move Tier'
    
    def get_service_type_badge(self, obj):
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


# apps/services/admin.py

@admin.register(SpecialtyItem)
class SpecialtyItemAdmin(admin.ModelAdmin):
    list_display = ('name', 'item_type', 'price_dollars', 'special_handling', 'is_active')
    list_filter = ('item_type', 'special_handling', 'is_active')
    search_fields = ('name', 'description')
    
    # ✅ ADD THIS: Bulk actions
    actions = ['mark_as_inactive', 'mark_as_active']
    
    fieldsets = (
        ('Item Details', {
            'fields': ('item_type', 'name', 'description', 'is_active')
        }),
        ('Pricing', {
            'fields': ('price_cents',)
        }),
        ('Requirements', {
            'fields': ('special_handling',)
        })
    )
    
    # ✅ ADD THESE METHODS:
    @admin.action(description='Mark selected items as inactive')
    def mark_as_inactive(self, request, queryset):
        updated = queryset.update(is_active=False)
        self.message_user(request, f'{updated} specialty item(s) marked as inactive.')
    
    @admin.action(description='Mark selected items as active')
    def mark_as_active(self, request, queryset):
        updated = queryset.update(is_active=True)
        self.message_user(request, f'{updated} specialty item(s) marked as active.')
        
@admin.register(SurchargeRule)
class SurchargeRuleAdmin(admin.ModelAdmin):
    list_display = ('name', 'surcharge_type', 'applies_to_service_type', 'calculation_type', 'get_surcharge_display', 'get_applies_to', 'is_active')
    list_filter = ('surcharge_type', 'applies_to_service_type', 'calculation_type', 'is_active', 'applies_saturday', 'applies_sunday')
    search_fields = ('name', 'description')
    
    fieldsets = (
        ('Rule Details', {
            'fields': ('surcharge_type', 'name', 'description', 'applies_to_service_type', 'is_active')
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


admin.site.site_header = "ToteTaxi Admin"
admin.site.site_title = "ToteTaxi Admin Portal"
admin.site.index_title = "Welcome to ToteTaxi Administration"