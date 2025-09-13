# apps/logistics/models.py
import uuid
from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import date


class Worker(models.Model):
    """Onfleet drivers/workers - mirrors your existing profile patterns"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    onfleet_id = models.CharField(max_length=100, unique=True, null=True, blank=True)
    
    # Worker info
    name = models.CharField(max_length=200)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=20, blank=True)
    
    # Status tracking - follows your status pattern from Booking model
    status = models.CharField(max_length=20, choices=[
        ('available', 'Available'),
        ('assigned', 'Assigned'),
        ('off_duty', 'Off Duty'),
        ('inactive', 'Inactive')
    ], default='available')
    
    # Capacity info
    max_tasks_per_day = models.PositiveIntegerField(default=8)
    vehicle_assigned = models.ForeignKey('Vehicle', on_delete=models.SET_NULL, null=True, blank=True)
    
    # Timestamps - following your exact pattern
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_seen = models.DateTimeField(null=True, blank=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'logistics_worker'
        verbose_name = 'Worker'
        verbose_name_plural = 'Workers'
    
    def __str__(self):
        return f"{self.name} ({self.status})"
    
    @property
    def is_available_today(self):
        """Check if worker is available for new tasks today"""
        if self.status != 'available':
            return False
        
        # Count today's active tasks
        today_tasks = self.onfleet_tasks.filter(
            created_at__date=date.today(),
            status__in=['created', 'assigned', 'active']
        ).count()
        
        return today_tasks < self.max_tasks_per_day


class Vehicle(models.Model):
    """Company vehicles/vans - follows your model patterns"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Vehicle info
    name = models.CharField(max_length=100)  # "Van #1", "Truck A"
    license_plate = models.CharField(max_length=20, blank=True)
    vehicle_type = models.CharField(max_length=50, choices=[
        ('van', 'Van'),
        ('truck', 'Truck'),
        ('car', 'Car')
    ], default='van')
    
    # Status - consistent with your other status fields
    status = models.CharField(max_length=20, choices=[
        ('available', 'Available'),
        ('in_use', 'In Use'),
        ('maintenance', 'Maintenance'),
        ('inactive', 'Inactive')
    ], default='available')
    
    # Capacity
    max_capacity = models.PositiveIntegerField(default=10, help_text="Max bookings per day")
    
    # Maintenance tracking
    last_service = models.DateField(null=True, blank=True)
    next_service_due = models.DateField(null=True, blank=True)
    
    # Standard timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'logistics_vehicle'
        verbose_name = 'Vehicle'
        verbose_name_plural = 'Vehicles'
    
    def __str__(self):
        return f"{self.name} ({self.status})"
    
    @property 
    def is_available_today(self):
        """Check if vehicle is available for new bookings today"""
        if self.status != 'available':
            return False
        
        # Count today's active tasks using this vehicle
        today_tasks = self.onfleet_tasks.filter(
            created_at__date=date.today(),
            status__in=['created', 'assigned', 'active']
        ).count()
        
        return today_tasks < self.max_capacity


class OnfleetTask(models.Model):
    """Links ToteTaxi bookings to Onfleet tasks - follows your relationship patterns"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Relationships - consistent with your ForeignKey patterns
    booking = models.OneToOneField(
        'bookings.Booking', 
        on_delete=models.CASCADE, 
        related_name='onfleet_task'
    )
    worker = models.ForeignKey(Worker, on_delete=models.SET_NULL, null=True, blank=True, related_name='onfleet_tasks')
    vehicle = models.ForeignKey(Vehicle, on_delete=models.SET_NULL, null=True, blank=True, related_name='onfleet_tasks')
    
    # Onfleet data
    onfleet_task_id = models.CharField(max_length=100, unique=True)
    onfleet_short_id = models.CharField(max_length=20, blank=True)  # For tracking URLs
    
    # Status tracking - mirrors your Booking status pattern  
    status = models.CharField(max_length=20, choices=[
        ('created', 'Created'),
        ('assigned', 'Assigned'),
        ('active', 'Active'),
        ('completed', 'Completed'),
        ('failed', 'Failed')
    ], default='created')
    
    # Timing - consistent with your timestamp approach
    assigned_at = models.DateTimeField(null=True, blank=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    estimated_completion = models.DateTimeField(null=True, blank=True)
    
    # Location tracking - using JSONField like your existing models
    current_location = models.JSONField(null=True, blank=True)
    tracking_url = models.URLField(blank=True)
    
    # Standard timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'logistics_onfleet_task'
        verbose_name = 'Onfleet Task'
        verbose_name_plural = 'Onfleet Tasks'
    
    def __str__(self):
        return f"Task {self.onfleet_short_id} - {self.booking.booking_number}"
    
    @property
    def duration_minutes(self):
        """Calculate task duration if completed"""
        if self.started_at and self.completed_at:
            duration = self.completed_at - self.started_at
            return int(duration.total_seconds() / 60)
        return None


class DailyCapacity(models.Model):
    """Daily capacity calculation - follows your business logic patterns"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    date = models.DateField(unique=True)
    
    # Calculated capacity
    available_workers = models.PositiveIntegerField(default=0)
    available_vehicles = models.PositiveIntegerField(default=0)
    total_capacity = models.PositiveIntegerField(default=0)
    booked_capacity = models.PositiveIntegerField(default=0)
    
    # Onfleet sync tracking
    last_synced = models.DateTimeField(null=True, blank=True)
    sync_source = models.CharField(max_length=20, choices=[
        ('manual', 'Manual'),
        ('onfleet', 'Onfleet'),
        ('calculated', 'Calculated')
    ], default='calculated')
    
    # Standard timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'logistics_daily_capacity'
        verbose_name = 'Daily Capacity'
        verbose_name_plural = 'Daily Capacities'
        ordering = ['-date']
    
    def __str__(self):
        return f"Capacity for {self.date}: {self.booked_capacity}/{self.total_capacity}"
    
    def calculate_capacity(self):
        """Calculate total capacity from available resources"""
        self.available_workers = Worker.objects.filter(status='available', deleted_at__isnull=True).count()
        self.available_vehicles = Vehicle.objects.filter(status='available', deleted_at__isnull=True).count()
        
        # Business logic: capacity = min(workers * 8 tasks, vehicles * 10 tasks)
        self.total_capacity = min(self.available_workers * 8, self.available_vehicles * 10)
        
        # Count actual bookings for this date
        from apps.bookings.models import Booking
        self.booked_capacity = Booking.objects.filter(
            pickup_date=self.date,
            deleted_at__isnull=True,
            status__in=['pending', 'confirmed', 'paid', 'in_progress']
        ).count()
        
        self.last_synced = timezone.now()
        self.save()
        
        return self
    
    @property
    def utilization_percentage(self):
        """Calculate utilization rate"""
        if self.total_capacity == 0:
            return 0
        return min(100, round((self.booked_capacity / self.total_capacity) * 100, 1))
    
    @property
    def remaining_capacity(self):
        """Calculate remaining capacity"""
        return max(0, self.total_capacity - self.booked_capacity)