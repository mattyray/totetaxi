# backend/apps/customers/booking_serializers.py
from rest_framework import serializers
from django.contrib.auth.models import User
from apps.bookings.models import Booking, Address
from apps.services.models import MiniMovePackage, SpecialtyItem
from .models import SavedAddress
from .serializers import SavedAddressSerializer


class AuthenticatedBookingCreateSerializer(serializers.Serializer):
    """Enhanced booking creation for authenticated customers"""
    
    # Service selection
    service_type = serializers.ChoiceField(choices=[
        ('mini_move', 'Mini Move'),
        ('standard_delivery', 'Standard Delivery'),
        ('specialty_item', 'Specialty Item')
    ])
    
    # Service-specific fields
    mini_move_package_id = serializers.UUIDField(required=False, allow_null=True)
    include_packing = serializers.BooleanField(default=False)
    include_unpacking = serializers.BooleanField(default=False)
    # PHASE 2: UPDATED to allow 0
    standard_delivery_item_count = serializers.IntegerField(required=False, min_value=0)
    is_same_day_delivery = serializers.BooleanField(default=False)
    specialty_item_ids = serializers.ListField(
        child=serializers.UUIDField(),
        required=False,
        allow_empty=True
    )
    
    # Booking details
    pickup_date = serializers.DateField()
    pickup_time = serializers.ChoiceField(choices=[
        ('morning', '8 AM - 11 AM'),
        ('morning_specific', 'Specific 1-hour window'),
        ('no_time_preference', 'No time preference'),
    ], required=False)
    specific_pickup_hour = serializers.IntegerField(required=False, allow_null=True)
    
    # Address selection - can use saved addresses or create new ones
    pickup_address_id = serializers.UUIDField(required=False)
    delivery_address_id = serializers.UUIDField(required=False)
    new_pickup_address = serializers.DictField(required=False)
    new_delivery_address = serializers.DictField(required=False)
    
    # Save new addresses for future use
    save_pickup_address = serializers.BooleanField(default=False)
    save_delivery_address = serializers.BooleanField(default=False)
    pickup_address_nickname = serializers.CharField(required=False, max_length=50)
    delivery_address_nickname = serializers.CharField(required=False, max_length=50)
    
    # Additional options
    special_instructions = serializers.CharField(required=False, allow_blank=True)
    coi_required = serializers.BooleanField(default=False)
    create_payment_intent = serializers.BooleanField(default=True)
    
    def validate(self, attrs):
        user = self.context['user']
        service_type = attrs['service_type']
        
        # Validate service-specific requirements
        if service_type == 'mini_move':
            if not attrs.get('mini_move_package_id'):
                raise serializers.ValidationError("mini_move_package_id is required for mini move service")
        
        # PHASE 2: Updated Standard Delivery validation
        elif service_type == 'standard_delivery':
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
        
        # Validate address selection
        if not (attrs.get('pickup_address_id') or attrs.get('new_pickup_address')):
            raise serializers.ValidationError("Either pickup_address_id or new_pickup_address is required")
        
        if not (attrs.get('delivery_address_id') or attrs.get('new_delivery_address')):
            raise serializers.ValidationError("Either delivery_address_id or new_delivery_address is required")
        
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
        
        # Handle pickup address
        pickup_address = self._get_or_create_address(
            user,
            validated_data.get('pickup_address_id'),
            validated_data.get('new_pickup_address'),
            validated_data.get('save_pickup_address', False),
            validated_data.get('pickup_address_nickname')
        )
        
        # Handle delivery address
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
            pickup_time=validated_data['pickup_time'],
            specific_pickup_hour=validated_data.get('specific_pickup_hour'),
            pickup_address=pickup_address,
            delivery_address=delivery_address,
            special_instructions=validated_data.get('special_instructions', ''),
            coi_required=validated_data.get('coi_required', False),
            include_packing=validated_data.get('include_packing', False),
            include_unpacking=validated_data.get('include_unpacking', False),
            standard_delivery_item_count=validated_data.get('standard_delivery_item_count'),
            is_same_day_delivery=validated_data.get('is_same_day_delivery', False)
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
        
        booking.save()  # Trigger pricing calculation
        return booking
    
    def _get_or_create_address(self, user, address_id, new_address_data, save_address, nickname):
        """Get existing saved address or create new one"""
        if address_id:
            # Use existing saved address
            saved_address = user.saved_addresses.get(id=address_id, is_active=True)
            
            # Create Address record for booking
            address = Address.objects.create(
                customer=user,
                address_line_1=saved_address.address_line_1,
                address_line_2=saved_address.address_line_2,
                city=saved_address.city,
                state=saved_address.state,
                zip_code=saved_address.zip_code
            )
            
            # Update usage tracking
            saved_address.mark_used()
            return address
        
        elif new_address_data:
            # Create new Address
            address = Address.objects.create(
                customer=user,
                **new_address_data
            )
            
            # Save as SavedAddress if requested
            if save_address:
                SavedAddress.objects.create(
                    user=user,
                    nickname=nickname or f"Address {user.saved_addresses.count() + 1}",
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