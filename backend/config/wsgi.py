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

# Increase recursion limit for gevent workers. Gevent monkey-patches SSL
# after some libraries (urllib3, botocore, anyio) have already imported it,
# causing deep recursion in HTTPS calls. Affects both LangSmith trace
# uploads and Onfleet API task creation. 10000 is safely above the ~4000
# frames observed in practice.
sys.setrecursionlimit(10000)

application = get_wsgi_application()
