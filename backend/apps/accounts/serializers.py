from rest_framework import serializers
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from .models import StaffProfile, StaffAction


class StaffUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 'is_active', 'date_joined')
        read_only_fields = ('id', 'date_joined')


class StaffProfileSerializer(serializers.ModelSerializer):
    user = StaffUserSerializer(read_only=True)
    full_name = serializers.ReadOnlyField()
    email = serializers.ReadOnlyField()
    can_approve_refunds = serializers.ReadOnlyField()
    can_manage_staff = serializers.ReadOnlyField()
    can_view_financial_reports = serializers.ReadOnlyField()
    
    class Meta:
        model = StaffProfile
        fields = (
            'id', 'user', 'role', 'department', 'hire_date', 'phone',
            'full_name', 'email', 'is_active', 'can_approve_refunds',
            'can_manage_staff', 'can_view_financial_reports', 'created_at'
        )
        read_only_fields = ('id', 'created_at')


class StaffLoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)
    
    def validate(self, attrs):
        username = attrs.get('username')
        password = attrs.get('password')
        
        if not username or not password:
            raise serializers.ValidationError("Must include username and password")
        
        return attrs


class StaffActionSerializer(serializers.ModelSerializer):
    staff_user_name = serializers.SerializerMethodField()
    
    class Meta:
        model = StaffAction
        fields = (
            'id', 'action_type', 'description', 'staff_user_name',
            'ip_address', 'customer_id', 'booking_id', 'created_at'
        )
        read_only_fields = ('id', 'created_at')
    
    def get_staff_user_name(self, obj):
        return obj.staff_user.get_full_name() if obj.staff_user else None


class StaffCreateSerializer(serializers.Serializer):
    """Serializer for creating staff accounts with hybrid prevention"""
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(min_length=8, write_only=True)
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    role = serializers.ChoiceField(choices=StaffProfile.ROLE_CHOICES)
    department = serializers.CharField(max_length=50, required=False, allow_blank=True)
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    
    def validate(self, attrs):
        # Check if email already exists
        if User.objects.filter(email__iexact=attrs['email']).exists():
            existing_user = User.objects.get(email__iexact=attrs['email'])
            if hasattr(existing_user, 'customer_profile'):
                raise serializers.ValidationError("This email is already registered as a customer account. Please use a different email.")
            else:
                raise serializers.ValidationError("User with this email already exists")
        
        # Check if username already exists
        if User.objects.filter(username=attrs['username']).exists():
            raise serializers.ValidationError("Username already exists")
        
        return attrs
    
    def create(self, validated_data):
        # Extract staff profile fields
        role = validated_data.pop('role')
        department = validated_data.pop('department', '')
        phone = validated_data.pop('phone', '')
        
        try:
            # Create User
            user = User.objects.create_user(**validated_data)
            
            # Create StaffProfile with validation
            StaffProfile.objects.create(
                user=user,
                role=role,
                department=department,
                phone=phone
            )
            
            return user
            
        except ValidationError as e:
            # Clean up user if profile creation fails
            if 'user' in locals():
                user.delete()
            raise serializers.ValidationError(str(e))