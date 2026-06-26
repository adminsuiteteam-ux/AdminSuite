"""
WebSocket URL routing for AdminSuite chat system.

Endpoint:
  ws://<host>/ws/chat/<workspace_id>/

<workspace_id> is the PK of the admin/company user that owns the workspace.
Token auth is performed in the handshake by TokenAuthMiddlewareStack (see middleware.py).
"""

from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'^ws/chat/(?P<workspace_id>\d+)/$', consumers.ChatConsumer.as_asgi()),
]
