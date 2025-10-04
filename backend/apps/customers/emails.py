# backend/apps/customers/emails.py
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

def send_welcome_email(user):
    """Send welcome email to newly registered customer"""
    try:
        subject = 'Welcome to ToteTaxi!'
        context = {
            'user_name': user.get_full_name() or user.email,
            'email': user.email,
        }
        message = render_to_string('emails/welcome.txt', context)
        
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
        )
        logger.info(f'Welcome email sent to {user.email}')
        return True
    except Exception as e:
        logger.error(f'Failed to send welcome email to {user.email}: {str(e)}')
        return False


def send_password_reset_email(user, reset_token, reset_url):
    """Send password reset email"""
    try:
        subject = 'Reset Your ToteTaxi Password'
        context = {
            'user_name': user.get_full_name() or user.email,
            'reset_url': reset_url,
            'reset_token': reset_token,
        }
        message = render_to_string('emails/password_reset.txt', context)
        
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
        )
        logger.info(f'Password reset email sent to {user.email}')
        return True
    except Exception as e:
        logger.error(f'Failed to send password reset email to {user.email}: {str(e)}')
        return False


def send_booking_confirmation_email(booking):
    """Send booking confirmation email"""
    try:
        subject = f'Booking Confirmation - {booking.booking_number}'
        context = {
            'booking': booking,
            'customer_name': booking.get_customer_name(),
            'customer_email': booking.get_customer_email(),
        }
        message = render_to_string('emails/booking_confirmation.txt', context)
        
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[booking.get_customer_email()],
            fail_silently=False,
        )
        logger.info(f'Booking confirmation sent for {booking.booking_number}')
        return True
    except Exception as e:
        logger.error(f'Failed to send booking confirmation for {booking.booking_number}: {str(e)}')
        return False


def send_booking_status_update_email(booking, old_status, new_status):
    """Send email when booking status changes"""
    try:
        subject = f'Booking Update - {booking.booking_number}'
        context = {
            'booking': booking,
            'customer_name': booking.get_customer_name(),
            'old_status': old_status,
            'new_status': new_status,
        }
        message = render_to_string('emails/booking_status_update.txt', context)
        
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[booking.get_customer_email()],
            fail_silently=False,
        )
        logger.info(f'Status update email sent for {booking.booking_number}')
        return True
    except Exception as e:
        logger.error(f'Failed to send status update for {booking.booking_number}: {str(e)}')
        return False
    
def send_email_verification(user, token, verify_url):
    """Send email verification link"""
    try:
        subject = 'Verify Your ToteTaxi Account'
        context = {
            'user_name': user.get_full_name() or user.email,
            'verify_url': verify_url,
        }
        message = render_to_string('emails/email_verification.txt', context)
        
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
        )
        logger.info(f'Verification email sent to {user.email}')
        return True
    except Exception as e:
        logger.error(f'Failed to send verification email to {user.email}: {str(e)}')
        return False