from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import Customer, CustomerProfile, SavedAddress, CustomerPaymentMethod

@admin.register(Customer)
class CustomerAdmin(UserAdmin):
    list_display = ('email', 'first_name', 'last_name', 'role', 'phone', 'is_active', 'created_at')
    list_filter = ('role', 'is_active', 'is_staff', 'created_at')
    search_fields = ('email', 'first_name', 'last_name', 'phone')
    ordering = ('-created_at',)
    
    # Customize the admin form for unified user model
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Personal Info', {'fields': ('first_name', 'last_name', 'phone')}),
        ('Role & Access', {'fields': ('role', 'is_active', 'is_staff', 'is_superuser')}),
        ('Customer-Specific', {
            'fields': ('stripe_customer_id',),
            'description': 'Only used for customers with role=customer'
        }),
        ('Staff-Specific', {
            'fields': ('department',),
            'description': 'Only used for users with role=staff or admin'
        }),
        ('Important Dates', {'fields': ('last_login', 'date_joined')}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'first_name', 'last_name', 'role', 'phone', 'password1', 'password2'),
        }),
    )
    
    # Custom actions
    actions = ['make_staff', 'make_customer', 'make_admin']
    
    def make_staff(self, request, queryset):
        queryset.update(role='staff', is_staff=True)
        self.message_user(request, f'Successfully made {queryset.count()} users into staff.')
    make_staff.short_description = "Convert selected users to staff"
    
    def make_customer(self, request, queryset):
        queryset.update(role='customer', is_staff=False)
        self.message_user(request, f'Successfully made {queryset.count()} users into customers.')
    make_customer.short_description = "Convert selected users to customers"
    
    def make_admin(self, request, queryset):
        queryset.update(role='admin', is_staff=True)
        self.message_user(request, f'Successfully made {queryset.count()} users into admins.')
    make_admin.short_description = "Convert selected users to admins"

@admin.register(CustomerProfile)
class CustomerProfileAdmin(admin.ModelAdmin):
    list_display = ('customer', 'total_bookings', 'total_spent_dollars', 'is_vip', 'last_booking_at')
    list_filter = ('is_vip', 'preferred_pickup_time', 'email_notifications')
    search_fields = ('customer__email', 'customer__first_name', 'customer__last_name')
    readonly_fields = ('total_bookings', 'total_spent_cents', 'last_booking_at', 'created_at', 'updated_at')
    
    fieldsets = (
        ('Customer', {
            'fields': ('customer',)
        }),
        ('Statistics', {
            'fields': ('total_bookings', 'total_spent_cents', 'last_booking_at'),
            'classes': ('collapse',)
        }),
        ('Preferences', {
            'fields': ('preferred_pickup_time', 'email_notifications', 'sms_notifications')
        }),
        ('VIP Status', {
            'fields': ('is_vip', 'notes')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )
    
    def get_queryset(self, request):
        # Only show profiles for customers, not staff
        return super().get_queryset(request).filter(customer__role='customer')

@admin.register(SavedAddress)
class SavedAddressAdmin(admin.ModelAdmin):
    list_display = ('customer', 'nickname', 'city', 'state', 'times_used', 'is_active')
    list_filter = ('state', 'is_active', 'city')
    search_fields = ('customer__email', 'nickname', 'city', 'address_line_1')
    readonly_fields = ('times_used', 'last_used_at', 'created_at', 'updated_at')
    
    fieldsets = (
        ('Customer', {
            'fields': ('customer', 'nickname')
        }),
        ('Address', {
            'fields': ('address_line_1', 'address_line_2', 'city', 'state', 'zip_code')
        }),
        ('Instructions', {
            'fields': ('delivery_instructions',)
        }),
        ('Usage Tracking', {
            'fields': ('times_used', 'last_used_at', 'is_active'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )
    
    def get_queryset(self, request):
        # Only show addresses for customers, not staff
        return super().get_queryset(request).filter(customer__role='customer')

@admin.register(CustomerPaymentMethod)
class CustomerPaymentMethodAdmin(admin.ModelAdmin):
    list_display = ('customer', 'display_name', 'is_default', 'is_active', 'created_at')
    list_filter = ('card_brand', 'is_default', 'is_active')
    search_fields = ('customer__email', 'card_last_four')
    readonly_fields = ('stripe_payment_method_id', 'created_at')
    
    fieldsets = (
        ('Customer', {
            'fields': ('customer',)
        }),
        ('Payment Method', {
            'fields': ('stripe_payment_method_id', 'card_brand', 'card_last_four', 'card_exp_month', 'card_exp_year')
        }),
        ('Settings', {
            'fields': ('is_default', 'is_active')
        }),
        ('Timestamps', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        })
    )
    
    def get_queryset(self, request):
        # Only show payment methods for customers, not staff
        return super().get_queryset(request).filter(customer__role='customer')