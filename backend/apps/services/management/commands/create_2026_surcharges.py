# backend/apps/services/management/commands/create_2026_surcharges.py
"""
Management command to create 2026 peak date surcharge rules.

Usage:
    python manage.py create_2026_surcharges
    python manage.py create_2026_surcharges --dry-run  # Preview without creating
"""
from datetime import date
from django.core.management.base import BaseCommand
from apps.services.models import SurchargeRule


class Command(BaseCommand):
    help = 'Create 2026 peak date surcharge rules for Mini Moves ($175) and Standard Delivery ($50)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Preview what would be created without actually creating',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']

        # Define the surcharge dates for 2026
        # Format: (name, specific_date OR (start_date, end_date))
        surcharge_dates = [
            ('Memorial Day', date(2026, 5, 25)),
            ('June 30th', date(2026, 6, 30)),
            ('July 1st', date(2026, 7, 1)),
            ('July 4th', date(2026, 7, 4)),
            ('July 31st', date(2026, 7, 31)),
            ('August 31st', date(2026, 8, 31)),
            ('Labor Day', date(2026, 9, 7)),
            # US Open is a date range
            ('US Open Week', (date(2026, 9, 14), date(2026, 9, 22))),
        ]

        # Service type configs: (service_type, amount_cents, name_suffix)
        service_configs = [
            ('mini_move', 17500, 'Mini Move'),      # $175
            ('standard_delivery', 5000, 'Standard Delivery'),  # $50
        ]

        created_count = 0
        skipped_count = 0

        for date_name, date_value in surcharge_dates:
            for service_type, amount_cents, service_name in service_configs:
                # Determine if it's a range or single date
                if isinstance(date_value, tuple):
                    start_date, end_date = date_value
                    specific_date = None
                    rule_name = f"{date_name} - {service_name} Surcharge"
                else:
                    start_date = None
                    end_date = None
                    specific_date = date_value
                    rule_name = f"{date_name} - {service_name} Surcharge"

                # Check if rule already exists
                exists = SurchargeRule.objects.filter(name=rule_name).exists()

                if exists:
                    self.stdout.write(
                        self.style.WARNING(f'  SKIP: "{rule_name}" already exists')
                    )
                    skipped_count += 1
                    continue

                if dry_run:
                    if start_date and end_date:
                        self.stdout.write(
                            self.style.SUCCESS(
                                f'  WOULD CREATE: "{rule_name}" - ${amount_cents/100:.0f} '
                                f'({start_date} → {end_date})'
                            )
                        )
                    else:
                        self.stdout.write(
                            self.style.SUCCESS(
                                f'  WOULD CREATE: "{rule_name}" - ${amount_cents/100:.0f} '
                                f'({specific_date})'
                            )
                        )
                else:
                    SurchargeRule.objects.create(
                        surcharge_type='peak_date',
                        name=rule_name,
                        description=f'Peak date surcharge for {date_name}',
                        applies_to_service_type=service_type,
                        calculation_type='fixed_amount',
                        fixed_amount_cents=amount_cents,
                        specific_date=specific_date,
                        start_date=start_date,
                        end_date=end_date,
                        is_active=True,
                    )
                    if start_date and end_date:
                        self.stdout.write(
                            self.style.SUCCESS(
                                f'  CREATED: "{rule_name}" - ${amount_cents/100:.0f} '
                                f'({start_date} → {end_date})'
                            )
                        )
                    else:
                        self.stdout.write(
                            self.style.SUCCESS(
                                f'  CREATED: "{rule_name}" - ${amount_cents/100:.0f} '
                                f'({specific_date})'
                            )
                        )

                created_count += 1

        self.stdout.write('')
        if dry_run:
            self.stdout.write(
                self.style.WARNING(
                    f'DRY RUN: Would create {created_count} rules, skip {skipped_count}'
                )
            )
        else:
            self.stdout.write(
                self.style.SUCCESS(
                    f'Done! Created {created_count} rules, skipped {skipped_count}'
                )
            )
