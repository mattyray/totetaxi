import logging
from django.conf import settings
from django.core.mail import send_mail, EmailMessage
from django.template.loader import render_to_string
from django.utils import timezone

logger = logging.getLogger(__name__)


def send_welcome_email(user):
    """Send welcome email to newly registered customer"""
    try:
        subject = 'Welcome to Tote Taxi!'
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
        logger.error(f'Failed to send welcome email to {user.email}: {str(e)}', exc_info=True)
        return False


def send_password_reset_email(user, reset_token, reset_url):
    """Send password reset email"""
    try:
        subject = 'Reset Your Tote Taxi Password'
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
        logger.error(f'Failed to send password reset email to {user.email}: {str(e)}', exc_info=True)
        return False


def send_booking_confirmation_email(booking):
    """
    Send booking confirmation email:
    - To: customer
    - BCC: internal list (BOOKING_EMAIL_BCC)
    """
    try:
        subject = f'Booking Confirmation - {booking.booking_number}'
        context = {
            'booking': booking,
            'customer_name': booking.get_customer_name(),
            'customer_email': booking.get_customer_email(),
        }
        message = render_to_string('emails/booking_confirmation.txt', context)

        to_addr = [booking.get_customer_email()]
        bcc_list = getattr(settings, 'BOOKING_EMAIL_BCC', [])

        email = EmailMessage(
            subject=subject,
            body=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=to_addr,
            bcc=bcc_list,
        )
        email.content_subtype = 'plain'
        email.send(fail_silently=False)

        logger.info(
            f'Booking confirmation sent for {booking.booking_number} '
            f"(bcc={','.join(bcc_list) if bcc_list else 'none'})"
        )
        return True
    except Exception as e:
        logger.error(
            f'Failed to send booking confirmation for {booking.booking_number}: {str(e)}',
            exc_info=True
        )
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
        logger.error(f'Failed to send status update for {booking.booking_number}: {str(e)}', exc_info=True)
        return False


def send_email_verification(user, token, verify_url):
    """Send email verification link"""
    try:
        subject = 'Verify Your Tote Taxi Account'
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
        logger.error(f'Failed to send verification email to {user.email}: {str(e)}', exc_info=True)
        return False


def send_booking_reminder_email(booking):
    """Send 24-hour reminder email before pickup"""
    try:
        # Already sent?
        if booking.reminder_sent_at:
            logger.info(f'Reminder already sent for {booking.booking_number} at {booking.reminder_sent_at}')
            return False

        # Tracking if available
        has_tracking = False
        tracking_url = ''
        if hasattr(booking, 'onfleet_tasks'):
            pickup_task = booking.onfleet_tasks.filter(task_type='pickup').first()
            if pickup_task and pickup_task.tracking_url:
                has_tracking = True
                tracking_url = pickup_task.tracking_url

        subject = f'Reminder: Your Tote Taxi Pickup is Tomorrow! - {booking.booking_number}'
        context = {
            'booking': booking,
            'customer_name': booking.get_customer_name(),
            'has_tracking': has_tracking,
            'tracking_url': tracking_url,
        }
        message = render_to_string('emails/booking_reminder.txt', context)

        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[booking.get_customer_email()],
            fail_silently=False,
        )

        booking.reminder_sent_at = timezone.now()
        booking.save(update_fields=['reminder_sent_at'])

        logger.info(f'✓ Reminder email sent for {booking.booking_number}')
        return True

    except Exception as e:
        logger.error(f'Failed to send reminder for {booking.booking_number}: {str(e)}', exc_info=True)
        return False
