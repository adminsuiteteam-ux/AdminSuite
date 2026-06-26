"""
Token authentication middleware for Django Channels WebSocket connections.

WebSocket clients cannot send HTTP headers after the initial handshake,
so the auth token is passed as a query-string parameter: ?token=<token_key>

Usage in asgi.py:
    from api.middleware import TokenAuthMiddlewareStack
    TokenAuthMiddlewareStack(URLRouter([...]))
"""

from urllib.parse import parse_qs

from channels.middleware import BaseMiddleware
from channels.auth import AuthMiddlewareStack
from django.contrib.auth.models import AnonymousUser
from django.db import close_old_connections


class TokenAuthMiddleware(BaseMiddleware):
    """
    Reads ?token=<key> from the WebSocket query-string and authenticates the
    Django REST Framework token against the database.
    """

    async def __call__(self, scope, receive, send):
        close_old_connections()

        # Lazy import to avoid circular issues at module-load time
        from rest_framework.authtoken.models import Token

        query_string = scope.get('query_string', b'').decode()
        params = parse_qs(query_string)
        token_key_list = params.get('token', [])

        scope['user'] = AnonymousUser()

        if token_key_list:
            token_key = token_key_list[0]
            try:
                token = await self._get_token(token_key)
                scope['user'] = token.user
            except Exception:
                pass  # Remain AnonymousUser; consumer will reject on connect

        return await super().__call__(scope, receive, send)

    @staticmethod
    async def _get_token(key: str):
        from rest_framework.authtoken.models import Token
        from channels.db import database_sync_to_async

        @database_sync_to_async
        def fetch():
            return Token.objects.select_related('user').get(key=key)

        return await fetch()


def TokenAuthMiddlewareStack(inner):
    """Convenience wrapper — mirrors Channels' AuthMiddlewareStack signature."""
    return TokenAuthMiddleware(inner)
