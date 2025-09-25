from rest_framework import serializers
from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from django.core.exceptions import ValidationError
from .models import CustomerProfile, SavedAddress, CustomerPaymentMethod


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 'date_joined')
        read_only_fields = ('id', 'username', 'date_joined')


class CustomerProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    total_spent_dollars = serializers.ReadOnlyField()
    
    class Meta:
        model = CustomerProfile
        fields = (
            'id', 'user', 'phone', 'total_bookings', 'total_spent_cents', 
            'total_spent_dollars', 'last_booking_at', 'preferred_pickup_time',
            'email_notifications', 'sms_notifications', 'is_vip'
        )
        read_only_fields = ('id', 'total_bookings', 'total_spent_cents', 'last_booking_at', 'is_vip')


class CustomerRegistrationSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(min_length=8, write_only=True)
    password_confirm = serializers.CharField(write_only=True)
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    
    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError("Passwords don't match")
        
        # Check if email already exists
        if User.objects.filter(email__iexact=attrs['email']).exists():
            existing_user = User.objects.get(email__iexact=attrs['email'])
            if hasattr(existing_user, 'staff_profile'):
                raise serializers.ValidationError("This email is already registered as a staff account. Please use a different email.")
            else:
                raise serializers.ValidationError("User with this email already exists")
        
        return attrs
    
    def create(self, validated_data):
        # Remove password_confirm from validated_data
        validated_data.pop('password_confirm')
        phone = validated_data.pop('phone', '')
        
        try:
            # Create User (use email as username for customers)
            user = User.objects.create_user(
                username=validated_data['email'],
                email=validated_data['email'],
                password=validated_data['password'],
                first_name=validated_data['first_name'],
                last_name=validated_data['last_name']
            )
            
            # Create CustomerProfile with validation
            CustomerProfile.objects.create(
                user=user,
                phone=phone
            )
            
            return user
            
        except ValidationError as e:
            # Clean up user if profile creation fails
            if 'user' in locals():
                user.delete()
            raise serializers.ValidationError(str(e))


class CustomerLoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    
    def validate(self, attrs):
        email = attrs.get('email')
        password = attrs.get('password')
        
        if email and password:
            # Authenticate using email (stored as username for customers)
            user = authenticate(username=email, password=password)
            
            if user:
                if not user.is_active:
                    raise serializers.ValidationError("User account is disabled")
                
                # Ensure user has a customer profile (not staff)
                if not hasattr(user, 'customer_profile'):
                    if hasattr(user, 'staff_profile'):
                        raise serializers.ValidationError("This is a staff account. Please use the staff login.")
                    else:
                        raise serializers.ValidationError("This is not a customer account")
                
                # Additional hybrid account check
                try:
                    CustomerProfile.ensure_single_profile_type(user)
                except ValidationError as e:
                    raise serializers.ValidationError(str(e))
                
                attrs['user'] = user
                return attrs
            else:
                raise serializers.ValidationError("Invalid email or password")
        else:
            raise serializers.ValidationError("Must include email and password")


class SavedAddressSerializer(serializers.ModelSerializer):
    formatted_address = serializers.ReadOnlyField()
    
    class Meta:
        model = SavedAddress
        fields = (
            'id', 'nickname', 'address_line_1', 'address_line_2', 
            'city', 'state', 'zip_code', 'delivery_instructions',
            'formatted_address', 'times_used', 'last_used_at', 'is_active'
        )
        read_only_fields = ('id', 'times_used', 'last_used_at')


class CustomerPaymentMethodSerializer(serializers.ModelSerializer):
    display_name = serializers.ReadOnlyField()
    
    class Meta:
        model = CustomerPaymentMethod
        fields = (
            'id', 'stripe_payment_method_id', 'card_brand', 'card_last_four',
            'card_exp_month', 'card_exp_year', 'display_name', 'is_default', 'is_active'
        )
        read_only_fields = ('id', 'stripe_payment_method_id')