from django.contrib import admin
from .models import (
    MiniMovePackage, 
    StandardDeliveryConfig, 
    SpecialtyItem, 
    SurchargeRule, 
    VanSchedule
)

@admin.register(MiniMovePackage)
class MiniMovePackageAdmin(admin.ModelAdmin):
    list_display = ('name', 'package_type', 'base_price_dollars', 'max_items', 'coi_included', 'is_most_popular', 'is_active')
    list_filter = ('package_type', 'coi_included', 'is_most_popular', 'is_active')
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

@admin.register(StandardDeliveryConfig)
class StandardDeliveryConfigAdmin(admin.ModelAdmin):
    list_display = ('price_per_item_dollars', 'minimum_items', 'minimum_charge_dollars', 'is_active')
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

@admin.register(SpecialtyItem)
class SpecialtyItemAdmin(admin.ModelAdmin):
    list_display = ('name', 'item_type', 'price_dollars', 'requires_van_schedule', 'is_active')
    list_filter = ('item_type', 'requires_van_schedule', 'special_handling', 'is_active')
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
    list_display = ('name', 'surcharge_type', 'calculation_type', 'get_surcharge_display', 'is_active')
    list_filter = ('surcharge_type', 'calculation_type', 'is_active')
    fieldsets = (
        ('Rule Details', {
            'fields': ('surcharge_type', 'name', 'description', 'is_active')
        }),
        ('Calculation', {
            'fields': ('calculation_type', 'percentage', 'fixed_amount_cents')
        }),
        ('Date Rules', {
            'fields': ('specific_date', 'applies_saturday', 'applies_sunday')
        })
    )
    
    def get_surcharge_display(self, obj):
        if obj.calculation_type == 'percentage' and obj.percentage:
            return f"{obj.percentage}%"
        elif obj.calculation_type == 'fixed_amount' and obj.fixed_amount_cents:
            return f"${obj.fixed_amount_cents / 100}"
        return "Not configured"
    get_surcharge_display.short_description = 'Surcharge Amount'

@admin.register(VanSchedule)
class VanScheduleAdmin(admin.ModelAdmin):
    list_display = ('date', 'is_available', 'total_bookings', 'max_capacity', 'has_capacity', 'allows_specialty_items')
    list_filter = ('is_available', 'date')
    date_hierarchy = 'date'
    fieldsets = (
        ('Schedule', {
            'fields': ('date', 'is_available', 'max_capacity')
        }),
        ('Bookings', {
            'fields': ('mini_moves_booked', 'specialty_items_booked')
        }),
        ('Notes', {
            'fields': ('notes',)
        })
    )