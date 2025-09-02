from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Booking, Address, GuestCheckout
from apps.services.models import MiniMovePackage, SpecialtyItem


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


class BookingSerializer(serializers.ModelSerializer):
    customer_name = serializers.SerializerMethodField()
    customer_email = serializers.SerializerMethodField()
    pickup_address = AddressSerializer(read_only=True)
    delivery_address = AddressSerializer(read_only=True)
    guest_checkout = GuestCheckoutSerializer(read_only=True)
    total_price_dollars = serializers.ReadOnlyField()
    pricing_breakdown = serializers.SerializerMethodField()
    
    class Meta:
        model = Booking
        fields = (
            'id', 'booking_number', 'customer_name', 'customer_email',
            'service_type', 'pickup_date', 'pickup_time', 'status',
            'pickup_address', 'delivery_address', 'guest_checkout',
            'special_instructions', 'coi_required',
            'total_price_dollars', 'pricing_breakdown', 'created_at'
        )
    
    def get_customer_name(self, obj):
        return obj.get_customer_name()
    
    def get_customer_email(self, obj):
        return obj.get_customer_email()
    
    def get_pricing_breakdown(self, obj):
        return obj.get_pricing_breakdown()


class BookingStatusSerializer(serializers.ModelSerializer):
    customer_name = serializers.SerializerMethodField()
    pickup_address = AddressSerializer(read_only=True)
    delivery_address = AddressSerializer(read_only=True)
    total_price_dollars = serializers.ReadOnlyField()
    
    class Meta:
        model = Booking
        fields = (
            'booking_number', 'customer_name', 'service_type', 
            'pickup_date', 'pickup_time', 'status',
            'pickup_address', 'delivery_address',
            'total_price_dollars', 'created_at'
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
    
    # Standard Delivery fields
    standard_delivery_item_count = serializers.IntegerField(required=False, min_value=1)
    is_same_day_delivery = serializers.BooleanField(required=False, default=False)
    
    # Specialty Items fields
    specialty_item_ids = serializers.ListField(
        child=serializers.UUIDField(),
        required=False,
        allow_empty=True
    )


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
    standard_delivery_item_count = serializers.IntegerField(required=False, min_value=1)
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
        ('afternoon', '12 PM - 3 PM'),
        ('evening', '4 PM - 7 PM'),
    ], default='morning')
    
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
        
        # Validate service-specific requirements
        if service_type == 'mini_move':
            if not attrs.get('mini_move_package_id'):
                raise serializers.ValidationError("mini_move_package_id is required for mini move service")
        
        elif service_type == 'standard_delivery':
            if not attrs.get('standard_delivery_item_count'):
                raise serializers.ValidationError("standard_delivery_item_count is required for standard delivery")
        
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
            pickup_address=pickup_address,
            delivery_address=delivery_address,
            special_instructions=validated_data.get('special_instructions', ''),
            coi_required=validated_data.get('coi_required', False),
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
        
        elif validated_data['service_type'] == 'specialty_item':
            specialty_items = SpecialtyItem.objects.filter(
                id__in=validated_data.get('specialty_item_ids', [])
            )
            booking.save()  # Save first to get ID for M2M relationship
            booking.specialty_items.set(specialty_items)
        
        booking.save()  # This will trigger pricing calculation
        return booking