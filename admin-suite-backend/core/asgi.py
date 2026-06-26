"""
ASGI config for AdminSuite — Django Channels enabled.

Routes:
  HTTP  → Django standard ASGI application
  WS /ws/chat/<workspace_id>/ → api.consumers.ChatConsumer
"""

import os
from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')

# ── Django ASGI app must be called before importing channels ──────────────────
django_asgi_app = get_asgi_application()

from channels.routing import ProtocolTypeRouter, URLRouter  # noqa: E402
from channels.security.websocket import AllowedHostsOriginValidator  # noqa: E402
from api.middleware import TokenAuthMiddlewareStack  # noqa: E402
import api.routing as chat_routing  # noqa: E402

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": AllowedHostsOriginValidator(
        TokenAuthMiddlewareStack(
            URLRouter(chat_routing.websocket_urlpatterns)
        )
    ),
})
