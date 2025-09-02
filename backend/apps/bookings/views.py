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
    SurchargeRule,
    VanSchedule
)


class ServiceCatalogView(APIView):
    """Get all available services - no authentication required"""
    permission_classes = [permissions.AllowAny]
    
    def get(self, request):
        # Mini Move Packages
        mini_move_packages = []
        for package in MiniMovePackage.objects.filter(is_active=True).order_by('base_price_cents'):
            mini_move_packages.append({
                'id': str(package.id),
                'package_type': package.package_type,
                'name': package.name,
                'description': package.description,
                'base_price_dollars': package.base_price_dollars,
                'max_items': package.max_items,
                'coi_included': package.coi_included,
                'coi_fee_dollars': package.coi_fee_dollars,
                'is_most_popular': package.is_most_popular,
                'features': {
                    'priority_scheduling': package.priority_scheduling,
                    'protective_wrapping': package.protective_wrapping
                }
            })
        
        # Standard Delivery Config
        standard_config = StandardDeliveryConfig.objects.filter(is_active=True).first()
        standard_delivery = None
        if standard_config:
            standard_delivery = {
                'price_per_item_dollars': standard_config.price_per_item_dollars,
                'minimum_items': standard_config.minimum_items,
                'minimum_charge_dollars': standard_config.minimum_charge_dollars,
                'same_day_flat_rate_dollars': standard_config.same_day_flat_rate_cents / 100,
                'max_weight_per_item_lbs': standard_config.max_weight_per_item_lbs
            }
        
        # Specialty Items
        specialty_items = []
        for item in SpecialtyItem.objects.filter(is_active=True):
            specialty_items.append({
                'id': str(item.id),
                'item_type': item.item_type,
                'name': item.name,
                'description': item.description,
                'price_dollars': item.price_dollars,
                'requires_van_schedule': item.requires_van_schedule,
                'special_handling': item.special_handling
            })
        
        return Response({
            'mini_move_packages': mini_move_packages,
            'standard_delivery': standard_delivery,
            'specialty_items': specialty_items
        })


class PricingPreviewView(APIView):
    """Calculate pricing for booking selection - no authentication required"""
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        serializer = PricingPreviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        service_type = serializer.validated_data['service_type']
        pickup_date = serializer.validated_data['pickup_date']
        
        base_price_cents = 0
        surcharge_cents = 0
        coi_fee_cents = 0
        details = {}
        
        # Calculate base price by service type
        if service_type == 'mini_move':
            package_id = serializer.validated_data.get('mini_move_package_id')
            if package_id:
                try:
                    package = MiniMovePackage.objects.get(id=package_id, is_active=True)
                    base_price_cents = package.base_price_cents
                    details['package_name'] = package.name
                    
                    # COI handling
                    coi_required = serializer.validated_data.get('coi_required', False)
                    if coi_required and not package.coi_included:
                        coi_fee_cents = package.coi_fee_cents
                        details['coi_required'] = True
                    
                except MiniMovePackage.DoesNotExist:
                    return Response({'error': 'Invalid mini move package'}, status=status.HTTP_400_BAD_REQUEST)
        
        elif service_type == 'standard_delivery':
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
            specialty_item_ids = serializer.validated_data.get('specialty_item_ids', [])
            specialty_items = SpecialtyItem.objects.filter(id__in=specialty_item_ids, is_active=True)
            
            specialty_total = sum(item.price_cents for item in specialty_items)
            base_price_cents = specialty_total
            details['specialty_items'] = [
                {'name': item.name, 'price_dollars': item.price_dollars}
                for item in specialty_items
            ]
        
        # Calculate surcharges (skip for same-day delivery)
        is_same_day = serializer.validated_data.get('is_same_day_delivery', False)
        if pickup_date and base_price_cents > 0 and not is_same_day:
            active_surcharges = SurchargeRule.objects.filter(is_active=True)
            surcharge_details = []
            
            for surcharge in active_surcharges:
                surcharge_amount = surcharge.calculate_surcharge(base_price_cents, pickup_date)
                if surcharge_amount > 0:
                    surcharge_cents += surcharge_amount
                    surcharge_details.append({
                        'name': surcharge.name,
                        'amount_dollars': surcharge_amount / 100,
                        'reason': surcharge.description
                    })
            
            if surcharge_details:
                details['surcharges'] = surcharge_details
        
        # Calculate total
        total_price_cents = base_price_cents + surcharge_cents + coi_fee_cents
        
        return Response({
            'service_type': service_type,
            'pricing': {
                'base_price_dollars': base_price_cents / 100,
                'surcharge_dollars': surcharge_cents / 100,
                'coi_fee_dollars': coi_fee_cents / 100,
                'total_price_dollars': total_price_cents / 100
            },
            'details': details,
            'pickup_date': pickup_date
        })


class CalendarAvailabilityView(APIView):
    """Get available dates for booking - no authentication required"""
    permission_classes = [permissions.AllowAny]
    
    def get(self, request):
        # Get date range (next 60 days by default)
        start_date = request.query_params.get('start_date', date.today())
        if isinstance(start_date, str):
            start_date = date.fromisoformat(start_date)
        
        end_date = start_date + timedelta(days=60)
        
        availability = []
        current_date = start_date
        
        while current_date <= end_date:
            # Check if it's a weekend (for surcharge indication)
            is_weekend = current_date.weekday() >= 5
            
            # Check van schedule availability
            van_schedule = VanSchedule.objects.filter(date=current_date).first()
            if van_schedule:
                available = van_schedule.has_capacity
                specialty_items_allowed = van_schedule.allows_specialty_items
                capacity_used = van_schedule.total_bookings
                max_capacity = van_schedule.max_capacity
            else:
                # Default availability if no specific schedule
                available = True
                specialty_items_allowed = False
                capacity_used = 0
                max_capacity = 10
            
            # Check for specific surcharges on this date
            surcharges = []
            for rule in SurchargeRule.objects.filter(is_active=True):
                if rule.applies_to_date(current_date):
                    surcharges.append({
                        'name': rule.name,
                        'type': rule.surcharge_type,
                        'description': rule.description
                    })
            
            availability.append({
                'date': current_date.isoformat(),
                'available': available,
                'is_weekend': is_weekend,
                'specialty_items_allowed': specialty_items_allowed,
                'capacity_used': capacity_used,
                'max_capacity': max_capacity,
                'surcharges': surcharges
            })
            
            current_date += timedelta(days=1)
        
        return Response({
            'availability': availability,
            'start_date': start_date.isoformat(),
            'end_date': end_date.isoformat()
        })


class GuestBookingCreateView(generics.CreateAPIView):
    """Create booking for guest (non-authenticated) users"""
    serializer_class = GuestBookingCreateSerializer
    permission_classes = [permissions.AllowAny]
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        booking = serializer.save()
        
        return Response({
            'message': 'Booking created successfully',
            'booking': BookingSerializer(booking).data
        }, status=status.HTTP_201_CREATED)


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