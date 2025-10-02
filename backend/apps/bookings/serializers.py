# backend/apps/bookings/serializers.py
from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Booking, Address, GuestCheckout
from apps.services.models import MiniMovePackage, SpecialtyItem, OrganizingService


class AddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = Address
        fields = (
            'id', 'address_line_1', 'address_line_2', 
            'city', 'state', 'zip_code'
        )


class GuestCheckoutSerializer(serializers.ModelSerializer):
    class Meta:
        model = GuestCheckout
        fields = ('first_name', 'last_name', 'email', 'phone')


class OrganizingServiceDetailSerializer(serializers.ModelSerializer):
    """Detailed organizing service info for booking responses"""
    price_dollars = serializers.ReadOnlyField()
    supplies_allowance_dollars = serializers.ReadOnlyField()
    
    class Meta:
        model = OrganizingService
        fields = (
            'id', 'service_type', 'name', 'description',
            'price_dollars', 'duration_hours', 'organizer_count',
            'supplies_allowance_dollars', 'is_packing_service'
        )


class BookingSerializer(serializers.ModelSerializer):
    customer_name = serializers.SerializerMethodField()
    customer_email = serializers.SerializerMethodField()
    pickup_address = AddressSerializer(read_only=True)
    delivery_address = AddressSerializer(read_only=True)
    guest_checkout = GuestCheckoutSerializer(read_only=True)
    total_price_dollars = serializers.ReadOnlyField()
    organizing_total_dollars = serializers.ReadOnlyField()
    pricing_breakdown = serializers.SerializerMethodField()
    organizing_services_breakdown = serializers.SerializerMethodField()
    
    class Meta:
        model = Booking
        fields = (
            'id', 'booking_number', 'customer_name', 'customer_email',
            'service_type', 'pickup_date', 'pickup_time', 'specific_pickup_hour', 'status',
            'pickup_address', 'delivery_address', 'guest_checkout',
            'special_instructions', 'coi_required', 'is_outside_core_area',
            'include_packing', 'include_unpacking',
            'total_price_dollars', 'organizing_total_dollars',
            'pricing_breakdown', 'organizing_services_breakdown', 'created_at'
        )
    
    def get_customer_name(self, obj):
        return obj.get_customer_name()
    
    def get_customer_email(self, obj):
        return obj.get_customer_email()
    
    def get_pricing_breakdown(self, obj):
        return obj.get_pricing_breakdown()
    
    def get_organizing_services_breakdown(self, obj):
        return obj.get_organizing_services_breakdown()


class BookingStatusSerializer(serializers.ModelSerializer):
    customer_name = serializers.SerializerMethodField()
    pickup_address = AddressSerializer(read_only=True)
    delivery_address = AddressSerializer(read_only=True)
    total_price_dollars = serializers.ReadOnlyField()
    organizing_total_dollars = serializers.ReadOnlyField()
    
    class Meta:
        model = Booking
        fields = (
            'booking_number', 'customer_name', 'service_type', 
            'pickup_date', 'pickup_time', 'specific_pickup_hour', 'status',
            'pickup_address', 'delivery_address',
            'include_packing', 'include_unpacking',
            'total_price_dollars', 'organizing_total_dollars', 'created_at'
        )
    
    def get_customer_name(self, obj):
        return obj.get_customer_name()


class PricingPreviewSerializer(serializers.Serializer):
    service_type = serializers.ChoiceField(choices=[
        ('mini_move', 'Mini Move'),
        ('standard_delivery', 'Standard Delivery'),
        ('specialty_item', 'Specialty Item')
    ])
    pickup_date = serializers.DateField()
    
    # Mini Move fields
    mini_move_package_id = serializers.UUIDField(required=False)
    coi_required = serializers.BooleanField(required=False, default=False)
    
    # NEW: Organizing service fields
    include_packing = serializers.BooleanField(required=False, default=False)
    include_unpacking = serializers.BooleanField(required=False, default=False)
    
    # UPDATED: New pickup time options
    pickup_time = serializers.ChoiceField(
        choices=[
            ('morning', '8 AM - 11 AM'),
            ('morning_specific', 'Specific 1-hour window'),
            ('no_time_preference', 'No time preference'),
        ],
        required=False,
        default='morning'
    )
    specific_pickup_hour = serializers.IntegerField(required=False, min_value=8, max_value=10)
    
    # NEW: Geographic surcharge
    is_outside_core_area = serializers.BooleanField(required=False, default=False)
    
    # PHASE 2: Standard Delivery fields - UPDATED to allow 0
    standard_delivery_item_count = serializers.IntegerField(required=False, min_value=0)
    is_same_day_delivery = serializers.BooleanField(required=False, default=False)
    
    # Specialty Items fields
    specialty_item_ids = serializers.ListField(
        child=serializers.UUIDField(),
        required=False,
        allow_empty=True
    )
    
    def validate(self, attrs):
        service_type = attrs.get('service_type')
        
        # PHASE 2: Validate Standard Delivery requires EITHER regular items OR specialty items
        if service_type == 'standard_delivery':
            item_count = attrs.get('standard_delivery_item_count', 0)
            specialty_ids = attrs.get('specialty_item_ids', [])
            
            # Must have at least one section
            if item_count == 0 and len(specialty_ids) == 0:
                raise serializers.ValidationError({
                    'standard_delivery': 'Please select at least one regular item or specialty item'
                })
        
        return attrs


class GuestBookingCreateSerializer(serializers.Serializer):
    # Guest customer info
    first_name = serializers.CharField(max_length=100)
    last_name = serializers.CharField(max_length=100)
    email = serializers.EmailField()
    phone = serializers.CharField(max_length=20)
    
    # Service selection
    service_type = serializers.ChoiceField(choices=[
        ('mini_move', 'Mini Move'),
        ('standard_delivery', 'Standard Delivery'),
        ('specialty_item', 'Specialty Item')
    ])
    
    # Service-specific fields
    mini_move_package_id = serializers.UUIDField(required=False)
    # PHASE 2: UPDATED to allow 0
    standard_delivery_item_count = serializers.IntegerField(required=False, min_value=0)
    is_same_day_delivery = serializers.BooleanField(default=False)
    specialty_item_ids = serializers.ListField(
        child=serializers.UUIDField(),
        required=False,
        allow_empty=True
    )
    
    # NEW: Organizing services for Mini Moves
    include_packing = serializers.BooleanField(default=False)
    include_unpacking = serializers.BooleanField(default=False)
    
    # Booking details - UPDATED: New pickup time options
    pickup_date = serializers.DateField()
    pickup_time = serializers.ChoiceField(choices=[
        ('morning', '8 AM - 11 AM'),
        ('morning_specific', 'Specific 1-hour window'),
        ('no_time_preference', 'No time preference'),
    ], default='morning')
    specific_pickup_hour = serializers.IntegerField(required=False, min_value=8, max_value=10)
    
    # NEW: Geographic surcharge
    is_outside_core_area = serializers.BooleanField(default=False)
    
    # Addresses
    pickup_address = serializers.DictField()
    delivery_address = serializers.DictField()
    
    # Additional info
    special_instructions = serializers.CharField(required=False, allow_blank=True)
    coi_required = serializers.BooleanField(default=False)
    
    def validate_pickup_address(self, value):
        required_fields = ['address_line_1', 'city', 'state', 'zip_code']
        for field in required_fields:
            if field not in value:
                raise serializers.ValidationError(f"Missing required field: {field}")
        return value
    
    def validate_delivery_address(self, value):
        required_fields = ['address_line_1', 'city', 'state', 'zip_code']
        for field in required_fields:
            if field not in value:
                raise serializers.ValidationError(f"Missing required field: {field}")
        return value
    
    def validate(self, attrs):
        service_type = attrs['service_type']
        pickup_time = attrs.get('pickup_time', 'morning')
        
        # Validate specific hour if morning_specific is selected
        if pickup_time == 'morning_specific' and not attrs.get('specific_pickup_hour'):
            raise serializers.ValidationError("specific_pickup_hour is required when pickup_time is 'morning_specific'")
        
        # Validate service-specific requirements
        if service_type == 'mini_move':
            if not attrs.get('mini_move_package_id'):
                raise serializers.ValidationError("mini_move_package_id is required for mini move service")
            
            # Validate organizing services only apply to mini moves
            include_packing = attrs.get('include_packing', False)
            include_unpacking = attrs.get('include_unpacking', False)
            
            if include_packing or include_unpacking:
                # Verify the mini move package exists and organizing services are available
                try:
                    package = MiniMovePackage.objects.get(id=attrs['mini_move_package_id'])
                    tier = package.package_type
                    
                    if include_packing:
                        if not OrganizingService.objects.filter(
                            mini_move_tier=tier,
                            is_packing_service=True,
                            is_active=True
                        ).exists():
                            raise serializers.ValidationError(f"Packing service not available for {tier} tier")
                    
                    if include_unpacking:
                        if not OrganizingService.objects.filter(
                            mini_move_tier=tier,
                            is_packing_service=False,
                            is_active=True
                        ).exists():
                            raise serializers.ValidationError(f"Unpacking service not available for {tier} tier")
                            
                except MiniMovePackage.DoesNotExist:
                    raise serializers.ValidationError("Invalid mini move package")
        else:
            # Organizing services only available for Mini Moves
            if attrs.get('include_packing') or attrs.get('include_unpacking'):
                raise serializers.ValidationError("Organizing services are only available for Mini Move bookings")
        
        # PHASE 2: Updated Standard Delivery validation
        if service_type == 'standard_delivery':
            item_count = attrs.get('standard_delivery_item_count', 0)
            specialty_ids = attrs.get('specialty_item_ids', [])
            
            # Must have EITHER regular items OR specialty items (or both)
            if item_count == 0 and len(specialty_ids) == 0:
                raise serializers.ValidationError(
                    "Please select at least one regular item or specialty item for Standard Delivery"
                )
        
        elif service_type == 'specialty_item':
            if not attrs.get('specialty_item_ids'):
                raise serializers.ValidationError("specialty_item_ids is required for specialty item service")
        
        return attrs
    
    def create(self, validated_data):
        # Create guest checkout
        guest_checkout = GuestCheckout.objects.create(
            first_name=validated_data['first_name'],
            last_name=validated_data['last_name'],
            email=validated_data['email'],
            phone=validated_data['phone']
        )
        
        # Create addresses
        pickup_address_data = validated_data.pop('pickup_address')
        pickup_address = Address.objects.create(**pickup_address_data)
        
        delivery_address_data = validated_data.pop('delivery_address')
        delivery_address = Address.objects.create(**delivery_address_data)
        
        # Create booking
        booking = Booking.objects.create(
            guest_checkout=guest_checkout,
            service_type=validated_data['service_type'],
            pickup_date=validated_data['pickup_date'],
            pickup_time=validated_data['pickup_time'],
            specific_pickup_hour=validated_data.get('specific_pickup_hour'),
            pickup_address=pickup_address,
            delivery_address=delivery_address,
            special_instructions=validated_data.get('special_instructions', ''),
            coi_required=validated_data.get('coi_required', False),
            is_outside_core_area=validated_data.get('is_outside_core_area', False),
            standard_delivery_item_count=validated_data.get('standard_delivery_item_count'),
            is_same_day_delivery=validated_data.get('is_same_day_delivery', False),
            # NEW: Organizing service fields
            include_packing=validated_data.get('include_packing', False),
            include_unpacking=validated_data.get('include_unpacking', False)
        )
        
        # Handle service-specific relationships
        if validated_data['service_type'] == 'mini_move':
            try:
                package = MiniMovePackage.objects.get(id=validated_data['mini_move_package_id'])
                booking.mini_move_package = package
            except MiniMovePackage.DoesNotExist:
                raise serializers.ValidationError("Invalid mini move package")
        
        # PHASE 2: Handle specialty items for standard_delivery OR specialty_item
        if validated_data.get('specialty_item_ids'):
            specialty_items = SpecialtyItem.objects.filter(
                id__in=validated_data.get('specialty_item_ids', [])
            )
            booking.save()  # Save first to get ID for M2M relationship
            booking.specialty_items.set(specialty_items)
        
        booking.save()  # This will trigger pricing calculation including organizing
        return booking