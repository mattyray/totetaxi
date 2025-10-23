from django.apps import AppConfig


class BookingsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.bookings'

    def ready(self):
        # Ensure signal handlers are registered
        import apps.bookings.signals  # noqa: F401
