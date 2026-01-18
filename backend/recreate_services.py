from apps.services.models import *

print("🚀 Creating service catalog...")

# 1. Mini Move Packages
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

# 2. Organizing Services (CORRECT PRICING FROM MIGRATION)
print("📋 Creating Organizing Services...")

OrganizingService.objects.create(
    service_type='petite_packing',
    mini_move_tier='petite',
    name='Petite Packing',
    description='1/2 day (up to 4 hours) with 2 organizers. Includes garment bags, moving bags + additional packing supplies upon request (up to $250).',
    price_cents=244500,
    duration_hours=4,
    organizer_count=2,
    supplies_allowance_cents=25000,
    is_packing_service=True,
    is_active=True
)

OrganizingService.objects.create(
    service_type='petite_unpacking',
    mini_move_tier='petite',
    name='Petite Unpacking',
    description='1/2 day (up to 4 hours) with 2 organizers. Organizing light (no supplies).',
    price_cents=211000,
    duration_hours=4,
    organizer_count=2,
    supplies_allowance_cents=0,
    is_packing_service=False,
    is_active=True
)

OrganizingService.objects.create(
    service_type='standard_packing',
    mini_move_tier='standard',
    name='Standard Packing',
    description='1 day (up to 8 hours) with 2 organizers. Includes garment bags, moving bags + additional packing supplies upon request (up to $350).',
    price_cents=333000,
    duration_hours=8,
    organizer_count=2,
    supplies_allowance_cents=35000,
    is_packing_service=True,
    is_active=True
)

OrganizingService.objects.create(
    service_type='standard_unpacking',
    mini_move_tier='standard',
    name='Standard Unpacking',
    description='1 day (up to 8 hours) with 2 organizers. Organizing light (no supplies).',
    price_cents=288500,
    duration_hours=8,
    organizer_count=2,
    supplies_allowance_cents=0,
    is_packing_service=False,
    is_active=True
)

OrganizingService.objects.create(
    service_type='full_packing',
    mini_move_tier='full',
    name='Full Packing',
    description='1 day (up to 8 hours) with 4 organizers. Includes garment bags, moving bags + additional packing supplies upon request (up to $500).',
    price_cents=507000,
    duration_hours=8,
    organizer_count=4,
    supplies_allowance_cents=50000,
    is_packing_service=True,
    is_active=True
)

OrganizingService.objects.create(
    service_type='full_unpacking',
    mini_move_tier='full',
    name='Full Unpacking',
    description='1 day (up to 8 hours) with 4 organizers. Organizing light (no supplies).',
    price_cents=452500,
    duration_hours=8,
    organizer_count=4,
    supplies_allowance_cents=0,
    is_packing_service=False,
    is_active=True
)

# 3. Specialty Items
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

# 4. Standard Delivery Config
print("🚚 Creating Standard Delivery Config...")
StandardDeliveryConfig.objects.create(
    price_per_item_cents=9500,
    minimum_items=1,
    minimum_charge_cents=28500,
    same_day_flat_rate_cents=36000,
    max_weight_per_item_lbs=50,
    is_active=True
)

# 5. Surcharge Rules
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

print("\n✅ Service catalog created successfully!")
print(f"📦 {MiniMovePackage.objects.count()} Mini Move Packages")
print(f"📋 {OrganizingService.objects.count()} Organizing Services")
print(f"🏄 {SpecialtyItem.objects.count()} Specialty Items")
print(f"🚚 {StandardDeliveryConfig.objects.count()} Standard Delivery Config")
print(f"💰 {SurchargeRule.objects.count()} Surcharge Rules")