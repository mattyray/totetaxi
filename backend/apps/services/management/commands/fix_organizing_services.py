from django.core.management.base import BaseCommand
from django.db import transaction
from apps.services.models import OrganizingService

class Command(BaseCommand):
    help = 'Create missing organizing services for full tier (Production Safe)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be created without making changes',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        
        if dry_run:
            self.stdout.write(self.style.WARNING("DRY RUN MODE - No changes will be made"))
        
        # Check current state
        existing = list(OrganizingService.objects.values_list('service_type', 'mini_move_tier'))
        self.stdout.write(f"Current services: {existing}")
        
        # Define required services
        required_services = [
            {
                'service_type': 'full_packing',
                'mini_move_tier': 'full',
                'name': 'Full Packing',
                'description': '1 day (up to 8 hours) with 4 organizers. Includes garment bags, moving bags + additional packing supplies upon request (up to $500).',
                'price_cents': 507000,
                'duration_hours': 8,
                'organizer_count': 4,
                'supplies_allowance_cents': 50000,
                'is_packing_service': True,
                'is_active': True,
            },
            {
                'service_type': 'full_unpacking',
                'mini_move_tier': 'full', 
                'name': 'Full Unpacking',
                'description': '1 day (up to 8 hours) with 4 organizers. Organizing light (no supplies).',
                'price_cents': 453000,
                'duration_hours': 8,
                'organizer_count': 4,
                'supplies_allowance_cents': 0,
                'is_packing_service': False,
                'is_active': True,
            },
        ]
        
        # Check what needs to be created
        to_create = []
        for service_data in required_services:
            exists = OrganizingService.objects.filter(
                service_type=service_data['service_type']
            ).exists()
            
            if not exists:
                to_create.append(service_data)
                self.stdout.write(f"WILL CREATE: {service_data['name']}")
            else:
                self.stdout.write(f"EXISTS: {service_data['name']}")
        
        if not to_create:
            self.stdout.write(self.style.SUCCESS("All organizing services already exist"))
            return
        
        if dry_run:
            self.stdout.write(f"Would create {len(to_create)} services")
            return
        
        # Production safety: Use transaction
        try:
            with transaction.atomic():
                created_count = 0
                for service_data in to_create:
                    service = OrganizingService.objects.create(**service_data)
                    created_count += 1
                    self.stdout.write(
                        self.style.SUCCESS(f"CREATED: {service.name} (${service.price_cents/100})")
                    )
                
                self.stdout.write(
                    self.style.SUCCESS(f"Successfully created {created_count} organizing services")
                )
                
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f"ERROR: Failed to create services: {str(e)}")
            )
            raise
        
        # Verification
        self.stdout.write("\nVerification:")
        for tier in ['petite', 'standard', 'full']:
            packing = OrganizingService.objects.filter(
                mini_move_tier=tier, is_packing_service=True, is_active=True
            ).exists()
            unpacking = OrganizingService.objects.filter(
                mini_move_tier=tier, is_packing_service=False, is_active=True
            ).exists()
            
            status = "✓" if (packing and unpacking) else "✗"
            self.stdout.write(f"{status} {tier.title()}: Packing={packing}, Unpacking={unpacking}")