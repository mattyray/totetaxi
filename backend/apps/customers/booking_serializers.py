# backend/apps/customers/booking_serializers.py
from rest_framework import serializers
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta, time as dt_time
from apps.bookings.models import Booking, Address, BookingSpecialtyItem
from apps.bookings.pricing_utils import calculate_geographic_surcharge_from_zips
from apps.payments.models import Payment
from apps.payments.services import StripePaymentService
from .models import CustomerProfile, SavedAddress, CustomerPaymentMethod
import logging
from .serializers import SavedAddressSerializer
from apps.services.models import MiniMovePackage, SpecialtyItem, StandardDeliveryConfig, calculate_surcharges_for_date

logger = logging.getLogger(__name__)


class OnfleetTaskSerializer(serializers.Serializer):
    """Minimal Onfleet task info for customer delivery tracking"""
    task_type = serializers.CharField()
    tracking_url = serializers.URLField()
    status = serializers.CharField()
    worker_name = serializers.CharField(allow_blank=True)
    completed_at = serializers.DateTimeField(allow_null=True)
    started_at = serializers.DateTimeField(allow_null=True)


class PaymentIntentCreateSerializer(serializers.Serializer):
    """
    Serializer for creating payment intent BEFORE booking
    ✅ NOW SUPPORTS QUANTITIES
    """
    
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
    
    # ✅ NEW: Specialty items with quantities
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
    
    customer_email = serializers.EmailField(required=False)

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
                raise serializers.ValidationError("All BLADE fields are required")
            
            if attrs.get('blade_bag_count', 0) < 2:
                raise serializers.ValidationError("BLADE service requires minimum 2 bags")
        
        elif service_type == 'mini_move':
            if not attrs.get('mini_move_package_id'):
                raise serializers.ValidationError("mini_move_package_id is required")
        
        elif service_type == 'standard_delivery':
            item_count = attrs.get('standard_delivery_item_count', 0)
            specialty_items = attrs.get('specialty_items', [])
            
            if item_count == 0 and len(specialty_items) == 0:
                raise serializers.ValidationError("At least one item required")
        
        elif service_type == 'specialty_item':
            if not attrs.get('specialty_items'):
                raise serializers.ValidationError("specialty_items is required")
        
        # Calculate pricing
        attrs['calculated_total_cents'] = self._calculate_total_price(attrs)
        
        return attrs
    
    def _calculate_total_price(self, data):
        """Calculate total price in cents WITH QUANTITIES"""
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
                
                if data.get('coi_required') and not package.coi_included:
                    total_cents += package.coi_fee_cents
                
                # Organizing services
                if data.get('include_packing') or data.get('include_unpacking'):
                    from apps.services.models import OrganizingService
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
        
        # Standard Delivery pricing - ✅ WITH QUANTITIES
        elif service_type == 'standard_delivery':
            try:
                config = StandardDeliveryConfig.objects.filter(is_active=True).first()
                if config:
                    item_count = data.get('standard_delivery_item_count', 0)
                    if item_count > 0:
                        item_total = config.price_per_item_cents * item_count
                        total_cents = max(item_total, config.minimum_charge_cents)
                    
                    # ✅ Specialty items WITH QUANTITIES
                    specialty_items_data = data.get('specialty_items', [])
                    if specialty_items_data:
                        for item_data in specialty_items_data:
                            try:
                                item = SpecialtyItem.objects.get(id=item_data['item_id'])
                                quantity = item_data['quantity']
                                total_cents += item.price_cents * quantity
                            except SpecialtyItem.DoesNotExist:
                                pass
                    
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

            except StandardDeliveryConfig.DoesNotExist:
                raise serializers.ValidationError("Standard delivery not configured")
        
        # Specialty Item pricing - ✅ WITH QUANTITIES
        elif service_type == 'specialty_item':
            specialty_items_data = data.get('specialty_items', [])
            for item_data in specialty_items_data:
                try:
                    item = SpecialtyItem.objects.get(id=item_data['item_id'])
                    quantity = item_data['quantity']
                    total_cents += item.price_cents * quantity
                except SpecialtyItem.DoesNotExist:
                    pass
            
            if data.get('is_same_day_delivery'):
                try:
                    config = StandardDeliveryConfig.objects.filter(is_active=True).first()
                    if config:
                        total_cents += config.same_day_flat_rate_cents
                except StandardDeliveryConfig.DoesNotExist:
                    pass
            
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
            from apps.bookings.models import DiscountCode as DiscountCodeModel
            try:
                discount = DiscountCodeModel.objects.get(code__iexact=discount_code_str)
                email = data.get('customer_email', '')
                # Fall back to user context email
                if not email and self.context.get('user'):
                    email = self.context['user'].email
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


class AuthenticatedBookingCreateSerializer(serializers.Serializer):
    """
    Create booking AFTER payment succeeds
    ✅ NOW SUPPORTS QUANTITIES
    """
    
    payment_intent_id = serializers.CharField(required=True)
    
    service_type = serializers.ChoiceField(choices=[
        ('mini_move', 'Mini Move'),
        ('standard_delivery', 'Standard Delivery'),
        ('specialty_item', 'Specialty Item'),
        ('blade_transfer', 'BLADE Airport Transfer'),
    ])
    
    mini_move_package_id = serializers.UUIDField(required=False, allow_null=True)
    include_packing = serializers.BooleanField(default=False)
    include_unpacking = serializers.BooleanField(default=False)
    standard_delivery_item_count = serializers.IntegerField(required=False, min_value=0)
    is_same_day_delivery = serializers.BooleanField(default=False)
    
    # ✅ NEW: Specialty items with quantities
    specialty_items = serializers.ListField(
        child=serializers.DictField(),
        required=False,
        allow_empty=True
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
    
    special_instructions = serializers.CharField(required=False, allow_blank=True)
    coi_required = serializers.BooleanField(default=False)

    # Discount code (optional)
    discount_code = serializers.CharField(required=False, max_length=50, allow_blank=True)

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
        user = self.context['user']
        service_type = attrs['service_type']
        
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
        
        # Address validation
        if not (attrs.get('pickup_address_id') or attrs.get('new_pickup_address')):
            raise serializers.ValidationError("pickup address required")
        
        if not (attrs.get('delivery_address_id') or attrs.get('new_delivery_address')):
            raise serializers.ValidationError("delivery address required")
        
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
        
        # Extract specialty items BEFORE creating booking
        specialty_items_data = validated_data.pop('specialty_items', [])
        
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
            status='pending',
        )
        
        # Handle mini move package
        if validated_data['service_type'] == 'mini_move':
            try:
                package = MiniMovePackage.objects.get(id=validated_data['mini_move_package_id'])
                booking.mini_move_package = package
            except MiniMovePackage.DoesNotExist:
                raise serializers.ValidationError("Invalid package")
        
        # ✅ Handle specialty items WITH QUANTITIES
        if specialty_items_data:
            booking.save()  # Save first to get ID
            for item_data in specialty_items_data:
                try:
                    item = SpecialtyItem.objects.get(id=item_data['item_id'])
                    BookingSpecialtyItem.objects.create(
                        booking=booking,
                        specialty_item=item,
                        quantity=item_data['quantity']
                    )
                except SpecialtyItem.DoesNotExist:
                    pass

        # Save to recalculate pricing with package + specialty items set
        booking.save()

        # Apply discount code AFTER save so pre_discount_total_cents is correct
        discount_code_str = (validated_data.get('discount_code') or '').strip()
        if discount_code_str:
            from apps.bookings.models import DiscountCode as DiscountCodeModel
            try:
                discount = DiscountCodeModel.objects.get(code__iexact=discount_code_str)
                email = user.email
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
                import uuid
                unique_nickname = nickname or f"Address {str(uuid.uuid4())[:8]}"

                # Avoid duplicate nickname constraint violation on booking retry
                if SavedAddress.objects.filter(user=user, nickname=unique_nickname).exists():
                    unique_nickname = f"{unique_nickname} ({str(uuid.uuid4())[:4]})"

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
    onfleet_tasks = serializers.SerializerMethodField()
    
    pickup_date = serializers.DateField(format='%Y-%m-%d')
    blade_flight_date = serializers.DateField(format='%Y-%m-%d', allow_null=True)
    
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
            'payment_status', 'can_rebook', 
            'onfleet_tasks',
            'created_at', 'updated_at'
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
    
    def get_onfleet_tasks(self, obj):
        """Return onfleet tasks for delivery tracking"""
        tasks = obj.onfleet_tasks.all().order_by('task_type')
        return OnfleetTaskSerializer(tasks, many=True).data


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