"""
WSGI config for config project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.2/howto/deployment/wsgi/
"""

import os
import sys

from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

# Moderate bump from default 1000 as safety net for gevent greenlet stacks.
# The real fix is preload_app=False in gunicorn.conf.py (ensures SSL is
# imported after monkey-patching), but this provides extra headroom.
sys.setrecursionlimit(3000)

application = get_wsgi_application()
