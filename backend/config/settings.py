import os
import sys
import environ
from pathlib import Path
from celery.schedules import crontab
import logging
import sentry_sdk
from sentry_sdk.integrations.django import DjangoIntegration
from sentry_sdk.integrations.celery import CeleryIntegration
from sentry_sdk.integrations.redis import RedisIntegration
from sentry_sdk.integrations.logging import LoggingIntegration



BASE_DIR = Path(__file__).resolve().parent.parent

env = environ.Env(
    DEBUG=(bool, False),
)

# Only load .env locally; Fly.io uses real env vars
if not os.environ.get('FLY_APP_NAME') and (BASE_DIR / '.env').exists():
    environ.Env.read_env(BASE_DIR / '.env')

SECRET_KEY = env('SECRET_KEY', default='django-insecure-change-me-in-production')
DEBUG = env('DEBUG', default=False)
FLY_APP_NAME = env('FLY_APP_NAME', default='')

SENTRY_DSN = env('SENTRY_DSN', default='')
SENTRY_ENVIRONMENT = env('SENTRY_ENVIRONMENT', default='development')
TESTING = 'test' in sys.argv or ('pytest' in sys.argv[0] if sys.argv else False)

def filter_sentry_events(event, hint):
    """Filter out certain events from being sent to Sentry"""
    if 'exc_info' in hint:
        exc_type, exc_value, tb = hint['exc_info']
        if exc_type.__name__ == 'DisallowedHost':
            return None
    
    if 'log_record' in hint:
        record = hint['log_record']
        if 'Not Found:' in record.getMessage():
            return None
    
    return event

if SENTRY_DSN and not TESTING:
    sentry_sdk.init(
        dsn=SENTRY_DSN,
        environment=SENTRY_ENVIRONMENT,
        integrations=[
            DjangoIntegration(
                transaction_style='url',
                middleware_spans=True,
                signals_spans=True,
                cache_spans=True,
            ),
            CeleryIntegration(
                monitor_beat_tasks=True,
                propagate_traces=True,
            ),
            RedisIntegration(),
            LoggingIntegration(
                level=logging.INFO,
                event_level=logging.ERROR
            ),
        ],
        traces_sample_rate=1.0 if DEBUG else 0.1,
        release=env('SENTRY_RELEASE', default=None),
        before_send=filter_sentry_events,
        attach_stacktrace=True,
        send_default_pii=False,
        max_breadcrumbs=50,
        debug=DEBUG,
    )

ALLOWED_HOSTS = env.list('ALLOWED_HOSTS', default=['localhost', '127.0.0.1', '0.0.0.0'])
if FLY_APP_NAME:
    ALLOWED_HOSTS.extend([
        f'{FLY_APP_NAME}.fly.dev',
        f'{FLY_APP_NAME}.internal',
        '.fly.dev',
    ])

DJANGO_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
]

THIRD_PARTY_APPS = [
    'rest_framework',
    'corsheaders',
    'django_celery_beat',
    'drf_yasg',
    'django_ratelimit',
]

LOCAL_APPS = [
    'apps.accounts',
    'apps.bookings',
    'apps.services',
    'apps.payments',
    'apps.logistics',
    'apps.customers',
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [{
    'BACKEND': 'django.template.backends.django.DjangoTemplates',
    'DIRS': [BASE_DIR / 'templates'],
    'APP_DIRS': True,
    'OPTIONS': {
        'context_processors': [
            'django.template.context_processors.debug',
            'django.template.context_processors.request',
            'django.contrib.auth.context_processors.auth',
            'django.contrib.messages.context_processors.messages',
        ],
    },
}]

WSGI_APPLICATION = 'config.wsgi.application'

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': env('DB_NAME', default='totetaxi'),
        'USER': env('DB_USER', default='postgres'),
        'PASSWORD': env('DB_PASSWORD', default='postgres'),
        'HOST': env('DB_HOST', default='db'),
        'PORT': env('DB_PORT', default='5432'),
    }
}
database_url = env('DATABASE_URL', default=None)
if database_url:
    import dj_database_url
    DATABASES['default'] = dj_database_url.config(
        default=database_url,
        conn_max_age=600,
        conn_health_checks=True,
    )

CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': env('REDIS_URL', default='redis://redis:6379/1'),
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
            'IGNORE_EXCEPTIONS': True,
        }
    }
}

RATELIMIT_USE_CACHE = 'default'
RATELIMIT_ENABLE = True

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'America/New_York'
USE_I18N = True
USE_TZ = True

STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_DIRS = []
if (BASE_DIR / 'static').exists():
    STATICFILES_DIRS.append(BASE_DIR / 'static')
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'apps.customers.authentication.HybridAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
        'rest_framework.renderers.BrowsableAPIRenderer',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
}

CORS_ALLOWED_ORIGINS = env.list('CORS_ALLOWED_ORIGINS', default=[
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://totetaxi.netlify.app',
])
if FLY_APP_NAME:
    CORS_ALLOWED_ORIGINS.append(f'https://{FLY_APP_NAME}.fly.dev')

CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_HEADERS = [
    'accept', 'accept-encoding', 'authorization', 'content-type', 'dnt',
    'origin', 'user-agent', 'x-csrftoken', 'x-requested-with', 'x-session-id',
]

CSRF_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_HTTPONLY = False
CSRF_COOKIE_SAMESITE = 'Lax' if DEBUG else 'None'
CSRF_TRUSTED_ORIGINS = env.list('CSRF_TRUSTED_ORIGINS', default=[
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://totetaxi.netlify.app',
])
if FLY_APP_NAME:
    CSRF_TRUSTED_ORIGINS.extend([f'https://{FLY_APP_NAME}.fly.dev'])

SESSION_COOKIE_SECURE = not DEBUG
SESSION_COOKIE_SAMESITE = 'Lax' if DEBUG else 'None'
SESSION_COOKIE_AGE = 60 * 60 * 24 * 30
SESSION_EXPIRE_AT_BROWSER_CLOSE = False
SESSION_SAVE_EVERY_REQUEST = True
SESSION_COOKIE_NAME = 'totetaxi_sessionid'
SESSION_ENGINE = 'django.contrib.sessions.backends.db'

# EMAIL — use OS env first (Fly secrets), then .env
EMAIL_BACKEND = os.environ.get('EMAIL_BACKEND') or env('EMAIL_BACKEND', default='django.core.mail.backends.console.EmailBackend')
EMAIL_HOST = os.environ.get('EMAIL_HOST') or env('EMAIL_HOST', default='localhost')
EMAIL_PORT = int(os.environ.get('EMAIL_PORT', env.int('EMAIL_PORT', default=587)))
EMAIL_USE_TLS = (os.environ.get('EMAIL_USE_TLS', '') or '').lower() in ('true', '1', 'yes') if os.environ.get('EMAIL_USE_TLS') else env.bool('EMAIL_USE_TLS', default=True)
EMAIL_HOST_USER = os.environ.get('EMAIL_HOST_USER') or env('EMAIL_HOST_USER', default='')
EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD') or env('EMAIL_HOST_PASSWORD', default='')
DEFAULT_FROM_EMAIL = os.environ.get('DEFAULT_FROM_EMAIL') or env('DEFAULT_FROM_EMAIL', default='ToteTaxi <noreply@totetaxi.com>')

# ⬇️ NEW: BCC list for booking confirmations (comma-separated env)
BOOKING_EMAIL_BCC = env.list('BOOKING_EMAIL_BCC', default=[])

# reCAPTCHA v3 settings for spam prevention
RECAPTCHA_SECRET_KEY = os.environ.get('RECAPTCHA_SECRET_KEY') or env('RECAPTCHA_SECRET_KEY', default='')

FRONTEND_URL = env('FRONTEND_URL', default='https://totetaxi.netlify.app')

CELERY_BROKER_URL = env('REDIS_URL', default='redis://redis:6379/0')
CELERY_RESULT_BACKEND = env('REDIS_URL', default='redis://redis:6379/0')
CELERY_ACCEPT_CONTENT = ['application/json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = TIME_ZONE

if not DEBUG:
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    SECURE_SSL_REDIRECT = True
    SECURE_BROWSER_XSS_FILTER = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_PRELOAD = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {'format': '{levelname} {asctime} {module} {message}', 'style': '{'},
    },
    'handlers': {'console': {'class': 'logging.StreamHandler', 'formatter': 'verbose'}},
    'root': {'handlers': ['console'], 'level': 'INFO'},
    'loggers': {
        'django': {'handlers': ['console'], 'level': env('DJANGO_LOG_LEVEL', default='INFO'), 'propagate': False},
        'django.request': {'handlers': ['console'], 'level': 'DEBUG', 'propagate': False},
        'django_ratelimit': {'handlers': ['console'], 'level': 'INFO', 'propagate': False},
    },
}

# Stripe
STRIPE_SECRET_KEY = env('STRIPE_SECRET_KEY', default='')
STRIPE_PUBLISHABLE_KEY = env('STRIPE_PUBLISHABLE_KEY', default='')
STRIPE_WEBHOOK_SECRET = env('STRIPE_WEBHOOK_SECRET', default='')

# Onfleet
ONFLEET_API_KEY = env('ONFLEET_API_KEY', default='')
ONFLEET_MOCK_MODE = env.bool('ONFLEET_MOCK_MODE', default=True)
ONFLEET_ENVIRONMENT = env('ONFLEET_ENVIRONMENT', default='sandbox')
ONFLEET_WEBHOOK_SECRET = env('ONFLEET_WEBHOOK_SECRET', default='')

BLADE_PHONE_NUMBER = env('BLADE_PHONE_NUMBER', default='+1234567890')

CELERY_BEAT_SCHEDULE = {
    'send-booking-reminders-hourly': {
        'task': 'apps.bookings.tasks.send_booking_reminders',
        'schedule': crontab(minute=0),
        'options': {'expires': 3600}
    },
}# Replace your TESTING section cache configuration with this:
# ADD THIS TO YOUR config/settings.py - COMPLETE TESTING SECTION

# ============================================================================
# TEST CONFIGURATION
# ============================================================================
# Detect if we're running tests
TESTING = 'test' in sys.argv or ('pytest' in sys.argv[0] if sys.argv else False)

if TESTING:
    # Use faster in-memory SQLite for tests
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': ':memory:',
        }
    }

    # Disable password hashing for faster tests
    PASSWORD_HASHERS = [
        'django.contrib.auth.hashers.MD5PasswordHasher',
    ]

    # Use console email backend for tests
    EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

    # Make Celery tasks run synchronously during tests
    CELERY_TASK_ALWAYS_EAGER = True
    CELERY_TASK_EAGER_PROPAGATES = True

    # Disable ratelimit logic
    RATELIMIT_ENABLE = False
    
    # Use Redis for tests (different DB number) - required by django-ratelimit
    CACHES = {
        'default': {
            'BACKEND': 'django_redis.cache.RedisCache',
            'LOCATION': env('REDIS_URL', default='redis://redis:6379/2'),  # DB 2 for tests
            'OPTIONS': {
                'CLIENT_CLASS': 'django_redis.client.DefaultClient',
                'IGNORE_EXCEPTIONS': True,
            }
        }
    }

    # ✅ Force Onfleet mock mode during tests
    ONFLEET_MOCK_MODE = True
    ONFLEET_ENVIRONMENT = 'sandbox'

    # Relax cookie security for test client
    CSRF_COOKIE_SECURE = False
    SESSION_COOKIE_SECURE = False