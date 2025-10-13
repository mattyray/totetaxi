# backend/apps/bookings/apps.py
from django.apps import AppConfig

class BookingsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.bookings'

    def ready(self):
        """
        Import signals when Django starts
        This makes sure signals are registered
        """
        import apps.bookings.signals