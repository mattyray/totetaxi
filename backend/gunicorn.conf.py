import multiprocessing

# Server socket
bind = "0.0.0.0:8000"
backlog = 2048

# Worker processes
workers = multiprocessing.cpu_count() * 2 + 1
worker_class = "sync"
worker_connections = 1000
timeout = 30
keepalive = 2
max_requests = 1000
max_requests_jitter = 100

# Logging
accesslog = "-"
errorlog = "-"
loglevel = "info"

# Process naming
proc_name = "totetaxi"

# Server mechanics
# preload_app MUST be False with gevent workers. When True, the master
# imports the app (loading requests/urllib3/botocore which import ssl),
# then workers fork and call monkey.patch_all() — but ssl is already
# imported, causing infinite recursion in all HTTPS calls (Onfleet,
# LangSmith, Stripe). With False, each worker imports AFTER patching.
preload_app = False
pidfile = "/tmp/gunicorn.pid"
