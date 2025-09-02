from rest_framework import serializers
from .models import Payment, Refund
from apps.bookings.models import Booking


class PaymentIntentCreateSerializer(serializers.Serializer):
    """Serializer for creating payment intent"""
    booking_id = serializers.UUIDField()
    customer_email = serializers.EmailField(required=False)
    
    def validate_booking_id(self, value):
        try:
            booking = Booking.objects.get(id=value, deleted_at__isnull=True)
            if booking.status in ['paid', 'completed']:
                raise serializers.ValidationError("Booking is already paid")
            return value
        except Booking.DoesNotExist:
            raise serializers.ValidationError("Booking not found")


class PaymentSerializer(serializers.ModelSerializer):
    amount_dollars = serializers.ReadOnlyField()
    booking_number = serializers.SerializerMethodField()
    customer_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Payment
        fields = (
            'id', 'booking_number', 'customer_name', 'amount_cents', 
            'amount_dollars', 'status', 'stripe_payment_intent_id',
            'stripe_charge_id', 'failure_reason', 'processed_at', 'created_at'
        )
        read_only_fields = ('id', 'created_at')
    
    def get_booking_number(self, obj):
        return obj.booking.booking_number
    
    def get_customer_name(self, obj):
        return obj.booking.get_customer_name()


class PaymentConfirmSerializer(serializers.Serializer):
    """Serializer for payment confirmation webhook"""
    payment_intent_id = serializers.CharField()
    status = serializers.ChoiceField(choices=['succeeded', 'failed'])
    failure_reason = serializers.CharField(required=False, allow_blank=True)


class RefundCreateSerializer(serializers.Serializer):
    """Serializer for creating refunds"""
    payment_id = serializers.UUIDField()
    amount_cents = serializers.IntegerField(min_value=1)
    reason = serializers.CharField(max_length=500)
    
    def validate_payment_id(self, value):
        try:
            payment = Payment.objects.get(id=value, status='succeeded')
            return value
        except Payment.DoesNotExist:
            raise serializers.ValidationError("Payment not found or not succeeded")
    
    def validate(self, attrs):
        try:
            payment = Payment.objects.get(id=attrs['payment_id'])
            if attrs['amount_cents'] > payment.amount_cents:
                raise serializers.ValidationError("Refund amount cannot exceed payment amount")
        except Payment.DoesNotExist:
            pass  # Already handled in validate_payment_id
        return attrs


class RefundSerializer(serializers.ModelSerializer):
    amount_dollars = serializers.ReadOnlyField()
    payment_booking_number = serializers.SerializerMethodField()
    requested_by_name = serializers.SerializerMethodField()
    approved_by_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Refund
        fields = (
            'id', 'payment_booking_number', 'amount_cents', 'amount_dollars',
            'reason', 'status', 'requested_by_name', 'approved_by_name',
            'approved_at', 'completed_at', 'created_at'
        )
        read_only_fields = ('id', 'created_at')
    
    def get_payment_booking_number(self, obj):
        return obj.payment.booking.booking_number
    
    def get_requested_by_name(self, obj):
        return obj.requested_by.get_full_name() if obj.requested_by else None
    
    def get_approved_by_name(self, obj):
        return obj.approved_by.get_full_name() if obj.approved_by else None