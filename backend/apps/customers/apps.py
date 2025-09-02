# apps/customers/apps.py
from django.apps import AppConfig

class CustomersConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.customers'  # Change this from 'customers' to 'apps.customers'