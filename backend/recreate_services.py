# backend/recreate_services.py
# Service Catalog Recreation Script
# Run this after fresh database migration: python manage.py shell < recreate_services.py

from apps.services.models import *

print("🚀 Creating service catalog...")

# Mini Move Packages
print("📦 Creating Mini Move Packages...")
MiniMovePackage.objects.create(
    package_type='petite',
    name='Petite',
    description='15 items <50 lbs. Shared van with COI available for +$50.',
    base_price_cents=99500,
    max_items=15,
    max_weight_per_item_lbs=50,
    coi_included=False,
    coi_fee_cents=5000,
    priority_scheduling=False,
    protective_wrapping=False,
    is_most_popular=False,
    is_active=True
)


MiniMovePackage.objects.create(
    package_type='standard',
    name='Standard',
    description='30 items <50 lbs. COI included, protective wrapping, priority scheduling.',
    base_price_cents=172500,
    max_items=30,
    max_weight_per_item_lbs=50,
    coi_included=True,
    coi_fee_cents=0,
    priority_scheduling=True,
    protective_wrapping=True,
    is_most_popular=True,
    is_active=True
)

MiniMovePackage.objects.create(
    package_type='full',
    name='Full Move',
    description='Van exclusive, unlimited items within van capacity. Direct pickup-to-delivery.',
    base_price_cents=249000,
    max_items=None,
    max_weight_per_item_lbs=50,
    coi_included=True,
    coi_fee_cents=0,
    priority_scheduling=True,
    protective_wrapping=True,
    is_most_popular=False,
    is_active=True
)

# Specialty Items
print("🏄 Creating Specialty Items...")
SpecialtyItem.objects.create(
    item_type='peloton',
    name='Peloton / Large Equipment',
    description='Peloton bikes and large equipment moving',
    price_cents=50000,
    special_handling=True,
    is_active=True
)

SpecialtyItem.objects.create(
    item_type='surfboard',
    name='Surfboard',
    description='Professional surfboard transport',
    price_cents=35000,
    special_handling=True,
    is_active=True
)

SpecialtyItem.objects.create(
    item_type='crib',
    name='Crib',
    description='Foldable crib delivery (may vary for non-foldable)',
    price_cents=35000,
    special_handling=True,
    is_active=True
)

SpecialtyItem.objects.create(
    item_type='wardrobe_box',
    name='Wardrobe Box',
    description='Professional wardrobe box handling',
    price_cents=27500,
    special_handling=True,
    is_active=True
)

# Standard Delivery Config
print("🚚 Creating Standard Delivery Config...")
StandardDeliveryConfig.objects.create(
    price_per_item_cents=9500,
    minimum_items=1,
    minimum_charge_cents=28500,
    same_day_flat_rate_cents=36000,
    max_weight_per_item_lbs=50,
    is_active=True
)

# Surcharge Rules
print("💰 Creating Surcharge Rules...")
SurchargeRule.objects.create(
    surcharge_type='weekend',
    name='Mini Move Weekend Surcharge',
    description='Weekend surcharge for Mini Move packages - $175 for Sat/Sun bookings',
    applies_to_service_type='mini_move',
    calculation_type='fixed_amount',
    percentage=None,
    fixed_amount_cents=17500,
    specific_date=None,
    applies_saturday=True,
    applies_sunday=True,
    is_active=True
)

SurchargeRule.objects.create(
    surcharge_type='weekend',
    name='Standard Delivery Weekend Surcharge',
    description='Weekend surcharge for Standard Delivery service - $50 for Sat/Sun bookings',
    applies_to_service_type='standard_delivery',
    calculation_type='fixed_amount',
    percentage=None,
    fixed_amount_cents=5000,
    specific_date=None,
    applies_saturday=True,
    applies_sunday=True,
    is_active=True
)

SurchargeRule.objects.create(
    surcharge_type='geographic',
    name='CT/NJ Distance Surcharge',
    description='Additional charge for CT/NJ pickups (30+ min outside Manhattan)',
    applies_to_service_type='all',
    calculation_type='fixed_amount',
    percentage=None,
    fixed_amount_cents=22000,
    specific_date=None,
    applies_saturday=False,
    applies_sunday=False,
    is_active=True
)

SurchargeRule.objects.create(
    surcharge_type='geographic',
    name='Amagansett/Montauk Surcharge',
    description='Additional charge for Amagansett/Montauk deliveries',
    applies_to_service_type='all',
    calculation_type='fixed_amount',
    percentage=None,
    fixed_amount_cents=12000,
    specific_date=None,
    applies_saturday=False,
    applies_sunday=False,
    is_active=True
)

print("✅ Service catalog created successfully!")
print(f"📦 {MiniMovePackage.objects.count()} Mini Move Packages")
print(f"🏄 {SpecialtyItem.objects.count()} Specialty Items") 
print(f"🚚 {StandardDeliveryConfig.objects.count()} Standard Delivery Configs")
print(f"💰 {SurchargeRule.objects.count()} Surcharge Rules")
print(f"📋 {OrganizingService.objects.count()} Organizing Services (from migration)")