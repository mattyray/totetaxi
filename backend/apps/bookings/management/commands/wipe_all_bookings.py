from django.core.management.base import BaseCommand
from django.db import transaction
from django.contrib.auth.models import User
from apps.bookings.models import Booking, Address, GuestCheckout
from apps.payments.models import Payment, Refund, PaymentAudit
from apps.logistics.models import OnfleetTask
from apps.customers.models import CustomerProfile

class Command(BaseCommand):
    help = 'PRODUCTION: Wipe ALL bookings (customer + guest) and related data'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be deleted without actually deleting'
        )
        parser.add_argument(
            '--yes-i-am-sure',
            action='store_true',
            help='Required confirmation flag for production deletion'
        )
        parser.add_argument(
            '--keep-addresses',
            action='store_true',
            help='Keep Address records (only delete bookings/payments)'
        )
    
    def handle(self, *args, **options):
        dry_run = options['dry_run']
        confirmed = options['yes_i_am_sure']
        keep_addresses = options['keep_addresses']
        
        # Safety check
        if not confirmed and not dry_run:
            self.stdout.write(
                self.style.ERROR(
                    '\n❌ SAFETY CHECK FAILED\n'
                    'You must pass --yes-i-am-sure to delete production data\n'
                    'Example: python manage.py wipe_all_bookings --yes-i-am-sure\n'
                )
            )
            return
        
        # Display current counts
        self.stdout.write(self.style.WARNING('\n' + '='*60))
        self.stdout.write(self.style.WARNING('  PRODUCTION DATABASE WIPE - CURRENT STATE'))
        self.stdout.write(self.style.WARNING('='*60))
        
        counts = self._get_current_counts()
        self._display_counts(counts)
        
        # Display what will happen
        self.stdout.write('\n' + '='*60)
        self.stdout.write(self.style.WARNING('  DELETION PLAN'))
        self.stdout.write('='*60)
        self.stdout.write('\n📋 Order of deletion (respects PROTECT relationships):')
        self.stdout.write('   1. ❌ Payment Audits')
        self.stdout.write('   2. ❌ Refunds (PROTECT on Payment)')
        self.stdout.write('   3. ❌ Payments (PROTECT on Booking)')
        self.stdout.write('   4. ❌ Bookings (CASCADE to OnfleetTask, GuestCheckout)')
        if not keep_addresses:
            self.stdout.write('   5. ❌ Addresses')
        else:
            self.stdout.write('   5. ✅ Addresses (keeping per --keep-addresses)')
        self.stdout.write('\n✅ User accounts will be PRESERVED')
        self.stdout.write('✅ CustomerProfiles will be PRESERVED (stats will reset)')
        self.stdout.write('✅ Service catalog will be PRESERVED\n')
        
        if dry_run:
            self.stdout.write(
                self.style.WARNING('\n🔍 DRY RUN MODE - No data will be deleted\n')
            )
            return
        
        # Confirm one more time
        self.stdout.write(
            self.style.ERROR(
                f'\n⚠️  FINAL WARNING: About to delete {counts["bookings"]} bookings '
                f'and {counts["payments"]} payments from PRODUCTION!\n'
            )
        )
        
        # Perform deletion
        self.stdout.write(self.style.WARNING('\n🗑️  Starting deletion process...\n'))
        
        deleted_counts = {}
        
        try:
            with transaction.atomic():
                # Step 1: Delete PaymentAudits (no PROTECT, just CASCADE)
                deleted_counts['payment_audits'], _ = PaymentAudit.objects.all().delete()
                self.stdout.write(
                    self.style.SUCCESS(f'   ✅ Deleted {deleted_counts["payment_audits"]} payment audit records')
                )
                
                # Step 2: Delete Refunds (PROTECT on Payment, must go first)
                deleted_counts['refunds'], _ = Refund.objects.all().delete()
                self.stdout.write(
                    self.style.SUCCESS(f'   ✅ Deleted {deleted_counts["refunds"]} refunds')
                )
                
                # Step 3: Delete Payments (PROTECT on Booking, must go second)
                deleted_counts['payments'], _ = Payment.objects.all().delete()
                self.stdout.write(
                    self.style.SUCCESS(f'   ✅ Deleted {deleted_counts["payments"]} payments')
                )
                
                # Step 4: Delete Bookings (CASCADE deletes OnfleetTask + GuestCheckout)
                deleted_counts['bookings'], _ = Booking.objects.all().delete()
                self.stdout.write(
                    self.style.SUCCESS(
                        f'   ✅ Deleted {deleted_counts["bookings"]} bookings '
                        f'(auto-deleted OnfleetTasks + GuestCheckouts via CASCADE)'
                    )
                )
                
                # Step 5: Optionally delete Addresses
                if not keep_addresses:
                    deleted_counts['addresses'], _ = Address.objects.all().delete()
                    self.stdout.write(
                        self.style.SUCCESS(f'   ✅ Deleted {deleted_counts["addresses"]} addresses')
                    )
                else:
                    deleted_counts['addresses'] = 0
                    self.stdout.write(
                        self.style.WARNING(f'   ⏭️  Kept {counts["addresses"]} addresses (--keep-addresses flag)')
                    )
            
            # Success!
            self.stdout.write('\n' + '='*60)
            self.stdout.write(self.style.SUCCESS('  ✅ DELETION COMPLETED SUCCESSFULLY'))
            self.stdout.write('='*60)
            self._display_deleted_summary(deleted_counts, counts)
            
            # Reset customer stats
            self.stdout.write('\n📊 Resetting customer booking statistics...')
            reset_count = self._reset_customer_stats()
            self.stdout.write(
                self.style.SUCCESS(f'   ✅ Reset stats for {reset_count} customers\n')
            )
            
            # Final verification
            self.stdout.write('🔍 Verifying deletion...')
            final_counts = self._get_current_counts()
            if final_counts['bookings'] == 0 and final_counts['payments'] == 0:
                self.stdout.write(self.style.SUCCESS('   ✅ All bookings and payments removed'))
            else:
                self.stdout.write(
                    self.style.ERROR(
                        f'   ⚠️  Warning: {final_counts["bookings"]} bookings, '
                        f'{final_counts["payments"]} payments still remain'
                    )
                )
            
            self.stdout.write('\n' + '='*60)
            self.stdout.write(self.style.SUCCESS('  🎉 DATABASE WIPE COMPLETE'))
            self.stdout.write('='*60 + '\n')
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'\n❌ ERROR during deletion: {str(e)}\n')
            )
            raise
    
    def _get_current_counts(self):
        """Get current record counts"""
        return {
            'payment_audits': PaymentAudit.objects.count(),
            'refunds': Refund.objects.count(),
            'payments': Payment.objects.count(),
            'bookings': Booking.objects.count(),
            'customer_bookings': Booking.objects.filter(customer__isnull=False).count(),
            'guest_bookings': Booking.objects.filter(guest_checkout__isnull=False).count(),
            'onfleet_tasks': OnfleetTask.objects.count(),
            'guest_checkouts': GuestCheckout.objects.count(),
            'addresses': Address.objects.count(),
            'users': User.objects.count(),
            'customer_profiles': CustomerProfile.objects.count(),
        }
    
    def _display_counts(self, counts):
        """Display current database state"""
        self.stdout.write('\n📊 Current Database State:')
        self.stdout.write(f'   🗑️  TO DELETE:')
        self.stdout.write(f'      • Bookings: {counts["bookings"]} total')
        self.stdout.write(f'        ├─ Customer bookings: {counts["customer_bookings"]}')
        self.stdout.write(f'        └─ Guest bookings: {counts["guest_bookings"]}')
        self.stdout.write(f'      • Payments: {counts["payments"]}')
        self.stdout.write(f'      • Refunds: {counts["refunds"]}')
        self.stdout.write(f'      • Payment Audits: {counts["payment_audits"]}')
        self.stdout.write(f'      • OnfleetTasks: {counts["onfleet_tasks"]} (CASCADE)')
        self.stdout.write(f'      • GuestCheckouts: {counts["guest_checkouts"]} (CASCADE)')
        self.stdout.write(f'      • Addresses: {counts["addresses"]}')
        
        self.stdout.write(f'\n   ✅ WILL PRESERVE:')
        self.stdout.write(f'      • User accounts: {counts["users"]}')
        self.stdout.write(f'      • Customer profiles: {counts["customer_profiles"]}')
        self.stdout.write(f'      • Service catalog (MiniMovePackages, SpecialtyItems, etc.)')
    
    def _display_deleted_summary(self, deleted, original):
        """Display deletion summary"""
        self.stdout.write('\n📋 Deletion Summary:')
        self.stdout.write(f'   ❌ Payment Audits: {deleted["payment_audits"]}/{original["payment_audits"]}')
        self.stdout.write(f'   ❌ Refunds: {deleted["refunds"]}/{original["refunds"]}')
        self.stdout.write(f'   ❌ Payments: {deleted["payments"]}/{original["payments"]}')
        self.stdout.write(f'   ❌ Bookings: {deleted["bookings"]}/{original["bookings"]}')
        self.stdout.write(f'      ├─ Customer bookings: {original["customer_bookings"]}')
        self.stdout.write(f'      └─ Guest bookings: {original["guest_bookings"]}')
        self.stdout.write(f'   ❌ OnfleetTasks: {original["onfleet_tasks"]} (auto-deleted via CASCADE)')
        self.stdout.write(f'   ❌ GuestCheckouts: {original["guest_checkouts"]} (auto-deleted via CASCADE)')
        if deleted.get('addresses', 0) > 0:
            self.stdout.write(f'   ❌ Addresses: {deleted["addresses"]}/{original["addresses"]}')
        
        self.stdout.write(f'\n   ✅ Users preserved: {original["users"]}')
        self.stdout.write(f'   ✅ Customer profiles preserved: {original["customer_profiles"]}')
    
    def _reset_customer_stats(self):
        """Reset customer booking statistics to zero"""
        reset_count = 0
        for profile in CustomerProfile.objects.all():
            profile.total_bookings = 0
            profile.total_spent_cents = 0
            profile.last_booking_at = None
            profile.save()
            reset_count += 1
        return reset_count