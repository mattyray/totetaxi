from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.utils import timezone
from datetime import date, timedelta
from .models import Booking, Address, GuestCheckout
from .serializers import (
    BookingSerializer,
    GuestBookingCreateSerializer,
    BookingStatusSerializer,
    PricingPreviewSerializer,
    AddressSerializer
)
from apps.services.models import (
    MiniMovePackage, 
    StandardDeliveryConfig, 
    SpecialtyItem, 
    OrganizingService,
    SurchargeRule
)
from apps.services.serializers import (
    ServiceCatalogSerializer,
    MiniMovePackageSerializer,
    OrganizingServiceSerializer,
    StandardDeliveryConfigSerializer,
    SpecialtyItemSerializer,
    MiniMoveWithOrganizingSerializer,
    OrganizingServicesByTierSerializer
)
from apps.payments.services import StripePaymentService


class ServiceCatalogView(APIView):
    """Get all available services including organizing services - no authentication required"""
    permission_classes = [permissions.AllowAny]
    
    def get(self, request):
        print("=" * 50)
        print("DEBUG: ServiceCatalogView.get() called")
        
        # Debug: Verify the model import
        print(f"DEBUG: OrganizingService model: {OrganizingService}")
        print(f"DEBUG: OrganizingService._meta.app_label: {OrganizingService._meta.app_label}")
        print(f"DEBUG: OrganizingService._meta.db_table: {OrganizingService._meta.db_table}")
        
        # Query organizing services with debug info
        organizing_services = OrganizingService.objects.filter(is_active=True).order_by('mini_move_tier', 'is_packing_service')
        print(f"DEBUG: Raw organizing services query count: {organizing_services.count()}")
        print(f"DEBUG: Organizing services IDs: {list(organizing_services.values_list('id', 'name', 'mini_move_tier', 'is_active'))}")
        
        # Test serialization
        organizing_serializer = OrganizingServiceSerializer(organizing_services, many=True)
        serialized_organizing = organizing_serializer.data
        print(f"DEBUG: Serialized organizing services count: {len(serialized_organizing)}")
        print(f"DEBUG: Serialized organizing services: {serialized_organizing}")
        
        # Query other services (keeping existing code)
        mini_move_packages = MiniMovePackage.objects.filter(is_active=True).order_by('base_price_cents')
        specialty_items = SpecialtyItem.objects.filter(is_active=True)
        standard_config = StandardDeliveryConfig.objects.filter(is_active=True).first()
        
        response_data = {
            'mini_move_packages': MiniMovePackageSerializer(mini_move_packages, many=True).data,
            'organizing_services': serialized_organizing,  # Use the debug-traced version
            'specialty_items': SpecialtyItemSerializer(specialty_items, many=True).data,
            'standard_delivery': StandardDeliveryConfigSerializer(standard_config).data if standard_config else None
        }
        
        print(f"DEBUG: Final response organizing_services count: {len(response_data['organizing_services'])}")
        print("=" * 50)
        
        return Response(response_data)


class ServiceCatalogWithOrganizingView(APIView):
    """Get Mini Move packages with their organizing options - optimized for booking wizard"""
    permission_classes = [permissions.AllowAny]
    
    def get(self, request):
        serializer = MiniMoveWithOrganizingSerializer()
        return Response({
            'mini_moves_with_organizing': serializer.to_representation(None)
        })


class OrganizingServicesByTierView(APIView):
    """Get organizing services grouped by Mini Move tier - for easy frontend consumption"""
    permission_classes = [permissions.AllowAny]
    
    def get(self, request):
        serializer = OrganizingServicesByTierSerializer()
        return Response(serializer.to_representation(None))


class PricingPreviewView(APIView):
    """Calculate pricing for booking selection including organizing services - no authentication required"""
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        serializer = PricingPreviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        service_type = serializer.validated_data['service_type']
        pickup_date = serializer.validated_data['pickup_date']
        
        base_price_cents = 0
        surcharge_cents = 0
        coi_fee_cents = 0
        organizing_total_cents = 0
        organizing_tax_cents = 0
        geographic_surcharge_cents = 0
        time_window_surcharge_cents = 0
        details = {}
        
        if service_type == 'mini_move':
            package_id = serializer.validated_data.get('mini_move_package_id')
            if package_id:
                try:
                    package = MiniMovePackage.objects.get(id=package_id, is_active=True)
                    base_price_cents = package.base_price_cents
                    details['package_name'] = package.name
                    details['package_tier'] = package.package_type
                    
                    coi_required = serializer.validated_data.get('coi_required', False)
                    if coi_required and not package.coi_included:
                        coi_fee_cents = package.coi_fee_cents
                        details['coi_required'] = True
                    
                    include_packing = serializer.validated_data.get('include_packing', False)
                    include_unpacking = serializer.validated_data.get('include_unpacking', False)
                    
                    organizing_services_breakdown = []
                    
                    # FIXED: Better error handling and debugging for organizing services
                    if include_packing:
                        packing_service = OrganizingService.objects.filter(
                            mini_move_tier=package.package_type,
                            is_packing_service=True,
                            is_active=True
                        ).first()
                        
                        if packing_service:
                            organizing_total_cents += packing_service.price_cents
                            organizing_services_breakdown.append({
                                'service': 'packing',
                                'name': packing_service.name,
                                'price_dollars': packing_service.price_dollars,
                                'duration_hours': packing_service.duration_hours,
                                'organizer_count': packing_service.organizer_count,
                                'supplies_allowance_dollars': packing_service.supplies_allowance_dollars
                            })
                        else:
                            print(f"DEBUG: No packing service found for tier {package.package_type}")
                            available_services = OrganizingService.objects.filter(is_active=True).values_list('mini_move_tier', 'is_packing_service')
                            print(f"DEBUG: Available services: {list(available_services)}")
                            return Response({
                                'error': f'Packing service not available for {package.package_type} tier'
                            }, status=status.HTTP_400_BAD_REQUEST)
                    
                    if include_unpacking:
                        unpacking_service = OrganizingService.objects.filter(
                            mini_move_tier=package.package_type,
                            is_packing_service=False,
                            is_active=True
                        ).first()
                        
                        if unpacking_service:
                            organizing_total_cents += unpacking_service.price_cents
                            organizing_services_breakdown.append({
                                'service': 'unpacking',
                                'name': unpacking_service.name,
                                'price_dollars': unpacking_service.price_dollars,
                                'duration_hours': unpacking_service.duration_hours,
                                'organizer_count': unpacking_service.organizer_count,
                                'supplies_allowance_dollars': 0
                            })
                        else:
                            print(f"DEBUG: No unpacking service found for tier {package.package_type}")
                            return Response({
                                'error': f'Unpacking service not available for {package.package_type} tier'
                            }, status=status.HTTP_400_BAD_REQUEST)
                    
                    # Calculate tax on organizing services (8.25%)
                    if organizing_total_cents > 0:
                        organizing_tax_cents = int(organizing_total_cents * 0.0825)
                    
                    # Calculate time window surcharge for specific hour selection
                    pickup_time = serializer.validated_data.get('pickup_time', 'morning')
                    if pickup_time == 'morning_specific' and package.package_type == 'standard':
                        time_window_surcharge_cents = 17500  # $175
                    
                    # Calculate geographic surcharge
                    is_outside_core_area = serializer.validated_data.get('is_outside_core_area', False)
                    if is_outside_core_area:
                        geographic_surcharge_cents = 17500  # $175
                    
                    if organizing_services_breakdown:
                        details['organizing_services'] = organizing_services_breakdown
                    
                except MiniMovePackage.DoesNotExist:
                    return Response({'error': 'Invalid mini move package'}, status=status.HTTP_400_BAD_REQUEST)
        
        elif service_type == 'standard_delivery':
            if serializer.validated_data.get('include_packing') or serializer.validated_data.get('include_unpacking'):
                return Response({
                    'error': 'Organizing services are only available for Mini Move bookings'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            item_count = serializer.validated_data.get('standard_delivery_item_count', 0)
            is_same_day = serializer.validated_data.get('is_same_day_delivery', False)
            
            try:
                config = StandardDeliveryConfig.objects.filter(is_active=True).first()
                if config:
                    base_price_cents = config.calculate_total(item_count, is_same_day)
                    details['item_count'] = item_count
                    details['is_same_day'] = is_same_day
                    
                    if is_same_day:
                        details['same_day_rate'] = config.same_day_flat_rate_cents / 100
                    else:
                        details['per_item_rate'] = config.price_per_item_cents / 100
                        details['minimum_charge'] = config.minimum_charge_cents / 100
                        
            except StandardDeliveryConfig.DoesNotExist:
                return Response({'error': 'Standard delivery not configured'}, status=status.HTTP_400_BAD_REQUEST)
        
        elif service_type == 'specialty_item':
            if serializer.validated_data.get('include_packing') or serializer.validated_data.get('include_unpacking'):
                return Response({
                    'error': 'Organizing services are only available for Mini Move bookings'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            specialty_item_ids = serializer.validated_data.get('specialty_item_ids', [])
            specialty_items = SpecialtyItem.objects.filter(id__in=specialty_item_ids, is_active=True)
            
            specialty_total = sum(item.price_cents for item in specialty_items)
            base_price_cents = specialty_total
            details['specialty_items'] = [
                {'name': item.name, 'price_dollars': item.price_dollars}
                for item in specialty_items
            ]
        
        # Calculate weekend surcharges
        is_same_day = serializer.validated_data.get('is_same_day_delivery', False)
        if pickup_date and base_price_cents > 0 and not is_same_day:
            active_surcharges = SurchargeRule.objects.filter(is_active=True)
            surcharge_details = []
            
            for surcharge in active_surcharges:
                surcharge_amount = surcharge.calculate_surcharge(base_price_cents, pickup_date, service_type)
                if surcharge_amount > 0:
                    surcharge_cents += surcharge_amount
                    surcharge_details.append({
                        'name': surcharge.name,
                        'amount_dollars': surcharge_amount / 100,
                        'reason': surcharge.description
                    })
            
            if surcharge_details:
                details['surcharges'] = surcharge_details
        
        total_price_cents = base_price_cents + surcharge_cents + coi_fee_cents + organizing_total_cents + organizing_tax_cents + geographic_surcharge_cents + time_window_surcharge_cents
        
        return Response({
            'service_type': service_type,
            'pricing': {
                'base_price_dollars': base_price_cents / 100,
                'surcharge_dollars': surcharge_cents / 100,
                'coi_fee_dollars': coi_fee_cents / 100,
                'organizing_total_dollars': organizing_total_cents / 100,
                'organizing_tax_dollars': organizing_tax_cents / 100,
                'geographic_surcharge_dollars': geographic_surcharge_cents / 100,
                'time_window_surcharge_dollars': time_window_surcharge_cents / 100,
                'total_price_dollars': total_price_cents / 100
            },
            'details': details,
            'pickup_date': pickup_date
        })
    
class CalendarAvailabilityView(APIView):
    """Calendar data with booking details - no capacity limits"""
    permission_classes = [permissions.AllowAny]
    
    def get(self, request):
        start_date = request.query_params.get('start_date', date.today())
        if isinstance(start_date, str):
            start_date = date.fromisoformat(start_date)
        
        end_date_param = request.query_params.get('end_date')
        if end_date_param:
            end_date = date.fromisoformat(end_date_param)
        else:
            end_date = start_date + timedelta(days=60)
        
        availability = []
        current_date = start_date
        
        while current_date <= end_date:
            # Get bookings for this date
            bookings_today = Booking.objects.filter(
                pickup_date=current_date,
                deleted_at__isnull=True
            ).select_related('customer', 'guest_checkout')
            
            # Get surcharges for this date
            surcharges = []
            for rule in SurchargeRule.objects.filter(is_active=True):
                if rule.applies_to_date(current_date):
                    surcharges.append({
                        'name': rule.name,
                        'type': rule.surcharge_type,
                        'description': rule.description
                    })
            
            # Serialize bookings for this date
            booking_list = []
            for booking in bookings_today:
                booking_list.append({
                    'id': str(booking.id),
                    'booking_number': booking.booking_number,
                    'customer_name': booking.get_customer_name(),
                    'service_type': booking.get_service_type_display(),
                    'pickup_time': booking.get_pickup_time_display(),
                    'status': booking.status,
                    'total_price_dollars': booking.total_price_dollars,
                    'coi_required': booking.coi_required
                })
            
            availability.append({
                'date': current_date.isoformat(),
                'available': True,  # Always available - no capacity limits
                'is_weekend': current_date.weekday() >= 5,
                'bookings': booking_list,
                'surcharges': surcharges
            })
            
            current_date += timedelta(days=1)
        
        return Response({
            'availability': availability,
            'start_date': start_date.isoformat(),
            'end_date': end_date.isoformat()
        })

class GuestBookingCreateView(generics.CreateAPIView):
    """Create booking for guest (non-authenticated) users with payment integration"""
    serializer_class = GuestBookingCreateSerializer
    permission_classes = [permissions.AllowAny]
    
    def create(self, request, *args, **kwargs):
        print("=" * 80)
        print("GUEST BOOKING CREATE REQUEST RECEIVED")
        print("=" * 80)
        print("Guest Email:", request.data.get('email'))
        print("Request Data:", request.data)
        print("Create Payment Intent:", request.data.get('create_payment_intent', True))
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        booking = serializer.save()
        
        print(f"Guest booking created: {booking.booking_number}")
        print(f"Total price: ${booking.total_price_dollars}")
        
        # Add payment intent creation for guests
        create_payment_intent = request.data.get('create_payment_intent', True)
        payment_data = None
        
        if create_payment_intent:
            print("Creating payment intent for guest...")
            try:
                # Use guest email from the booking
                guest_email = booking.guest_checkout.email if booking.guest_checkout else None
                
                payment_result = StripePaymentService.create_payment_intent(
                    booking=booking,
                    customer_email=guest_email
                )
                
                payment_data = {
                    'client_secret': payment_result['client_secret'],
                    'payment_intent_id': payment_result['payment_intent_id']
                }
                
                print(f"Payment intent created: {payment_result['payment_intent_id']}")
            except Exception as e:
                print(f"Payment intent failed: {str(e)}")
                # Don't fail the booking creation, but log the error
                payment_data = None
        
        # Return same format as authenticated endpoint
        response_data = {
            'message': 'Booking created successfully',
            'booking': {
                'id': str(booking.id),
                'booking_number': booking.booking_number,
                'total_price_dollars': booking.total_price_dollars
            }
        }
        
        # Include payment data if available
        if payment_data:
            response_data['payment'] = payment_data
        
        print("=" * 80)
        print("SUCCESS - Returning guest booking response")
        print("Response includes payment:", bool(payment_data))
        print("=" * 80)
        
        return Response(response_data, status=status.HTTP_201_CREATED)


class BookingStatusView(APIView):
    """Get booking status by booking number - no authentication required"""
    permission_classes = [permissions.AllowAny]
    
    def get(self, request, booking_number):
        try:
            booking = Booking.objects.get(booking_number=booking_number, deleted_at__isnull=True)
            serializer = BookingStatusSerializer(booking)
            return Response(serializer.data)
        except Booking.DoesNotExist:
            return Response(
                {'error': 'Booking not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )


class OrganizingServiceDetailView(APIView):
    """Get detailed info about a specific organizing service - no authentication required"""
    permission_classes = [permissions.AllowAny]
    
    def get(self, request, service_id):
        try:
            organizing_service = OrganizingService.objects.get(id=service_id, is_active=True)
            serializer = OrganizingServiceSerializer(organizing_service)
            return Response(serializer.data)
        except OrganizingService.DoesNotExist:
            return Response(
                {'error': 'Organizing service not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )