from rest_framework import serializers
from django.contrib.auth.models import User
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
    
    class Meta:
        model = StaffProfile
        fields = (
            'id', 'user', 'role', 'department', 'hire_date', 'phone',
            'full_name', 'email', 'is_active', 'created_at'
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