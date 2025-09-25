# backend/apps/services/serializers.py
from rest_framework import serializers
from .models import (
    MiniMovePackage, 
    OrganizingService, 
    StandardDeliveryConfig, 
    SpecialtyItem, 
    SurchargeRule
)


class MiniMovePackageSerializer(serializers.ModelSerializer):
    base_price_dollars = serializers.ReadOnlyField()
    coi_fee_dollars = serializers.ReadOnlyField()
    
    class Meta:
        model = MiniMovePackage
        fields = (
            'id', 'package_type', 'name', 'description',
            'base_price_dollars', 'max_items', 'coi_included', 'coi_fee_dollars',
            'is_most_popular', 'priority_scheduling', 'protective_wrapping'
        )


class OrganizingServiceSerializer(serializers.ModelSerializer):
    price_dollars = serializers.ReadOnlyField()
    supplies_allowance_dollars = serializers.ReadOnlyField()
    
    class Meta:
        model = OrganizingService
        fields = (
            'id', 'service_type', 'mini_move_tier', 'name', 'description',
            'price_dollars', 'duration_hours', 'organizer_count',
            'supplies_allowance_dollars', 'is_packing_service'
        )


class SpecialtyItemSerializer(serializers.ModelSerializer):
    price_dollars = serializers.ReadOnlyField()
    
    class Meta:
        model = SpecialtyItem
        fields = (
            'id', 'item_type', 'name', 'description', 'price_dollars',
            'requires_van_schedule', 'special_handling'
        )


class StandardDeliveryConfigSerializer(serializers.ModelSerializer):
    price_per_item_dollars = serializers.ReadOnlyField()
    minimum_charge_dollars = serializers.ReadOnlyField()
    same_day_flat_rate_dollars = serializers.SerializerMethodField()
    
    class Meta:
        model = StandardDeliveryConfig
        fields = (
            'price_per_item_dollars', 'minimum_items', 'minimum_charge_dollars',
            'same_day_flat_rate_dollars', 'max_weight_per_item_lbs'
        )
    
    def get_same_day_flat_rate_dollars(self, obj):
        return obj.same_day_flat_rate_cents / 100


class SurchargeRuleSerializer(serializers.ModelSerializer):
    fixed_amount_dollars = serializers.SerializerMethodField()
    
    class Meta:
        model = SurchargeRule
        fields = (
            'id', 'surcharge_type', 'name', 'description',
            'calculation_type', 'percentage', 'fixed_amount_dollars',
            'specific_date', 'applies_saturday', 'applies_sunday'
        )
    
    def get_fixed_amount_dollars(self, obj):
        return obj.fixed_amount_cents / 100 if obj.fixed_amount_cents else None


class ServiceCatalogSerializer(serializers.Serializer):
    """Complete service catalog with all available services and organizing options"""
    
    mini_move_packages = MiniMovePackageSerializer(many=True, read_only=True)
    organizing_services = OrganizingServiceSerializer(many=True, read_only=True)
    standard_delivery = StandardDeliveryConfigSerializer(read_only=True)
    specialty_items = SpecialtyItemSerializer(many=True, read_only=True)
    
    surcharge_rules = SurchargeRuleSerializer(many=True, read_only=True, required=False)


class OrganizingServicesByTierSerializer(serializers.Serializer):
    """Organizing services grouped by Mini Move tier for easy frontend consumption"""
    
    def to_representation(self, instance):
        organizing_services = OrganizingService.objects.filter(is_active=True)
        
        result = {}
        for tier in ['petite', 'standard', 'full']:
            tier_services = organizing_services.filter(mini_move_tier=tier)
            packing_service = tier_services.filter(is_packing_service=True).first()
            unpacking_service = tier_services.filter(is_packing_service=False).first()
            
            result[tier] = {
                'packing': OrganizingServiceSerializer(packing_service).data if packing_service else None,
                'unpacking': OrganizingServiceSerializer(unpacking_service).data if unpacking_service else None
            }
        
        return result


class MiniMoveWithOrganizingSerializer(serializers.Serializer):
    """Mini Move packages with their available organizing services"""
    
    def to_representation(self, instance):
        packages = MiniMovePackage.objects.filter(is_active=True).order_by('base_price_cents')
        
        result = []
        for package in packages:
            organizing_services = OrganizingService.objects.filter(
                mini_move_tier=package.package_type,
                is_active=True
            )
            
            packing_service = organizing_services.filter(is_packing_service=True).first()
            unpacking_service = organizing_services.filter(is_packing_service=False).first()
            
            package_data = MiniMovePackageSerializer(package).data
            package_data['organizing_options'] = {
                'packing': OrganizingServiceSerializer(packing_service).data if packing_service else None,
                'unpacking': OrganizingServiceSerializer(unpacking_service).data if unpacking_service else None
            }
            
            result.append(package_data)
        
        return result