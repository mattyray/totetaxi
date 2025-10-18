# Generated manually to handle ManyToMany to Through conversion
from django.db import migrations, models
import django.db.models.deletion


def migrate_existing_specialty_items(apps, schema_editor):
    """Migrate existing specialty items to use quantities (default = 1)"""
    Booking = apps.get_model('bookings', 'Booking')
    BookingSpecialtyItem = apps.get_model('bookings', 'BookingSpecialtyItem')
    
    # Get the old M2M table name
    db_alias = schema_editor.connection.alias
    
    # For each booking with specialty items, create BookingSpecialtyItem records
    for booking in Booking.objects.using(db_alias).prefetch_related('specialty_items').all():
        for item in booking.specialty_items.all():
            BookingSpecialtyItem.objects.using(db_alias).create(
                booking=booking,
                specialty_item=item,
                quantity=1  # Default quantity for existing items
            )


class Migration(migrations.Migration):

    dependencies = [
        ('bookings', '0006_booking_blade_airport_booking_blade_bag_count_and_more'),
        ('services', '0006_remove_specialtyitem_requires_van_schedule'),
    ]

    operations = [
        # Step 1: Create the through model
        migrations.CreateModel(
            name='BookingSpecialtyItem',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('quantity', models.PositiveIntegerField(default=1)),
                ('booking', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='bookings.booking')),
                ('specialty_item', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, to='services.specialtyitem')),
            ],
            options={
                'db_table': 'bookings_booking_specialty_item',
                'ordering': ['specialty_item__name'],
                'unique_together': {('booking', 'specialty_item')},
            },
        ),
        
        # Step 2: Migrate existing data
        migrations.RunPython(
            code=migrate_existing_specialty_items,
            reverse_code=migrations.RunPython.noop,
        ),
        
        # Step 3: Remove old M2M field
        migrations.RemoveField(
            model_name='booking',
            name='specialty_items',
        ),
        
        # Step 4: Add new M2M field with through model
        migrations.AddField(
            model_name='booking',
            name='specialty_items',
            field=models.ManyToManyField(
                blank=True,
                help_text='Selected specialty items with quantities',
                through='bookings.BookingSpecialtyItem',
                to='services.specialtyitem'
            ),
        ),
    ]