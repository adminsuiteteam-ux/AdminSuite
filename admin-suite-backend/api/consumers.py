"""
AdminSuite Enterprise Chat — WebSocket Consumer

Handles all real-time communication events:
  - chat messages (send / edit / delete)
  - typing indicators
  - presence updates (online / away / busy / offline)
  - emoji reactions (add / remove)
  - read receipts
  - call signals (initiate / accept / reject / end / ice-candidate)

Channel groups:
  workspace_<workspace_id>           — all users in a company workspace
  workspace_<workspace_id>_dm_<min_uid>_<max_uid>  — private DM thread
  workspace_<workspace_id>_group_<group_id>         — ChatGroup thread
"""

import json
import logging
from datetime import datetime, timezone as tz

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from django.contrib.auth.models import AnonymousUser

logger = logging.getLogger('adminsuite')


class ChatConsumer(AsyncWebsocketConsumer):
    # ──────────────────────────────────────────────────────────────────────
    # Connection lifecycle
    # ──────────────────────────────────────────────────────────────────────

    async def connect(self):
        """
        Accept connection only for authenticated users that belong to the
        requested workspace (workspace_id == admin user PK or employee of admin).
        """
        self.workspace_id = self.scope['url_route']['kwargs']['workspace_id']
        self.user = self.scope.get('user', AnonymousUser())

        if not self.user or isinstance(self.user, AnonymousUser) or not self.user.is_authenticated:
            await self.close(code=4001)
            return

        # Verify the user belongs to this workspace
        belongs = await self._user_belongs_to_workspace(self.workspace_id)
        if not belongs:
            await self.close(code=4003)
            return

        # Join workspace-level group (broadcast to everyone in the company)
        self.workspace_group = f'workspace_{self.workspace_id}'
        await self.channel_layer.group_add(self.workspace_group, self.channel_name)

        await self.accept()

        # Mark user as online
        await self._set_presence('online')
        await self._broadcast_presence('online')

        logger.info(
            f'[WS] {self.user.username} connected to workspace {self.workspace_id}'
        )

    async def disconnect(self, close_code):
        if hasattr(self, 'workspace_group'):
            # Mark user as offline and broadcast
            await self._set_presence('offline')
            await self._broadcast_presence('offline')

            await self.channel_layer.group_discard(
                self.workspace_group, self.channel_name
            )

        logger.info(
            f'[WS] {getattr(self.user, "username", "?")} disconnected '
            f'(code={close_code})'
        )

    # ──────────────────────────────────────────────────────────────────────
    # Receive from client
    # ──────────────────────────────────────────────────────────────────────

    async def receive(self, text_data=None, bytes_data=None):
        try:
            data = json.loads(text_data or '{}')
        except json.JSONDecodeError:
            await self._send_error('Invalid JSON payload')
            return

        msg_type = data.get('type', '')

        handler = {
            'chat.message':      self._handle_chat_message,
            'chat.edit':         self._handle_edit_message,
            'chat.delete':       self._handle_delete_message,
            'chat.typing':       self._handle_typing,
            'chat.reaction':     self._handle_reaction,
            'chat.read':         self._handle_read_receipt,
            'presence.update':   self._handle_presence_update,
            'call.signal':       self._handle_call_signal,
            'ping':              self._handle_ping,
        }.get(msg_type)

        if handler:
            await handler(data)
        else:
            await self._send_error(f'Unknown message type: {msg_type}')

    # ──────────────────────────────────────────────────────────────────────
    # Message handlers
    # ──────────────────────────────────────────────────────────────────────

    async def _handle_chat_message(self, data):
        """
        Persist a new message and broadcast it to the correct group.
        data keys: text, recipient_id?, group_id?, channel_id?, reply_to_id?
        """
        text = (data.get('text') or '').strip()
        if not text:
            await self._send_error('text is required')
            return
        if len(text) > 50000:
            await self._send_error('Message too long (max 50000 chars)')
            return

        recipient_id = data.get('recipient_id')
        group_id = data.get('group_id')
        channel_id = data.get('channel_id')
        reply_to_id = data.get('reply_to_id')

        # Persist to DB
        msg_data = await self._create_message(
            text=text,
            recipient_id=recipient_id,
            group_id=group_id,
            channel_id=channel_id,
            reply_to_id=reply_to_id,
        )

        if msg_data is None:
            await self._send_error('Could not create message (permission or not found)')
            return

        payload = {
            'type': 'chat.message',
            'message': msg_data,
        }

        # Broadcast to the appropriate channel group
        target_group = self._resolve_group(recipient_id, group_id)
        await self.channel_layer.group_send(target_group, {
            'type': 'broadcast_chat_message',
            'payload': payload,
        })

    async def _handle_edit_message(self, data):
        """data keys: message_id, text"""
        msg_id = data.get('message_id')
        new_text = (data.get('text') or '').strip()
        if not msg_id or not new_text:
            await self._send_error('message_id and text required')
            return

        updated = await self._edit_message(msg_id, new_text)
        if not updated:
            await self._send_error('Cannot edit this message')
            return

        await self.channel_layer.group_send(self.workspace_group, {
            'type': 'broadcast_chat_event',
            'payload': {'type': 'chat.edited', 'message_id': msg_id, 'text': new_text},
        })

    async def _handle_delete_message(self, data):
        """data keys: message_id"""
        msg_id = data.get('message_id')
        if not msg_id:
            await self._send_error('message_id required')
            return

        deleted = await self._delete_message(msg_id)
        if not deleted:
            await self._send_error('Cannot delete this message')
            return

        await self.channel_layer.group_send(self.workspace_group, {
            'type': 'broadcast_chat_event',
            'payload': {'type': 'chat.deleted', 'message_id': msg_id},
        })

    async def _handle_typing(self, data):
        """
        data keys: recipient_id? OR group_id?
        Broadcasts typing indicator to workspace; no DB persistence needed.
        """
        await self.channel_layer.group_send(self.workspace_group, {
            'type': 'broadcast_chat_event',
            'payload': {
                'type': 'chat.typing',
                'user_id': self.user.id,
                'username': self.user.get_full_name() or self.user.username,
                'recipient_id': data.get('recipient_id'),
                'group_id': data.get('group_id'),
                'is_typing': data.get('is_typing', True),
            },
        })

    async def _handle_reaction(self, data):
        """
        data keys: message_id, emoji, action ('add'|'remove')
        """
        msg_id = data.get('message_id')
        emoji = (data.get('emoji') or '').strip()
        action = data.get('action', 'add')

        if not msg_id or not emoji:
            await self._send_error('message_id and emoji required')
            return

        result = await self._toggle_reaction(msg_id, emoji, action)
        if result is None:
            await self._send_error('Message not found')
            return

        await self.channel_layer.group_send(self.workspace_group, {
            'type': 'broadcast_chat_event',
            'payload': {
                'type': 'chat.reaction',
                'message_id': msg_id,
                'emoji': emoji,
                'action': action,
                'user_id': self.user.id,
                'username': self.user.username,
                'reaction_counts': result,
            },
        })

    async def _handle_read_receipt(self, data):
        """data keys: message_ids (list of int)"""
        ids = data.get('message_ids', [])
        if ids:
            await self._mark_read(ids)
            await self.channel_layer.group_send(self.workspace_group, {
                'type': 'broadcast_chat_event',
                'payload': {
                    'type': 'chat.read',
                    'message_ids': ids,
                    'reader_id': self.user.id,
                },
            })

    async def _handle_presence_update(self, data):
        """data keys: status ('online'|'away'|'busy'|'offline'), status_message?"""
        status = data.get('status', 'online')
        status_msg = (data.get('status_message') or '')[:120]

        await self._set_presence(status, status_msg)
        await self._broadcast_presence(status, status_msg)

    async def _handle_call_signal(self, data):
        """
        Relays WebRTC signaling messages between peers.
        data keys: signal_type ('offer'|'answer'|'ice-candidate'|'reject'|'end'),
                   recipient_id, sdp?, candidate?
        This consumer does NOT handle WebRTC media — it's a signaling relay only.
        """
        recipient_id = data.get('recipient_id')
        group_id = data.get('group_id')
        is_group_call = data.get('is_group_call', False)
        if not recipient_id and not group_id and not is_group_call:
            await self._send_error('recipient_id or group_id required for call signal')
            return

        await self.channel_layer.group_send(self.workspace_group, {
            'type': 'broadcast_chat_event',
            'payload': {
                'type': 'call.signal',
                'signal_type': data.get('signal_type'),
                'caller_id': self.user.id,
                'caller_name': self.user.get_full_name() or self.user.username,
                'recipient_id': recipient_id,
                'group_id': group_id,
                'is_group_call': is_group_call,
                'call_id': data.get('call_id'),
                'sdp': data.get('sdp'),
                'candidate': data.get('candidate'),
                'call_type': data.get('call_type', 'voice'),
            },
        })

    async def _handle_ping(self, data):
        """Keep-alive: client sends ping, server sends pong + refreshes presence."""
        await self._set_presence(status=None)  # updates last_seen without changing status
        await self.send(text_data=json.dumps({'type': 'pong'}))

    # ──────────────────────────────────────────────────────────────────────
    # Channel layer event handlers (group_send → individual send)
    # ──────────────────────────────────────────────────────────────────────

    async def broadcast_chat_message(self, event):
        await self.send(text_data=json.dumps(event['payload']))

    async def broadcast_chat_event(self, event):
        await self.send(text_data=json.dumps(event['payload']))

    async def broadcast_presence(self, event):
        await self.send(text_data=json.dumps(event['payload']))

    # ──────────────────────────────────────────────────────────────────────
    # Database helpers (sync → async via database_sync_to_async)
    # ──────────────────────────────────────────────────────────────────────

    @database_sync_to_async
    def _user_belongs_to_workspace(self, workspace_id: str) -> bool:
        from django.contrib.auth.models import User
        from .models import Employee
        try:
            workspace_user = User.objects.get(pk=int(workspace_id))
        except (User.DoesNotExist, ValueError):
            return False

        if self.user == workspace_user:
            return True
        # Check if this user is an employee in that workspace
        return Employee.objects.filter(
            user=workspace_user,
            employee_user=self.user
        ).exists()

    @database_sync_to_async
    def _create_message(self, text, recipient_id=None, group_id=None,
                        channel_id=None, reply_to_id=None):
        from django.contrib.auth.models import User
        from .models import ChatMessage, ChatGroup, ChatChannel, ChatSettings
        from .serializers import ChatMessageSerializer

        workspace_id = int(self.workspace_id)
        try:
            company_user = User.objects.get(pk=workspace_id)
        except User.DoesNotExist:
            return None

        recipient = None
        group = None
        channel = None
        reply_to = None

        if recipient_id:
            try:
                recipient = User.objects.get(pk=int(recipient_id))
            except User.DoesNotExist:
                return None

        if group_id:
            try:
                group = ChatGroup.objects.get(pk=int(group_id), company_user=company_user)
            except ChatGroup.DoesNotExist:
                return None

        if channel_id:
            try:
                channel = ChatChannel.objects.get(pk=int(channel_id), company_user=company_user)
                group = group or channel.group
            except ChatChannel.DoesNotExist:
                return None

        if reply_to_id:
            try:
                reply_to = ChatMessage.objects.get(pk=int(reply_to_id), company_user=company_user)
            except ChatMessage.DoesNotExist:
                pass

        # Enforce group lock / block rules for general group messages
        is_admin = (self.user == company_user)
        if not recipient and not group and not is_admin:
            settings_obj, _ = ChatSettings.objects.get_or_create(company_user=company_user)
            if settings_obj.group_locked:
                return None
            if self.user.id in (settings_obj.blocked_user_ids or []):
                return None

        msg = ChatMessage.objects.create(
            company_user=company_user,
            sender=self.user,
            recipient=recipient,
            group=group,
            channel=channel,
            text=text,
            reply_to=reply_to,
        )
        msg.read_by.add(self.user)

        # Send push notification asynchronously (best-effort)
        try:
            from .notifications import send_push_notification
            sender_name = self.user.get_full_name() or self.user.username
            short_text = text[:80] + ('...' if len(text) > 80 else '')
            if recipient:
                send_push_notification(
                    user=recipient,
                    title=f'💬 New message from {sender_name}',
                    body=short_text,
                    data={'screen': 'chat', 'recipientId': str(self.user.id)},
                )
            elif group:
                for member in group.members.exclude(id=self.user.id):
                    send_push_notification(
                        user=member,
                        title=f'💬 {group.name}: {sender_name}',
                        body=short_text,
                        data={'screen': 'chat-group', 'groupId': str(group.id)},
                    )
            elif self.user != company_user:
                send_push_notification(
                    user=company_user,
                    title=f'💬 Group: {sender_name}',
                    body=short_text,
                    data={'screen': 'chat'},
                )
        except Exception:
            pass

        # Serialize for broadcast
        from django.test import RequestFactory
        serializer = ChatMessageSerializer(msg)
        return serializer.data

    @database_sync_to_async
    def _edit_message(self, msg_id: int, new_text: str) -> bool:
        from .models import ChatMessage
        try:
            msg = ChatMessage.objects.get(
                pk=int(msg_id), sender=self.user, company_user__pk=int(self.workspace_id)
            )
            msg.text = new_text
            msg.is_edited = True
            msg.save(update_fields=['text', 'is_edited', 'updated_at'])
            return True
        except ChatMessage.DoesNotExist:
            return False

    @database_sync_to_async
    def _delete_message(self, msg_id: int) -> bool:
        from .models import ChatMessage
        try:
            msg = ChatMessage.objects.get(
                pk=int(msg_id), sender=self.user, company_user__pk=int(self.workspace_id)
            )
            msg.is_deleted = True
            msg.text = ''
            msg.save(update_fields=['is_deleted', 'text', 'updated_at'])
            return True
        except ChatMessage.DoesNotExist:
            return False

    @database_sync_to_async
    def _toggle_reaction(self, msg_id: int, emoji: str, action: str):
        from .models import ChatMessage, MessageReaction
        try:
            msg = ChatMessage.objects.get(pk=int(msg_id), company_user__pk=int(self.workspace_id))
        except ChatMessage.DoesNotExist:
            return None

        if action == 'add':
            MessageReaction.objects.get_or_create(message=msg, user=self.user, emoji=emoji)
        else:
            MessageReaction.objects.filter(message=msg, user=self.user, emoji=emoji).delete()

        # Return aggregated reaction counts
        from django.db.models import Count
        counts = (
            MessageReaction.objects
            .filter(message=msg)
            .values('emoji')
            .annotate(count=Count('id'))
        )
        return {item['emoji']: item['count'] for item in counts}

    @database_sync_to_async
    def _mark_read(self, message_ids: list):
        from .models import ChatMessage
        msgs = ChatMessage.objects.filter(
            pk__in=[int(i) for i in message_ids],
            company_user__pk=int(self.workspace_id),
        )
        through_model = ChatMessage.read_by.through
        objs = [
            through_model(chatmessage_id=m.id, user_id=self.user.id)
            for m in msgs
        ]
        if objs:
            through_model.objects.bulk_create(objs, ignore_conflicts=True)

    @database_sync_to_async
    def _set_presence(self, status=None, status_message=''):
        from django.contrib.auth.models import User
        from .models import UserPresence
        try:
            company_user = User.objects.get(pk=int(self.workspace_id))
        except User.DoesNotExist:
            return
        presence, _ = UserPresence.objects.get_or_create(
            company_user=company_user, user=self.user
        )
        if status:
            presence.status = status
        if status_message is not None:
            presence.status_message = status_message
        presence.save()  # auto_now=True refreshes last_seen

    async def _broadcast_presence(self, status: str, status_message: str = ''):
        await self.channel_layer.group_send(self.workspace_group, {
            'type': 'broadcast_presence',
            'payload': {
                'type': 'presence.update',
                'user_id': self.user.id,
                'username': self.user.get_full_name() or self.user.username,
                'status': status,
                'status_message': status_message,
            },
        })

    # ──────────────────────────────────────────────────────────────────────
    # Utilities
    # ──────────────────────────────────────────────────────────────────────

    def _resolve_group(self, recipient_id, group_id):
        """Returns the channel layer group name for the given conversation."""
        if recipient_id:
            uid1 = min(self.user.id, int(recipient_id))
            uid2 = max(self.user.id, int(recipient_id))
            return f'workspace_{self.workspace_id}_dm_{uid1}_{uid2}'
        if group_id:
            return f'workspace_{self.workspace_id}_group_{group_id}'
        return self.workspace_group  # general team chat

    async def _send_error(self, detail: str):
        await self.send(text_data=json.dumps({'type': 'error', 'detail': detail}))
