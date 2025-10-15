# backend/apps/bookings/serializers.py
from rest_framework import serializers
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta, time as dt_time
from .models import Booking, Address, GuestCheckout
from apps.services.models import MiniMovePackage, SpecialtyItem, OrganizingService, StandardDeliveryConfig, SurchargeRule


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
    
    # ✅ FIX: Explicitly format date fields as date-only strings (no timezone)
    pickup_date = serializers.DateField(format='%Y-%m-%d')
    blade_flight_date = serializers.DateField(format='%Y-%m-%d', allow_null=True)
    
    class Meta:
        model = Booking
        fields = (
            'id', 'booking_number', 'customer_name', 'customer_email',
            'service_type', 'pickup_date', 'pickup_time', 'specific_pickup_hour', 'status',
            'pickup_address', 'delivery_address', 'guest_checkout',
            'special_instructions', 'coi_required', 'is_outside_core_area',
            'include_packing', 'include_unpacking',
            # BLADE fields
            'blade_airport', 'blade_flight_date', 'blade_flight_time', 
            'blade_bag_count', 'blade_ready_time',
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
    
    # ✅ FIX: Explicitly format date fields as date-only strings (no timezone)
    pickup_date = serializers.DateField(format='%Y-%m-%d')
    blade_flight_date = serializers.DateField(format='%Y-%m-%d', allow_null=True)
    
    class Meta:
        model = Booking
        fields = (
            'booking_number', 'customer_name', 'service_type', 
            'pickup_date', 'pickup_time', 'specific_pickup_hour', 'status',
            'pickup_address', 'delivery_address',
            'include_packing', 'include_unpacking',
            # BLADE fields
            'blade_airport', 'blade_flight_date', 'blade_flight_time', 
            'blade_bag_count', 'blade_ready_time',
            'total_price_dollars', 'organizing_total_dollars', 'created_at'
        )
    
    def get_customer_name(self, obj):
        return obj.get_customer_name()


class PricingPreviewSerializer(serializers.Serializer):
    service_type = serializers.ChoiceField(choices=[
        ('mini_move', 'Mini Move'),
        ('standard_delivery', 'Standard Delivery'),
        ('specialty_item', 'Specialty Item'),
        ('blade_transfer', 'BLADE Airport Transfer'),
    ])
    pickup_date = serializers.DateField()
    
    # Mini Move fields
    mini_move_package_id = serializers.UUIDField(required=False)
    coi_required = serializers.BooleanField(required=False, default=False)
    include_packing = serializers.BooleanField(required=False, default=False)
    include_unpacking = serializers.BooleanField(required=False, default=False)
    
    # Pickup time options
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
    
    # Geographic surcharge
    is_outside_core_area = serializers.BooleanField(required=False, default=False)
    
    # Standard Delivery fields
    standard_delivery_item_count = serializers.IntegerField(required=False, min_value=0)
    is_same_day_delivery = serializers.BooleanField(required=False, default=False)
    specialty_item_ids = serializers.ListField(
        child=serializers.UUIDField(),
        required=False,
        allow_empty=True
    )
    
    # BLADE fields
    blade_airport = serializers.ChoiceField(
        choices=[('JFK', 'JFK'), ('EWR', 'EWR')],
        required=False
    )
    blade_flight_date = serializers.DateField(required=False)
    blade_flight_time = serializers.TimeField(required=False)
    blade_bag_count = serializers.IntegerField(required=False, min_value=2)
    
    def validate(self, attrs):
        service_type = attrs.get('service_type')
        
        # BLADE validation
        if service_type == 'blade_transfer':
            if not attrs.get('blade_airport'):
                raise serializers.ValidationError({'blade_airport': 'Airport selection required for BLADE'})
            if not attrs.get('blade_flight_date'):
                raise serializers.ValidationError({'blade_flight_date': 'Flight date required for BLADE'})
            if not attrs.get('blade_flight_time'):
                raise serializers.ValidationError({'blade_flight_time': 'Flight time required for BLADE'})
            if not attrs.get('blade_bag_count'):
                raise serializers.ValidationError({'blade_bag_count': 'Bag count required for BLADE'})
            
            if attrs.get('blade_bag_count', 0) < 2:
                raise serializers.ValidationError({
                    'blade_bag_count': 'BLADE service requires minimum 2 bags'
                })
            
            if attrs.get('blade_airport') not in ['JFK', 'EWR']:
                raise serializers.ValidationError({
                    'blade_airport': 'BLADE only serves JFK and EWR airports'
                })
            
            flight_date = attrs.get('blade_flight_date')
            if flight_date:
                now = timezone.now()
                cutoff = timezone.datetime.combine(
                    flight_date - timedelta(days=1),
                    dt_time(20, 0)
                )
                cutoff = timezone.make_aware(cutoff)
                
                if now > cutoff:
                    raise serializers.ValidationError({
                        'blade_flight_date': 'BLADE bookings must be made by 8 PM the night before flight'
                    })
        
        # Standard Delivery validation
        elif service_type == 'standard_delivery':
            item_count = attrs.get('standard_delivery_item_count', 0)
            specialty_ids = attrs.get('specialty_item_ids', [])
            
            if item_count == 0 and len(specialty_ids) == 0:
                raise serializers.ValidationError({
                    'standard_delivery': 'Please select at least one regular item or specialty item'
                })
        
        return attrs


class GuestPaymentIntentSerializer(serializers.Serializer):
    """
    NEW: Serializer for creating payment intent BEFORE guest booking
    Validates all booking data and calculates total price
    """
    
    # Guest customer info
    first_name = serializers.CharField(max_length=100)
    last_name = serializers.CharField(max_length=100)
    email = serializers.EmailField()
    phone = serializers.CharField(max_length=20)
    
    # Service selection
    service_type = serializers.ChoiceField(choices=[
        ('mini_move', 'Mini Move'),
        ('standard_delivery', 'Standard Delivery'),
        ('specialty_item', 'Specialty Item'),
        ('blade_transfer', 'BLADE Airport Transfer'),
    ])
    
    # Service-specific fields
    mini_move_package_id = serializers.UUIDField(required=False, allow_null=True)
    include_packing = serializers.BooleanField(default=False)
    include_unpacking = serializers.BooleanField(default=False)
    standard_delivery_item_count = serializers.IntegerField(required=False, min_value=0)
    is_same_day_delivery = serializers.BooleanField(default=False)
    specialty_item_ids = serializers.ListField(
        child=serializers.UUIDField(),
        required=False,
        allow_empty=True
    )
    
    # BLADE fields
    blade_airport = serializers.ChoiceField(
        choices=[('JFK', 'JFK'), ('EWR', 'EWR')],
        required=False
    )
    blade_flight_date = serializers.DateField(required=False)
    blade_flight_time = serializers.TimeField(required=False)
    blade_bag_count = serializers.IntegerField(required=False, min_value=2)
    
    # Booking details
    pickup_date = serializers.DateField()
    pickup_time = serializers.ChoiceField(choices=[
        ('morning', '8 AM - 11 AM'),
        ('morning_specific', 'Specific 1-hour window'),
        ('no_time_preference', 'No time preference'),
    ], required=False)
    specific_pickup_hour = serializers.IntegerField(required=False, allow_null=True)
    
    # Additional options
    coi_required = serializers.BooleanField(default=False)
    is_outside_core_area = serializers.BooleanField(default=False)
    
    def validate(self, attrs):
        service_type = attrs['service_type']
        
        # Service-specific validation
        if service_type == 'blade_transfer':
            if not all([attrs.get('blade_airport'), attrs.get('blade_flight_date'), 
                       attrs.get('blade_flight_time'), attrs.get('blade_bag_count')]):
                raise serializers.ValidationError("All BLADE fields are required")
            
            if attrs.get('blade_bag_count', 0) < 2:
                raise serializers.ValidationError("BLADE service requires minimum 2 bags")
        
        elif service_type == 'mini_move':
            if not attrs.get('mini_move_package_id'):
                raise serializers.ValidationError("mini_move_package_id is required")
        
        elif service_type == 'standard_delivery':
            item_count = attrs.get('standard_delivery_item_count', 0)
            specialty_ids = attrs.get('specialty_item_ids', [])
            
            if item_count == 0 and len(specialty_ids) == 0:
                raise serializers.ValidationError("At least one item required")
        
        elif service_type == 'specialty_item':
            if not attrs.get('specialty_item_ids'):
                raise serializers.ValidationError("specialty_item_ids is required")
        
        # Calculate pricing
        attrs['calculated_total_cents'] = self._calculate_total_price(attrs)
        
        return attrs
    
    def _calculate_total_price(self, data):
        """Calculate total price in cents for payment intent"""
        service_type = data['service_type']
        total_cents = 0
        
        # BLADE pricing
        if service_type == 'blade_transfer':
            bag_count = data.get('blade_bag_count', 0)
            per_bag_price = 7500  # $75
            total_cents = max(bag_count * per_bag_price, 15000)  # $150 min
            return total_cents
        
        # Mini Move pricing
        elif service_type == 'mini_move':
            try:
                package = MiniMovePackage.objects.get(id=data['mini_move_package_id'])
                total_cents = package.base_price_cents
                
                # COI fee
                if data.get('coi_required') and not package.coi_included:
                    total_cents += package.coi_fee_cents
                
                # Organizing services
                if data.get('include_packing') or data.get('include_unpacking'):
                    organizing_total = 0
                    
                    if data.get('include_packing'):
                        packing = OrganizingService.objects.filter(
                            mini_move_tier=package.package_type,
                            is_packing_service=True,
                            is_active=True
                        ).first()
                        if packing:
                            total_cents += packing.price_cents
                            organizing_total += packing.price_cents
                    
                    if data.get('include_unpacking'):
                        unpacking = OrganizingService.objects.filter(
                            mini_move_tier=package.package_type,
                            is_packing_service=False,
                            is_active=True
                        ).first()
                        if unpacking:
                            total_cents += unpacking.price_cents
                            organizing_total += unpacking.price_cents
                    
                    # Tax on organizing
                    if organizing_total > 0:
                        total_cents += int(organizing_total * 0.0825)
                
                # Geographic surcharge
                if data.get('is_outside_core_area'):
                    total_cents += 17500
                
                # Time window surcharge
                if data.get('pickup_time') == 'morning_specific' and package.package_type == 'standard':
                    total_cents += 17500
                
            except MiniMovePackage.DoesNotExist:
                raise serializers.ValidationError("Invalid package")
        
        # Standard Delivery pricing
        elif service_type == 'standard_delivery':
            try:
                config = StandardDeliveryConfig.objects.filter(is_active=True).first()
                if config:
                    item_count = data.get('standard_delivery_item_count', 0)
                    if item_count > 0:
                        item_total = config.price_per_item_cents * item_count
                        total_cents = max(item_total, config.minimum_charge_cents)
                    
                    # Specialty items
                    specialty_ids = data.get('specialty_item_ids', [])
                    if specialty_ids:
                        specialty_items = SpecialtyItem.objects.filter(id__in=specialty_ids)
                        total_cents += sum(item.price_cents for item in specialty_items)
                    
                    # Same-day
                    if data.get('is_same_day_delivery'):
                        total_cents += config.same_day_flat_rate_cents
                    
                    # COI
                    if data.get('coi_required'):
                        total_cents += 5000
                    
                    # Geographic
                    if data.get('is_outside_core_area'):
                        total_cents += 17500
                        
            except StandardDeliveryConfig.DoesNotExist:
                raise serializers.ValidationError("Standard delivery not configured")
        
        # Specialty Item pricing
        elif service_type == 'specialty_item':
            specialty_ids = data.get('specialty_item_ids', [])
            specialty_items = SpecialtyItem.objects.filter(id__in=specialty_ids)
            total_cents = sum(item.price_cents for item in specialty_items)
            
            # Same-day
            if data.get('is_same_day_delivery'):
                try:
                    config = StandardDeliveryConfig.objects.filter(is_active=True).first()
                    if config:
                        total_cents += config.same_day_flat_rate_cents
                except StandardDeliveryConfig.DoesNotExist:
                    pass
            
            # COI
            if data.get('coi_required'):
                total_cents += 5000
            
            # Geographic
            if data.get('is_outside_core_area'):
                total_cents += 17500
        
        # Weekend surcharges (not for BLADE)
        if service_type != 'blade_transfer' and data.get('pickup_date'):
            active_surcharges = SurchargeRule.objects.filter(is_active=True)
            for surcharge in active_surcharges:
                surcharge_amount = surcharge.calculate_surcharge(
                    total_cents,
                    data['pickup_date'],
                    service_type
                )
                total_cents += surcharge_amount
        
        return total_cents


class GuestBookingCreateSerializer(serializers.Serializer):
    """
    REFACTORED: Create booking for guest AFTER payment succeeds
    Now requires payment_intent_id and does NOT create payment
    """
    
    # Payment verification
    payment_intent_id = serializers.CharField(required=True)
    
    # Guest customer info
    first_name = serializers.CharField(max_length=100)
    last_name = serializers.CharField(max_length=100)
    email = serializers.EmailField()
    phone = serializers.CharField(max_length=20)
    
    # Service selection
    service_type = serializers.ChoiceField(choices=[
        ('mini_move', 'Mini Move'),
        ('standard_delivery', 'Standard Delivery'),
        ('specialty_item', 'Specialty Item'),
        ('blade_transfer', 'BLADE Airport Transfer'),
    ])
    
    # Service-specific fields
    mini_move_package_id = serializers.UUIDField(required=False)
    standard_delivery_item_count = serializers.IntegerField(required=False, min_value=0)
    is_same_day_delivery = serializers.BooleanField(default=False)
    specialty_item_ids = serializers.ListField(
        child=serializers.UUIDField(),
        required=False,
        allow_empty=True
    )
    
    # Organizing services for Mini Moves
    include_packing = serializers.BooleanField(default=False)
    include_unpacking = serializers.BooleanField(default=False)
    
    # BLADE fields
    blade_airport = serializers.ChoiceField(
        choices=[('JFK', 'JFK'), ('EWR', 'EWR')],
        required=False
    )
    blade_flight_date = serializers.DateField(required=False)
    blade_flight_time = serializers.TimeField(required=False)
    blade_bag_count = serializers.IntegerField(required=False, min_value=2)
    
    # Booking details
    pickup_date = serializers.DateField()
    pickup_time = serializers.ChoiceField(choices=[
        ('morning', '8 AM - 11 AM'),
        ('morning_specific', 'Specific 1-hour window'),
        ('no_time_preference', 'No time preference'),
    ], default='morning')
    specific_pickup_hour = serializers.IntegerField(required=False, min_value=8, max_value=10)
    
    # Geographic surcharge
    is_outside_core_area = serializers.BooleanField(default=False)
    
    # Addresses
    pickup_address = serializers.DictField()
    delivery_address = serializers.DictField()
    
    # Additional info
    special_instructions = serializers.CharField(required=False, allow_blank=True)
    coi_required = serializers.BooleanField(default=False)
    
    def validate_pickup_address(self, value):
        """Validate pickup address including service area check"""
        required_fields = ['address_line_1', 'city', 'state', 'zip_code']
        for field in required_fields:
            if field not in value:
                raise serializers.ValidationError(f"Missing required field: {field}")
        
        from .zip_codes import validate_service_area
        
        zip_code = value.get('zip_code')
        is_serviceable, requires_surcharge, zone, error = validate_service_area(zip_code)
        
        if not is_serviceable:
            raise serializers.ValidationError(error)
        
        return value

    def validate_delivery_address(self, value):
        """Validate delivery address including service area check"""
        required_fields = ['address_line_1', 'city', 'state', 'zip_code']
        for field in required_fields:
            if field not in value:
                raise serializers.ValidationError(f"Missing required field: {field}")
        
        # SKIP ZIP VALIDATION FOR BLADE TRANSFERS
        if self.initial_data.get('service_type') == 'blade_transfer':
            return value
        
        from .zip_codes import validate_service_area
        
        zip_code = value.get('zip_code')
        is_serviceable, requires_surcharge, zone, error = validate_service_area(zip_code)
        
        if not is_serviceable:
            raise serializers.ValidationError(error)
        
        return value
    
    def validate(self, attrs):
        service_type = attrs['service_type']
        pickup_time = attrs.get('pickup_time', 'morning')
        
        if pickup_time == 'morning_specific' and not attrs.get('specific_pickup_hour'):
            raise serializers.ValidationError("specific_pickup_hour is required when pickup_time is 'morning_specific'")
        
        # BLADE validation
        if service_type == 'blade_transfer':
            if not attrs.get('blade_airport'):
                raise serializers.ValidationError("blade_airport is required for BLADE service")
            if not attrs.get('blade_flight_date'):
                raise serializers.ValidationError("blade_flight_date is required for BLADE service")
            if not attrs.get('blade_flight_time'):
                raise serializers.ValidationError("blade_flight_time is required for BLADE service")
            if not attrs.get('blade_bag_count'):
                raise serializers.ValidationError("blade_bag_count is required for BLADE service")
            
            if attrs.get('blade_bag_count', 0) < 2:
                raise serializers.ValidationError("BLADE service requires minimum 2 bags")
            
            if attrs.get('blade_airport') not in ['JFK', 'EWR']:
                raise serializers.ValidationError("BLADE only serves JFK and EWR airports")
            
            flight_date = attrs.get('blade_flight_date')
            if flight_date:
                now = timezone.now()
                cutoff = timezone.datetime.combine(
                    flight_date - timedelta(days=1),
                    dt_time(20, 0)
                )
                cutoff = timezone.make_aware(cutoff)
                
                if now > cutoff:
                    raise serializers.ValidationError(
                        "BLADE bookings must be made by 8 PM the night before flight. "
                        "For rush service, please call (631) 595-5100"
                    )
            
            pickup_state = attrs.get('pickup_address', {}).get('state')
            if pickup_state and pickup_state != 'NY':
                raise serializers.ValidationError(
                    "BLADE service is only available for NYC pickups (NY state)"
                )
        
        # Mini Move validation
        elif service_type == 'mini_move':
            if not attrs.get('mini_move_package_id'):
                raise serializers.ValidationError("mini_move_package_id is required for mini move service")
            
            include_packing = attrs.get('include_packing', False)
            include_unpacking = attrs.get('include_unpacking', False)
            
            if include_packing or include_unpacking:
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
            if attrs.get('include_packing') or attrs.get('include_unpacking'):
                raise serializers.ValidationError("Organizing services are only available for Mini Move bookings")
        
        # Standard Delivery validation
        if service_type == 'standard_delivery':
            item_count = attrs.get('standard_delivery_item_count', 0)
            specialty_ids = attrs.get('specialty_item_ids', [])
            
            if item_count == 0 and len(specialty_ids) == 0:
                raise serializers.ValidationError(
                    "Please select at least one regular item or specialty item for Standard Delivery"
                )
        
        elif service_type == 'specialty_item':
            if not attrs.get('specialty_item_ids'):
                raise serializers.ValidationError("specialty_item_ids is required for specialty item service")
        
        return attrs
    
    def create(self, validated_data):
        # Remove payment_intent_id (not needed for booking)
        payment_intent_id = validated_data.pop('payment_intent_id')
        
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
            include_packing=validated_data.get('include_packing', False),
            include_unpacking=validated_data.get('include_unpacking', False),
            blade_airport=validated_data.get('blade_airport'),
            blade_flight_date=validated_data.get('blade_flight_date'),
            blade_flight_time=validated_data.get('blade_flight_time'),
            blade_bag_count=validated_data.get('blade_bag_count'),
            status='pending',  # Will be updated to 'paid' in view
        )
        
        # Handle service-specific relationships
        if validated_data['service_type'] == 'mini_move':
            try:
                package = MiniMovePackage.objects.get(id=validated_data['mini_move_package_id'])
                booking.mini_move_package = package
            except MiniMovePackage.DoesNotExist:
                raise serializers.ValidationError("Invalid mini move package")
        
        # Handle specialty items
        if validated_data.get('specialty_item_ids'):
            specialty_items = SpecialtyItem.objects.filter(
                id__in=validated_data.get('specialty_item_ids', [])
            )
            booking.save()
            booking.specialty_items.set(specialty_items)
        
        booking.save()
        return booking