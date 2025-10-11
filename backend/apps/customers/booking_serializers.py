# backend/apps/customers/booking_serializers.py
from rest_framework import serializers
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta, time as dt_time
from apps.bookings.models import Booking, Address
from apps.services.models import MiniMovePackage, SpecialtyItem, StandardDeliveryConfig, SurchargeRule
from .models import SavedAddress
from .serializers import SavedAddressSerializer


class PaymentIntentCreateSerializer(serializers.Serializer):
    """
    NEW: Serializer for creating payment intent BEFORE booking
    Validates all booking data and calculates total price
    """
    
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
    
    # Customer info (for guest bookings)
    customer_email = serializers.EmailField(required=False)
    
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
                    from apps.services.models import OrganizingService
                    
                    if data.get('include_packing'):
                        packing = OrganizingService.objects.filter(
                            mini_move_tier=package.package_type,
                            is_packing_service=True,
                            is_active=True
                        ).first()
                        if packing:
                            total_cents += packing.price_cents
                    
                    if data.get('include_unpacking'):
                        unpacking = OrganizingService.objects.filter(
                            mini_move_tier=package.package_type,
                            is_packing_service=False,
                            is_active=True
                        ).first()
                        if unpacking:
                            total_cents += unpacking.price_cents
                    
                    # Tax on organizing
                    organizing_total = 0
                    if data.get('include_packing') and packing:
                        organizing_total += packing.price_cents
                    if data.get('include_unpacking') and unpacking:
                        organizing_total += unpacking.price_cents
                    
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


class AuthenticatedBookingCreateSerializer(serializers.Serializer):
    """
    REFACTORED: Create booking AFTER payment succeeds
    Now requires payment_intent_id and does NOT create payment
    """
    
    # Payment verification
    payment_intent_id = serializers.CharField(required=True)
    
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
    
    # Address selection
    pickup_address_id = serializers.UUIDField(required=False)
    delivery_address_id = serializers.UUIDField(required=False)
    new_pickup_address = serializers.DictField(required=False)
    new_delivery_address = serializers.DictField(required=False)
    
    # Save addresses
    save_pickup_address = serializers.BooleanField(default=False)
    save_delivery_address = serializers.BooleanField(default=False)
    pickup_address_nickname = serializers.CharField(required=False, max_length=50)
    delivery_address_nickname = serializers.CharField(required=False, max_length=50)
    
    # Additional options
    special_instructions = serializers.CharField(required=False, allow_blank=True)
    coi_required = serializers.BooleanField(default=False)
    
    def validate(self, attrs):
        user = self.context['user']
        service_type = attrs['service_type']
        
        # BLADE validation
        if service_type == 'blade_transfer':
            if not attrs.get('blade_airport'):
                raise serializers.ValidationError("blade_airport is required")
            if not attrs.get('blade_flight_date'):
                raise serializers.ValidationError("blade_flight_date is required")
            if not attrs.get('blade_flight_time'):
                raise serializers.ValidationError("blade_flight_time is required")
            if not attrs.get('blade_bag_count'):
                raise serializers.ValidationError("blade_bag_count is required")
            
            if attrs.get('blade_bag_count', 0) < 2:
                raise serializers.ValidationError("BLADE requires minimum 2 bags")
        
        # Mini Move validation
        elif service_type == 'mini_move':
            if not attrs.get('mini_move_package_id'):
                raise serializers.ValidationError("mini_move_package_id is required")
        
        # Standard Delivery validation
        elif service_type == 'standard_delivery':
            item_count = attrs.get('standard_delivery_item_count', 0)
            specialty_ids = attrs.get('specialty_item_ids', [])
            
            if item_count == 0 and len(specialty_ids) == 0:
                raise serializers.ValidationError("At least one item required")
        
        elif service_type == 'specialty_item':
            if not attrs.get('specialty_item_ids'):
                raise serializers.ValidationError("specialty_item_ids is required")
        
        # Address validation
        if not (attrs.get('pickup_address_id') or attrs.get('new_pickup_address')):
            raise serializers.ValidationError("pickup address is required")
        
        if not (attrs.get('delivery_address_id') or attrs.get('new_delivery_address')):
            raise serializers.ValidationError("delivery address is required")
        
        # Validate saved addresses belong to user
        if attrs.get('pickup_address_id'):
            if not user.saved_addresses.filter(id=attrs['pickup_address_id'], is_active=True).exists():
                raise serializers.ValidationError("Invalid pickup address")
        
        if attrs.get('delivery_address_id'):
            if not user.saved_addresses.filter(id=attrs['delivery_address_id'], is_active=True).exists():
                raise serializers.ValidationError("Invalid delivery address")
        
        # Use customer's preferred pickup time if not specified
        if not attrs.get('pickup_time'):
            attrs['pickup_time'] = user.customer_profile.preferred_pickup_time
        
        return attrs
    
    def create(self, validated_data):
        user = self.context['user']
        
        # Remove payment_intent_id from validated_data (not needed for booking)
        payment_intent_id = validated_data.pop('payment_intent_id')
        
        # Handle addresses
        pickup_address = self._get_or_create_address(
            user,
            validated_data.get('pickup_address_id'),
            validated_data.get('new_pickup_address'),
            validated_data.get('save_pickup_address', False),
            validated_data.get('pickup_address_nickname')
        )
        
        delivery_address = self._get_or_create_address(
            user,
            validated_data.get('delivery_address_id'),
            validated_data.get('new_delivery_address'),
            validated_data.get('save_delivery_address', False),
            validated_data.get('delivery_address_nickname')
        )
        
        # Create booking
        booking = Booking.objects.create(
            customer=user,
            service_type=validated_data['service_type'],
            pickup_date=validated_data['pickup_date'],
            pickup_time=validated_data.get('pickup_time', 'morning'),
            specific_pickup_hour=validated_data.get('specific_pickup_hour'),
            pickup_address=pickup_address,
            delivery_address=delivery_address,
            special_instructions=validated_data.get('special_instructions', ''),
            coi_required=validated_data.get('coi_required', False),
            include_packing=validated_data.get('include_packing', False),
            include_unpacking=validated_data.get('include_unpacking', False),
            standard_delivery_item_count=validated_data.get('standard_delivery_item_count'),
            is_same_day_delivery=validated_data.get('is_same_day_delivery', False),
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
    
    def _get_or_create_address(self, user, address_id, new_address_data, save_address, nickname):
        """Get existing saved address or create new one"""
        if address_id:
            saved_address = user.saved_addresses.get(id=address_id, is_active=True)
            
            address = Address.objects.create(
                customer=user,
                address_line_1=saved_address.address_line_1,
                address_line_2=saved_address.address_line_2,
                city=saved_address.city,
                state=saved_address.state,
                zip_code=saved_address.zip_code
            )
            
            saved_address.mark_used()
            return address
        
        elif new_address_data:
            address = Address.objects.create(
                customer=user,
                **new_address_data
            )
            
            if save_address:
                # Use timestamp-based nickname to avoid collisions
                import uuid
                unique_nickname = nickname or f"Address {str(uuid.uuid4())[:8]}"
                
                SavedAddress.objects.create(
                    user=user,
                    nickname=unique_nickname,
                    address_line_1=new_address_data['address_line_1'],
                    address_line_2=new_address_data.get('address_line_2', ''),
                    city=new_address_data['city'],
                    state=new_address_data['state'],
                    zip_code=new_address_data['zip_code'],
                    delivery_instructions=new_address_data.get('delivery_instructions', ''),
                    times_used=1
                )
            
            return address


class CustomerBookingDetailSerializer(serializers.ModelSerializer):
    """Detailed booking information for authenticated customers"""
    
    customer_name = serializers.SerializerMethodField()
    pickup_address = serializers.SerializerMethodField()
    delivery_address = serializers.SerializerMethodField()
    total_price_dollars = serializers.ReadOnlyField()
    pricing_breakdown = serializers.SerializerMethodField()
    payment_status = serializers.SerializerMethodField()
    can_rebook = serializers.SerializerMethodField()
    
    class Meta:
        model = Booking
        fields = (
            'id', 'booking_number', 'customer_name', 
            'service_type', 'pickup_date', 'pickup_time', 'status',
            'pickup_address', 'delivery_address',
            'special_instructions', 'coi_required',
            'blade_airport', 'blade_flight_date', 'blade_flight_time', 
            'blade_bag_count', 'blade_ready_time',
            'total_price_dollars', 'pricing_breakdown',
            'payment_status', 'can_rebook', 'created_at', 'updated_at'
        )
    
    def get_customer_name(self, obj):
        return obj.get_customer_name()
    
    def get_pickup_address(self, obj):
        return {
            'address_line_1': obj.pickup_address.address_line_1,
            'address_line_2': obj.pickup_address.address_line_2,
            'city': obj.pickup_address.city,
            'state': obj.pickup_address.state,
            'zip_code': obj.pickup_address.zip_code
        }
    
    def get_delivery_address(self, obj):
        return {
            'address_line_1': obj.delivery_address.address_line_1,
            'address_line_2': obj.delivery_address.address_line_2,
            'city': obj.delivery_address.city,
            'state': obj.delivery_address.state,
            'zip_code': obj.delivery_address.zip_code
        }
    
    def get_pricing_breakdown(self, obj):
        return obj.get_pricing_breakdown()
    
    def get_payment_status(self, obj):
        payment = obj.payments.first()
        return payment.status if payment else 'not_created'
    
    def get_can_rebook(self, obj):
        return obj.status in ['completed', 'paid']


class QuickBookingSerializer(serializers.Serializer):
    """Serializer for quickly rebooking with minimal changes"""
    pickup_date = serializers.DateField()
    pickup_time = serializers.ChoiceField(
        choices=[
            ('morning', '8 AM - 11 AM'),
            ('morning_specific', 'Specific 1-hour window'),
            ('no_time_preference', 'No time preference'),
        ],
        required=False
    )
    is_same_day_delivery = serializers.BooleanField(default=False)
    special_instructions = serializers.CharField(required=False, allow_blank=True)
    coi_required = serializers.BooleanField(required=False)