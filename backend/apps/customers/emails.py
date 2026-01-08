import logging
from datetime import timedelta
from django.conf import settings
from django.core.mail import send_mail, EmailMessage
from django.template.loader import render_to_string
from django.utils import timezone

logger = logging.getLogger(__name__)

# Google review URL for Tote Taxi Southampton
GOOGLE_REVIEW_URL = 'https://search.google.com/local/writereview?placeid=ChIJK7UwwRDB0UIRP6hrsPW6ZMk'


def generate_ics_calendar_invite(booking):
    """Generate an .ics calendar file for the booking pickup"""
    # Get pickup datetime
    pickup_dt = booking.pickup_datetime
    if not pickup_dt:
        return None

    # Event duration: 30 minutes
    end_dt = pickup_dt + timedelta(minutes=30)

    # Format dates for ICS (UTC format)
    def format_ics_date(dt):
        # Convert to UTC if timezone-aware
        if timezone.is_aware(dt):
            dt = dt.astimezone(timezone.utc)
        return dt.strftime('%Y%m%dT%H%M%SZ')

    start_str = format_ics_date(pickup_dt)
    end_str = format_ics_date(end_dt)
    now_str = format_ics_date(timezone.now())

    # Build location string
    pickup_address = booking.pickup_address_line1 or ''
    if booking.pickup_city:
        pickup_address += f', {booking.pickup_city}'
    if booking.pickup_state:
        pickup_address += f', {booking.pickup_state}'
    if booking.pickup_zip:
        pickup_address += f' {booking.pickup_zip}'

    # Build description
    description = f'Tote Taxi Pickup\\n\\nBooking: {booking.booking_number}\\n'
    if booking.delivery_address_line1:
        description += f'Delivery to: {booking.delivery_address_line1}'
        if booking.delivery_city:
            description += f', {booking.delivery_city}'
        description += '\\n'
    description += '\\nQuestions? Call (631) 595-5100 or email info@totetaxi.com'

    # Generate unique ID for the event
    uid = f'{booking.booking_number}@totetaxi.com'

    ics_content = f"""BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Tote Taxi//Booking System//EN
CALSCALE:GREGORIAN
METHOD:REQUEST
BEGIN:VEVENT
UID:{uid}
DTSTAMP:{now_str}
DTSTART:{start_str}
DTEND:{end_str}
SUMMARY:Tote Taxi Pickup - {booking.booking_number}
DESCRIPTION:{description}
LOCATION:{pickup_address}
STATUS:CONFIRMED
SEQUENCE:0
END:VEVENT
END:VCALENDAR"""

    return ics_content


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
    """Send 24-hour reminder email before pickup with calendar invite attachment"""
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

        # Create email with potential attachment
        email = EmailMessage(
            subject=subject,
            body=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[booking.get_customer_email()],
        )

        # Generate and attach calendar invite
        ics_content = generate_ics_calendar_invite(booking)
        if ics_content:
            email.attach(
                f'totetaxi-pickup-{booking.booking_number}.ics',
                ics_content,
                'text/calendar'
            )
            logger.info(f'Calendar invite attached for {booking.booking_number}')

        email.send(fail_silently=False)

        booking.reminder_sent_at = timezone.now()
        booking.save(update_fields=['reminder_sent_at'])

        logger.info(f'✓ Reminder email sent for {booking.booking_number}')
        return True

    except Exception as e:
        logger.error(f'Failed to send reminder for {booking.booking_number}: {str(e)}', exc_info=True)
        return False


def send_review_request_email(booking):
    """Send post-delivery email requesting Google review"""
    try:
        # Don't send if already sent
        if hasattr(booking, 'review_request_sent_at') and booking.review_request_sent_at:
            logger.info(f'Review request already sent for {booking.booking_number}')
            return False

        subject = f'How was your Tote Taxi experience? - {booking.booking_number}'
        context = {
            'booking': booking,
            'customer_name': booking.get_customer_name(),
            'review_url': GOOGLE_REVIEW_URL,
        }
        message = render_to_string('emails/review_request.txt', context)

        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[booking.get_customer_email()],
            fail_silently=False,
        )

        # Mark as sent if field exists
        if hasattr(booking, 'review_request_sent_at'):
            booking.review_request_sent_at = timezone.now()
            booking.save(update_fields=['review_request_sent_at'])

        logger.info(f'✓ Review request email sent for {booking.booking_number}')
        return True

    except Exception as e:
        logger.error(f'Failed to send review request for {booking.booking_number}: {str(e)}', exc_info=True)
        return False
