# backend/apps/bookings/views.py
from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from collections import defaultdict
from datetime import date, timedelta, time as dt_time
import logging
import json
import uuid as _uuid_mod
import stripe
from django.conf import settings

from .models import Booking, Address, GuestCheckout, check_same_day_restriction
from apps.payments.models import Payment
from .serializers import (
    BookingSerializer,
    GuestBookingCreateSerializer,
    GuestPaymentIntentSerializer,
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
from .pricing_utils import calculate_geographic_surcharge_from_zips
from django.utils.decorators import method_decorator
from django_ratelimit.decorators import ratelimit

logger = logging.getLogger(__name__)

# Initialize Stripe
stripe.api_key = settings.STRIPE_SECRET_KEY


class ServiceCatalogView(APIView):
    """Get all available services including organizing services - no authentication required"""
    permission_classes = [permissions.AllowAny]
    
    def get(self, request):
        organizing_services = OrganizingService.objects.filter(
            is_active=True
        ).order_by('mini_move_tier', 'is_packing_service')
        
        mini_move_packages = MiniMovePackage.objects.filter(
            is_active=True
        ).order_by('base_price_cents')
        
        specialty_items = SpecialtyItem.objects.filter(is_active=True)
        standard_config = StandardDeliveryConfig.objects.filter(is_active=True).first()
        
        response_data = {
            'mini_move_packages': MiniMovePackageSerializer(mini_move_packages, many=True).data,
            'organizing_services': OrganizingServiceSerializer(organizing_services, many=True).data,
            'specialty_items': SpecialtyItemSerializer(specialty_items, many=True).data,
            'standard_delivery': StandardDeliveryConfigSerializer(standard_config).data if standard_config else None
        }
        
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
    """Calculate pricing for booking selection including organizing services + BLADE - no authentication required"""
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        serializer = PricingPreviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        service_type = serializer.validated_data['service_type']
        pickup_date = serializer.validated_data['pickup_date']
        
        # ========== SAME-DAY RESTRICTION CHECK ==========
        if pickup_date:
            is_blocked, error_message = check_same_day_restriction(pickup_date)
            if is_blocked:
                return Response({
                    'error': 'same_day_restriction',
                    'message': error_message,
                    'contact_phone': '(631) 595-5100',
                    'pickup_date': str(pickup_date)
                }, status=status.HTTP_400_BAD_REQUEST)
        # ========== END RESTRICTION CHECK ==========
        
        base_price_cents = 0
        surcharge_cents = 0
        coi_fee_cents = 0
        organizing_total_cents = 0
        organizing_tax_cents = 0
        geographic_surcharge_cents = 0
        time_window_surcharge_cents = 0
        same_day_fee_cents = 0
        details = {}
        
        # BLADE pricing
        if service_type == 'blade_transfer':
            bag_count = serializer.validated_data.get('blade_bag_count', 0)
            
            if bag_count < 2:
                return Response({
                    'error': 'BLADE service requires minimum 2 bags'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            per_bag_price = 7500  # $75 in cents
            base_price_cents = bag_count * per_bag_price
            base_price_cents = max(base_price_cents, 15000)  # $150 minimum
            
            # Calculate ready time (to_airport only)
            transfer_direction = serializer.validated_data.get('transfer_direction', 'to_airport')
            flight_time = serializer.validated_data.get('blade_flight_time')
            if transfer_direction == 'to_airport' and flight_time:
                if flight_time < dt_time(13, 0):
                    ready_time = dt_time(5, 0)
                else:
                    ready_time = dt_time(10, 0)
                details['ready_time'] = ready_time.isoformat()

            details['transfer_direction'] = transfer_direction
            details['terminal'] = serializer.validated_data.get('blade_terminal')
            details['airport'] = serializer.validated_data.get('blade_airport')
            details['bag_count'] = bag_count
            details['per_bag_price'] = 75
            details['flight_date'] = serializer.validated_data.get('blade_flight_date').isoformat() if serializer.validated_data.get('blade_flight_date') else None
            details['flight_time'] = serializer.validated_data.get('blade_flight_time').isoformat() if serializer.validated_data.get('blade_flight_time') else None
        
        # Mini Move pricing
        elif service_type == 'mini_move':
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
                            logger.warning(f"Packing service not found for tier {package.package_type}")
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
                            logger.warning(f"Unpacking service not found for tier {package.package_type}")
                            return Response({
                                'error': f'Unpacking service not available for {package.package_type} tier'
                            }, status=status.HTTP_400_BAD_REQUEST)
                    
                    if organizing_total_cents > 0:
                        organizing_tax_cents = int(organizing_total_cents * 0.0825)
                    
                    pickup_time = serializer.validated_data.get('pickup_time', 'morning')
                    if pickup_time == 'morning_specific' and package.package_type == 'standard':
                        time_window_surcharge_cents = 17500
                    
                    # Calculate geographic surcharge ($175 per out-of-zone address)
                    geographic_surcharge_cents = calculate_geographic_surcharge_from_zips(
                        serializer.validated_data.get('pickup_zip_code'),
                        serializer.validated_data.get('delivery_zip_code'),
                        fallback_is_outside=serializer.validated_data.get('is_outside_core_area', False)
                    )
                    
                    if organizing_services_breakdown:
                        details['organizing_services'] = organizing_services_breakdown
                    
                except MiniMovePackage.DoesNotExist:
                    return Response({'error': 'Invalid mini move package'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Standard Delivery pricing
        elif service_type == 'standard_delivery':
            if serializer.validated_data.get('include_packing') or serializer.validated_data.get('include_unpacking'):
                return Response({
                    'error': 'Organizing services are only available for Mini Move bookings'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            item_count = serializer.validated_data.get('standard_delivery_item_count', 0)
            specialty_items_data = serializer.validated_data.get('specialty_items', [])
            is_same_day = serializer.validated_data.get('is_same_day_delivery', False)
            
            config = StandardDeliveryConfig.objects.filter(is_active=True).first()
            if config:
                if item_count > 0:
                    item_total = config.price_per_item_cents * item_count
                    base_price_cents = max(item_total, config.minimum_charge_cents)

                    details['item_count'] = item_count
                    details['per_item_rate'] = config.price_per_item_cents / 100
                    details['minimum_charge'] = config.minimum_charge_cents / 100
                else:
                    base_price_cents = 0

                # Calculate specialty items with quantities
                if specialty_items_data:
                    specialty_items_list = []
                    specialty_total_cents = 0

                    for item_data in specialty_items_data:
                        item_id = item_data.get('item_id')
                        quantity = item_data.get('quantity', 1)

                        try:
                            specialty_item = SpecialtyItem.objects.get(id=item_id, is_active=True)
                            item_total = specialty_item.price_cents * quantity
                            specialty_total_cents += item_total

                            specialty_items_list.append({
                                'name': specialty_item.name,
                                'price_dollars': specialty_item.price_dollars,
                                'quantity': quantity,
                                'subtotal_dollars': item_total / 100
                            })
                        except SpecialtyItem.DoesNotExist:
                            logger.warning(f"Specialty item {item_id} not found")
                            continue

                    base_price_cents += specialty_total_cents
                    details['specialty_items'] = specialty_items_list

                if is_same_day:
                    same_day_fee_cents = config.same_day_flat_rate_cents
                    details['is_same_day'] = True
                    details['same_day_rate'] = config.same_day_flat_rate_cents / 100
            
            # Apply geographic surcharge for Standard Delivery ($175 per out-of-zone address)
            geographic_surcharge_cents = calculate_geographic_surcharge_from_zips(
                serializer.validated_data.get('pickup_zip_code'),
                serializer.validated_data.get('delivery_zip_code'),
                fallback_is_outside=serializer.validated_data.get('is_outside_core_area', False)
            )
            
            # Apply COI fee for Standard Delivery
            coi_required = serializer.validated_data.get('coi_required', False)
            if coi_required:
                coi_fee_cents = 5000
        
        # Specialty Item pricing with quantities
        elif service_type == 'specialty_item':
            if serializer.validated_data.get('include_packing') or serializer.validated_data.get('include_unpacking'):
                return Response({
                    'error': 'Organizing services are only available for Mini Move bookings'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            specialty_items_data = serializer.validated_data.get('specialty_items', [])
            
            if specialty_items_data:
                specialty_items_list = []
                specialty_total_cents = 0
                
                for item_data in specialty_items_data:
                    item_id = item_data.get('item_id')
                    quantity = item_data.get('quantity', 1)
                    
                    try:
                        specialty_item = SpecialtyItem.objects.get(id=item_id, is_active=True)
                        item_total = specialty_item.price_cents * quantity
                        specialty_total_cents += item_total
                        
                        specialty_items_list.append({
                            'name': specialty_item.name,
                            'price_dollars': specialty_item.price_dollars,
                            'quantity': quantity,
                            'subtotal_dollars': item_total / 100
                        })
                    except SpecialtyItem.DoesNotExist:
                        logger.warning(f"Specialty item {item_id} not found")
                        continue
                
                base_price_cents = specialty_total_cents
                details['specialty_items'] = specialty_items_list
            
            # Apply same-day delivery for specialty items
            is_same_day = serializer.validated_data.get('is_same_day_delivery', False)
            if is_same_day:
                config = StandardDeliveryConfig.objects.filter(is_active=True).first()
                if config:
                    same_day_fee_cents = config.same_day_flat_rate_cents
                    details['is_same_day'] = True
                    details['same_day_rate'] = config.same_day_flat_rate_cents / 100
            
            # Apply geographic surcharge for Specialty Items ($175 per out-of-zone address)
            geographic_surcharge_cents = calculate_geographic_surcharge_from_zips(
                serializer.validated_data.get('pickup_zip_code'),
                serializer.validated_data.get('delivery_zip_code'),
                fallback_is_outside=serializer.validated_data.get('is_outside_core_area', False)
            )
            
            # Apply COI fee for Specialty Items
            coi_required = serializer.validated_data.get('coi_required', False)
            if coi_required:
                coi_fee_cents = 5000
        
        # Apply surcharges (NOT for BLADE)
        if service_type != 'blade_transfer' and pickup_date and base_price_cents > 0:
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
        
        total_price_cents = (
            base_price_cents +
            same_day_fee_cents +
            surcharge_cents +
            coi_fee_cents +
            organizing_total_cents +
            organizing_tax_cents +
            geographic_surcharge_cents +
            time_window_surcharge_cents
        )

        # Apply discount code if provided
        discount_amount_cents = 0
        discount_info = None

        discount_code_str = (serializer.validated_data.get('discount_code') or '').strip()
        discount_email = (serializer.validated_data.get('discount_email') or '').strip()

        if discount_code_str and discount_email:
            from .models import DiscountCode
            try:
                discount = DiscountCode.objects.get(code__iexact=discount_code_str)
                is_valid, _ = discount.is_valid_for_customer(discount_email)

                if is_valid and discount.is_valid_for_service(service_type):
                    if total_price_cents >= discount.minimum_order_cents:
                        discount_amount_cents = discount.calculate_discount(total_price_cents)
                        discount_info = {
                            'code': discount.code,
                            'discount_type': discount.discount_type,
                            'discount_description': discount.discount_value_display,
                            'discount_amount_dollars': discount_amount_cents / 100,
                        }
            except DiscountCode.DoesNotExist:
                pass

        final_total_cents = max(0, total_price_cents - discount_amount_cents)

        return Response({
            'service_type': service_type,
            'pricing': {
                'base_price_dollars': base_price_cents / 100,
                'same_day_delivery_dollars': same_day_fee_cents / 100,
                'surcharge_dollars': surcharge_cents / 100,
                'coi_fee_dollars': coi_fee_cents / 100,
                'organizing_total_dollars': organizing_total_cents / 100,
                'organizing_tax_dollars': organizing_tax_cents / 100,
                'geographic_surcharge_dollars': geographic_surcharge_cents / 100,
                'time_window_surcharge_dollars': time_window_surcharge_cents / 100,
                'total_price_dollars': final_total_cents / 100,
                'pre_discount_total_dollars': total_price_cents / 100 if discount_amount_cents > 0 else None,
                'discount_amount_dollars': discount_amount_cents / 100 if discount_amount_cents > 0 else 0,
            },
            'details': details,
            'discount': discount_info,
            'pickup_date': pickup_date
        })


class CalendarAvailabilityView(APIView):
    """Calendar availability data.
    - Public requests: dates, counts, surcharges only (no PII).
    - Staff requests: full booking details for the staff dashboard calendar.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        start_date = request.query_params.get('start_date', date.today())
        if isinstance(start_date, str):
            try:
                start_date = date.fromisoformat(start_date)
            except ValueError:
                return Response(
                    {'error': 'Invalid start_date format. Use YYYY-MM-DD.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        end_date_param = request.query_params.get('end_date')
        if end_date_param:
            try:
                end_date = date.fromisoformat(end_date_param)
            except ValueError:
                return Response(
                    {'error': 'Invalid end_date format. Use YYYY-MM-DD.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        else:
            end_date = start_date + timedelta(days=60)

        is_staff = (
            request.user.is_authenticated
            and hasattr(request.user, 'staff_profile')
        )

        # Bulk-fetch all bookings in date range (single query instead of N)
        bookings_qs = Booking.objects.filter(
            pickup_date__gte=start_date,
            pickup_date__lte=end_date,
            deleted_at__isnull=True,
        )
        if is_staff:
            bookings_qs = bookings_qs.select_related(
                'customer', 'guest_checkout', 'mini_move_package',
            )

        # Group bookings by date in Python
        bookings_by_date = defaultdict(list)
        for b in bookings_qs:
            bookings_by_date[b.pickup_date].append(b)

        # Fetch surcharge rules once (instead of per-day)
        surcharge_rules = list(SurchargeRule.objects.filter(is_active=True))

        availability = []
        current_date = start_date

        while current_date <= end_date:
            surcharges = [
                {
                    'name': rule.name,
                    'type': rule.surcharge_type,
                    'description': rule.description,
                }
                for rule in surcharge_rules
                if rule.applies_to_date(current_date)
            ]

            day_data = {
                'date': current_date.isoformat(),
                'available': True,
                'is_weekend': current_date.weekday() >= 5,
                'surcharges': surcharges,
            }

            day_bookings = bookings_by_date.get(current_date, [])

            if is_staff:
                day_data['bookings'] = [
                    {
                        'id': str(b.id),
                        'booking_number': b.booking_number,
                        'customer_name': b.get_customer_name(),
                        'service_type': b.get_service_type_display(),
                        'pickup_time': b.get_pickup_time_display(),
                        'status': b.status,
                        'total_price_dollars': b.total_price_dollars,
                        'coi_required': b.coi_required,
                    }
                    for b in day_bookings
                ]
            else:
                day_data['booking_count'] = len(day_bookings)

            availability.append(day_data)
            current_date += timedelta(days=1)

        return Response({
            'availability': availability,
            'start_date': start_date.isoformat(),
            'end_date': end_date.isoformat(),
        })


@method_decorator(ratelimit(key='ip', rate='10/h', method='POST', block=True), name='post')
class CreateGuestPaymentIntentView(APIView):
    """
    Create payment intent BEFORE guest booking
    This separates payment from booking creation to avoid pending bookings
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        logger.info("Guest payment intent request received")
        
        serializer = GuestPaymentIntentSerializer(data=request.data)
        
        if not serializer.is_valid():
            logger.warning(f"Guest payment intent validation failed: {serializer.errors}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        # Get calculated total from serializer
        validated_data = serializer.validated_data
        amount_cents = validated_data['calculated_total_cents']
        customer_email = validated_data.get('email')
        
        # Handle free orders (100% discount)
        if amount_cents == 0:
            free_order_id = f'free_order_{_uuid_mod.uuid4()}'
            logger.info(f"Free order via discount for guest {customer_email}")
            return Response({
                'client_secret': None,
                'payment_intent_id': free_order_id,
                'amount_dollars': 0
            }, status=status.HTTP_200_OK)

        try:
            # Create Stripe payment intent
            metadata = {
                'service_type': validated_data['service_type'],
                'customer_email': customer_email,
            }
            if validated_data.get('_discount_code_id'):
                metadata['discount_code_id'] = validated_data['_discount_code_id']
                metadata['discount_amount_cents'] = str(validated_data.get('_discount_amount_cents', 0))

            payment_intent = stripe.PaymentIntent.create(
                amount=amount_cents,
                currency='usd',
                payment_method_types=['card'],
                metadata=metadata
            )

            logger.info(f"Payment intent created: {payment_intent.id} for ${amount_cents / 100}")

            return Response({
                'client_secret': payment_intent.client_secret,
                'payment_intent_id': payment_intent.id,
                'amount_dollars': amount_cents / 100
            }, status=status.HTTP_200_OK)

        except stripe.error.StripeError as e:
            logger.error(f"Stripe error creating payment intent: {str(e)}")
            return Response(
                {'error': 'Payment initialization failed'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class GuestBookingCreateView(generics.CreateAPIView):
    """
    Create booking for guest AFTER payment succeeds
    Requires payment_intent_id and verifies payment before creating booking
    """
    serializer_class = GuestBookingCreateSerializer
    permission_classes = [permissions.AllowAny]
    
    def create(self, request, *args, **kwargs):
        logger.info(f"Guest booking create request - Service: {request.data.get('service_type')}, Email: {request.data.get('email')}")

        # Verify payment_intent_id is provided
        payment_intent_id = request.data.get('payment_intent_id')
        if not payment_intent_id:
            return Response(
                {'error': 'payment_intent_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        is_free_order = payment_intent_id.startswith('free_order_')

        # ========== C2: PaymentIntent reuse prevention ==========
        if Payment.objects.filter(
            stripe_payment_intent_id=payment_intent_id,
            booking__isnull=False,
        ).exists():
            logger.warning(f"PI reuse attempt: {payment_intent_id}")
            return Response(
                {'error': 'This payment has already been used for a booking'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not is_free_order:

            # Verify payment with Stripe
            try:
                payment_intent = stripe.PaymentIntent.retrieve(payment_intent_id)

                if payment_intent.status != 'succeeded':
                    logger.warning(f"Payment not succeeded: {payment_intent.status}")
                    return Response(
                        {'error': 'Payment has not succeeded'},
                        status=status.HTTP_400_BAD_REQUEST
                    )

                logger.info(f"Payment verified: {payment_intent_id} - ${payment_intent.amount / 100}")

            except stripe.error.StripeError as e:
                logger.error(f"Stripe verification failed: {str(e)}")
                return Response(
                    {'error': 'Payment verification failed'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # ========== SAME-DAY RESTRICTION CHECK ==========
        pickup_date = serializer.validated_data.get('pickup_date')
        if pickup_date:
            is_blocked, error_message = check_same_day_restriction(pickup_date)
            if is_blocked:
                return Response({
                    'error': 'same_day_restriction',
                    'message': error_message,
                    'contact_phone': '(631) 595-5100'
                }, status=status.HTTP_400_BAD_REQUEST)
        # ========== END RESTRICTION CHECK ==========

        with transaction.atomic():
            booking = serializer.save()

            if is_free_order:
                # Verify the booking total is actually $0
                if booking.total_price_cents != 0:
                    logger.error(
                        f"Free order claimed but total is {booking.total_price_cents} "
                        f"for {booking.booking_number}"
                    )
                    booking.status = 'cancelled'
                    booking.save()
                    return Response(
                        {'error': 'Free order verification failed'},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                # Create $0 payment record for audit trail
                Payment.objects.create(
                    booking=booking,
                    amount_cents=0,
                    stripe_payment_intent_id='free_order',
                    stripe_charge_id='',
                    status='succeeded',
                    processed_at=timezone.now(),
                )
            else:
                # ========== C1: Payment amount verification ==========
                if payment_intent.amount != booking.total_price_cents:
                    logger.error(
                        f"Payment amount mismatch: PI={payment_intent.amount}, "
                        f"booking={booking.total_price_cents} for {booking.booking_number}"
                    )
                    booking.status = 'cancelled'
                    booking.save()
                    return Response(
                        {'error': 'Payment amount does not match booking total'},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                # ========== C2b: Create Payment record for guest booking ==========
                charge_id = getattr(payment_intent, 'latest_charge', None)
                if not isinstance(charge_id, str):
                    charge_id = ''
                Payment.objects.create(
                    booking=booking,
                    amount_cents=payment_intent.amount,
                    stripe_payment_intent_id=payment_intent_id,
                    stripe_charge_id=charge_id,
                    status='succeeded',
                    processed_at=timezone.now(),
                )

            # Update booking status to paid since payment already succeeded
            booking.status = 'paid'
            booking.save(_skip_pricing=True)

        logger.info(f"Guest booking created: {booking.booking_number} - {booking.service_type} - ${booking.total_price_dollars}")

        response_data = {
            'message': 'Booking created successfully',
            'booking': {
                'id': str(booking.id),
                'booking_number': booking.booking_number,
                'total_price_dollars': booking.total_price_dollars,
                'service_type': booking.service_type,
                'status': booking.status,
            }
        }

        # Add BLADE-specific response data
        if booking.service_type == 'blade_transfer':
            response_data['booking']['blade_details'] = {
                'airport': booking.blade_airport,
                'bag_count': booking.blade_bag_count,
                'flight_date': booking.blade_flight_date.isoformat() if booking.blade_flight_date else None,
                'ready_time': booking.blade_ready_time.isoformat() if booking.blade_ready_time else None,
            }

        return Response(response_data, status=status.HTTP_201_CREATED)


class BookingStatusView(APIView):
    """Get booking status by UUID — non-guessable, no PII leak."""
    permission_classes = [permissions.AllowAny]

    def get(self, request, booking_lookup):
        try:
            # Accept UUID only (non-guessable). Sequential TT-XXXXXX is rejected.
            import uuid as _uuid
            try:
                booking_uuid = _uuid.UUID(str(booking_lookup))
            except ValueError:
                return Response(
                    {'error': 'Booking not found'},
                    status=status.HTTP_404_NOT_FOUND,
                )

            booking = Booking.objects.get(id=booking_uuid, deleted_at__isnull=True)
            return Response({
                'booking_number': booking.booking_number,
                'service_type': booking.service_type,
                'status': booking.status,
                'pickup_date': booking.pickup_date.isoformat(),
            })
        except Booking.DoesNotExist:
            return Response(
                {'error': 'Booking not found'},
                status=status.HTTP_404_NOT_FOUND,
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


@method_decorator(ratelimit(key='ip', rate='20/h', method='POST', block=True), name='post')
class ValidateDiscountCodeView(APIView):
    """Validate a discount code and return discount details."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        from .models import DiscountCode

        code = (request.data.get('code') or '').strip().upper()
        email = (request.data.get('email') or '').strip().lower()
        service_type = request.data.get('service_type', '')
        subtotal_cents = request.data.get('subtotal_cents', 0)

        if not code:
            return Response(
                {'error': 'Discount code is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not email:
            return Response(
                {'error': 'Email is required for discount validation'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            discount = DiscountCode.objects.get(code__iexact=code)
        except DiscountCode.DoesNotExist:
            return Response(
                {'error': 'Invalid discount code'},
                status=status.HTTP_400_BAD_REQUEST
            )

        is_valid, error = discount.is_valid_for_customer(email)
        if not is_valid:
            return Response({'error': error}, status=status.HTTP_400_BAD_REQUEST)

        if service_type and not discount.is_valid_for_service(service_type):
            return Response(
                {'error': f'This discount code does not apply to {service_type} bookings'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if subtotal_cents and discount.minimum_order_cents > 0:
            if int(subtotal_cents) < discount.minimum_order_cents:
                return Response(
                    {'error': f'Minimum order of ${discount.minimum_order_cents / 100:.2f} required for this code'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        discount_amount_cents = discount.calculate_discount(int(subtotal_cents)) if subtotal_cents else 0

        return Response({
            'valid': True,
            'code': discount.code,
            'discount_type': discount.discount_type,
            'discount_value': discount.discount_value,
            'discount_description': discount.discount_value_display,
            'discount_amount_cents': discount_amount_cents,
            'discount_amount_dollars': discount_amount_cents / 100,
            'minimum_order_cents': discount.minimum_order_cents,
            'allowed_service_types': discount.allowed_service_types,
        })


class ValidateZipCodeView(APIView):
    """
    Public endpoint to validate a single ZIP code.
    Returns service area information without requiring authentication.
    """
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        from .zip_codes import validate_service_area
        
        zip_code = request.data.get('zip_code')
        
        if not zip_code:
            return Response(
                {'error': 'ZIP code is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        is_serviceable, requires_surcharge, zone, error = validate_service_area(zip_code)
        
        return Response({
            'is_serviceable': is_serviceable,
            'requires_surcharge': requires_surcharge,
            'zone': zone,
            'error': error,
            'zip_code': zip_code.split('-')[0].strip()
        })