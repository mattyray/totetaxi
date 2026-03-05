from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('bookings', '0011_booking_item_description'),
    ]

    operations = [
        migrations.AddField(
            model_name='booking',
            name='created_by_staff',
            field=models.ForeignKey(
                blank=True,
                help_text='Staff member who created this booking on behalf of a customer',
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='staff_created_bookings',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddField(
            model_name='booking',
            name='custom_total_override_cents',
            field=models.PositiveBigIntegerField(
                blank=True,
                help_text='Staff-set custom price override (in cents). Replaces auto-calculated total.',
                null=True,
            ),
        ),
    ]
