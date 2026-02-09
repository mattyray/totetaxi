# backend/apps/bookings/serializers.py
from rest_framework import serializers
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta, time as dt_time
from .models import Booking, Address, GuestCheckout, BookingSpecialtyItem
from .pricing_utils import calculate_geographic_surcharge_from_zips
from apps.services.models import MiniMovePackage, SpecialtyItem, OrganizingService, StandardDeliveryConfig, calculate_surcharges_for_date


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
    
    pickup_date = serializers.DateField(format='%Y-%m-%d')
    blade_flight_date = serializers.DateField(format='%Y-%m-%d', allow_null=True)
    
    class Meta:
        model = Booking
        fields = (
            'booking_number', 'customer_name', 'service_type', 
            'pickup_date', 'pickup_time', 'specific_pickup_hour', 'status',
            'pickup_address', 'delivery_address',
            'include_packing', 'include_unpacking',
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
    is_outside_core_area = serializers.BooleanField(required=False, default=False)
    # ZIP codes for accurate geographic surcharge calculation ($175 per out-of-zone address)
    pickup_zip_code = serializers.CharField(required=False, max_length=10)
    delivery_zip_code = serializers.CharField(required=False, max_length=10)
    
    # Standard Delivery fields
    standard_delivery_item_count = serializers.IntegerField(required=False, min_value=0)
    is_same_day_delivery = serializers.BooleanField(required=False, default=False)
    
    specialty_items = serializers.ListField(
        child=serializers.DictField(),
        required=False,
        allow_empty=True,
        help_text="List of {item_id: UUID, quantity: int}"
    )
    
    # BLADE fields
    blade_airport = serializers.ChoiceField(
        choices=[('JFK', 'JFK'), ('EWR', 'EWR')],
        required=False
    )
    blade_flight_date = serializers.DateField(required=False)
    blade_flight_time = serializers.TimeField(required=False)
    blade_bag_count = serializers.IntegerField(required=False, min_value=2)

    # Discount code (optional)
    discount_code = serializers.CharField(required=False, max_length=50, allow_blank=True)
    discount_email = serializers.EmailField(required=False, allow_blank=True)

    def validate_specialty_items(self, value):
        """Validate specialty items list with quantities"""
        if not value:
            return []
        
        for item in value:
            if 'item_id' not in item or 'quantity' not in item:
                raise serializers.ValidationError(
                    "Each specialty item must have 'item_id' and 'quantity'"
                )
            if item['quantity'] < 1:
                raise serializers.ValidationError("Quantity must be at least 1")
        
        return value
    
    def validate(self, attrs):
        service_type = attrs.get('service_type')
        
        # BLADE validation
        if service_type == 'blade_transfer':
            if not attrs.get('blade_airport'):
                raise serializers.ValidationError({'blade_airport': 'Airport selection required'})
            if not attrs.get('blade_flight_date'):
                raise serializers.ValidationError({'blade_flight_date': 'Flight date required'})
            if not attrs.get('blade_flight_time'):
                raise serializers.ValidationError({'blade_flight_time': 'Flight time required'})
            if not attrs.get('blade_bag_count'):
                raise serializers.ValidationError({'blade_bag_count': 'Bag count required'})
            
            if attrs.get('blade_bag_count', 0) < 2:
                raise serializers.ValidationError({'blade_bag_count': 'Minimum 2 bags'})
        
        # Standard Delivery validation
        elif service_type == 'standard_delivery':
            item_count = attrs.get('standard_delivery_item_count', 0)
            specialty_items = attrs.get('specialty_items', [])
            
            if item_count == 0 and len(specialty_items) == 0:
                raise serializers.ValidationError({
                    'standard_delivery': 'At least one item required'
                })
        
        return attrs


class GuestPaymentIntentSerializer(serializers.Serializer):
    """
    Serializer for creating payment intent BEFORE guest booking
    ✅ NOW SUPPORTS QUANTITIES
    """
    
    # Guest customer info
    first_name = serializers.CharField(max_length=100)
    last_name = serializers.CharField(max_length=100)
    email = serializers.EmailField()
    phone = serializers.CharField(max_length=20)
    
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
    
    specialty_items = serializers.ListField(
        child=serializers.DictField(),
        required=False,
        allow_empty=True,
        help_text="List of {item_id: UUID, quantity: int}"
    )
    
    # BLADE fields
    blade_airport = serializers.ChoiceField(choices=[('JFK', 'JFK'), ('EWR', 'EWR')], required=False)
    blade_flight_date = serializers.DateField(required=False)
    blade_flight_time = serializers.TimeField(required=False)
    blade_bag_count = serializers.IntegerField(required=False, min_value=2)
    
    pickup_date = serializers.DateField()
    pickup_time = serializers.ChoiceField(choices=[
        ('morning', '8 AM - 11 AM'),
        ('morning_specific', 'Specific 1-hour window'),
        ('no_time_preference', 'No time preference'),
    ], required=False)
    specific_pickup_hour = serializers.IntegerField(required=False, allow_null=True)
    
    coi_required = serializers.BooleanField(default=False)
    is_outside_core_area = serializers.BooleanField(default=False)
    # ZIP codes for accurate geographic surcharge calculation ($175 per out-of-zone address)
    pickup_zip_code = serializers.CharField(required=False, max_length=10)
    delivery_zip_code = serializers.CharField(required=False, max_length=10)

    # Discount code (optional)
    discount_code = serializers.CharField(required=False, max_length=50, allow_blank=True)

    def validate_specialty_items(self, value):
        """Validate specialty items with quantities"""
        if not value:
            return []

        for item in value:
            if 'item_id' not in item or 'quantity' not in item:
                raise serializers.ValidationError(
                    "Each specialty item must have 'item_id' and 'quantity'"
                )
            if item['quantity'] < 1:
                raise serializers.ValidationError("Quantity must be at least 1")

        return value

    def validate(self, attrs):
        service_type = attrs['service_type']

        if service_type == 'blade_transfer':
            if not all([attrs.get('blade_airport'), attrs.get('blade_flight_date'),
                       attrs.get('blade_flight_time'), attrs.get('blade_bag_count')]):
                raise serializers.ValidationError("All BLADE fields required")

            if attrs.get('blade_bag_count', 0) < 2:
                raise serializers.ValidationError("Minimum 2 bags")

        elif service_type == 'mini_move':
            if not attrs.get('mini_move_package_id'):
                raise serializers.ValidationError("Package ID required")

        elif service_type == 'standard_delivery':
            item_count = attrs.get('standard_delivery_item_count', 0)
            specialty_items = attrs.get('specialty_items', [])

            if item_count == 0 and len(specialty_items) == 0:
                raise serializers.ValidationError("At least one item required")

        elif service_type == 'specialty_item':
            if not attrs.get('specialty_items'):
                raise serializers.ValidationError("Specialty items required")

        # Calculate pricing
        attrs['calculated_total_cents'] = self._calculate_total_price(attrs)

        return attrs
    
    def _calculate_total_price(self, data):
        """
        Calculate total price WITH QUANTITIES
        ✅ OPTIMIZED: Bulk fetch specialty items to avoid N+1 queries
        """
        service_type = data['service_type']
        total_cents = 0
        
        # BLADE pricing
        if service_type == 'blade_transfer':
            bag_count = data.get('blade_bag_count', 0)
            total_cents = max(bag_count * 7500, 15000)

        # Mini Move pricing
        elif service_type == 'mini_move':
            try:
                package = MiniMovePackage.objects.get(id=data['mini_move_package_id'])
                total_cents = package.base_price_cents
                
                if data.get('coi_required') and not package.coi_included:
                    total_cents += package.coi_fee_cents
                
                # Organizing services
                organizing_total = 0
                if data.get('include_packing'):
                    packing = OrganizingService.objects.filter(
                        mini_move_tier=package.package_type,
                        is_packing_service=True,
                        is_active=True
                    ).first()
                    if packing:
                        organizing_total += packing.price_cents
                
                if data.get('include_unpacking'):
                    unpacking = OrganizingService.objects.filter(
                        mini_move_tier=package.package_type,
                        is_packing_service=False,
                        is_active=True
                    ).first()
                    if unpacking:
                        organizing_total += unpacking.price_cents
                
                if organizing_total > 0:
                    total_cents += organizing_total + int(organizing_total * 0.0825)

                # Geographic surcharge: $175 per out-of-zone address (max $350)
                geographic_surcharge = calculate_geographic_surcharge_from_zips(
                    data.get('pickup_zip_code'),
                    data.get('delivery_zip_code'),
                    fallback_is_outside=data.get('is_outside_core_area', False)
                )
                total_cents += geographic_surcharge

                if data.get('pickup_time') == 'morning_specific' and package.package_type == 'standard':
                    total_cents += 17500

            except MiniMovePackage.DoesNotExist:
                raise serializers.ValidationError("Invalid package")

        # Standard Delivery pricing - ✅ OPTIMIZED WITH BULK FETCH
        elif service_type == 'standard_delivery':
            config = StandardDeliveryConfig.objects.filter(is_active=True).first()
            if config:
                item_count = data.get('standard_delivery_item_count', 0)
                if item_count > 0:
                    item_total = config.price_per_item_cents * item_count
                    total_cents = max(item_total, config.minimum_charge_cents)

                # ✅ OPTIMIZED: Bulk fetch specialty items (was N+1 query)
                specialty_items_data = data.get('specialty_items', [])
                if specialty_items_data:
                    # Extract all item IDs
                    item_ids = [item_data['item_id'] for item_data in specialty_items_data]

                    # Single query to fetch all items
                    items_dict = {
                        str(item.id): item
                        for item in SpecialtyItem.objects.filter(id__in=item_ids, is_active=True)
                    }

                    # Calculate totals
                    for item_data in specialty_items_data:
                        item_id = str(item_data['item_id'])
                        if item_id in items_dict:
                            item = items_dict[item_id]
                            quantity = item_data['quantity']
                            total_cents += item.price_cents * quantity

                if data.get('is_same_day_delivery'):
                    total_cents += config.same_day_flat_rate_cents

                if data.get('coi_required'):
                    total_cents += 5000

                # Geographic surcharge: $175 per out-of-zone address (max $350)
                geographic_surcharge = calculate_geographic_surcharge_from_zips(
                    data.get('pickup_zip_code'),
                    data.get('delivery_zip_code'),
                    fallback_is_outside=data.get('is_outside_core_area', False)
                )
                total_cents += geographic_surcharge

        # Specialty Item pricing - ✅ OPTIMIZED WITH BULK FETCH
        elif service_type == 'specialty_item':
            specialty_items_data = data.get('specialty_items', [])
            
            if specialty_items_data:
                # ✅ OPTIMIZED: Bulk fetch specialty items (was N+1 query)
                item_ids = [item_data['item_id'] for item_data in specialty_items_data]
                
                # Single query to fetch all items
                items_dict = {
                    str(item.id): item 
                    for item in SpecialtyItem.objects.filter(id__in=item_ids, is_active=True)
                }
                
                # Calculate totals
                for item_data in specialty_items_data:
                    item_id = str(item_data['item_id'])
                    if item_id in items_dict:
                        item = items_dict[item_id]
                        quantity = item_data['quantity']
                        total_cents += item.price_cents * quantity
            
            if data.get('is_same_day_delivery'):
                config = StandardDeliveryConfig.objects.filter(is_active=True).first()
                if config:
                    total_cents += config.same_day_flat_rate_cents
            
            if data.get('coi_required'):
                total_cents += 5000

            # Geographic surcharge: $175 per out-of-zone address (max $350)
            geographic_surcharge = calculate_geographic_surcharge_from_zips(
                data.get('pickup_zip_code'),
                data.get('delivery_zip_code'),
                fallback_is_outside=data.get('is_outside_core_area', False)
            )
            total_cents += geographic_surcharge

        # Weekend/peak date surcharges (peak dates override weekends)
        if service_type != 'blade_transfer' and data.get('pickup_date'):
            surcharge_amount = calculate_surcharges_for_date(
                total_cents,
                data['pickup_date'],
                service_type
            )
            total_cents += surcharge_amount

        # Apply discount code if provided
        discount_code_str = (data.get('discount_code') or '').strip()
        if discount_code_str:
            from .models import DiscountCode as DiscountCodeModel
            try:
                discount = DiscountCodeModel.objects.get(code__iexact=discount_code_str)
                email = data.get('email', '')
                is_valid, _ = discount.is_valid_for_customer(email)

                if is_valid and discount.is_valid_for_service(data['service_type']):
                    if total_cents >= discount.minimum_order_cents:
                        discount_amount = discount.calculate_discount(total_cents)
                        data['_discount_amount_cents'] = discount_amount
                        data['_discount_code_id'] = str(discount.id)
                        total_cents = max(0, total_cents - discount_amount)
            except DiscountCodeModel.DoesNotExist:
                pass

        return total_cents


class GuestBookingCreateSerializer(serializers.Serializer):
    """
    Create booking for guest AFTER payment succeeds
    ✅ NOW SUPPORTS QUANTITIES
    """
    
    payment_intent_id = serializers.CharField(required=True)
    
    # Guest info
    first_name = serializers.CharField(max_length=100)
    last_name = serializers.CharField(max_length=100)
    email = serializers.EmailField()
    phone = serializers.CharField(max_length=20)
    
    service_type = serializers.ChoiceField(choices=[
        ('mini_move', 'Mini Move'),
        ('standard_delivery', 'Standard Delivery'),
        ('specialty_item', 'Specialty Item'),
        ('blade_transfer', 'BLADE Airport Transfer'),
    ])
    
    mini_move_package_id = serializers.UUIDField(required=False)
    standard_delivery_item_count = serializers.IntegerField(required=False, min_value=0)
    is_same_day_delivery = serializers.BooleanField(default=False)
    
    specialty_items = serializers.ListField(
        child=serializers.DictField(),
        required=False,
        allow_empty=True
    )
    
    include_packing = serializers.BooleanField(default=False)
    include_unpacking = serializers.BooleanField(default=False)
    
    # BLADE fields
    blade_airport = serializers.ChoiceField(choices=[('JFK', 'JFK'), ('EWR', 'EWR')], required=False)
    blade_flight_date = serializers.DateField(required=False)
    blade_flight_time = serializers.TimeField(required=False)
    blade_bag_count = serializers.IntegerField(required=False, min_value=2)
    
    pickup_date = serializers.DateField()
    pickup_time = serializers.ChoiceField(choices=[
        ('morning', '8 AM - 11 AM'),
        ('morning_specific', 'Specific 1-hour window'),
        ('no_time_preference', 'No time preference'),
    ], default='morning')
    specific_pickup_hour = serializers.IntegerField(required=False, min_value=8, max_value=10)
    
    is_outside_core_area = serializers.BooleanField(default=False)
    
    pickup_address = serializers.DictField()
    delivery_address = serializers.DictField()
    
    special_instructions = serializers.CharField(required=False, allow_blank=True)
    coi_required = serializers.BooleanField(default=False)

    # Discount code (optional)
    discount_code = serializers.CharField(required=False, max_length=50, allow_blank=True)

    def validate_pickup_address(self, value):
        required_fields = ['address_line_1', 'city', 'state', 'zip_code']
        for field in required_fields:
            if field not in value:
                raise serializers.ValidationError(f"Missing: {field}")
        
        from .zip_codes import validate_service_area
        
        zip_code = value.get('zip_code')
        is_serviceable, requires_surcharge, zone, error = validate_service_area(zip_code)
        
        if not is_serviceable:
            raise serializers.ValidationError(error)
        
        return value

    def validate_delivery_address(self, value):
        required_fields = ['address_line_1', 'city', 'state', 'zip_code']
        for field in required_fields:
            if field not in value:
                raise serializers.ValidationError(f"Missing: {field}")
        
        if self.initial_data.get('service_type') == 'blade_transfer':
            return value
        
        from .zip_codes import validate_service_area
        
        zip_code = value.get('zip_code')
        is_serviceable, requires_surcharge, zone, error = validate_service_area(zip_code)
        
        if not is_serviceable:
            raise serializers.ValidationError(error)
        
        return value
    
    def validate_specialty_items(self, value):
        if not value:
            return []
        
        for item in value:
            if 'item_id' not in item or 'quantity' not in item:
                raise serializers.ValidationError(
                    "Each item needs 'item_id' and 'quantity'"
                )
            if item['quantity'] < 1:
                raise serializers.ValidationError("Quantity must be >= 1")
        
        return value
    
    def validate(self, attrs):
        service_type = attrs['service_type']
        pickup_time = attrs.get('pickup_time', 'morning')
        
        if pickup_time == 'morning_specific' and not attrs.get('specific_pickup_hour'):
            raise serializers.ValidationError("specific_pickup_hour required")
        
        # BLADE validation
        if service_type == 'blade_transfer':
            if not all([attrs.get('blade_airport'), attrs.get('blade_flight_date'), 
                       attrs.get('blade_flight_time'), attrs.get('blade_bag_count')]):
                raise serializers.ValidationError("All BLADE fields required")
            
            if attrs.get('blade_bag_count', 0) < 2:
                raise serializers.ValidationError("Minimum 2 bags")
        
        # Mini Move validation
        elif service_type == 'mini_move':
            if not attrs.get('mini_move_package_id'):
                raise serializers.ValidationError("Package ID required")
        
        # Standard Delivery validation
        elif service_type == 'standard_delivery':
            item_count = attrs.get('standard_delivery_item_count', 0)
            specialty_items = attrs.get('specialty_items', [])
            
            if item_count == 0 and len(specialty_items) == 0:
                raise serializers.ValidationError("At least one item required")
        
        elif service_type == 'specialty_item':
            if not attrs.get('specialty_items'):
                raise serializers.ValidationError("Specialty items required")
        
        return attrs
    
    def create(self, validated_data):
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
        
        # Extract specialty items BEFORE creating booking
        specialty_items_data = validated_data.pop('specialty_items', [])
        
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
            status='pending',
        )
        
        # Handle mini move package
        if validated_data['service_type'] == 'mini_move':
            try:
                package = MiniMovePackage.objects.get(id=validated_data['mini_move_package_id'])
                booking.mini_move_package = package
            except MiniMovePackage.DoesNotExist:
                raise serializers.ValidationError("Invalid package")
        
        # ✅ OPTIMIZED: Bulk fetch specialty items (was N+1 query)
        if specialty_items_data:
            booking.save()  # Save first to get ID
            
            # Bulk fetch all specialty items in one query
            item_ids = [item_data['item_id'] for item_data in specialty_items_data]
            items_dict = {
                str(item.id): item 
                for item in SpecialtyItem.objects.filter(id__in=item_ids)
            }
            
            # Create BookingSpecialtyItem records
            for item_data in specialty_items_data:
                item_id = str(item_data['item_id'])
                if item_id in items_dict:
                    BookingSpecialtyItem.objects.create(
                        booking=booking,
                        specialty_item=items_dict[item_id],
                        quantity=item_data['quantity']
                    )
        
        # Save to recalculate pricing with package + specialty items set
        booking.save()

        # Apply discount code AFTER save so pre_discount_total_cents is correct
        discount_code_str = (validated_data.get('discount_code') or '').strip()
        if discount_code_str:
            from .models import DiscountCode as DiscountCodeModel
            try:
                # Lock the discount row to prevent TOCTOU race on usage count
                discount = DiscountCodeModel.objects.select_for_update().get(
                    code__iexact=discount_code_str
                )
                email = validated_data['email']
                is_valid, _ = discount.is_valid_for_customer(email)

                if is_valid and discount.is_valid_for_service(validated_data['service_type']):
                    discount_amount = discount.calculate_discount(booking.pre_discount_total_cents)
                    booking.discount_code = discount
                    booking.discount_amount_cents = discount_amount
                    discount.record_usage(email=email, booking=booking)
                    booking.save()
            except DiscountCodeModel.DoesNotExist:
                pass

        return booking