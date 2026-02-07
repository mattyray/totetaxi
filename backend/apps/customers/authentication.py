from rest_framework.authentication import SessionAuthentication
from django.contrib.auth.models import User
from django.contrib.sessions.backends.db import SessionStore
import logging

logger = logging.getLogger(__name__)

class HybridAuthentication(SessionAuthentication):
    """
    Hybrid authentication for mobile compatibility.
    Tries session cookie first (desktop), falls back to X-Session-Id header (mobile).
    """
    
    def authenticate(self, request):
        # Try standard cookie-based session authentication
        user = getattr(request._request, 'user', None)
        
        if user and user.is_authenticated:
            # 🔧 FIX: Ensure related profiles are loaded
            try:
                user = User.objects.select_related('staff_profile', 'customer_profile').get(pk=user.pk)
            except User.DoesNotExist:
                return None
            return (user, None)
        
        # Mobile fallback: check for session ID in custom header
        session_key = request.META.get('HTTP_X_SESSION_ID')
        
        if not session_key:
            return None
        
        logger.info(f"Mobile auth attempt with session: {session_key[:4] + '***'}...")
        
        try:
            # Validate session exists and get user
            session = SessionStore(session_key=session_key)
            
            if not session.exists(session_key):
                logger.warning(f"Session does not exist: {session_key[:4] + '***'}...")
                return None
            
            user_id = session.get('_auth_user_id')
            
            if not user_id:
                logger.warning(f"No user_id in session: {session_key[:4] + '***'}...")
                return None
            
            # 🔧 FIX: Load user with related profiles
            user = User.objects.select_related('staff_profile', 'customer_profile').get(pk=user_id)
            logger.info(f"Mobile auth successful for user: {user.email}")
            return (user, None)
            
        except User.DoesNotExist:
            logger.error(f"User not found for session: {session_key[:4] + '***'}...")
            return None
        except Exception as e:
            logger.error(f"Mobile auth error: {str(e)}")
            return None