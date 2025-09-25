from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from apps.bookings.models import Booking, GuestCheckout
from apps.payments.models import Payment
from django.db import transaction


class Command(BaseCommand):
    help = 'Completely delete a user and all associated data for clean testing'
    
    def add_arguments(self, parser):
        parser.add_argument('email', type=str, help='Email of user to delete')
        parser.add_argument(
            '--dry-run', 
            action='store_true',
            help='Show what would be deleted without actually deleting'
        )
    
    def handle(self, *args, **options):
        email = options['email']
        dry_run = options['dry_run']
        
        if dry_run:
            self.stdout.write(self.style.WARNING(f"DRY RUN - No data will actually be deleted"))
        
        self.stdout.write(f"🔍 Searching for user: {email}")
        
        # Track what we'll delete
        deletion_summary = {
            'users': 0,
            'bookings': 0,
            'payments': 0,
            'guest_checkouts': 0,
            'saved_addresses': 0,
            'payment_methods': 0
        }
        
        with transaction.atomic():
            # Find authenticated user
            try:
                user = User.objects.get(email__iexact=email)
                self.stdout.write(f"✅ Found user: {user.get_full_name()} (ID: {user.id})")
                
                # Check profile type
                if hasattr(user, 'customer_profile'):
                    self.stdout.write("   👤 Customer Profile")
                    deletion_summary['saved_addresses'] = user.saved_addresses.count()
                    deletion_summary['payment_methods'] = user.payment_methods.count()
                
                if hasattr(user, 'staff_profile'):
                    self.stdout.write("   👮 Staff Profile")
                
                # Count bookings
                user_bookings = user.bookings.all()
                deletion_summary['bookings'] = user_bookings.count()
                
                # Count payments
                booking_ids = [str(b.id) for b in user_bookings]
                user_payments = Payment.objects.filter(booking_id__in=booking_ids)
                deletion_summary['payments'] = user_payments.count()
                
                if not dry_run:
                    # Delete user (cascades to profile, bookings, addresses, etc.)
                    user.delete()
                    deletion_summary['users'] = 1
                    self.stdout.write(self.style.SUCCESS(f"✅ Deleted authenticated user and cascaded data"))
                else:
                    self.stdout.write(f"   Would delete user and {deletion_summary['bookings']} bookings")
            
            except User.DoesNotExist:
                self.stdout.write("❌ No authenticated user found with that email")
            
            # Find guest checkout records
            guest_checkouts = GuestCheckout.objects.filter(email__iexact=email)
            deletion_summary['guest_checkouts'] = guest_checkouts.count()
            
            if guest_checkouts.exists():
                self.stdout.write(f"✅ Found {guest_checkouts.count()} guest checkout records")
                
                if not dry_run:
                    # Delete associated bookings first, then guest records
                    for guest in guest_checkouts:
                        if hasattr(guest, 'booking') and guest.booking:
                            guest.booking.delete()
                    guest_checkouts.delete()
                    self.stdout.write(self.style.SUCCESS("✅ Deleted guest checkout records"))
                else:
                    self.stdout.write(f"   Would delete {guest_checkouts.count()} guest records")
            
            # Raise exception to rollback if dry run
            if dry_run:
                self.stdout.write(self.style.WARNING("DRY RUN - Rolling back transaction"))
                raise transaction.TransactionManagementError("Dry run - rollback")
        
        # Print summary
        self.stdout.write("\n" + "="*50)
        if dry_run:
            self.stdout.write(self.style.WARNING("📋 WOULD DELETE:"))
        else:
            self.stdout.write(self.style.SUCCESS("📋 DELETED:"))
        
        self.stdout.write(f"   👤 Users: {deletion_summary['users']}")
        self.stdout.write(f"   📦 Bookings: {deletion_summary['bookings']}")  
        self.stdout.write(f"   💳 Payments: {deletion_summary['payments']}")
        self.stdout.write(f"   👻 Guest Checkouts: {deletion_summary['guest_checkouts']}")
        self.stdout.write(f"   📍 Saved Addresses: {deletion_summary['saved_addresses']}")
        self.stdout.write(f"   💰 Payment Methods: {deletion_summary['payment_methods']}")
        
        if not dry_run:
            self.stdout.write(self.style.SUCCESS(f"\n🧹 Email {email} completely cleaned from system"))
        else:
            self.stdout.write(self.style.WARNING(f"\n🔍 Run without --dry-run to actually delete"))