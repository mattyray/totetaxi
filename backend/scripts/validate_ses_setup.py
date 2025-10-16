# backend/scripts/validate_ses_setup.py
"""
Validate SES setup for production
Run locally: docker-compose exec web python manage.py shell < scripts/validate_ses_setup.py
Run on Fly.io: fly ssh console -a totetaxi-backend -C "python manage.py shell < scripts/validate_ses_setup.py"
"""
import sys
from django.core.mail import send_mail
from django.conf import settings

print("🔍 Validating SES Configuration...")
print(f"EMAIL_BACKEND: {settings.EMAIL_BACKEND}")
print(f"EMAIL_HOST: {settings.EMAIL_HOST}")
print(f"EMAIL_PORT: {settings.EMAIL_PORT}")
print(f"EMAIL_USE_TLS: {settings.EMAIL_USE_TLS}")
print(f"DEFAULT_FROM_EMAIL: {settings.DEFAULT_FROM_EMAIL}")

# Check if using SES in production
if 'ses' not in settings.EMAIL_BACKEND.lower() and not settings.DEBUG:
    print("⚠️  WARNING: Not using SES backend in production!")
    print(f"Current backend: {settings.EMAIL_BACKEND}")
    sys.exit(1)

# In local dev, skip SES validation
if settings.DEBUG and 'console' in settings.EMAIL_BACKEND.lower():
    print("ℹ️  Running in DEBUG mode with console backend - SES validation skipped")
    print("✅ Email configuration is correct for local development")
    sys.exit(0)

print("\n📧 Sending test email to mnraynor90@gmail.com...")
try:
    send_mail(
        subject='ToteTaxi SES Test - Production Email Validation',
        message='''This is a test email from ToteTaxi to validate SES setup.

If you received this email, your SES configuration is working correctly!

Test Details:
- Backend: {backend}
- From: {from_email}
- Host: {host}
- Port: {port}

Next steps:
1. Check AWS SES dashboard for delivery metrics
2. Verify email templates are rendering correctly
3. Test all email types (welcome, verification, password reset, bookings)

ToteTaxi Backend Team
'''.format(
            backend=settings.EMAIL_BACKEND,
            from_email=settings.DEFAULT_FROM_EMAIL,
            host=settings.EMAIL_HOST,
            port=settings.EMAIL_PORT
        ),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=['mnraynor90@gmail.com'],
        fail_silently=False,
    )
    print("✅ Test email sent successfully!")
    print("📬 Check mnraynor90@gmail.com inbox to confirm delivery.")
    print("\n✨ SES validation complete!")
except Exception as e:
    print(f"❌ Failed to send email: {e}")
    print("\nTroubleshooting steps:")
    print("1. Verify SES sender identity is verified in AWS console")
    print("2. Check AWS credentials (ACCESS_KEY_ID and SECRET_ACCESS_KEY)")
    print("3. Confirm DEFAULT_FROM_EMAIL matches verified identity")
    print("4. Check SES is out of sandbox mode (or recipient is verified)")
    print("5. Review CloudWatch logs for detailed error messages")
    sys.exit(1)