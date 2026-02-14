"""Custom middleware for ToteTaxi."""
import _thread

from django.db import connections


class GeventConnectionMiddleware:
    """
    Reset DB connection thread ident for gevent compatibility.

    Django's DatabaseWrapper stores the thread ID of the greenlet that
    created it. With gevent workers, each request runs in a different
    greenlet with a different ID, causing validate_thread_sharing() to
    fail. This middleware closes stale connections and updates the
    thread ident at the start of each request.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        for conn in connections.all():
            conn.close()
            conn._thread_ident = _thread.get_ident()
        response = self.get_response(request)
        return response
