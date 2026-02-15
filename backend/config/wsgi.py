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

# Increase recursion limit for gevent workers. The LangSmith SDK's
# serializer recurses through nested AIMessage content blocks from
# ChatAnthropic; the default limit (1000) is too shallow under gevent's
# smaller greenlet stacks with stream_mode="updates".
sys.setrecursionlimit(3000)

application = get_wsgi_application()
