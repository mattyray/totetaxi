from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from .models import CustomerProfile, SavedAddress, CustomerPaymentMethod
from apps.bookings.models import Booking, Address
from apps.payments.services import StripePaymentService
from .serializers import SavedAddressSerializer
from .booking_serializers import (
    AuthenticatedBookingCreateSerializer,
    CustomerBookingDetailSerializer,
    QuickBookingSerializer
)


class CustomerBookingCreateView(APIView):
    """Create booking for authenticated customers with enhanced features"""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        # Ensure user has customer profile
        if not hasattr(request.user, 'customer_profile'):
            return Response(
                {'error': 'This is not a customer account'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = AuthenticatedBookingCreateSerializer(
            data=request.data,
            context={'user': request.user}
        )
        serializer.is_valid(raise_exception=True)
        booking = serializer.save()
        
        # Set booking to confirmed for demo mode (no real payment processing)
        booking.status = 'pending'  # Change to 'confirmed' if you want auto-confirmation
        booking.save()
        
        # Update customer statistics immediately for demo
        customer_profile = request.user.customer_profile
        customer_profile.add_booking_stats(booking.total_price_cents)
        
        # Automatically create payment intent for seamless experience
        create_payment_intent = request.data.get('create_payment_intent', False)  # Default to False for demo
        payment_data = None
        
        if create_payment_intent:
            try:
                payment_data = StripePaymentService.create_payment_intent(
                    booking=booking,
                    customer_email=request.user.email
                )
            except Exception as e:
                # Don't fail booking creation if payment intent fails
                payment_data = {'error': str(e)}
        
        response_data = {
            'message': 'Booking created successfully',
            'booking': CustomerBookingDetailSerializer(booking).data
        }
        
        if payment_data and 'error' not in payment_data:
            response_data['payment'] = {
                'client_secret': payment_data['client_secret'],
                'payment_intent_id': payment_data['payment_intent_id']
            }
        
        return Response(response_data, status=status.HTTP_201_CREATED)


class QuickRebookView(APIView):
    """Quickly rebook a previous booking with minimal changes"""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, booking_id):
        try:
            # Get original booking - must belong to this customer
            original_booking = Booking.objects.get(
                id=booking_id,
                customer=request.user,
                deleted_at__isnull=True
            )
        except Booking.DoesNotExist:
            return Response(
                {'error': 'Original booking not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = QuickBookingSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Create new booking based on original
        new_booking = Booking.objects.create(
            customer=request.user,
            service_type=original_booking.service_type,
            mini_move_package=original_booking.mini_move_package,
            standard_delivery_item_count=original_booking.standard_delivery_item_count,
            is_same_day_delivery=serializer.validated_data.get('is_same_day_delivery', False),
            pickup_date=serializer.validated_data['pickup_date'],
            pickup_time=serializer.validated_data.get('pickup_time', original_booking.pickup_time),
            pickup_address=original_booking.pickup_address,
            delivery_address=original_booking.delivery_address,
            special_instructions=serializer.validated_data.get('special_instructions', original_booking.special_instructions),
            coi_required=serializer.validated_data.get('coi_required', original_booking.coi_required),
            status='confirmed'  # Set to confirmed for demo
        )
        
        # Copy specialty items if any
        if original_booking.specialty_items.exists():
            new_booking.specialty_items.set(original_booking.specialty_items.all())
        
        new_booking.save()  # Trigger pricing calculation
        
        # Update customer statistics
        customer_profile = request.user.customer_profile
        customer_profile.add_booking_stats(new_booking.total_price_cents)
        
        # Create payment intent
        payment_data = StripePaymentService.create_payment_intent(
            booking=new_booking,
            customer_email=request.user.email
        )
        
        return Response({
            'message': 'Booking recreated successfully',
            'booking': CustomerBookingDetailSerializer(new_booking).data,
            'payment': {
                'client_secret': payment_data['client_secret'],
                'payment_intent_id': payment_data['payment_intent_id']
            }
        }, status=status.HTTP_201_CREATED)


class CustomerBookingDetailView(generics.RetrieveAPIView):
    """Get detailed booking information for authenticated customer"""
    serializer_class = CustomerBookingDetailSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return self.request.user.bookings.filter(deleted_at__isnull=True)
    
    def get_object(self):
        booking_id = self.kwargs.get('booking_id')
        return get_object_or_404(self.get_queryset(), id=booking_id)


class CustomerDashboardView(APIView):
    """Enhanced customer dashboard with booking insights"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        if not hasattr(request.user, 'customer_profile'):
            return Response(
                {'error': 'This is not a customer account'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        customer_profile = request.user.customer_profile
        
        # Get bookings
        all_bookings = request.user.bookings.filter(deleted_at__isnull=True).order_by('-created_at')
        recent_bookings = all_bookings[:5]
        
        # Get booking statistics
        pending_bookings = all_bookings.filter(status__in=['pending', 'confirmed']).count()
        completed_bookings = all_bookings.filter(status='completed').count()
        
        # Get saved data
        saved_addresses = request.user.saved_addresses.filter(is_active=True)
        payment_methods = request.user.payment_methods.filter(is_active=True)
        
        # Get most used addresses
        popular_addresses = saved_addresses.order_by('-times_used')[:3]
        
        return Response({
            'customer_profile': {
                'name': request.user.get_full_name(),
                'email': request.user.email,
                'phone': customer_profile.phone,
                'is_vip': customer_profile.is_vip,
                'total_bookings': customer_profile.total_bookings,
                'total_spent_dollars': customer_profile.total_spent_dollars,
                'last_booking_at': customer_profile.last_booking_at
            },
            'booking_summary': {
                'pending_bookings': pending_bookings,
                'completed_bookings': completed_bookings,
                'total_bookings': all_bookings.count()
            },
            'recent_bookings': CustomerBookingDetailSerializer(recent_bookings, many=True).data,
            'saved_addresses_count': saved_addresses.count(),
            'payment_methods_count': payment_methods.count(),
            'popular_addresses': SavedAddressSerializer(popular_addresses, many=True).data
        })


class BookingPreferencesView(APIView):
    """Manage customer booking preferences"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        customer_profile = request.user.customer_profile
        
        return Response({
            'preferred_pickup_time': customer_profile.preferred_pickup_time,
            'email_notifications': customer_profile.email_notifications,
            'sms_notifications': customer_profile.sms_notifications,
            'default_addresses': {
                'most_used_pickup': self._get_most_used_address('pickup'),
                'most_used_delivery': self._get_most_used_address('delivery')
            }
        })
    
    def _get_most_used_address(self, address_type):
        # This is a simplified version - in production you'd track pickup vs delivery usage
        most_used = self.request.user.saved_addresses.filter(is_active=True).order_by('-times_used').first()
        return SavedAddressSerializer(most_used).data if most_used else None