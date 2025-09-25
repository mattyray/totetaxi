# backend/apps/customers/booking_views.py
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
import json


class CustomerBookingCreateView(APIView):
    """Create booking for authenticated customers with enhanced features"""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        # CRITICAL DEBUG LOGGING
        print("=" * 80)
        print("🔍 BOOKING CREATE REQUEST RECEIVED")
        print("=" * 80)
        print(f"👤 User: {request.user}")
        print(f"📧 Email: {request.user.email}")
        print(f"🔐 Is Authenticated: {request.user.is_authenticated}")
        print(f"📦 Request Data: {json.dumps(request.data, indent=2, default=str)}")
        print("=" * 80)
        
        # Ensure user has customer profile
        if not hasattr(request.user, 'customer_profile'):
            print("❌ ERROR: User has no customer profile")
            return Response(
                {'error': 'This is not a customer account'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        print(f"✅ Customer Profile Found: {request.user.customer_profile}")
        
        serializer = AuthenticatedBookingCreateSerializer(
            data=request.data,
            context={'user': request.user}
        )
        
        print("🔄 Validating serializer...")
        
        if not serializer.is_valid():
            print("=" * 80)
            print("❌ SERIALIZER VALIDATION FAILED")
            print("=" * 80)
            print(f"Errors: {json.dumps(serializer.errors, indent=2, default=str)}")
            print("=" * 80)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        print("✅ Serializer valid, creating booking...")
        
        try:
            booking = serializer.save()
            print(f"✅ Booking created: {booking.booking_number}")
        except Exception as e:
            print(f"❌ ERROR creating booking: {str(e)}")
            import traceback
            traceback.print_exc()
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # Create payment intent for this booking
        create_payment_intent = request.data.get('create_payment_intent', True)
        payment_data = None
        
        if create_payment_intent:
            print("💳 Creating payment intent...")
            try:
                payment_data = StripePaymentService.create_payment_intent(
                    booking=booking,
                    customer_email=request.user.email
                )
                print(f"✅ Payment intent created: {payment_data.get('payment_intent_id')}")
            except Exception as e:
                print(f"⚠️ Payment intent failed: {str(e)}")
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
        
        print("=" * 80)
        print("✅ SUCCESS - Returning response")
        print("=" * 80)
        
        return Response(response_data, status=status.HTTP_201_CREATED)


class QuickRebookView(APIView):
    """Quickly rebook a previous booking with minimal changes"""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, booking_id):
        try:
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
            status='pending'
        )
        
        if original_booking.specialty_items.exists():
            new_booking.specialty_items.set(original_booking.specialty_items.all())
        
        new_booking.save()
        
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
        
        all_bookings = request.user.bookings.filter(deleted_at__isnull=True).order_by('-created_at')
        recent_bookings = all_bookings[:5]
        
        pending_bookings = all_bookings.filter(status__in=['pending', 'confirmed']).count()
        completed_bookings = all_bookings.filter(status='completed').count()
        
        saved_addresses = request.user.saved_addresses.filter(is_active=True)
        payment_methods = request.user.payment_methods.filter(is_active=True)
        
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
        most_used = self.request.user.saved_addresses.filter(is_active=True).order_by('-times_used').first()
        return SavedAddressSerializer(most_used).data if most_used else None