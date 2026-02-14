"""Custom middleware for ToteTaxi."""
import _thread

from django.core.signals import request_finished, request_started
from django.db import close_old_connections, connections


def _safe_close_old_connections(**kwargs):
    """Reset DB thread idents before closing stale connections.

    Django's close_old_connections fires on request_started/request_finished
    signals — BEFORE middleware runs. With gevent, each greenlet has a unique
    _thread.get_ident(), so connections created by one greenlet fail
    validate_thread_sharing() when another greenlet tries to close them.
    This wrapper resets the ident first.
    """
    for conn in connections.all():
        conn._thread_ident = _thread.get_ident()
    close_old_connections(**kwargs)


# Replace Django's default signal handlers (runs once at import time)
request_started.disconnect(close_old_connections)
request_started.connect(_safe_close_old_connections)
request_finished.disconnect(close_old_connections)
request_finished.connect(_safe_close_old_connections)


class GeventConnectionMiddleware:
    """
    Reset DB connection thread ident for gevent compatibility.

    Belt-and-suspenders: the signal patch above handles close_old_connections,
    and this middleware handles any DB access during the request itself.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        for conn in connections.all():
            conn._thread_ident = _thread.get_ident()
        response = self.get_response(request)
        return response
