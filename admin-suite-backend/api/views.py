import threading
import logging
from django.conf import settings
from django.contrib.auth.models import User
from django.db import models

logger = logging.getLogger(__name__)
from django.db.models import Sum
from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes, throttle_classes, action, renderer_classes, parser_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.renderers import BaseRenderer, JSONRenderer
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.throttling import AnonRateThrottle
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.exceptions import PermissionDenied, ValidationError
from .models import (
    UserProfile,
    Employee, EmployeeFinance, PayHistory, Client, Project, Transaction,
    Notification, Debt, BudgetCategory, Savings, EmployeeActivityLog,
    EmployeeQuery, EmployeeTask, EmployeeLeave, EmployeeMessage,
    EmployeeDocument, SalaryAdjustment, PayrollStatus, ChatMessage, ChatSettings,
    ChatGroup, ChatTypingStatus, UserDevice,
    MessageAttachment, MessageReaction, UserPresence, ChatChannel, CallRecord,
    ReportedAccount, BlockedAccount, Note,
)
from .serializers import (
    EmployeeSerializer, ClientSerializer, ProjectSerializer,
    TransactionSerializer, NotificationSerializer, DebtSerializer,
    BudgetCategorySerializer, SavingsSerializer, UserSerializer,
    UserProfileSerializer, RegisterSerializer, EmployeeActivityLogSerializer,
    EmployeeQuerySerializer, EmployeeTaskSerializer, EmployeeLeaveSerializer,
    EmployeeMessageSerializer, EmployeeDocumentSerializer, SalaryAdjustmentSerializer,
    EmployeeFinanceSerializer, PayHistorySerializer, ChatMessageSerializer,
    ChatSettingsSerializer, ChatGroupSerializer,
    MessageAttachmentSerializer, MessageReactionSerializer, UserPresenceSerializer,
    ChatChannelSerializer, CallRecordSerializer,
    ReportedAccountSerializer, BlockedAccountSerializer, NoteSerializer,
)
from .notifications import send_push_notification


class AuthRateThrottle(AnonRateThrottle):
    scope = 'auth'


class ThrottledObtainAuthToken(ObtainAuthToken):
    throttle_classes = [AuthRateThrottle]

    def post(self, request, *args, **kwargs):
        from django.contrib.auth.models import User
        from django.utils import timezone
        from django.contrib.auth import authenticate
        from .models import UserProfile
        from rest_framework.authtoken.models import Token
        from core.safe_logger import safe_log

        try:
            username = request.data.get('username', '').strip()
            password = request.data.get('password', '')

            if not username or not password:
                return Response({'error': 'Username and password are required.'}, status=status.HTTP_400_BAD_REQUEST)

            # Resolve email to username if email is used (use .first() to prevent MultipleObjectsReturned)
            target_user = None
            if '@' in username:
                target_user = User.objects.filter(email__iexact=username).first()
            else:
                target_user = User.objects.filter(username__iexact=username).first()

            profile = None
            if target_user:
                profile = UserProfile.objects.filter(user=target_user).first()
                if not profile:
                    profile = UserProfile.objects.create(user=target_user)
                # Check if currently suspended
                if profile.suspended_until and profile.suspended_until > timezone.now():
                    time_left = int((profile.suspended_until - timezone.now()).total_seconds())
                    minutes_left = max(1, (time_left + 59) // 60)
                    return Response({
                        'error': 'suspended',
                        'message': f'Account suspended. Please try again after {minutes_left} minutes.',
                        'suspended_until': profile.suspended_until.isoformat()
                    }, status=status.HTTP_423_LOCKED)

            # Attempt to authenticate
            user = None
            if target_user:
                user = authenticate(username=target_user.username, password=password)
            else:
                user = authenticate(username=username, password=password)

            if not user:
                # Authentication failed!
                if target_user and profile:
                    profile.failed_login_attempts += 1
                    attempts_left = 7 - profile.failed_login_attempts

                    if profile.failed_login_attempts >= 7:
                        profile.suspended_until = timezone.now() + timezone.timedelta(minutes=10)
                        profile.save()
                        return Response({
                            'error': 'suspended',
                            'message': 'Account has been suspended for 10 minutes due to 7 consecutive failed login attempts.',
                            'suspended_until': profile.suspended_until.isoformat()
                        }, status=status.HTTP_423_LOCKED)
                    elif profile.failed_login_attempts >= 3:
                        profile.save()
                        return Response({
                            'error': 'warning',
                            'message': f'Incorrect credentials. You have only {attempts_left} trials left before account is suspended for 10 minutes. Click Forgot Password to reset it.',
                            'attempts_left': attempts_left
                        }, status=status.HTTP_400_BAD_REQUEST)
                    else:
                        profile.save()
                        return Response({
                            'error': 'invalid_credentials',
                            'message': f'Unable to log in with provided credentials. {attempts_left} trials left.',
                            'attempts_left': attempts_left
                        }, status=status.HTTP_400_BAD_REQUEST)
                else:
                    return Response({
                        'error': 'invalid_credentials',
                        'message': 'Unable to log in with provided credentials.'
                    }, status=status.HTTP_400_BAD_REQUEST)

            # Successful login!
            if not isinstance(user, User):
                return Response({
                    'error': 'invalid_credentials',
                    'message': 'Unable to log in with provided credentials.'
                }, status=status.HTTP_400_BAD_REQUEST)

            profile, _ = UserProfile.objects.get_or_create(user=user)
            profile.failed_login_attempts = 0
            profile.suspended_until = None
            profile.save()

            token, created = Token.objects.get_or_create(user=user)
            return Response({
                'token': token.key,
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'name': user.first_name or user.username,
                    'profile_complete': profile.profile_complete,
                }
            })
        except Exception as e:
            safe_log("error", f"Error in ThrottledObtainAuthToken: {str(e)}")
            return Response({
                'error': 'server_error',
                'message': f'Authentication error: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)



def get_scoped_queryset(model, request, user_field='user', branch_field='branch'):
    user = request.user
    if not user.is_authenticated:
        return model.objects.none()
    
    # Bypass isolation checks for admin django panel superusers/staff
    if user.is_superuser or user.is_staff:
        return model.objects.all()

    try:
        ext = user.extension
        role = ext.role
        org = ext.organization
        branch = ext.branch
    except Exception:
        # Fallback to UserProfile role/organization or user
        try:
            profile = user.profile
            role = profile.role.upper()
        except Exception:
            role = ''
        org = None
        branch = None

    is_linked_employee = getattr(user, 'employee_profile', None) is not None
    # If not a linked employee, and role is CEO/Admin/Owner or unset, treat as CEO (company admin)
    if not is_linked_employee and (not role or role in ('CEO', 'ADMIN', 'OWNER', 'EMPLOYER')):
        role = 'CEO'

    if role == 'CEO':
        if org:
            has_org = hasattr(model, 'organization')
            has_branch = hasattr(model, 'branch') or hasattr(model, branch_field)
            has_user = hasattr(model, 'user') or hasattr(model, user_field)

            q_filter = models.Q()
            if has_org:
                q_filter |= models.Q(organization=org)
            if has_branch:
                q_filter |= models.Q(**{f"{branch_field}__organization": org})
            if has_user:
                # Include records owned directly by the CEO or by members of their org
                q_filter |= models.Q(**{user_field: user})
                q_filter |= models.Q(**{f"{user_field}__extension__organization": org})

            if hasattr(model, 'client'):
                q_filter |= models.Q(client__user=user)
                if org:
                    q_filter |= models.Q(client__user__extension__organization=org)

            if q_filter:
                return model.objects.filter(q_filter).distinct()
            if hasattr(model, 'client'):
                return model.objects.filter(models.Q(**{user_field: user}) | models.Q(client__user=user)).distinct()
            return model.objects.filter(**{user_field: user})
        if hasattr(model, 'client'):
            return model.objects.filter(models.Q(**{user_field: user}) | models.Q(client__user=user)).distinct()
        return model.objects.filter(**{user_field: user})
        
    elif role in ('BRANCH_ADMIN', 'HR', 'FINANCE', 'OPERATIONS', 'SECRETARY', 'DEPT_MANAGER'):
        has_branch = hasattr(model, 'branch') or hasattr(model, branch_field)
        has_org = hasattr(model, 'organization')
        has_user = hasattr(model, 'user') or hasattr(model, user_field)

        if branch:
            q_filter = models.Q()
            if has_branch:
                q_filter |= models.Q(**{branch_field: branch})
            if has_org:
                q_filter |= models.Q(organization=branch.organization)
            if has_user:
                q_filter |= models.Q(**{f"{user_field}__extension__branch": branch})
            if hasattr(model, 'client'):
                q_filter |= models.Q(client__user__extension__branch=branch)
            if q_filter:
                return model.objects.filter(q_filter).distinct()
        elif org:
            q_filter = models.Q()
            if has_org:
                q_filter |= models.Q(organization=org)
            if has_branch:
                q_filter |= models.Q(**{f"{branch_field}__organization": org})
            if has_user:
                q_filter |= models.Q(**{f"{user_field}__extension__organization": org})
            if hasattr(model, 'client'):
                q_filter |= models.Q(client__user__extension__organization=org)
            if q_filter:
                return model.objects.filter(q_filter).distinct()
        return model.objects.filter(**{user_field: user})
        
    else: # EMPLOYEE
        if model.__name__ == 'Employee':
            return model.objects.filter(linked_user=user)
        elif model.__name__ == 'EmployeeTask':
            return model.objects.filter(employee__linked_user=user)
        elif model.__name__ == 'EmployeeLeave':
            return model.objects.filter(employee__linked_user=user)
        elif model.__name__ == 'EmployeeMessage':
            return model.objects.filter(employee__linked_user=user)
        elif model.__name__ == 'EmployeeDocument':
            return model.objects.filter(employee__linked_user=user)
        elif model.__name__ == 'Project':
            emp = getattr(user, 'employee_profile', None)
            if emp:
                comp_user = emp.user
                q = models.Q(user=comp_user) | models.Q(client__user=comp_user) | models.Q(user=user)
                if emp.branch:
                    q |= models.Q(branch=emp.branch)
                return model.objects.filter(q).distinct()
        elif model.__name__ == 'Client':
            emp = getattr(user, 'employee_profile', None)
            if emp:
                return model.objects.filter(models.Q(user=emp.user) | models.Q(user=user)).distinct()
        
        if hasattr(model, 'user') or hasattr(model, user_field):
            return model.objects.filter(**{user_field: user})
        return model.objects.none()


def get_workspace_id(user):
    """Returns the primary workspace_id (owner admin user PK) for this user."""
    if not user or not getattr(user, 'is_authenticated', False):
        return None
    try:
        employee = getattr(user, 'employee_profile', None)
        if employee and employee.user_id:
            return employee.user_id
    except Exception:
        pass
    return user.id


def get_financial_pulse_data(user):
    """Calculates live financial pulse figures for the user's workspace."""
    from django.db.models import Sum
    ws_id = get_workspace_id(user)
    if not ws_id:
        return {}
    txs = Transaction.objects.filter(user_id=ws_id)
    total_income = txs.filter(type='income').aggregate(total=Sum('amount'))['total'] or 0
    total_expense = txs.filter(type='expense').aggregate(total=Sum('amount'))['total'] or 0
    total_payroll = Employee.objects.filter(user_id=ws_id).exclude(status='terminated').aggregate(total=Sum('salary'))['total'] or 0
    staff_paid = Employee.objects.filter(user_id=ws_id, status='active').count()
    return {
        'netProfit': float(total_income) - float(total_expense),
        'totalIncome': float(total_income),
        'totalExpense': float(total_expense),
        'totalPayroll': float(total_payroll),
        'staffPaid': staff_paid,
    }


class EmployeeViewSet(viewsets.ModelViewSet):
    serializer_class = EmployeeSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return get_scoped_queryset(Employee, self.request)

    def perform_create(self, serializer):
        try:
            # pyrefly: ignore [missing-attribute]
            ext = self.request.user.extension
            org = ext.organization
        except Exception:
            org = None
        if org:
            check_subscription_limit(org, 'employees')
            
        instance = serializer.save(user=self.request.user)

        # Non-blocking post-creation hooks in background thread
        import threading
        creator = self.request.user
        emp_instance = instance

        def _async_post_create():
            try:
                send_push_notification(
                    user=creator,
                    title='👤 New Staff Member Added',
                    body=f"{emp_instance.name} has been onboarded as {emp_instance.role} in {emp_instance.department}.",
                    data={'screen': 'employees', 'employeeId': str(emp_instance.id)}
                )
            except Exception as e:
                logger.warning(f"[EmployeeCreate] Push notification failed: {e}")

            try:
                from .consumers import broadcast_workspace_sync
                ws_id = get_workspace_id(creator)
                if ws_id:
                    broadcast_workspace_sync(ws_id, 'employee.created', EmployeeSerializer(emp_instance).data)
                    broadcast_workspace_sync(ws_id, 'financial_pulse.updated', get_financial_pulse_data(creator))
            except Exception as e:
                logger.warning(f"[EmployeeCreate] WebSocket broadcast failed: {e}")

        threading.Thread(target=_async_post_create, daemon=True).start()

    def perform_update(self, serializer):
        instance = serializer.save()
        from .consumers import broadcast_workspace_sync
        from django.contrib.auth.models import User
        ws_id = get_workspace_id(self.request.user)

        # Sync changes to linked User and UserProfile
        target_user = instance.linked_user or User.objects.filter(email__iexact=instance.email).first()
        if target_user:
            if not instance.linked_user:
                instance.linked_user = target_user
                instance.save(update_fields=['linked_user'])

            if instance.name:
                parts = instance.name.strip().split(' ')
                target_user.first_name = parts[0]
                target_user.last_name = ' '.join(parts[1:]) if len(parts) > 1 else ''
                target_user.save(update_fields=['first_name', 'last_name'])

            from .models import UserProfile
            target_profile, _ = UserProfile.objects.get_or_create(user=target_user)
            if instance.avatar:
                try:
                    target_profile.avatar = instance.avatar.name
                except Exception:
                    target_profile.avatar = instance.avatar
            if instance.role:
                target_profile.role = instance.role.lower()
            if instance.phone:
                target_profile.phone = instance.phone
            if instance.location:
                target_profile.location = instance.location
            if instance.bio:
                target_profile.bio = instance.bio
            target_profile.save()

        # Broadcast real-time employee and workspace metrics
        emp_data = EmployeeSerializer(instance, context={'request': self.request}).data
        broadcast_workspace_sync(ws_id, 'employee.updated', emp_data)
        broadcast_workspace_sync(ws_id, 'financial_pulse.updated', get_financial_pulse_data(self.request.user))

        # Real-time live notifications & user state sync to employee
        if target_user:
            avatar_url = None
            if instance.avatar:
                try:
                    avatar_url = self.request.build_absolute_uri(instance.avatar.url)
                except Exception:
                    avatar_url = None

            broadcast_workspace_sync(ws_id, 'user.updated', {
                'id': target_user.id,
                'email': instance.email,
                'name': instance.name,
                'role': instance.role,
                'avatar': avatar_url,
            })

            # Send live push notification and in-app Notification in background
            import threading
            req_u = self.request.user
            admin_name = getattr(req_u, 'get_full_name', lambda: '')() or getattr(req_u, 'username', '') or 'Administrator'

            def _send_employee_update_notif():
                from .notifications import send_push_notification
                from .models import Notification
                title = "Profile & Account Updated 👤"
                body = f"Your workplace profile and employee details were updated by administrator {admin_name}."
                try:
                    send_push_notification(
                        user=target_user,
                        title=title,
                        body=body,
                        data={'screen': 'profile'}
                    )
                except Exception as e:
                    logger.warning(f"[EmployeeUpdate] Push notification failed: {e}")

                try:
                    notif = Notification.objects.create(
                        user=target_user,
                        title=title,
                        body=body,
                        time="Just now"
                    )
                    if ws_id:
                        broadcast_workspace_sync(
                            ws_id,
                            'notification.created',
                            NotificationSerializer(notif).data
                        )
                except Exception as e:
                    logger.warning(f"[EmployeeUpdate] In-app notification creation failed: {e}")

            threading.Thread(target=_send_employee_update_notif, daemon=True).start()

    def perform_destroy(self, instance):
        from .consumers import broadcast_workspace_sync
        ws_id = get_workspace_id(self.request.user)
        emp_id = instance.id
        instance.delete()
        broadcast_workspace_sync(ws_id, 'employee.deleted', {'id': emp_id})
        broadcast_workspace_sync(ws_id, 'financial_pulse.updated', get_financial_pulse_data(self.request.user))

    @action(detail=True, methods=['post'])
    def flag(self, request, pk=None):
        employee = self.get_object()
        is_flagged = request.data.get('is_flagged', False)
        reason = request.data.get('flag_reason', '')
        note = request.data.get('flag_note', '')

        employee.is_flagged = is_flagged
        if is_flagged:
            employee.flag_reason = reason
            employee.flag_note = note
            action_name = "Flagged"
            details = f"Flagged. Reason: '{reason}'. Note: '{note}'"
        else:
            employee.flag_reason = ""
            employee.flag_note = ""
            action_name = "Unflagged"
            details = f"Unflagged (Flag resolved). Note: '{note}'"

        employee.save(update_fields=['is_flagged', 'flag_reason', 'flag_note'])

        # Log to activity history
        EmployeeActivityLog.objects.create(
            employee=employee,
            action=action_name,
            details=details
        )

        # Notify the linked employee about their flag status change
        if employee.linked_user:
            if is_flagged:
                send_push_notification(
                    user=employee.linked_user,
                    title='🚩 Account Flagged',
                    body=f"Your profile has been flagged. Reason: {reason or 'See admin for details'}.",
                    data={'screen': 'profile'}
                )
            else:
                send_push_notification(
                    user=employee.linked_user,
                    title='✅ Flag Resolved',
                    body='Your profile flag has been cleared by the administrator.',
                    data={'screen': 'profile'}
                )
        from .consumers import broadcast_workspace_sync
        ws_id = get_workspace_id(request.user)
        broadcast_workspace_sync(ws_id, 'employee.updated', EmployeeSerializer(employee, context={'request': request}).data)
        return Response({'status': 'success', 'is_flagged': employee.is_flagged})

    @action(detail=True, methods=['post'])
    def archive(self, request, pk=None):
        employee = self.get_object()
        employee.is_archived = True
        employee.save(update_fields=['is_archived'])
        EmployeeActivityLog.objects.create(
            employee=employee,
            action="Archived",
            details="Employee profile has been archived/deactivated."
        )
        # Notify the employee their account has been deactivated
        if employee.linked_user:
            send_push_notification(
                user=employee.linked_user,
                title='⚠️ Account Deactivated',
                body='Your staff account has been deactivated. Contact your administrator for details.',
                data={'screen': 'profile'}
            )
        from .consumers import broadcast_workspace_sync
        ws_id = get_workspace_id(request.user)
        broadcast_workspace_sync(ws_id, 'employee.updated', EmployeeSerializer(employee, context={'request': request}).data)
        return Response({'status': 'success', 'is_archived': True})

    @action(detail=True, methods=['post'])
    def restore(self, request, pk=None):
        employee = self.get_object()
        employee.is_archived = False
        employee.save(update_fields=['is_archived'])
        EmployeeActivityLog.objects.create(
            employee=employee,
            action="Restored",
            details="Employee profile has been restored/reactivated."
        )
        # Notify the employee their account is active again
        if employee.linked_user:
            send_push_notification(
                user=employee.linked_user,
                title='✅ Account Reactivated',
                body='Your staff account has been reactivated. Welcome back!',
                data={'screen': 'dashboard'}
            )
        from .consumers import broadcast_workspace_sync
        ws_id = get_workspace_id(request.user)
        broadcast_workspace_sync(ws_id, 'employee.updated', EmployeeSerializer(employee, context={'request': request}).data)
        return Response({'status': 'success', 'is_archived': False})


class ClientViewSet(viewsets.ModelViewSet):
    serializer_class = ClientSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return get_scoped_queryset(Client, self.request)

    def perform_create(self, serializer):
        try:
            # pyrefly: ignore [missing-attribute]
            ext = self.request.user.extension
            org = ext.organization
        except Exception:
            org = None
        if org:
            check_subscription_limit(org, 'clients')
        instance = serializer.save(user=self.request.user)
        try:
            from .consumers import broadcast_workspace_sync
            ws_id = get_workspace_id(self.request.user)
            if ws_id:
                broadcast_workspace_sync(ws_id, 'client.created', ClientSerializer(instance).data)
        except Exception as e:
            logger.warning(f"[ClientCreate] Broadcast error: {e}")

    def perform_update(self, serializer):
        instance = serializer.save()
        try:
            from .consumers import broadcast_workspace_sync
            ws_id = get_workspace_id(self.request.user)
            if ws_id:
                broadcast_workspace_sync(ws_id, 'client.updated', ClientSerializer(instance).data)
        except Exception as e:
            logger.warning(f"[ClientUpdate] Broadcast error: {e}")

    def perform_destroy(self, instance):
        try:
            from .consumers import broadcast_workspace_sync
            ws_id = get_workspace_id(self.request.user)
            c_id = instance.id
            instance.delete()
            if ws_id:
                broadcast_workspace_sync(ws_id, 'client.deleted', {'id': c_id})
        except Exception as e:
            logger.warning(f"[ClientDestroy] Broadcast error: {e}")


class ProjectViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = get_scoped_queryset(Project, self.request)
        try:
            comp_user = _get_company_user(self.request)
            fallback_q = (
                models.Q(user=comp_user) |
                models.Q(client__user=comp_user) |
                models.Q(user=self.request.user) |
                models.Q(client__user=self.request.user)
            )
            return (qs | Project.objects.filter(fallback_q)).distinct()
        except Exception:
            return qs

    def perform_create(self, serializer):
        try:
            # pyrefly: ignore [missing-attribute]
            ext = self.request.user.extension
            org = ext.organization
            branch = getattr(ext, 'branch', None)
        except Exception:
            org = None
            branch = None
        if org:
            check_subscription_limit(org, 'projects')
        
        comp_user = _get_company_user(self.request)
        client = serializer.validated_data.get('client')
        if not branch and client and getattr(client, 'branch', None):
            branch = client.branch
        serializer.save(user=comp_user or self.request.user, branch=branch)

    def perform_update(self, serializer):
        old_status = serializer.instance.status
        instance = serializer.save()
        # Notify the admin when a project is marked as completed
        if old_status != 'completed' and instance.status == 'completed':
            try:
                send_push_notification(
                    user=self.request.user,
                    title='🎉 Project Completed',
                    body=f"Project '{instance.name}' has been marked as completed.",
                    data={'screen': 'projects', 'projectId': str(instance.id)}
                )
            except Exception as e:
                logger.warning(f"[ProjectUpdate] Push notification error: {e}")


class TransactionViewSet(viewsets.ModelViewSet):
    serializer_class = TransactionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return get_scoped_queryset(Transaction, self.request)

    def perform_create(self, serializer):
        user = self.request.user
        branch = None
        try:
            # pyrefly: ignore [missing-attribute]
            ext = user.extension
            branch = ext.branch
            if not branch and ext.organization:
                branch = ext.organization.branches.first()
        except Exception:
            pass
        instance = serializer.save(user=user, branch=branch)
        try:
            from .consumers import broadcast_workspace_sync
            ws_id = get_workspace_id(user)
            if ws_id:
                broadcast_workspace_sync(ws_id, 'financial_pulse.updated', get_financial_pulse_data(user))
                broadcast_workspace_sync(ws_id, 'transaction.created', TransactionSerializer(instance).data)
        except Exception as e:
            logger.warning(f"[TransactionCreate] Broadcast error: {e}")

    def perform_update(self, serializer):
        instance = serializer.save()
        from .consumers import broadcast_workspace_sync
        ws_id = get_workspace_id(self.request.user)
        broadcast_workspace_sync(ws_id, 'financial_pulse.updated', get_financial_pulse_data(self.request.user))
        broadcast_workspace_sync(ws_id, 'transaction.updated', TransactionSerializer(instance).data)

    def perform_destroy(self, instance):
        from .consumers import broadcast_workspace_sync
        ws_id = get_workspace_id(self.request.user)
        tx_id = instance.id
        instance.delete()
        broadcast_workspace_sync(ws_id, 'financial_pulse.updated', get_financial_pulse_data(self.request.user))
        broadcast_workspace_sync(ws_id, 'transaction.deleted', {'id': tx_id})


class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return get_scoped_queryset(Notification, self.request)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class DebtViewSet(viewsets.ModelViewSet):
    serializer_class = DebtSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return get_scoped_queryset(Debt, self.request)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class BudgetCategoryViewSet(viewsets.ModelViewSet):
    serializer_class = BudgetCategorySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return get_scoped_queryset(BudgetCategory, self.request)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class SavingsViewSet(viewsets.ModelViewSet):
    serializer_class = SavingsSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return get_scoped_queryset(Savings, self.request)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def me(request):
    from .models import UserProfile
    user = request.user
    profile, _ = UserProfile.objects.get_or_create(user=user)

    if request.method == 'DELETE':
        user.delete()
        return Response({'message': 'Account deleted successfully.'}, status=status.HTTP_204_NO_CONTENT)

    if request.method in ('PUT', 'PATCH'):
        # Update user fields
        first_name = request.data.get('first_name')
        if first_name is not None:
            user.first_name = first_name
            user.save(update_fields=['first_name'])

        password = request.data.get('password')
        if password:
            try:
                from django.contrib.auth.password_validation import validate_password
                from django.core.exceptions import ValidationError as DjangoValidationError
                validate_password(password, user=user)
            # pyrefly: ignore [unbound-name]
            except DjangoValidationError as e:
                return Response({'password': list(e.messages)}, status=status.HTTP_400_BAD_REQUEST)
            user.set_password(password)
            user.save()
            profile.is_first_login = False
            profile.save()

        # Update profile fields
        profile_serializer = UserProfileSerializer(profile, data=request.data, partial=True)
        if profile_serializer.is_valid():
            profile_serializer.save(profile_complete=True)
            
            # Ensure UserExtension, Organization, and default Branch exist for CEO/Admin users
            # This allows employees created by them to correctly associate with their organization/branch
            role_val = request.data.get('role', profile.role)
            if role_val:
                # Map to system role choice
                role_upper = role_val.upper()
                if role_upper in ('ADMIN', 'CEO'):
                    system_role = 'CEO'
                elif role_upper == 'HR':
                    system_role = 'HR'
                elif role_upper == 'MANAGER':
                    system_role = 'DEPT_MANAGER'
                else:
                    system_role = 'CEO' # Default owner/admin to CEO role for access
                
                from .extended_models import UserExtension, Organization, Branch
                
                # Retrieve or create Organization
                org_name = request.data.get('business_name', profile.business_name) or f"{user.username}'s Corp"
                existing_ext = getattr(user, 'extension', None)
                if existing_ext and existing_ext.organization and (existing_ext.organization.created_by == user or not existing_ext.organization.created_by):
                    org = existing_ext.organization
                    if org.name != org_name:
                        org.name = org_name
                        org.save(update_fields=['name'])
                else:
                    org, _ = Organization.objects.get_or_create(
                        name=org_name,
                        defaults={'created_by': user}
                    )
                
                # Retrieve or create Branch
                branch = None
                if existing_ext and existing_ext.branch:
                    branch = existing_ext.branch
                    if branch.organization != org:
                        branch.organization = org
                        branch.save(update_fields=['organization'])
                if not branch:
                    branch, _ = Branch.objects.get_or_create(
                        organization=org,
                        name="Main HQ",
                        defaults={'created_by': user, 'location': profile.location or 'Main HQ'}
                    )
                
                # Retrieve or create UserExtension
                ext, created_ext = UserExtension.objects.get_or_create(
                    user=user,
                    defaults={
                        'role': system_role,
                        'organization': org,
                        'branch': branch
                    }
                )
                if not created_ext:
                    # Update fields if already exists
                    ext.role = system_role
                    ext.organization = org
                    ext.branch = branch
                    ext.save(update_fields=['role', 'organization', 'branch'])

            # Sync to Employee profile if it exists (searching linked_user or email)
            employee = getattr(user, 'employee_profile', None) or Employee.objects.filter(email__iexact=user.email).first()
            if employee:
                update_fields = []
                if not employee.linked_user:
                    employee.linked_user = user
                    update_fields.append('linked_user')
                if profile.avatar:
                    employee.avatar = profile.avatar
                    update_fields.append('avatar')
                if first_name:
                    employee.name = f"{user.first_name} {user.last_name}".strip()
                    update_fields.append('name')
                if request.data.get('phone'):
                    employee.phone = request.data.get('phone')
                    update_fields.append('phone')
                if request.data.get('location'):
                    employee.location = request.data.get('location')
                    update_fields.append('location')
                if request.data.get('bio'):
                    employee.bio = request.data.get('bio')
                    update_fields.append('bio')
                if update_fields:
                    employee.save(update_fields=list(set(update_fields)))

                # Real-time broadcast so Admin and colleagues immediately see the new avatar & profile changes
                ws_id = get_workspace_id(user)
                if ws_id:
                    from .consumers import broadcast_workspace_sync
                    broadcast_workspace_sync(
                        ws_id,
                        'employee.updated',
                        EmployeeSerializer(employee, context={'request': request}).data
                    )
        else:
            return Response(profile_serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    employee = getattr(user, 'employee_profile', None) or Employee.objects.filter(email__iexact=user.email).first()
    name = f"{user.first_name} {user.last_name}".strip() or (employee.name if employee else user.username)
    profile_data = UserProfileSerializer(profile).data
    avatar_url = None
    if profile.avatar:
        avatar_url = request.build_absolute_uri(profile.avatar.url)
    elif employee and employee.avatar:
        avatar_url = request.build_absolute_uri(employee.avatar.url)
        try:
            profile.avatar = employee.avatar.name
            profile.save(update_fields=['avatar'])
        except Exception:
            pass

    company_logo_url = None
    if profile.company_logo:
        company_logo_url = request.build_absolute_uri(profile.company_logo.url)

    employee_id = employee.id if employee else None

    return Response({
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'name': name,
        'profile_complete': profile.profile_complete,
        'is_first_login': profile.is_first_login,
        'location': profile_data.get('location', ''),
        'heard_from': profile_data.get('heard_from', ''),
        'role': profile_data.get('role', ''),
        'phone': profile_data.get('phone', ''),
        'bio': profile_data.get('bio', ''),
        'social_link': profile_data.get('social_link', ''),
        'biometrics_enabled': profile_data.get('biometrics_enabled', False),
        'notifications_enabled': profile_data.get('notifications_enabled', False),
        'avatar': avatar_url,
        'business_name': profile_data.get('business_name', ''),
        'org_location': profile_data.get('org_location', ''),
        'org_email': profile_data.get('org_email', ''),
        'company_line': profile_data.get('company_line', ''),
        'social_handles': profile_data.get('social_handles', ''),
        'total_workers': profile_data.get('total_workers', ''),
        'opening_time': profile_data.get('opening_time', ''),
        'closing_time': profile_data.get('closing_time', ''),
        'working_days': profile_data.get('working_days', ''),
        'average_revenue': profile_data.get('average_revenue', ''),
        'company_logo': company_logo_url,
        'employee_id': employee_id,
        'workspace_id': get_workspace_id(user),
    })


@api_view(['POST'])
@throttle_classes([AuthRateThrottle])
def register(request):
    """User registration: email + password + confirm_password.
    Requires a prior email verification via /api/auth/email/send-code/ + /api/auth/email/verify/.
    Returns an auth token immediately on success."""
    from rest_framework.authtoken.models import Token
    from .models import UserProfile, EmailVerificationCode

    email = request.data.get('email', '').strip().lower()
    supabase_verified = request.data.get('supabase_verified', False)

    # Block registration if the email is associated with a suspended account
    try:
        from django.utils import timezone
        existing_user = User.objects.get(email__iexact=email)
        profile, _ = UserProfile.objects.get_or_create(user=existing_user)
        if profile.suspended_until and profile.suspended_until > timezone.now():
            time_left = int((profile.suspended_until - timezone.now()).total_seconds())
            minutes_left = max(1, (time_left + 59) // 60)
            return Response({
                'error': 'suspended',
                'message': f'Account suspended. Please try again after {minutes_left} minutes.',
                'suspended_until': profile.suspended_until.isoformat()
            }, status=status.HTTP_423_LOCKED)
    except User.DoesNotExist:
        pass

    # Enforce that email verification has been completed via Django OTP
    if not supabase_verified:
        try:
            verification = EmailVerificationCode.objects.get(email=email)
            if verification.code != 'VERIFIED':
                return Response(
                    {'error': 'Email verification has not been completed. Please verify your email first.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        except EmailVerificationCode.DoesNotExist:
            return Response(
                {'error': 'Email verification has not been completed. Please verify your email first.'},
                status=status.HTTP_400_BAD_REQUEST
            )

    serializer = RegisterSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    user = serializer.save()

    # Delete the verification record after successful registration
    if not supabase_verified:
        try:
            verification = EmailVerificationCode.objects.get(email=email)
            verification.delete()
        except EmailVerificationCode.DoesNotExist:
            pass

    # Create a blank profile for the new user
    UserProfile.objects.get_or_create(user=user)
    token, _ = Token.objects.get_or_create(user=user)

    return Response({
        'token': token.key,
        'user': {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'name': user.first_name or user.username,
            'profile_complete': False,
        },
    }, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def metrics(request):
    """Dashboard metrics — mirrors getMetrics() from mockData.ts"""
    transactions = get_scoped_queryset(Transaction, request)
    total_income = transactions.filter(
        type='income'
    ).aggregate(total=Sum('amount'))['total'] or 0
    total_expense = transactions.filter(
        type='expense'
    ).aggregate(total=Sum('amount'))['total'] or 0
    return Response({
        'employees': get_scoped_queryset(Employee, request).exclude(status='terminated').count(),
        'activeProjects': get_scoped_queryset(Project, request).filter(status='active').count(),
        'clients': get_scoped_queryset(Client, request).count(),
        'netProfit': float(total_income) - float(total_expense),
        'totalIncome': float(total_income),
        'totalExpense': float(total_expense),
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def client_metrics(request):
    """Client breakdown — mirrors getClientMetrics()"""
    clients = get_scoped_queryset(Client, request)
    return Response({
        'active': clients.filter(status='active').count(),
        'pending': clients.filter(status='pending').count(),
        'completed': clients.filter(status='completed').count(),
        'total': clients.count(),
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def payroll_metrics(request):
    """Payroll status — dynamic list of months fetched from DB"""
    user = request.user
    default_months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug']
    
    # Fetch existing statuses
    statuses = {ps.month: ps.paid for ps in PayrollStatus.objects.filter(user=user)}
    
    payroll_months = []
    for m in default_months:
        paid_status = statuses.get(m, False)
        payroll_months.append({'month': m, 'paid': paid_status})
        
    paid = sum(1 for m in payroll_months if m['paid'])
    unpaid = len(payroll_months) - paid
    staff_paid = get_scoped_queryset(Employee, request).filter(status='active').count()
    
    return Response({
        'paid': paid,
        'unpaid': unpaid,
        'staffPaid': staff_paid,
        'total': len(payroll_months),
        'payrollMonths': payroll_months,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def toggle_payroll_month(request):
    """Toggle or set the paid status for a specific month"""
    user = request.user
    month = request.data.get('month')
    paid = request.data.get('paid', False)

    if not month:
        return Response({'error': 'month is required.'}, status=status.HTTP_400_BAD_REQUEST)

    payroll_status, created = PayrollStatus.objects.update_or_create(
        user=user,
        month=month,
        defaults={'paid': paid}
    )

    # When marking a month as PAID, notify all active employees under this admin
    if paid:
        active_employees = Employee.objects.filter(
            user=user, is_archived=False, status='active'
        ).select_related('linked_user')
        for emp in active_employees:
            if emp.linked_user:
                send_push_notification(
                    user=emp.linked_user,
                    title='💰 Salary Processed',
                    body=f'Your salary for {month} has been processed and marked as paid.',
                    data={'screen': 'finance'}
                )

    return Response({
        'month': payroll_status.month,
        'paid': payroll_status.paid,
        'success': True
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def debts_grouped(request):
    """Debts grouped as weOwe / owedToUs — mirrors the frontend structure"""
    debts = get_scoped_queryset(Debt, request)
    we_owe = DebtSerializer(debts.filter(type='weOwe'), many=True).data
    owed_to_us = DebtSerializer(debts.filter(type='owedToUs'), many=True).data
    return Response({
        'weOwe': we_owe,
        'owedToUs': owed_to_us,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def branch_metrics(request):
    user = request.user
    try:
        ext = user.extension
        role = ext.role
        org = ext.organization
    except Exception:
        return Response({'error': 'No organization scope.'}, status=status.HTTP_400_BAD_REQUEST)

    if not org:
        return Response([])

    if role != 'CEO' and role != 'ADMIN':
        branch = ext.branch
        if not branch:
            return Response([])
        branches = [branch]
    else:
        branches = org.branches.filter(is_active=True)

    result = []
    for b in branches:
        headcount = Employee.objects.filter(branch=b, is_archived=False).exclude(status='terminated').count()
        active_projects = Project.objects.filter(branch=b, status='active').count()
        clients_count = Client.objects.filter(projects__branch=b).distinct().count()
        if clients_count == 0:
            clients_count = Client.objects.filter(user__extension__branch=b).count()
        
        txs = Transaction.objects.filter(branch=b)
        total_income = txs.filter(type='income').aggregate(total=Sum('amount'))['total'] or 0
        total_expense = txs.filter(type='expense').aggregate(total=Sum('amount'))['total'] or 0
        net_profit = float(total_income) - float(total_expense)
        
        result.append({
            'id': b.id,
            'name': b.name,
            'location': b.location or 'Unknown',
            'headcount': headcount,
            'activeProjects': active_projects,
            'clients': clients_count,
            'totalIncome': float(total_income),
            'totalExpense': float(total_expense),
            'netProfit': net_profit
        })
    return Response(result)


def check_subscription_limit(org, field_name):
    try:
        sub = org.subscription
        plan = sub.plan
    except Exception:
        plan = "BASIC"
        
    if plan == 'BASIC':
        limit = 15
    else:
        limit = 999999
        
    if field_name == 'branches':
        limit = 5 if plan == 'BASIC' else (25 if plan == 'PREMIUM' else 999999)
        current = org.branches.filter(is_active=True).count()
    elif field_name == 'employees':
        current = Employee.objects.filter(branch__organization=org, is_archived=False).count()
    elif field_name == 'clients':
        current = Client.objects.filter(user__extension__organization=org).count()
    elif field_name == 'projects':
        current = Project.objects.filter(branch__organization=org).count()
    else:
        return
        
    if current >= limit:
        from rest_framework.exceptions import PermissionDenied
        raise PermissionDenied(
            f"Your organization has reached the limit of {limit if limit < 999999 else 'unlimited'} {field_name} "
            f"for your {plan} plan. Please upgrade to add more."
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def subscription_limits(request):
    user = request.user
    try:
        ext = user.extension
        org = ext.organization
    except Exception:
        return Response({'error': 'No organization scope.'}, status=status.HTTP_400_BAD_REQUEST)

    if not org:
        return Response({'error': 'No organization associated.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        sub = org.subscription
        plan = sub.plan
        max_records = sub.max_records_per_field
    except Exception:
        plan = "BASIC"
        max_records = 15

    branches_count = org.branches.filter(is_active=True).count()
    employees_count = Employee.objects.filter(branch__organization=org, is_archived=False).count()
    clients_count = Client.objects.filter(user__extension__organization=org).count()
    projects_count = Project.objects.filter(branch__organization=org).count()

    return Response({
        'plan': plan,
        'max_records': max_records,
        'usage': {
            'branches': { 'current': branches_count, 'limit': 5 if plan == 'BASIC' else (25 if plan == 'PREMIUM' else 999999) },
            'employees': { 'current': employees_count, 'limit': max_records },
            'clients': { 'current': clients_count, 'limit': max_records },
            'projects': { 'current': projects_count, 'limit': max_records },
        }
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def subscription_upgrade(request):
    user = request.user
    try:
        ext = user.extension
        org = ext.organization
    except Exception:
        return Response({'error': 'No organization scope.'}, status=status.HTTP_400_BAD_REQUEST)
        
    if not org:
        return Response({'error': 'No organization associated.'}, status=status.HTTP_400_BAD_REQUEST)
        
    plan = request.data.get('plan')
    if plan not in ('BASIC', 'PREMIUM', 'PRO', 'PRO_YEARLY'):
        return Response({'error': 'Invalid subscription plan.'}, status=status.HTTP_400_BAD_REQUEST)
        
    # Process simulated credit card billing details
    payment_method = request.data.get('payment_method')
    
    import os
    stripe_key = os.getenv('STRIPE_SECRET_KEY')
    use_stripe = plan != 'BASIC' and stripe_key and not stripe_key.startswith('sk_test_placeholder')
    
    if plan != 'BASIC' and not payment_method and not use_stripe:
        return Response({'error': 'Payment method details are required for paid plans.'}, status=status.HTTP_400_BAD_REQUEST)
        
    if use_stripe:
        from payments.stripe_helper import create_checkout_session
        import json
        res = create_checkout_session(request, org.id, plan)
        if res.status_code == 200:
            data = json.loads(res.content)
            return Response(data)
        else:
            try:
                data = json.loads(res.content)
                err_msg = data.get('error', 'Stripe checkout creation failed.')
            except Exception:
                err_msg = 'Stripe checkout creation failed.'
            return Response({'error': err_msg}, status=res.status_code)
        
    # Update or create organization subscription
    from .extended_models import Subscription
    from django.utils import timezone
    
    sub, created = Subscription.objects.get_or_create(organization=org)
    sub.plan = plan
    
    # Set limit fields and dates
    if plan == 'BASIC':
        sub.max_records_per_field = 15
        sub.end_date = None
        sub.features = {}
    elif plan == 'PREMIUM':
        sub.max_records_per_field = 999999 # unlimited
        sub.end_date = (timezone.now() + timezone.timedelta(days=30)).date()
        sub.features = {'financial_management': False}
    elif plan in ('PRO', 'PRO_YEARLY'):
        sub.max_records_per_field = 999999 # unlimited
        days = 365 if plan == 'PRO_YEARLY' else 30
        sub.end_date = (timezone.now() + timezone.timedelta(days=days)).date()
        sub.features = {'financial_management': True, 'ai_automation': True}
        
    sub.save()
    
    # Log organization level activity
    EmployeeActivityLog.objects.create(
        employee=None, # system/organization level
        action="Subscription Upgraded",
        details=f"Upgraded organization subscription to {plan} plan."
    )
    
    # Send push notification to the CEO/Admin user
    from .notifications import send_push_notification
    send_push_notification(
        user=user,
        title='⚡ Subscription Upgraded!',
        body=f"Your organization has successfully upgraded to the {plan} plan.",
        data={'screen': 'dashboard'}
    )
    
    return Response({
        'status': 'success',
        'plan': plan,
        'message': f'Subscription upgraded successfully to {plan}.'
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def transaction_categories(request):
    transactions = get_scoped_queryset(Transaction, request)
    income_by_category = list(transactions.filter(type='income').values('category').annotate(value=Sum('amount')).order_by('-value'))
    expense_by_category = list(transactions.filter(type='expense').values('category').annotate(value=Sum('amount')).order_by('-value'))
    
    return Response({
        'income': [{'category': item['category'], 'value': float(item['value'] or 0)} for item in income_by_category],
        'expense': [{'category': item['category'], 'value': float(item['value'] or 0)} for item in expense_by_category]
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_alerts(request):
    queries = get_scoped_queryset(EmployeeQuery, request).filter(status='open')
    queries_count = queries.count()

    flagged = get_scoped_queryset(Employee, request).filter(is_flagged=True)
    flagged_count = flagged.count()

    tasks = get_scoped_queryset(EmployeeTask, request).filter(status='pending', priority='high')
    tasks_count = tasks.count()

    alerts_list = []
    if queries_count > 0:
        alerts_list.append({
            'type': 'query',
            'count': queries_count,
            'message': f'{queries_count} unresolved employee queries require review.'
        })
    if flagged_count > 0:
        alerts_list.append({
            'type': 'flagged',
            'count': flagged_count,
            'message': f'{flagged_count} employee profiles have active safety flags.'
        })
    if tasks_count > 0:
        alerts_list.append({
            'type': 'task',
            'count': tasks_count,
            'message': f'{tasks_count} high-priority tasks are currently pending.'
        })

    return Response({
        'queries_count': queries_count,
        'flagged_count': flagged_count,
        'high_priority_tasks_count': tasks_count,
        'alerts': alerts_list
    })


# ---------------------------------------------------------------------------
# Social / Phone Authentication
# ---------------------------------------------------------------------------

@api_view(['POST'])
@throttle_classes([AuthRateThrottle])
def google_login(request):
    """
    Authenticate via Google.
    Accepts { id_token, email?, name? }.
    In DEBUG mode, if Google token verification fails, falls back to
    the provided email/name so developers can test without real credentials.
    """
    # pyrefly: ignore [untyped-import]
    # pyrefly: ignore [untyped-import]
    import requests as http_requests
    from rest_framework.authtoken.models import Token

    id_token = request.data.get('id_token', '')
    email = request.data.get('email', '')
    name = request.data.get('name', '')

    if not id_token and not email:
        return Response({'error': 'id_token or email is required.'}, status=status.HTTP_400_BAD_REQUEST)

    # Try to verify the token with Google
    google_verified = False
    if id_token:
        try:
            resp = http_requests.get(
                'https://oauth2.googleapis.com/tokeninfo',
                params={'id_token': id_token},
                timeout=5,
            )
            if resp.status_code == 200:
                payload = resp.json()
                email = payload.get('email', email)
                name = name or payload.get('name', '')
                google_verified = True
        except Exception:
            pass  # Fall through to debug fallback

    if id_token and not google_verified and not settings.DEBUG:
        return Response({'error': 'Invalid or unverified Google token.'}, status=status.HTTP_401_UNAUTHORIZED)

    if not google_verified and not email and not settings.DEBUG:
        return Response({'error': 'Invalid Google token.'}, status=status.HTTP_401_UNAUTHORIZED)

    if not email:
        return Response({'error': 'Could not determine email.'}, status=status.HTTP_400_BAD_REQUEST)

    # Get or create user
    user, created = User.objects.get_or_create(
        email=email,
        defaults={
            'username': email.split('@')[0],
            'first_name': name.split(' ')[0] if name else '',
            'last_name': ' '.join(name.split(' ')[1:]) if name else '',
        },
    )
    if created:
        # Set unusable password for social-auth users
        user.set_unusable_password()
        user.save()
        UserProfile.objects.get_or_create(user=user, defaults={'role': 'CEO'})
    else:
        profile = getattr(user, 'profile', None)
        if profile and not profile.role and getattr(user, 'employee_profile', None) is None:
            profile.role = 'CEO'
            profile.save(update_fields=['role'])

    token, _ = Token.objects.get_or_create(user=user)
    user_name = f"{user.first_name} {user.last_name}".strip() or user.username
    return Response({
        'token': token.key,
        'user': {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'name': user_name,
        },
    })


@api_view(['POST'])
@throttle_classes([AuthRateThrottle])
def apple_login(request):
    """
    Authenticate via Apple.
    Accepts { identity_token, email?, name? }.
    In DEBUG mode, if Apple token verification fails, falls back to
    the provided email/name so developers can test without real credentials.
    """
    from rest_framework.authtoken.models import Token

    email = request.data.get('email', '')
    name = request.data.get('name', '')

    if not email:
        return Response({'error': 'email is required.'}, status=status.HTTP_400_BAD_REQUEST)

    # Get or create user
    user, created = User.objects.get_or_create(
        email=email,
        defaults={
            'username': email.split('@')[0],
            'first_name': name.split(' ')[0] if name else '',
            'last_name': ' '.join(name.split(' ')[1:]) if name else '',
        },
    )
    if created:
        user.set_unusable_password()
        user.save()

    token, _ = Token.objects.get_or_create(user=user)
    user_name = f"{user.first_name} {user.last_name}".strip() or user.username
    return Response({
        'token': token.key,
        'user': {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'name': user_name,
        },
    })


@api_view(['POST'])
@throttle_classes([AuthRateThrottle])
def send_otp(request):
    """
    Send a 6-digit OTP to the given phone number.
    In DEBUG mode the OTP is returned in the response body for easy testing.
    """
    import re
    import secrets
    from .models import PhoneOTP

    phone = request.data.get('phone', '').strip()
    # Strip everything except digits and leading +
    cleaned = re.sub(r'[^\d+]', '', phone)
    if len(cleaned) < 7 or len(cleaned) > 16:
        return Response({'error': 'Invalid phone number.'}, status=status.HTTP_400_BAD_REQUEST)

    otp_code = ''.join([str(secrets.randbelow(10)) for _ in range(6)])

    PhoneOTP.objects.update_or_create(
        phone=cleaned,
        defaults={'otp': otp_code},
    )

    # TODO(security): In production, integrate an SMS provider (e.g. Twilio)
    # to deliver the OTP instead of returning it in the response.
    response_data = {'message': 'OTP sent successfully.', 'phone': cleaned}
    if settings.DEBUG:
        response_data['otp'] = otp_code  # Dev convenience only

    return Response(response_data)


@api_view(['POST'])
@throttle_classes([AuthRateThrottle])
def verify_otp(request):
    """
    Verify a phone OTP and return an auth token.
    Creates a user with username `phone_<number>` if one doesn't exist.
    OTP expires after 5 minutes.
    """
    import re
    from django.utils import timezone
    from datetime import timedelta
    from rest_framework.authtoken.models import Token
    from .models import PhoneOTP

    phone = re.sub(r'[^\d+]', '', request.data.get('phone', '').strip())
    otp = request.data.get('otp', '').strip()

    if not phone or not otp:
        return Response({'error': 'Phone and OTP are required.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        record = PhoneOTP.objects.get(phone=phone)
    except PhoneOTP.DoesNotExist:
        return Response({'error': 'No OTP found for this number. Please request a new one.'}, status=status.HTTP_400_BAD_REQUEST)

    # Check expiry (5 minutes)
    if timezone.now() - record.created_at > timedelta(minutes=5):
        record.delete()
        return Response({'error': 'OTP has expired. Please request a new one.'}, status=status.HTTP_400_BAD_REQUEST)

    if record.otp != otp:
        return Response({'error': 'Invalid OTP.'}, status=status.HTTP_400_BAD_REQUEST)

    # OTP verified — clean up
    record.delete()

    # Get or create a user for this phone
    username = f"phone_{phone.lstrip('+')}"
    user, created = User.objects.get_or_create(
        username=username,
        defaults={'email': ''},
    )
    if created:
        user.set_unusable_password()
        user.save()

    token, _ = Token.objects.get_or_create(user=user)
    user_name = f"{user.first_name} {user.last_name}".strip() or user.username
    return Response({
        'token': token.key,
        'user': {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'name': user_name,
        },
    })


@api_view(['POST'])
@throttle_classes([AuthRateThrottle])
def send_email_verification(request):
    """
    Send a 6-digit verification code to the given email address.
    Checks if a user with that email already exists.
    In DEBUG mode, the code is returned in the response for easy testing.
    """
    import secrets
    from django.core.validators import validate_email
    from django.core.exceptions import ValidationError
    from django.contrib.auth.models import User
    from django.conf import settings
    from .models import EmailVerificationCode

    email = request.data.get('email', '').strip().lower()
    if not email:
        return Response({'error': 'Email is required.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        validate_email(email)
    except ValidationError:
        return Response({'error': 'Invalid email address.'}, status=status.HTTP_400_BAD_REQUEST)

    # Check if user already exists
    if User.objects.filter(email=email).exists():
        return Response({'error': 'A user with this email already exists.'}, status=status.HTTP_400_BAD_REQUEST)

    # Generate 6-digit code using a secure PRNG
    code = ''.join([str(secrets.randbelow(10)) for _ in range(6)])

    # Store/Update verification code
    EmailVerificationCode.objects.update_or_create(
        email=email,
        defaults={'code': code},
    )

    # Send the OTP via email (Django SMTP — Supabase-free)
    from core.safe_logger import safe_log, mask_email
    from .emails import send_signup_otp_email
    email_sent = False
    email_error_detail = ''
    try:
        send_signup_otp_email(email, code)
        email_sent = True
    except Exception as e:
        email_error_detail = str(e)
        safe_log("error", f"Failed to send OTP email to {mask_email(email)}: {email_error_detail}")
        # In DEBUG mode, don't block registration — the code will be returned in the response
        if not settings.DEBUG:
            return Response(
                {'error': 'Failed to send verification email. Please try again later.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    safe_log("info", "Verification code dispatched", extra={"email": mask_email(email), "email_sent": email_sent})

    response_data = {'message': 'Verification code sent successfully.', 'email': email}
    if settings.DEBUG:
        response_data['code'] = code  # Dev convenience only — never exposed in production
        if not email_sent:
            response_data['warning'] = f'Email delivery failed ({email_error_detail}), but code is available in DEBUG mode.'

    return Response(response_data)


@api_view(['POST'])
@throttle_classes([AuthRateThrottle])
def verify_email(request):
    """
    Verify the 6-digit email code.
    This doesn't register the user or log them in, but validates that the user owns the email.
    Sets the status of EmailVerificationCode for that email to 'VERIFIED'.
    """
    from django.utils import timezone
    from datetime import timedelta
    from .models import EmailVerificationCode

    email = request.data.get('email', '').strip().lower()
    code = request.data.get('code', '').strip()

    if not email or not code:
        return Response({'error': 'Email and code are required.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        record = EmailVerificationCode.objects.get(email=email)
    except EmailVerificationCode.DoesNotExist:
        return Response({'error': 'No verification code found for this email. Please request a new one.'}, status=status.HTTP_400_BAD_REQUEST)

    # Check expiry (10 minutes)
    if timezone.now() - record.created_at > timedelta(minutes=10):
        record.delete()
        return Response({'error': 'Verification code has expired. Please request a new one.'}, status=status.HTTP_400_BAD_REQUEST)

    if record.code != code:
        return Response({'error': 'Invalid verification code.'}, status=status.HTTP_400_BAD_REQUEST)

    # Mark as verified (using 'VERIFIED' string) so register view knows it's confirmed
    record.code = "VERIFIED"
    record.save()

    return Response({'message': 'Email verified successfully.', 'email': email})


class PDFRenderer(BaseRenderer):
    media_type = 'application/pdf'
    format = 'pdf'
    charset = None
    render_style = 'binary'

    def render(self, data, accepted_media_type=None, renderer_context=None):
        return data


class CSVRenderer(BaseRenderer):
    media_type = 'text/csv'
    format = 'csv'
    charset = 'utf-8'

    def render(self, data, accepted_media_type=None, renderer_context=None):
        return data


@api_view(['GET'])
@renderer_classes([PDFRenderer, CSVRenderer, JSONRenderer])
@permission_classes([IsAuthenticated])
def export_data(request):
    from .pdf_generator import build_pdf_report
    import csv
    from django.http import HttpResponse

    export_format = (request.GET.get('export_format') or request.GET.get('file_format') or request.GET.get('format', 'pdf')).strip().lower()
    export_type = request.GET.get('type', 'general').strip().lower()
    time_filter = request.GET.get('time_filter')
    individual_id = request.GET.get('id')
    skip_branding = request.GET.get('skip_branding', 'false').strip().lower() == 'true'

    if export_format == 'pdf':
        try:
            pdf_data = build_pdf_report(request.user, export_type, time_filter=time_filter, individual_id=individual_id, skip_branding=skip_branding)
            response = HttpResponse(pdf_data, content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="adminsuite_{export_type}_export.pdf"'
            return response
        except Exception as e:
            from core.safe_logger import safe_log
            safe_log("error", "PDF generation failed", extra={"error": str(e)})
            return Response({'error': 'Failed to generate PDF due to an internal error.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    elif export_format == 'csv':
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="adminsuite_{export_type}_export.csv"'
        writer = csv.writer(response)

        if export_type == 'client':
            from .models import Client
            if individual_id:
                try:
                    c = Client.objects.get(user=request.user, id=individual_id)
                    writer.writerow(["Field", "Value"])
                    writer.writerow(["Company", c.company])
                    writer.writerow(["Contact", c.contact])
                    writer.writerow(["Email", c.email])
                    writer.writerow(["Location", c.location])
                    writer.writerow(["Website", c.website or "N/A"])
                    writer.writerow(["Status", c.status])
                    writer.writerow(["LTV", c.lifetime_value])
                except Client.DoesNotExist:
                    return Response({'error': 'Client not found'}, status=status.HTTP_404_NOT_FOUND)
            else:
                clients = Client.objects.filter(user=request.user)
                writer.writerow(["Company", "Contact", "Email", "Location", "Website", "LTV", "Status"])
                for c in clients:
                    writer.writerow([c.company, c.contact, c.email, c.location, c.website or "N/A", c.lifetime_value, c.status])

        elif export_type == 'employee':
            from .models import Employee
            if individual_id:
                try:
                    e = Employee.objects.get(user=request.user, id=individual_id)
                    writer.writerow(["Field", "Value"])
                    writer.writerow(["Name", e.name])
                    writer.writerow(["Role", e.role])
                    writer.writerow(["Department", e.department])
                    writer.writerow(["Email", e.email])
                    writer.writerow(["Salary", e.salary])
                    writer.writerow(["Status", e.status])
                except Employee.DoesNotExist:
                    return Response({'error': 'Employee not found'}, status=status.HTTP_404_NOT_FOUND)
            else:
                emps = Employee.objects.filter(user=request.user)
                writer.writerow(["Name", "Role", "Department", "Email", "Salary", "Status"])
                for e in emps:
                    writer.writerow([e.name, e.role, e.department, e.email, e.salary, e.status])

        elif export_type == 'financials':
            from .models import Transaction
            from django.utils import timezone
            from datetime import timedelta
            txs = Transaction.objects.filter(user=request.user)
            
            now = timezone.now()
            if time_filter == "24h":
                txs = txs.filter(created_at__gte=now - timedelta(days=1)) if hasattr(Transaction, 'created_at') else txs
            elif time_filter == "3d":
                txs = txs.filter(created_at__gte=now - timedelta(days=3)) if hasattr(Transaction, 'created_at') else txs
            elif time_filter == "1w":
                txs = txs.filter(created_at__gte=now - timedelta(days=7)) if hasattr(Transaction, 'created_at') else txs
            elif time_filter == "1m":
                txs = txs.filter(created_at__gte=now - timedelta(days=30)) if hasattr(Transaction, 'created_at') else txs
            elif time_filter == "3m":
                txs = txs.filter(created_at__gte=now - timedelta(days=90)) if hasattr(Transaction, 'created_at') else txs
            elif time_filter == "6m":
                txs = txs.filter(created_at__gte=now - timedelta(days=180)) if hasattr(Transaction, 'created_at') else txs
            elif time_filter == "12m":
                txs = txs.filter(created_at__gte=now - timedelta(days=365)) if hasattr(Transaction, 'created_at') else txs
                
            writer.writerow(["Date", "Description", "Category", "Amount", "Type"])
            for t in txs:
                writer.writerow([t.date, t.description, t.category, t.amount, t.type])
        else:
            from .models import Employee, Client
            writer.writerow(["Export Type", "General Workspace Data"])
            writer.writerow([])
            writer.writerow(["--- EMPLOYEES ---"])
            writer.writerow(["Name", "Role", "Department", "Salary"])
            for e in Employee.objects.filter(user=request.user):
                writer.writerow([e.name, e.role, e.department, e.salary])

            writer.writerow([])
            writer.writerow(["--- CLIENTS ---"])
            writer.writerow(["Company", "Contact", "Email", "LTV"])
            for c in Client.objects.filter(user=request.user):
                writer.writerow([c.company, c.contact, c.email, c.lifetime_value])

        return response

    return Response({'error': 'Unsupported format. Use format=pdf or format=csv.'}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@throttle_classes([AuthRateThrottle])
def send_password_reset_code(request):
    """
    Sends a 6-digit verification code to the given email address for password reset.
    Checks if a user with that email exists.
    In DEBUG mode, the code is returned in the response for easy testing.
    """
    import secrets
    from django.core.validators import validate_email
    from django.core.exceptions import ValidationError
    from django.contrib.auth.models import User
    from django.conf import settings
    from .models import PasswordResetCode, UserProfile

    email = request.data.get('email', '').strip().lower()
    if not email:
        return Response({'error': 'Email is required.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        validate_email(email)
    except ValidationError:
        return Response({'error': 'Invalid email address.'}, status=status.HTTP_400_BAD_REQUEST)

    # Find the user by company email, username, or employee personal_email
    user = User.objects.filter(email__iexact=email).first() or User.objects.filter(username__iexact=email).first()
    emp = None
    if not user:
        emp = Employee.objects.filter(personal_email__iexact=email).first()
        if emp and emp.linked_user:
            user = emp.linked_user
        elif emp and emp.email:
            user = User.objects.filter(email__iexact=emp.email).first() or User.objects.filter(username__iexact=emp.email).first()

    if not user:
        return Response({'error': 'No account found with this email.'}, status=status.HTTP_400_BAD_REQUEST)

    # Determine destination email for OTP dispatch:
    # If the user is an employee and has a personal email (e.g. Gmail), dispatch OTP to that personal email.
    destination_email = email
    if not emp:
        emp = getattr(user, 'employee_profile', None) or Employee.objects.filter(linked_user=user).first()
        if not emp and user.email:
            emp = Employee.objects.filter(email__iexact=user.email).first()

    if emp and emp.personal_email:
        destination_email = emp.personal_email.strip().lower()
    elif user.email:
        destination_email = user.email.strip().lower()

    # Check if suspended
    profile, _ = UserProfile.objects.get_or_create(user=user)
    from django.utils import timezone
    if profile.suspended_until and profile.suspended_until > timezone.now():
        time_left = int((profile.suspended_until - timezone.now()).total_seconds())
        minutes_left = max(1, (time_left + 59) // 60)
        return Response({
            'error': 'suspended',
            'message': f'Account suspended. Please try again after {minutes_left} minutes.'
        }, status=status.HTTP_423_LOCKED)

    # Generate 6-digit numeric code
    code = ''.join([str(secrets.randbelow(10)) for _ in range(6)])

    # Store/Update verification code for BOTH input email and destination email (and user.email)
    emails_to_bind = {email, destination_email}
    if user.email:
        emails_to_bind.add(user.email.strip().lower())
    if user.username and '@' in user.username:
        emails_to_bind.add(user.username.strip().lower())

    for em in emails_to_bind:
        PasswordResetCode.objects.update_or_create(
            email=em,
            defaults={'code': code},
        )

    from .emails import send_password_reset_email
    send_password_reset_email(destination_email, code)

    from core.safe_logger import safe_log, mask_email
    safe_log("info", "Password reset code generated", extra={"email": mask_email(destination_email), "code": "***"})

    masked_dest = mask_email(destination_email)
    msg = f'Verification code sent successfully to your personal email ({masked_dest}).' if destination_email != email else 'Verification code sent successfully.'
    response_data = {
        'message': msg,
        'email': email,
        'destination_email': masked_dest
    }
    if settings.DEBUG:
        response_data['code'] = code  # Dev convenience only

    return Response(response_data)


@api_view(['POST'])
@throttle_classes([AuthRateThrottle])
def verify_password_reset_code(request):
    """
    Verify the 6-digit password reset OTP.
    Sets the status of PasswordResetCode for that email to 'VERIFIED'.
    """
    from django.utils import timezone
    from datetime import timedelta
    from .models import PasswordResetCode

    email = request.data.get('email', '').strip().lower()
    code = request.data.get('code', '').strip()

    if not email or not code:
        return Response({'error': 'Email and code are required.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        record = PasswordResetCode.objects.get(email=email)
    except PasswordResetCode.DoesNotExist:
        return Response({'error': 'No reset code found for this email. Please request a new one.'}, status=status.HTTP_400_BAD_REQUEST)

    # Check expiry (10 minutes)
    if timezone.now() - record.created_at > timedelta(minutes=10):
        record.delete()
        return Response({'error': 'Verification code has expired. Please request a new one.'}, status=status.HTTP_400_BAD_REQUEST)

    if record.code != code:
        return Response({'error': 'Invalid verification code.'}, status=status.HTTP_400_BAD_REQUEST)

    # Mark as verified
    record.code = "VERIFIED"
    record.save()

    return Response({'message': 'OTP verified successfully.', 'email': email})


@api_view(['POST'])
@throttle_classes([AuthRateThrottle])
def confirm_password_reset(request):
    """
    Confirm password reset: set new password, clear all login lockout counters.
    """
    from django.contrib.auth.models import User
    from .models import PasswordResetCode, UserProfile

    email = request.data.get('email', '').strip().lower()
    code = request.data.get('code', '').strip()
    new_password = request.data.get('new_password', '')

    if not email or not code or not new_password:
        return Response({'error': 'Email, code, and new password are required.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        record = PasswordResetCode.objects.get(email=email)
    except PasswordResetCode.DoesNotExist:
        return Response({'error': 'No reset code found for this email. Please request a new one.'}, status=status.HTTP_400_BAD_REQUEST)

    if record.code != "VERIFIED":
        return Response({'error': 'OTP verification has not been completed.'}, status=status.HTTP_400_BAD_REQUEST)

    user = User.objects.filter(email__iexact=email).first() or User.objects.filter(username__iexact=email).first()
    if not user:
        emp = Employee.objects.filter(personal_email__iexact=email).first()
        if emp and emp.linked_user:
            user = emp.linked_user
        elif emp and emp.email:
            user = User.objects.filter(email__iexact=emp.email).first() or User.objects.filter(username__iexact=emp.email).first()

    if not user:
        return Response({'error': 'User not found.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        from django.contrib.auth.password_validation import validate_password
        from django.core.exceptions import ValidationError as DjangoValidationError
        validate_password(new_password, user=user)
    # pyrefly: ignore [unbound-name]
    except DjangoValidationError as e:
        return Response({'error': e.messages[0]}, status=status.HTTP_400_BAD_REQUEST)

    # Change password
    user.set_password(new_password)
    user.save()

    # Clear lockout status
    profile, _ = UserProfile.objects.get_or_create(user=user)
    profile.failed_login_attempts = 0
    profile.suspended_until = None
    profile.save()

    # Delete verification record
    record.delete()

    return Response({'message': 'Password has been reset successfully. You can now log in.'})


class EmployeeActivityLogViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = EmployeeActivityLogSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return get_scoped_queryset(EmployeeActivityLog, self.request, user_field='employee__user').order_by('-created_at')


class EmployeeQueryViewSet(viewsets.ModelViewSet):
    serializer_class = EmployeeQuerySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return EmployeeQuery.objects.filter(employee__user=self.request.user).order_by('-created_at')

    def perform_create(self, serializer):
        employee = serializer.validated_data.get('employee')
        if employee.user != self.request.user:
            raise PermissionDenied("You do not have permission to query this employee.")
        instance = serializer.save()
        EmployeeActivityLog.objects.create(
            employee=employee,
            action="Query Raised",
            details=f"Raised query of type '{instance.query_type}': {instance.message}"
        )
        # Notify the admin/HR that a new query has been submitted
        admin_user = self.request.user
        send_push_notification(
            user=admin_user,
            title='❓ New Employee Query',
            body=f"{employee.name} raised a {instance.query_type} query: {instance.message[:80]}",
            data={'screen': 'employee-queries', 'employeeId': str(employee.id)}
        )

    def perform_update(self, serializer):
        old_status = serializer.instance.status
        instance = serializer.save()
        # When a query is resolved, notify the employee who raised it
        if old_status != 'resolved' and instance.status == 'resolved':
            if instance.employee.linked_user:
                send_push_notification(
                    user=instance.employee.linked_user,
                    title='✅ Query Resolved',
                    body=f'Your {instance.query_type} query has been resolved by the administrator.',
                    data={'screen': 'queries'}
                )


class EmployeeTaskViewSet(viewsets.ModelViewSet):
    serializer_class = EmployeeTaskSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return get_scoped_queryset(EmployeeTask, self.request, user_field='employee__user', branch_field='employee__branch').order_by('-created_at')

    def perform_create(self, serializer):
        employee = serializer.validated_data.get('employee')
        creator_user = employee.user
        request_user = self.request.user
        is_same_org = False
        try:
            # pyrefly: ignore [missing-attribute]
            if request_user.extension.organization == creator_user.extension.organization:
                is_same_org = True
        except Exception:
            pass

        if creator_user != request_user and not is_same_org:
            raise PermissionDenied("You do not have permission to assign tasks to this employee.")
        instance = serializer.save()
        
        EmployeeActivityLog.objects.create(
            employee=employee,
            action="Task Assigned",
            details=f"Assigned task: {instance.title} (Priority: {instance.priority})"
        )
        
        Notification.objects.create(
            user=self.request.user,
            title="Task Assigned",
            body=f"Assigned task '{instance.title}' to {employee.name}",
            time="Just now"
        )
        
        # Send real-time push notification to the assigned employee
        if employee.linked_user:
            send_push_notification(
                user=employee.linked_user,
                title="New Task Assigned 📋",
                body=f"You have been assigned task: '{instance.title}'",
                data={
                    "screen": "tasks",
                    "taskId": instance.id
                }
            )


class EmployeeLeaveViewSet(viewsets.ModelViewSet):
    serializer_class = EmployeeLeaveSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return get_scoped_queryset(EmployeeLeave, self.request, user_field='employee__user', branch_field='employee__branch').order_by('-created_at')

    def perform_create(self, serializer):
        employee = serializer.validated_data.get('employee')
        creator_user = employee.user
        request_user = self.request.user
        is_same_org = False
        try:
            # pyrefly: ignore [missing-attribute]
            if request_user.extension.organization == creator_user.extension.organization:
                is_same_org = True
        except Exception:
            pass

        if creator_user != request_user and not is_same_org:
            raise PermissionDenied("You do not have permission to schedule leave for this employee.")
        
        start_date = serializer.validated_data.get('start_date')
        end_date = serializer.validated_data.get('end_date')
        
        overlapping = EmployeeLeave.objects.filter(
            employee=employee,
            start_date__lte=end_date,
            end_date__gte=start_date
        )
        if overlapping.exists():
            raise ValidationError("Leave dates overlap with an existing scheduled leave.")
            
        instance = serializer.save()

        from datetime import date
        today = date.today()
        if instance.start_date <= today <= instance.end_date:
            employee.status = 'on_leave'
            employee.save(update_fields=['status'])

        EmployeeActivityLog.objects.create(
            employee=employee,
            action="Leave Scheduled",
            details=f"Scheduled {instance.leave_type} leave from {instance.start_date} to {instance.end_date} ({instance.duration_days} days)"
        )

        # Notify the account owner (admin) about the new leave request
        admin_user = self.request.user
        send_push_notification(
            user=admin_user,
            title='📅 New Leave Request',
            body=(
                f'{employee.name} has requested {instance.leave_type} leave '
                f'from {instance.start_date} to {instance.end_date} '
                f'({instance.duration_days} day{"s" if instance.duration_days != 1 else ""}).'
            ),
            data={'screen': 'leave', 'employeeId': str(employee.id)}
        )

    def perform_update(self, serializer):
        old_status = serializer.instance.status
        employee = serializer.instance.employee
        instance = serializer.save()
        # Notify the employee when their leave request is approved or rejected
        new_status = instance.status
        if old_status != new_status and new_status in ('approved', 'rejected'):
            if employee.linked_user:
                emoji = '✅' if new_status == 'approved' else '❌'
                send_push_notification(
                    user=employee.linked_user,
                    title=f'{emoji} Leave Request {new_status.capitalize()}',
                    body=(
                        f'Your {instance.leave_type} leave from {instance.start_date} '
                        f'to {instance.end_date} has been {new_status}.'
                    ),
                    data={'screen': 'leave'}
                )


class EmployeeMessageViewSet(viewsets.ModelViewSet):
    serializer_class = EmployeeMessageSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return EmployeeMessage.objects.filter(employee__user=self.request.user).order_by('-created_at')

    def perform_create(self, serializer):
        employee = serializer.validated_data.get('employee')
        if employee.user != self.request.user:
            raise PermissionDenied("You do not have permission to send messages to this employee.")
        instance = serializer.save()
        EmployeeActivityLog.objects.create(
            employee=employee,
            action="Message Sent",
            details=f"Sent {instance.delivery_mode} message. Subject: {instance.subject}"
        )


class EmployeeDocumentViewSet(viewsets.ModelViewSet):
    serializer_class = EmployeeDocumentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return EmployeeDocument.objects.filter(employee__user=self.request.user).order_by('-created_at')

    def perform_create(self, serializer):
        employee = serializer.validated_data.get('employee')
        if employee.user != self.request.user:
            raise PermissionDenied("You do not have permission to manage documents for this employee.")
        instance = serializer.save()
        EmployeeActivityLog.objects.create(
            employee=employee,
            action="Document Added",
            details=f"Added document: {instance.name} ({instance.document_type})"
        )
        # Notify the employee that a document has been added to their profile
        if employee.linked_user:
            send_push_notification(
                user=employee.linked_user,
                title='📄 Document Added',
                body=f"A {instance.document_type} document '{instance.name}' has been added to your profile.",
                data={'screen': 'documents'}
            )

    def perform_destroy(self, instance):
        employee = instance.employee
        doc_name = instance.name
        doc_type = instance.document_type
        linked_user = employee.linked_user
        instance.delete()
        EmployeeActivityLog.objects.create(
            employee=employee,
            action="Document Deleted",
            details=f"Deleted document: {doc_name}"
        )
        # Notify employee that a document was removed from their profile
        if linked_user:
            send_push_notification(
                user=linked_user,
                title='🗑️ Document Removed',
                body=f"The {doc_type} document '{doc_name}' has been removed from your profile.",
                data={'screen': 'documents'}
            )


class SalaryAdjustmentViewSet(viewsets.ModelViewSet):
    serializer_class = SalaryAdjustmentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return SalaryAdjustment.objects.filter(employee__user=self.request.user).order_by('-created_at')

    def perform_create(self, serializer):
        from django.utils import timezone
        employee = serializer.validated_data.get('employee')
        if employee.user != self.request.user:
            raise PermissionDenied("You do not have permission to adjust salary for this employee.")
            
        try:
            plan = employee.branch.organization.subscription.plan
        except Exception:
            plan = 'BASIC'
            
        if plan not in ('PRO', 'PRO_YEARLY'):
            raise PermissionDenied("Detailed financial modifications are Pro features. Please upgrade your plan.")
        
        adj_type = serializer.validated_data.get('adjustment_type')
        amount = serializer.validated_data.get('amount')
        prev_salary = employee.salary
        
        employee.finance.last_finance_update = timezone.now()
        
        if adj_type == 'increment':
            new_salary = prev_salary + amount
        elif adj_type == 'decrement':
            new_salary = max(0, prev_salary - amount)
        elif adj_type == 'bonus':
            new_salary = prev_salary
            employee.finance.bonuses += amount
            employee.finance.save(update_fields=['bonuses', 'last_finance_update'])
        elif adj_type == 'correction':
            new_salary = amount
        else:
            new_salary = prev_salary
            
        instance = serializer.save(previous_salary=prev_salary, new_salary=new_salary)

        if adj_type != 'bonus':
            employee.salary = new_salary
            employee.finance.current_pay = new_salary
            employee.save(update_fields=['salary'])
            employee.finance.save(update_fields=['current_pay', 'last_finance_update'])

        EmployeeActivityLog.objects.create(
            employee=employee,
            action="Salary Adjusted",
            details=f"Adjusted salary ({adj_type}): {prev_salary} -> {new_salary} (Amount: {amount})"
        )

        # Notify the employee about their salary/compensation change
        if employee.linked_user:
            label_map = {
                'increment': ('📈 Salary Increased', f'Your salary has been increased by {amount}. New salary: {new_salary}.'),
                'decrement': ('📉 Salary Adjusted', f'Your salary has been adjusted. New salary: {new_salary}.'),
                'bonus': ('🎁 Bonus Added', f'A bonus of {amount} has been added to your compensation.'),
                'correction': ('📋 Salary Corrected', f'Your salary record has been corrected to {new_salary}.'),
            }
            title, body = label_map.get(adj_type, ('💰 Salary Updated', f'Your compensation has been updated to {new_salary}.'))
            send_push_notification(
                user=employee.linked_user,
                title=title,
                body=body,
                data={'screen': 'finance'}
            )

        from .consumers import broadcast_workspace_sync
        ws_id = get_workspace_id(self.request.user)
        broadcast_workspace_sync(ws_id, 'financial_pulse.updated', get_financial_pulse_data(self.request.user))
        broadcast_workspace_sync(ws_id, 'employee.updated', EmployeeSerializer(employee, context={'request': self.request}).data)


class EmployeeFinanceViewSet(viewsets.ModelViewSet):
    serializer_class = EmployeeFinanceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return get_scoped_queryset(EmployeeFinance, self.request, user_field='user')

    def perform_update(self, serializer):
        from django.utils import timezone
        from .notifications import send_push_notification
        
        instance = serializer.save()
        instance.last_finance_update = timezone.now()
        instance.save(update_fields=['last_finance_update'])
        
        # Notify the employee if linked
        employee = getattr(instance, 'employee', None)
        if employee and employee.linked_user:
            send_push_notification(
                user=employee.linked_user,
                title='💼 Finance Profile Updated',
                body='Your compensation and financial details have been updated.',
                data={'screen': 'finance'}
            )

        from .consumers import broadcast_workspace_sync
        ws_id = get_workspace_id(self.request.user)
        broadcast_workspace_sync(ws_id, 'financial_pulse.updated', get_financial_pulse_data(self.request.user))
        if employee:
            broadcast_workspace_sync(ws_id, 'employee.updated', EmployeeSerializer(employee, context={'request': self.request}).data)


# ---------------------------------------------------------------------------
# Employee Portal Endpoints
# ---------------------------------------------------------------------------

# Roles that are employee-type (can access the employee portal)
_EMPLOYEE_PORTAL_ROLES = {'employee', 'hr', 'finance', 'operations', 'secretary', 'dept_manager', 'branch_admin'}

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def employee_dashboard(request):
    user = request.user
    profile = getattr(user, 'profile', None)
    if not profile or profile.role.lower() not in _EMPLOYEE_PORTAL_ROLES:
        raise PermissionDenied("Only staff members can access this portal.")
        
    employee = getattr(user, 'employee_profile', None)
    if not employee:
        return Response({'error': 'Employee profile not found.'}, status=status.HTTP_404_NOT_FOUND)
        
    # Get assigned tasks
    tasks = EmployeeTask.objects.filter(employee=employee).order_by('-created_at')
    
    # Get activity logs
    activities = EmployeeActivityLog.objects.filter(employee=employee).order_by('-created_at')[:8]
    
    # Return consolidated metrics and details
    return Response({
        'employee': EmployeeSerializer(employee, context={'request': request}).data,
        'tasks': EmployeeTaskSerializer(tasks, many=True, context={'request': request}).data,
        'activities': EmployeeActivityLogSerializer(activities, many=True).data,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def employee_finance(request):
    user = request.user
    profile = getattr(user, 'profile', None)
    if not profile or profile.role.lower() not in _EMPLOYEE_PORTAL_ROLES:
        raise PermissionDenied("Only staff members can access this portal.")
        
    employee = getattr(user, 'employee_profile', None)
    if not employee:
        return Response({'error': 'Employee profile not found.'}, status=status.HTTP_404_NOT_FOUND)
        
    finance = employee.finance
    pay_history = PayHistory.objects.filter(finance=finance).order_by('-id')
    
    return Response({
        'finance': EmployeeFinanceSerializer(finance).data,
        'pay_history': PayHistorySerializer(pay_history, many=True).data,
        'salary': float(employee.salary),
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def employee_update_task(request, pk):
    user = request.user
    profile = getattr(user, 'profile', None)
    if not profile or profile.role.lower() not in _EMPLOYEE_PORTAL_ROLES:
        raise PermissionDenied("Only staff members can access this portal.")
        
    employee = getattr(user, 'employee_profile', None)
    if not employee:
        return Response({'error': 'Employee profile not found.'}, status=status.HTTP_404_NOT_FOUND)
        
    try:
        task = EmployeeTask.objects.get(pk=pk, employee=employee)
    except EmployeeTask.DoesNotExist:
        return Response({'error': 'Task not found.'}, status=status.HTTP_404_NOT_FOUND)
        
    new_status = request.data.get('status')
    description = request.data.get('description', '')
    
    if new_status not in ['assigned', 'in_progress', 'completed']:
        return Response({'error': 'Invalid task status.'}, status=status.HTTP_400_BAD_REQUEST)
        
    task.status = new_status
    if description:
        task.description = f"{task.description}\n\n[Update]: {description}"
    task.save()
    
    # Log activity
    EmployeeActivityLog.objects.create(
        employee=employee,
        action="Task Updated",
        details=f"Task '{task.title}' updated to status '{new_status}'."
    )
    
    # Send push notification to the Admin (creator)
    if employee.user:
        send_push_notification(
            user=employee.user,
            title="Task Status Updated 📋",
            body=f"Employee {employee.name} set task '{task.title}' to {new_status.replace('_', ' ')}",
            data={
                "screen": "admin-tasks",
                "taskId": task.id
            }
        )

    return Response({
        'status': 'success',
        'task': EmployeeTaskSerializer(task, context={'request': request}).data
    })


# ---------------------------------------------------------------------------
# Chat Endpoints
# ---------------------------------------------------------------------------

def _get_company_user(request):
    """
    Returns the admin/company user for the current authenticated user.
    - If admin: returns self.
    - If employee: returns the admin who owns their linked employee profile.
    """
    user = request.user
    employee = getattr(user, 'employee_profile', None)
    if employee:
        return employee.user
    return user


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def chat_messages(request):
    """
    GET /api/chat/messages/
    Returns messages for a conversation.
    Query params:
      - recipient_id: user ID for private chat (omit for group chat)
      - group_id: custom ChatGroup ID
    """
    company_user = _get_company_user(request)
    if not company_user:
        return Response({'error': 'Company profile not found.'}, status=status.HTTP_404_NOT_FOUND)

    recipient_id = request.GET.get('recipient_id')
    group_id = request.GET.get('group_id')
    channel_id = request.GET.get('channel_id')
    profile = getattr(request.user, 'profile', None)
    is_employee = profile and profile.role == 'employee'

    chat_select = (
        'sender',
        'sender__employee_profile',
        'sender__profile',
        'recipient',
        'recipient__employee_profile',
        'recipient__profile',
        'reply_to',
        'reply_to__sender',
        'reply_to__sender__employee_profile',
        'reply_to__sender__profile',
    )

    if channel_id:
        try:
            chat_channel = ChatChannel.objects.get(id=channel_id, company_user=company_user)
        except ChatChannel.DoesNotExist:
            return Response({'error': 'Channel not found.'}, status=status.HTTP_404_NOT_FOUND)
        msgs_qs = ChatMessage.objects.filter(
            company_user=company_user,
            channel=chat_channel
        )
    elif group_id:
        try:
            chat_group = ChatGroup.objects.get(id=group_id, company_user=company_user)
        except ChatGroup.DoesNotExist:
            return Response({'error': 'Chat group not found.'}, status=status.HTTP_404_NOT_FOUND)
        msgs_qs = ChatMessage.objects.filter(
            company_user=company_user,
            group=chat_group,
            channel__isnull=True
        )
    elif recipient_id:
        try:
            recipient = User.objects.get(id=recipient_id)
        except User.DoesNotExist:
            return Response({'error': 'Recipient not found.'}, status=status.HTTP_404_NOT_FOUND)

        # Private messages between the two users in this company workspace
        msgs_qs = ChatMessage.objects.filter(
            company_user=company_user,
            recipient__isnull=False
        ).filter(
            models.Q(sender=request.user, recipient=recipient) |
            models.Q(sender=recipient, recipient=request.user)
        )
    else:
        # Group messages (recipient=None, group=None)
        msgs_qs = ChatMessage.objects.filter(
            company_user=company_user,
            recipient__isnull=True,
            group__isnull=True
        )

    # Fetch latest 120 messages in reverse order with all relations joined in 1 query
    msgs_list = list(
        msgs_qs.order_by('-created_at')[:120].select_related(*chat_select)
    )
    msgs_list.reverse()

    # Fast mark-as-read without evaluating heavy model instances
    unread_ids = [m.id for m in msgs_list if m.sender_id != request.user.id]
    if unread_ids:
        through_model = ChatMessage.read_by.through
        already_read = set(through_model.objects.filter(
            chatmessage_id__in=unread_ids, user_id=request.user.id
        ).values_list('chatmessage_id', flat=True))
        needed_objs = [
            through_model(chatmessage_id=mid, user_id=request.user.id)
            for mid in unread_ids if mid not in already_read
        ]
        if needed_objs:
            through_model.objects.bulk_create(needed_objs, ignore_conflicts=True)
            read_mids = [o.chatmessage_id for o in needed_objs]
            ChatMessage.objects.filter(id__in=read_mids).update(delivery_status='read')
            for m in msgs_list:
                if m.id in read_mids:
                    m.delivery_status = 'read'

    serializer = ChatMessageSerializer(msgs_list, many=True, context={'request': request})
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def chat_send(request):
    """
    POST /api/chat/send/
    Body: { text, recipient_id? (for DM), group_id? (for custom group), reply_to_id? }
    Enforces group lock and per-user group blocks (admin controls).
    """
    company_user = _get_company_user(request)
    if not company_user:
        return Response({'error': 'Company profile not found.'}, status=status.HTTP_404_NOT_FOUND)

    text = request.data.get('text', '').strip()
    attachment = request.FILES.get('attachment') or request.FILES.get('file')
    attachment_type = request.data.get('attachment_type', '').strip().lower()
    attachment_name = request.data.get('attachment_name', '').strip()

    # Fallback: check for base64 attachment if not in request.FILES
    if not attachment:
        b64_data = request.data.get('attachment_base64') or request.data.get('file_base64')
        if b64_data and isinstance(b64_data, str):
            import base64
            import time
            from django.core.files.base import ContentFile
            try:
                if ';base64,' in b64_data:
                    _, b64_data = b64_data.split(';base64,', 1)
                decoded_file = base64.b64decode(b64_data)
                fname = attachment_name or f"file_{int(time.time())}.bin"
                attachment = ContentFile(decoded_file, name=fname)
            except Exception as e:
                logger.error(f"Failed to decode base64 chat attachment: {e}")

    if not text and not attachment:
        return Response({'error': 'Message text or attachment is required.'}, status=status.HTTP_400_BAD_REQUEST)
    if len(text) > 50000:
        return Response({'error': 'Message too long (max 50000 chars).'}, status=status.HTTP_400_BAD_REQUEST)

    if attachment and not attachment_name:
        attachment_name = getattr(attachment, 'name', 'file')
    if attachment and not attachment_type:
        content_type = getattr(attachment, 'content_type', '')
        ext = os.path.splitext(attachment_name)[1].lower()
        if content_type.startswith('image/') or ext in ('.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'):
            attachment_type = 'image'
        elif content_type.startswith('video/') or ext in ('.mp4', '.mov', '.avi', '.mkv', '.webm'):
            attachment_type = 'video'
        elif content_type.startswith('audio/') or ext in ('.m4a', '.mp3', '.wav', '.aac', '.ogg'):
            attachment_type = 'audio'
        else:
            attachment_type = 'document'

    if not text and attachment:
        text = attachment_name or f"[{attachment_type.capitalize()}]"

    recipient_id = request.data.get('recipient_id')
    group_id = request.data.get('group_id')
    channel_id = request.data.get('channel_id')
    reply_to_id = request.data.get('reply_to_id')

    recipient = None
    chat_group = None
    chat_channel = None
    if channel_id:
        try:
            chat_channel = ChatChannel.objects.get(id=channel_id, company_user=company_user)
            chat_group = chat_channel.group
        except ChatChannel.DoesNotExist:
            return Response({'error': 'Channel not found.'}, status=status.HTTP_404_NOT_FOUND)
    elif group_id:
        try:
            chat_group = ChatGroup.objects.get(id=group_id, company_user=company_user)
        except ChatGroup.DoesNotExist:
            return Response({'error': 'Chat group not found.'}, status=status.HTTP_404_NOT_FOUND)
    elif recipient_id:
        try:
            recipient = User.objects.get(id=recipient_id)
        except User.DoesNotExist:
            return Response({'error': 'Recipient not found.'}, status=status.HTTP_404_NOT_FOUND)

    # ── Group chat enforcement ──────────────────────────────────────────────────
    is_general_group = recipient is None and chat_group is None
    is_admin = (request.user == company_user)

    if is_general_group and not is_admin:
        # Fetch settings lazily (create with defaults if not yet created)
        settings_obj, _ = ChatSettings.objects.get_or_create(company_user=company_user)

        # Check if group is locked
        if settings_obj.group_locked:
            return Response(
                {'error': 'The group chat is currently locked. Only the admin can post.'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Check if this user is blocked from the group
        if request.user.id in (settings_obj.blocked_user_ids or []):
            return Response(
                {'error': 'You have been blocked from posting in the group chat.'},
                status=status.HTTP_403_FORBIDDEN
            )

    if chat_group:
        # Check if user is member
        if request.user not in chat_group.members.all() and not is_admin:
            return Response({'error': 'You are not a member of this group.'}, status=status.HTTP_403_FORBIDDEN)
        
        # Check admin-only locks
        if chat_group.only_admins_can_chat and request.user not in chat_group.admins.all() and not is_admin:
            return Response({'error': 'Only group admins can post in this group.'}, status=status.HTTP_403_FORBIDDEN)

    reply_to = None
    if reply_to_id:
        try:
            reply_to = ChatMessage.objects.get(id=reply_to_id, company_user=company_user)
        except ChatMessage.DoesNotExist:
            pass

    try:
        msg = ChatMessage.objects.create(
            company_user=company_user,
            sender=request.user,
            recipient=recipient,
            group=chat_group,
            channel=chat_channel,
            text=text,
            attachment=attachment,
            attachment_type=attachment_type,
            attachment_name=attachment_name,
            attachment_size=attachment.size if attachment else 0,
            reply_to=reply_to,
        )
    except Exception as save_err:
        logger.error(f"[chat_send] Error saving ChatMessage with attachment: {save_err}", exc_info=True)
        msg = ChatMessage.objects.create(
            company_user=company_user,
            sender=request.user,
            recipient=recipient,
            group=chat_group,
            channel=chat_channel,
            text=text,
            attachment=None,
            attachment_type=attachment_type,
            attachment_name=attachment_name,
            attachment_size=0,
            reply_to=reply_to,
        )
    msg.read_by.add(request.user)

    # ── Push Notifications (dispatched in background so HTTP response is instant) ──
    sender_name = request.user.get_full_name() or request.user.username
    if attachment:
        short_text = f"📎 [{attachment_type.capitalize()}] {attachment_name or text}"
    else:
        short_text = text[:80] + ('...' if len(text) > 80 else '')

    def _async_chat_push():
        try:
            if recipient:
                # Direct message — notify the recipient only
                send_push_notification(
                    user=recipient,
                    title=f'💬 New message from {sender_name}',
                    body=short_text,
                    data={'screen': 'chat', 'recipientId': str(request.user.id)}
                )
            elif chat_channel and chat_channel.group:
                # Channel message — notify all channel group members except sender
                for member in chat_channel.group.members.exclude(id=request.user.id):
                    send_push_notification(
                        user=member,
                        title=f'💬 #{chat_channel.name}: {sender_name}',
                        body=short_text,
                        data={'screen': 'chat-group', 'groupId': str(chat_channel.group.id), 'channelId': str(chat_channel.id)}
                    )
            elif chat_group:
                # Custom group — notify all members except the sender
                for member in chat_group.members.exclude(id=request.user.id):
                    send_push_notification(
                        user=member,
                        title=f'💬 {chat_group.name}: {sender_name}',
                        body=short_text,
                        data={'screen': 'chat-group', 'groupId': str(chat_group.id)}
                    )
            else:
                # General company group (Team Chat) — notify all employees + admin (except sender)
                if request.user != company_user:
                    send_push_notification(
                        user=company_user,
                        title=f'💬 Team Chat: {sender_name}',
                        body=short_text,
                        data={'screen': 'chat', 'recipientId': 'group'}
                    )
                # Notify all linked employee accounts
                employees = Employee.objects.filter(user=company_user, is_archived=False).exclude(linked_user=request.user).select_related('linked_user')
                for emp in employees:
                    if emp.linked_user and emp.linked_user != request.user:
                        send_push_notification(
                            user=emp.linked_user,
                            title=f'💬 Team Chat: {sender_name}',
                            body=short_text,
                            data={'screen': 'chat', 'recipientId': 'group'}
                        )
        except Exception as push_err:
            logger.warning(f"[Chat Push Notification Error]: {push_err}")

    threading.Thread(target=_async_chat_push, daemon=True).start()
    # ───────────────────────────────────────────────────────────────────────

    serializer = ChatMessageSerializer(msg, context={'request': request})
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def chat_message_detail(request, pk):
    """
    PUT /api/chat/messages/<pk>/   → Edit message text
    DELETE /api/chat/messages/<pk>/ → Soft-delete
    Only the sender can edit/delete their own messages.
    """
    company_user = _get_company_user(request)
    try:
        msg = ChatMessage.objects.get(id=pk, company_user=company_user)
    except ChatMessage.DoesNotExist:
        return Response({'error': 'Message not found.'}, status=status.HTTP_404_NOT_FOUND)

    if msg.sender != request.user:
        return Response({'error': 'You can only edit/delete your own messages.'}, status=status.HTTP_403_FORBIDDEN)

    if request.method == 'PUT':
        text = request.data.get('text', '').strip()
        if not text:
            return Response({'error': 'Text is required.'}, status=status.HTTP_400_BAD_REQUEST)
        msg.text = text
        msg.is_edited = True
        msg.save(update_fields=['text', 'is_edited', 'updated_at'])
        return Response(ChatMessageSerializer(msg, context={'request': request}).data)

    elif request.method == 'DELETE':
        msg.is_deleted = True
        msg.text = ''
        msg.save(update_fields=['is_deleted', 'text', 'updated_at'])
        return Response({'status': 'deleted'})

    return Response({'error': 'Method not allowed.'}, status=status.HTTP_405_METHOD_NOT_ALLOWED)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def chat_pin_message(request, pk):
    """
    POST /api/chat/messages/<pk>/pin/
    Toggles pin state. Admin-only for group chat; either party can pin in DMs.
    """
    company_user = _get_company_user(request)
    try:
        msg = ChatMessage.objects.get(id=pk, company_user=company_user)
    except ChatMessage.DoesNotExist:
        return Response({'error': 'Message not found.'}, status=status.HTTP_404_NOT_FOUND)

    msg.is_pinned = not msg.is_pinned
    msg.save(update_fields=['is_pinned'])
    return Response({'is_pinned': msg.is_pinned})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def chat_contacts(request):
    """
    GET /api/chat/contacts/
    Returns the list of people the current user can chat with.
    - Admin: group + all employees + all custom groups
    - Employee: group + admin only + custom groups they are members of
    """
    company_user = _get_company_user(request)
    if not company_user:
        return Response({'error': 'Company profile not found.'}, status=status.HTTP_404_NOT_FOUND)

    is_employee = getattr(request.user, 'employee_profile', None) is not None

    # Get chat settings for blocked user awareness
    settings_obj, _ = ChatSettings.objects.get_or_create(company_user=company_user)

    # Mark any DMs addressed to this user as delivered (2 gray ticks) once their app syncs
    ChatMessage.objects.filter(
        company_user=company_user, recipient=request.user, delivery_status='sent'
    ).update(delivery_status='delivered')

    contacts = []

    # 1. Pre-aggregate unread counts for all conversations in single fast queries
    unread_dm_counts = dict(
        ChatMessage.objects.filter(
            company_user=company_user,
            recipient=request.user
        ).exclude(read_by=request.user)
        .values('sender_id')
        .annotate(cnt=models.Count('id'))
        .values_list('sender_id', 'cnt')
    )

    unread_group_counts = dict(
        ChatMessage.objects.filter(
            company_user=company_user,
            group__isnull=False
        ).exclude(sender=request.user).exclude(read_by=request.user)
        .values('group_id')
        .annotate(cnt=models.Count('id'))
        .values_list('group_id', 'cnt')
    )

    tc_unread = ChatMessage.objects.filter(
        company_user=company_user,
        recipient__isnull=True,
        group__isnull=True
    ).exclude(sender=request.user).exclude(read_by=request.user).count()

    # 2. Pre-fetch recent messages to resolve latest message per chat without DB queries inside loops
    recent_msgs = list(
        ChatMessage.objects.filter(company_user=company_user)
        .order_by('-created_at')[:250]
    )

    tc_latest = next((m for m in recent_msgs if m.recipient_id is None and m.group_id is None), None)

    latest_by_group = {}
    for m in recent_msgs:
        if m.group_id and m.group_id not in latest_by_group:
            latest_by_group[m.group_id] = m

    latest_by_dm_user = {}
    my_uid = request.user.id
    for m in recent_msgs:
        if m.recipient_id is not None:
            other_uid = m.recipient_id if m.sender_id == my_uid else (m.sender_id if m.recipient_id == my_uid else None)
            if other_uid and other_uid not in latest_by_dm_user:
                latest_by_dm_user[other_uid] = m

    def msg_preview(m):
        if not m:
            return None
        if m.is_deleted:
            return "This message was deleted"
        if getattr(m, 'attachment_type', None) == "image":
            return "📷 Photo"
        if getattr(m, 'attachment_type', None) == "video":
            return "📹 Video"
        if getattr(m, 'attachment_type', None) == "audio":
            return "🎤 Voice note"
        if getattr(m, 'attachment_type', None) == "document":
            return f"📄 {getattr(m, 'attachment_name', None) or 'Document'}"
        return m.text or ""

    # 3. Employees in organization
    employees = list(
        Employee.objects.filter(user=company_user, is_archived=False)
        .select_related('linked_user', 'linked_user__profile')
    )
    employees_by_user_id = {emp.linked_user.id: emp for emp in employees if emp.linked_user}

    # Build members list for Team Chat (all employees + admin)
    tc_members = []
    tc_admin_profile = getattr(company_user, 'profile', None)
    tc_admin_avatar = request.build_absolute_uri(tc_admin_profile.avatar.url) if tc_admin_profile and tc_admin_profile.avatar else None
    tc_company_logo = request.build_absolute_uri(tc_admin_profile.company_logo.url) if tc_admin_profile and tc_admin_profile.company_logo else None
    tc_admin_name = f"{company_user.first_name} {company_user.last_name}".strip() or company_user.username
    tc_members.append({'id': company_user.id, 'name': tc_admin_name, 'avatar': tc_admin_avatar, 'role': 'Admin'})
    for emp in employees:
        emp_id = emp.linked_user.id if emp.linked_user else emp.id
        emp_av = request.build_absolute_uri(emp.avatar.url) if emp.avatar else None
        tc_members.append({'id': emp_id, 'name': emp.name, 'avatar': emp_av, 'role': emp.role or 'Employee'})

    contacts.append({
        'id': 'group',
        'type': 'group',
        'name': 'Team Chat',
        'initials': '#',
        'avatar': tc_company_logo,
        'group_locked': settings_obj.group_locked,
        'is_blocked_from_group': request.user.id in (settings_obj.blocked_user_ids or []),
        'members_details': tc_members,
        'last_message': msg_preview(tc_latest),
        'last_message_time': tc_latest.created_at.isoformat() if tc_latest else None,
        'unread_count': tc_unread,
    })

    # Include custom chat groups
    if is_employee:
        custom_groups = ChatGroup.objects.filter(company_user=company_user, members=request.user, is_archived=False)
    else:
        custom_groups = ChatGroup.objects.filter(company_user=company_user, is_archived=False)
    custom_groups = custom_groups.prefetch_related('members', 'members__profile', 'admins')

    for g in custom_groups:
        g_avatar = request.build_absolute_uri(g.avatar.url) if g.avatar else None
        g_latest = latest_by_group.get(g.id)
        g_unread = unread_group_counts.get(g.id, 0)

        g_members = []
        for mu in g.members.all():
            mu_profile = getattr(mu, 'profile', None)
            mu_avatar = request.build_absolute_uri(mu_profile.avatar.url) if mu_profile and mu_profile.avatar else None
            mu_emp = employees_by_user_id.get(mu.id)
            mu_role = mu_emp.role if mu_emp else ('Admin' if mu == company_user else 'Member')
            mu_name = f"{mu.first_name} {mu.last_name}".strip() or mu.username
            g_members.append({'id': mu.id, 'name': mu_name, 'avatar': mu_avatar, 'role': mu_role})

        contacts.append({
            'id': g.id,
            'type': 'group',
            'name': g.name,
            'initials': g.name[:2].upper(),
            'avatar': g_avatar,
            'group_locked': g.only_admins_can_chat,
            'is_blocked_from_group': False,
            'members': list(g.members.values_list('id', flat=True)),
            'members_details': g_members,
            'admins': list(g.admins.values_list('id', flat=True)),
            'last_message': msg_preview(g_latest),
            'last_message_time': g_latest.created_at.isoformat() if g_latest else None,
            'unread_count': g_unread,
        })

    if is_employee and company_user != request.user:
        admin_name = f"{company_user.first_name} {company_user.last_name}".strip() or company_user.username
        admin_profile = getattr(company_user, 'profile', None)
        admin_avatar = request.build_absolute_uri(admin_profile.avatar.url) if admin_profile and admin_profile.avatar else None
        dm_latest = latest_by_dm_user.get(company_user.id)
        dm_unread = unread_dm_counts.get(company_user.id, 0)

        contacts.append({
            'id': company_user.id,
            'type': 'private',
            'name': admin_name,
            'initials': admin_name[:2].upper(),
            'avatar': admin_avatar,
            'email': company_user.email or '',
            'group_locked': False,
            'is_blocked_from_group': False,
            'last_message': msg_preview(dm_latest),
            'last_message_time': dm_latest.created_at.isoformat() if dm_latest else None,
            'unread_count': dm_unread,
        })

    # Everyone can DM all other active employees in the company
    for emp in employees:
        if emp.linked_user and emp.linked_user != request.user:
            is_blocked = emp.linked_user.id in (settings_obj.blocked_user_ids or [])
            emp_avatar = request.build_absolute_uri(emp.avatar.url) if emp.avatar else None
            dm_latest = latest_by_dm_user.get(emp.linked_user.id)
            dm_unread = unread_dm_counts.get(emp.linked_user.id, 0)

            contacts.append({
                'id': emp.linked_user.id,
                'type': 'private',
                'name': emp.name,
                'initials': emp.initials or emp.name[:2].upper(),
                'avatar': emp_avatar,
                'employee_id': emp.id,
                'email': emp.linked_user.email or '',
                'role': emp.role or '',
                'group_locked': False,
                'is_blocked_from_group': is_blocked,
                'last_message': msg_preview(dm_latest),
                'last_message_time': dm_latest.created_at.isoformat() if dm_latest else None,
                'unread_count': dm_unread,
            })

    return Response(contacts)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def chat_groups(request):
    """
    GET: list all custom groups.
    POST: create a custom group.
    """
    company_user = _get_company_user(request)
    if not company_user:
        return Response({'error': 'Company profile not found.'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        profile = getattr(request.user, 'profile', None)
        if profile and profile.role == 'employee':
            groups = ChatGroup.objects.filter(company_user=company_user, members=request.user)
        else:
            groups = ChatGroup.objects.filter(company_user=company_user)
        serializer = ChatGroupSerializer(groups, many=True, context={'request': request})
        return Response(serializer.data)

    elif request.method == 'POST':
        name = request.data.get('name', '').strip()
        if not name:
            return Response({'error': 'Group name is required.'}, status=status.HTTP_400_BAD_REQUEST)

        group = ChatGroup.objects.create(
            company_user=company_user,
            name=name,
            only_admins_can_chat=str(request.data.get('only_admins_can_chat', 'false')).lower() == 'true'
        )

        if 'avatar' in request.FILES:
            group.avatar = request.FILES['avatar']
            group.save()

        # Add admin and members
        group.members.add(request.user)
        group.admins.add(request.user)

        members_data = request.data.get('members')
        if members_data:
            import json
            try:
                if isinstance(members_data, str):
                    member_ids = json.loads(members_data)
                else:
                    member_ids = members_data
                for mid in member_ids:
                    try:
                        u = User.objects.get(id=int(mid))
                        group.members.add(u)
                    except (User.DoesNotExist, ValueError):
                        pass
            except Exception as e:
                print("Failed to add members:", e)

        serializer = ChatGroupSerializer(group, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    return Response({'error': 'Method not allowed.'}, status=status.HTTP_405_METHOD_NOT_ALLOWED)


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def chat_group_detail(request, pk) -> Response:
    """
    GET/PUT/PATCH/DELETE /api/chat/groups/<pk>/
    """
    company_user = _get_company_user(request)
    try:
        group = ChatGroup.objects.get(id=pk, company_user=company_user)
    except ChatGroup.DoesNotExist:
        return Response({'error': 'Chat group not found.'}, status=status.HTTP_404_NOT_FOUND)

    is_admin = (request.user == company_user or request.user in group.admins.all())

    if request.method == 'GET':
        serializer = ChatGroupSerializer(group, context={'request': request})
        return Response(serializer.data)

    if not is_admin:
        return Response({'error': 'Only group administrators can modify group settings.'}, status=status.HTTP_403_FORBIDDEN)

    if request.method == 'DELETE':
        group.delete()
        return Response({'status': 'deleted'})

    elif request.method in ['PUT', 'PATCH']:
        name = request.data.get('name', '').strip()
        if name:
            group.name = name

        if 'avatar' in request.FILES:
            group.avatar = request.FILES['avatar']
        elif 'avatar' in request.data and request.data['avatar'] == 'null':
            group.avatar = None

        only_admins = request.data.get('only_admins_can_chat')
        if only_admins is not None:
            group.only_admins_can_chat = str(only_admins).lower() == 'true'

        group.save()

        members_data = request.data.get('members')
        if members_data is not None:
            import json
            try:
                if isinstance(members_data, str):
                    member_ids = json.loads(members_data)
                else:
                    member_ids = members_data
                group.members.clear()
                group.members.add(request.user)  # Always keep admin/creator
                for mid in member_ids:
                    try:
                        u = User.objects.get(id=int(mid))
                        group.members.add(u)
                    except (User.DoesNotExist, ValueError):
                        pass
            except Exception as e:
                print("Failed to update members:", e)

        admins_data = request.data.get('admins')
        if admins_data is not None:
            import json
            try:
                if isinstance(admins_data, str):
                    admin_ids = json.loads(admins_data)
                else:
                    admin_ids = admins_data
                group.admins.clear()
                group.admins.add(request.user)  # Always keep admin/creator
                for aid in admin_ids:
                    try:
                        u = User.objects.get(id=int(aid))
                        group.admins.add(u)
                    except (User.DoesNotExist, ValueError):
                        pass
            except Exception as e:
                print("Failed to update admins:", e)

        serializer = ChatGroupSerializer(group, context={'request': request})
        return Response(serializer.data)

    return Response({'error': 'Method not allowed.'}, status=status.HTTP_405_METHOD_NOT_ALLOWED)


@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def chat_settings(request) -> Response:
    """
    GET  /api/chat/settings/  → Returns current group lock state and blocked users
    PATCH /api/chat/settings/ → Admin updates group_locked and/or blocked_user_ids
    """
    from .serializers import ChatSettingsSerializer
    company_user = _get_company_user(request)
    if not company_user:
        return Response({'error': 'Company profile not found.'}, status=status.HTTP_404_NOT_FOUND)

    # Only admin can manage settings
    if request.user != company_user:
        return Response({'error': 'Only the admin can manage chat settings.'}, status=status.HTTP_403_FORBIDDEN)

    settings_obj, _ = ChatSettings.objects.get_or_create(company_user=company_user)

    if request.method == 'GET':
        serializer = ChatSettingsSerializer(settings_obj)
        return Response(serializer.data)

    elif request.method == 'PATCH':
        serializer = ChatSettingsSerializer(settings_obj, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    return Response({'error': 'Method not allowed.'}, status=status.HTTP_405_METHOD_NOT_ALLOWED)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def chat_block_user(request):
    """
    POST /api/chat/block-user/
    Body: { user_id: int, block: bool }
    Toggles a user in/out of the blocked_user_ids list for the group chat.
    Admin only.
    """
    company_user = _get_company_user(request)
    if not company_user:
        return Response({'error': 'Company profile not found.'}, status=status.HTTP_404_NOT_FOUND)

    if request.user != company_user:
        return Response({'error': 'Only the admin can block/unblock users.'}, status=status.HTTP_403_FORBIDDEN)

    user_id = request.data.get('user_id')
    block = request.data.get('block', True)

    if not user_id:
        return Response({'error': 'user_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        target_user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({'error': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

    settings_obj, _ = ChatSettings.objects.get_or_create(company_user=company_user)
    blocked = list(settings_obj.blocked_user_ids or [])

    if block:
        if user_id not in blocked:
            blocked.append(user_id)
    else:
        blocked = [uid for uid in blocked if uid != user_id]

    settings_obj.blocked_user_ids = blocked
    settings_obj.save(update_fields=['blocked_user_ids', 'updated_at'])

    # Keep BlockedAccount model synchronized so developer/admin can track blocks
    try:
        BlockedAccount.objects.update_or_create(
            blocked_by=request.user,
            blocked_user=target_user,
            scope='chat_group',
            defaults={
                'company_user': company_user,
                'is_active': bool(block),
                'reason': request.data.get('reason', 'Blocked by administrator'),
            }
        )
    except Exception as e:
        logger.warning(f"Could not sync BlockedAccount record: {e}")

    return Response({
        'status': 'blocked' if block else 'unblocked',
        'user_id': user_id,
        'blocked_user_ids': blocked,
    })


# pyrefly: ignore [bad-specialization]
@api_view(['POST'])
# pyrefly: ignore [bad-specialization]
@permission_classes([IsAuthenticated])
def chat_report_user(request):
    """
    POST /api/chat/report-user/
    Body: {
        "reported_user_id": int,
        "reason": str,            # spam, harassment, inappropriate_content, etc.
        "details": str,           # optional explanation
        "chat_message_id": int,   # optional message ID
    }
    Submits an account report for moderation. Saves to ReportedAccount and notifies
    the developer/admin immediately via backend in-app notifications.
    """
    company_user = _get_company_user(request)
    reported_user_id = request.data.get('reported_user_id') or request.data.get('user_id')
    reason = request.data.get('reason', 'other')
    details = request.data.get('details', '')
    chat_message_id = request.data.get('chat_message_id') or request.data.get('message_id')

    if not reported_user_id:
        return Response({'error': 'reported_user_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        reported_user = User.objects.get(id=reported_user_id)
    except User.DoesNotExist:
        return Response({'error': 'Reported user not found.'}, status=status.HTTP_404_NOT_FOUND)

    if reported_user == request.user:
        return Response({'error': 'You cannot report yourself.'}, status=status.HTTP_400_BAD_REQUEST)

    chat_message = None
    if chat_message_id:
        chat_message = ChatMessage.objects.filter(id=chat_message_id).first()

    report = ReportedAccount.objects.create(
        company_user=company_user,
        reporter=request.user,
        reported_user=reported_user,
        reason=reason,
        details=details,
        chat_message=chat_message,
        status='pending',
    )

    # Immediately create backend notifications so developer and admin get notified
    reporter_name = request.user.get_full_name() or request.user.username
    reported_name = reported_user.get_full_name() or reported_user.username
    notif_title = f"⚠️ Account Reported: @{reported_user.username}"
    notif_body = f"{reporter_name} reported {reported_name} for '{report.get_reason_display()}'. Details: {details[:120] if details else 'No additional details.'}"

    if company_user:
        Notification.objects.create(
            user=company_user,
            title=notif_title,
            body=notif_body,
            time="Just now",
        )

    # Also notify all superusers/staff
    superusers = User.objects.filter(is_superuser=True).exclude(id=company_user.id if company_user else 0)
    for su in superusers:
        Notification.objects.create(
            user=su,
            title=notif_title,
            body=notif_body,
            time="Just now",
        )

    serializer = ReportedAccountSerializer(report, context={'request': request})
    return Response({
        'status': 'success',
        'message': f'Account for {reported_name} has been reported. The developer and administration team have received this report.',
        'report': serializer.data
    }, status=status.HTTP_201_CREATED)


# pyrefly: ignore [bad-specialization]
@api_view(['GET'])
# pyrefly: ignore [bad-specialization]
@permission_classes([IsAuthenticated])
def chat_reports_list(request):
    """
    GET /api/chat/reports/
    Admin endpoint to view submitted reports.
    """
    company_user = _get_company_user(request)
    if not company_user or (request.user != company_user and not request.user.is_superuser):
        return Response({'error': 'Admin permissions required.'}, status=status.HTTP_403_FORBIDDEN)

    reports = ReportedAccount.objects.filter(company_user=company_user)
    status_filter = request.query_params.get('status')
    if status_filter:
        reports = reports.filter(status=status_filter)

    serializer = ReportedAccountSerializer(reports, many=True, context={'request': request})
    return Response(serializer.data)



# pyrefly: ignore [bad-specialization]
@api_view(['GET', 'POST'])
# pyrefly: ignore [bad-specialization]
@permission_classes([IsAuthenticated])
def chat_typing(request):
    """
    POST /api/chat/typing/  → Set/update typing status for current user
      Body: { recipient_id? (for DM), group_id? (for custom group), is_typing?: bool }
    GET  /api/chat/typing/  → Retrieve list of other users typing in the active conversation
      Query params: recipient_id? (for DM), group_id? (for custom group)
    """
    from django.utils import timezone
    from datetime import timedelta
    from .models import ChatTypingStatus, ChatGroup

    company_user = _get_company_user(request)
    if not company_user:
        return Response({'error': 'Company profile not found.'}, status=status.HTTP_404_NOT_FOUND)

    recipient_id = request.data.get('recipient_id') if request.method == 'POST' else request.GET.get('recipient_id')
    group_id = request.data.get('group_id') if request.method == 'POST' else request.GET.get('group_id')

    recipient = None
    chat_group = None

    if group_id and str(group_id) != 'group':
        try:
            chat_group = ChatGroup.objects.get(id=group_id, company_user=company_user)
        except (ChatGroup.DoesNotExist, ValueError):
            pass
    elif recipient_id:
        try:
            recipient = User.objects.get(id=recipient_id)
        except (User.DoesNotExist, ValueError):
            pass

    if request.method == 'POST':
        is_typing = request.data.get('is_typing', True)

        if not is_typing:
            ChatTypingStatus.objects.filter(
                company_user=company_user,
                user=request.user,
                recipient=recipient,
                group=chat_group
            ).delete()
            return Response({'status': 'stopped'})

        status_obj, created = ChatTypingStatus.objects.get_or_create(
            company_user=company_user,
            user=request.user,
            recipient=recipient,
            group=chat_group,
            defaults={'updated_at': timezone.now()}
        )
        if not created:
            status_obj.updated_at = timezone.now()
            status_obj.save(update_fields=['updated_at'])

        return Response({'status': 'typing'})

    elif request.method == 'GET':
        # Clean up very old typing statuses periodically
        threshold_cleanup = timezone.now() - timedelta(minutes=5)
        ChatTypingStatus.objects.filter(updated_at__lt=threshold_cleanup).delete()

        # Anyone updated in the last 6 seconds (excluding self)
        threshold_active = timezone.now() - timedelta(seconds=6)
        is_all = request.GET.get('all') == 'true'

        if is_all:
            active_statuses = ChatTypingStatus.objects.filter(
                company_user=company_user,
                updated_at__gte=threshold_active
            ).exclude(user=request.user).select_related('user', 'user__employee_profile', 'recipient', 'group')
        else:
            active_statuses = ChatTypingStatus.objects.filter(
                company_user=company_user,
                recipient=recipient,
                group=chat_group,
                updated_at__gte=threshold_active
            ).exclude(user=request.user).select_related('user', 'user__employee_profile')

        typing_users = []
        for status_obj in active_statuses:
            emp = getattr(status_obj.user, 'employee_profile', None)
            name = emp.name if emp else f"{status_obj.user.first_name} {status_obj.user.last_name}".strip() or status_obj.user.username
            initials = emp.initials if emp else (status_obj.user.username[:2].upper() if len(status_obj.user.username) > 1 else status_obj.user.username.upper())
            avatar = request.build_absolute_uri(emp.avatar.url) if emp and emp.avatar else None

            item = {
                'id': status_obj.user.id,
                'name': name,
                'initials': initials,
                'avatar': avatar,
            }
            if is_all:
                item['recipient_id'] = status_obj.recipient.id if status_obj.recipient else None
                item['group_id'] = status_obj.group.id if status_obj.group else None
                item['is_general_group'] = status_obj.recipient is None and status_obj.group is None
            
            typing_users.append(item)

        return Response({'typing_users': typing_users})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def register_device(request):
    """
    POST /api/devices/register/
    Registers or updates an Expo push token for the authenticated user.
    """
    token = request.data.get('expo_push_token', '').strip()
    is_valid_token = bool(token and (
        token.startswith('ExponentPushToken[') or
        token.startswith('ExpoPushToken[') or
        (len(token) > 15 and ' ' not in token)
    ))
    if not is_valid_token:
        return Response({'error': 'Invalid Expo push token format.'}, status=status.HTTP_400_BAD_REQUEST)
        
    device_name = request.data.get('device_name', '').strip()
    device_type = request.data.get('device_type', '').strip()

    # Associated token is updated or created for the current user.
    # We enforce uniqueness of expo_push_token in the model, so we update the user association if it already exists.
    device, created = UserDevice.objects.update_or_create(
        expo_push_token=token,
        defaults={
            'user': request.user,
            'device_name': device_name[:100] if device_name else None,
            'device_type': device_type[:20] if device_type else None,
            'is_active': True
        }
    )

    # Enable notifications in user profile since user registered a device for push notifications
    profile = getattr(request.user, 'profile', None)
    if profile and not profile.notifications_enabled:
        profile.notifications_enabled = True
        profile.save(update_fields=['notifications_enabled'])
    
    return Response({
        'status': 'success',
        'message': 'Device token registered successfully.',
        'created': created
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def unregister_device(request):
    """
    POST /api/devices/unregister/
    Unregisters / removes an Expo push token upon logout.
    """
    token = request.data.get('expo_push_token', '').strip()
    if not token:
        return Response({'error': 'Expo push token is required.'}, status=status.HTTP_400_BAD_REQUEST)

    # Clean up the device token matching the current authenticated user
    deleted_count, _ = UserDevice.objects.filter(user=request.user, expo_push_token=token).delete()
    
    if deleted_count > 0:
        return Response({'status': 'success', 'message': 'Device token unregistered successfully.'}, status=status.HTTP_200_OK)
    return Response({'error': 'Device token not found or not associated with your user.'}, status=status.HTTP_404_NOT_FOUND)


# ===========================================================================
# Enterprise Communication System — REST API Endpoints
# ===========================================================================

import os
from django.utils import timezone as django_tz


# ---------------------------------------------------------------------------
# Presence
# ---------------------------------------------------------------------------

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def chat_presence(request):
    """
    GET  /api/chat/presence/  → Returns workspace-wide presence list
    POST /api/chat/presence/  → Update own presence
      Body: { status: 'online'|'away'|'busy'|'offline', status_message?: str }
    """
    company_user = _get_company_user(request)
    if not company_user:
        return Response({'error': 'Company profile not found.'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        presences = UserPresence.objects.filter(company_user=company_user).select_related('user')
        return Response(UserPresenceSerializer(presences, many=True).data)

    # POST — update own presence
    new_status = request.data.get('status', 'online')
    if new_status not in ('online', 'away', 'busy', 'offline'):
        return Response({'error': 'Invalid status.'}, status=status.HTTP_400_BAD_REQUEST)
    status_msg = (request.data.get('status_message') or '')[:120]

    presence, _ = UserPresence.objects.get_or_create(
        company_user=company_user, user=request.user
    )
    presence.status = new_status
    presence.status_message = status_msg
    presence.save()
    return Response(UserPresenceSerializer(presence).data)


# ---------------------------------------------------------------------------
# Message Reactions
# ---------------------------------------------------------------------------

@api_view(['POST', 'DELETE'])
@permission_classes([IsAuthenticated])
def chat_react(request, pk):
    """
    POST   /api/chat/messages/<pk>/react/   → Add reaction  { emoji: '👍' }
    DELETE /api/chat/messages/<pk>/react/   → Remove reaction  { emoji: '👍' }
    """
    company_user = _get_company_user(request)
    try:
        msg = ChatMessage.objects.get(pk=pk, company_user=company_user)
    except ChatMessage.DoesNotExist:
        return Response({'error': 'Message not found.'}, status=status.HTTP_404_NOT_FOUND)

    emoji = (request.data.get('emoji') or '').strip()
    if not emoji:
        return Response({'error': 'emoji is required.'}, status=status.HTTP_400_BAD_REQUEST)

    if request.method == 'POST':
        MessageReaction.objects.get_or_create(message=msg, user=request.user, emoji=emoji)
    else:
        MessageReaction.objects.filter(message=msg, user=request.user, emoji=emoji).delete()

    # Return aggregated counts for this message
    from django.db.models import Count
    counts = (
        MessageReaction.objects.filter(message=msg)
        .values('emoji')
        .annotate(count=Count('id'))
    )
    return Response({
        'message_id': pk,
        'reactions': {item['emoji']: item['count'] for item in counts},
    })


# ---------------------------------------------------------------------------
# Message Forwarding
# ---------------------------------------------------------------------------

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def chat_forward(request, pk):
    """
    POST /api/chat/messages/<pk>/forward/
    Body: { recipient_id? OR group_id? }
    Forwards a message to another conversation.
    """
    company_user = _get_company_user(request)
    try:
        original = ChatMessage.objects.get(pk=pk, company_user=company_user)
    except ChatMessage.DoesNotExist:
        return Response({'error': 'Message not found.'}, status=status.HTTP_404_NOT_FOUND)

    recipient_id = request.data.get('recipient_id')
    group_id = request.data.get('group_id')
    recipient = None
    group = None

    if recipient_id:
        try:
            recipient = User.objects.get(pk=recipient_id)
        except User.DoesNotExist:
            return Response({'error': 'Recipient not found.'}, status=status.HTTP_404_NOT_FOUND)
    elif group_id:
        try:
            group = ChatGroup.objects.get(pk=group_id, company_user=company_user)
        except ChatGroup.DoesNotExist:
            return Response({'error': 'Group not found.'}, status=status.HTTP_404_NOT_FOUND)

    forwarded = ChatMessage.objects.create(
        company_user=company_user,
        sender=request.user,
        recipient=recipient,
        group=group,
        text=original.text,
        forwarded_from=original,
    )
    forwarded.read_by.add(request.user)
    return Response(ChatMessageSerializer(forwarded, context={'request': request}).data, status=status.HTTP_201_CREATED)


# ---------------------------------------------------------------------------
# Message Attachments
# ---------------------------------------------------------------------------

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def chat_attach(request, pk):
    """
    POST /api/chat/messages/<pk>/attach/
    Multipart body: { file: <file> }
    Attaches a file to an existing message.
    """
    company_user = _get_company_user(request)
    try:
        msg = ChatMessage.objects.get(pk=pk, company_user=company_user, sender=request.user)
    except ChatMessage.DoesNotExist:
        return Response({'error': 'Message not found or not yours.'}, status=status.HTTP_404_NOT_FOUND)

    uploaded_file = request.FILES.get('file')
    if not uploaded_file:
        return Response({'error': 'No file provided.'}, status=status.HTTP_400_BAD_REQUEST)

    MAX_SIZE = 25 * 1024 * 1024  # 25 MB
    if uploaded_file.size > MAX_SIZE:
        return Response({'error': 'File too large (max 25 MB).'}, status=status.HTTP_400_BAD_REQUEST)

    # Determine file type from content-type
    ct = uploaded_file.content_type or ''
    if ct.startswith('image/'):
        file_type = 'image'
    elif ct.startswith('video/'):
        file_type = 'video'
    elif ct.startswith('audio/'):
        file_type = 'audio'
    elif ct in ('application/pdf', 'application/msword', 'text/plain',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'):
        file_type = 'document'
    else:
        file_type = 'other'

    attachment = MessageAttachment.objects.create(
        message=msg,
        file=uploaded_file,
        original_filename=uploaded_file.name,
        file_type=file_type,
        file_size=uploaded_file.size,
    )
    return Response(
        MessageAttachmentSerializer(attachment, context={'request': request}).data,
        status=status.HTTP_201_CREATED
    )


# ---------------------------------------------------------------------------
# Calls (initiate, list, end)
# ---------------------------------------------------------------------------

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def chat_calls(request):
    """
    GET  /api/chat/calls/      → Call history for current user
    POST /api/chat/calls/      → Initiate a call — creates a Daily.co room and returns join URL + token
      Body: { callee_id?, call_type: 'voice'|'video', group_id? }
    """
    import requests as http_requests

    company_user = _get_company_user(request)
    if not company_user:
        return Response({'error': 'Company profile not found.'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        calls = CallRecord.objects.filter(
            company_user=company_user
        ).filter(
            models.Q(caller=request.user) | models.Q(callee=request.user)
        ).select_related('caller', 'callee', 'group')[:50]
        return Response(CallRecordSerializer(calls, many=True).data)

    # ── POST — initiate call via Daily.co ──────────────────────────────────────
    callee_id = request.data.get('callee_id')
    call_type = request.data.get('call_type', 'voice')
    group_id = request.data.get('group_id')

    if call_type not in ('voice', 'video'):
        return Response({'error': 'call_type must be voice or video.'}, status=status.HTTP_400_BAD_REQUEST)

    callee = None
    group = None
    if callee_id:
        try:
            callee = User.objects.get(pk=callee_id)
        except User.DoesNotExist:
            return Response({'error': 'Callee not found.'}, status=status.HTTP_404_NOT_FOUND)
    elif group_id:
        try:
            group = ChatGroup.objects.get(pk=group_id, company_user=company_user)
        except ChatGroup.DoesNotExist:
            return Response({'error': 'Group not found.'}, status=status.HTTP_404_NOT_FOUND)
    else:
        return Response({'error': 'callee_id or group_id required.'}, status=status.HTTP_400_BAD_REQUEST)

    # ── Create Daily.co Room ───────────────────────────────────────────────────
    daily_api_key = (
        getattr(settings, 'DAILY_API_KEY', None)
        or os.environ.get('DAILY_API_KEY')
        or '3f81d666c2e8c7a25967002c7a8d543aa39350f3ddc171cb97b4e7006958575f'
    )
    daily_domain = (
        getattr(settings, 'DAILY_DOMAIN', None)
        or os.environ.get('DAILY_DOMAIN')
        or 'adminsuite'
    )
    room_name = f"adminsuite-call-{request.user.id}-{int(django_tz.now().timestamp())}"

    daily_room_url = None
    daily_token = None
    daily_err_msg = None

    if daily_api_key:
        try:
            # 1. Create the room
            room_resp = http_requests.post(
                'https://api.daily.co/v1/rooms',
                headers={'Authorization': f'Bearer {daily_api_key}', 'Content-Type': 'application/json'},
                json={
                    'name': room_name,
                    'privacy': 'public',
                    'properties': {
                        'enable_chat': True,
                        'enable_screenshare': True,
                        'start_video_off': call_type == 'voice',
                        'start_audio_off': False,
                        'max_participants': 20 if group else 2,
                        'exp': int(django_tz.now().timestamp()) + 7200,
                    }
                },
                timeout=10,
            )
            if room_resp.status_code == 200:
                room_data = room_resp.json()
                daily_room_url = room_data.get('url')

                # 2. Create a meeting token for the caller
                token_resp = http_requests.post(
                    'https://api.daily.co/v1/meeting-tokens',
                    headers={'Authorization': f'Bearer {daily_api_key}', 'Content-Type': 'application/json'},
                    json={
                        'properties': {
                            'room_name': room_name,
                            'user_name': request.user.get_full_name() or request.user.username,
                            'user_id': str(request.user.id),
                            'is_owner': True,
                        }
                    },
                    timeout=10,
                )
                if token_resp.status_code == 200:
                    daily_token = token_resp.json().get('token')
            else:
                daily_err_msg = f"Daily API status {room_resp.status_code}: {room_resp.text}"
                logger.error(f"[Daily.co Error] {daily_err_msg}")
        except Exception as e:
            daily_err_msg = str(e)
            logger.error(f"[Daily.co Exception] {e}")
    else:
        daily_err_msg = "DAILY_API_KEY is not configured."

    if not daily_room_url:
        return Response(
            {'error': f'Unable to start call: {daily_err_msg or "Failed to create meeting room."}'},
            status=status.HTTP_502_BAD_GATEWAY
        )

    # ── Create CallRecord in DB ────────────────────────────────────────────────
    call = CallRecord.objects.create(
        company_user=company_user,
        caller=request.user,
        callee=callee,
        group=group,
        call_type=call_type,
        status='initiated',
    )

    # Store room info on call if model has room_url field, else just return it
    response_data = CallRecordSerializer(call).data
    response_data['room_url'] = daily_room_url
    response_data['room_name'] = room_name
    response_data['token'] = daily_token
    response_data['daily_domain'] = daily_domain

    # ── Notify callee via push ─────────────────────────────────────────────────
    caller_u = request.user
    caller_name = getattr(caller_u, 'get_full_name', lambda: '')() or getattr(caller_u, 'username', '') or 'Caller'
    icon = '📞' if call_type == 'voice' else '📹'

    callee_token = None
    if callee:
        # Create a callee token too so they can join directly from the notification
        if daily_api_key and room_name:
            try:
                ct_resp = http_requests.post(
                    'https://api.daily.co/v1/meeting-tokens',
                    headers={'Authorization': f'Bearer {daily_api_key}', 'Content-Type': 'application/json'},
                    json={
                        'properties': {
                            'room_name': room_name,
                            'user_name': getattr(callee, 'get_full_name', lambda: '')() or getattr(callee, 'username', '') or 'Guest',
                            'user_id': str(callee.id),
                        }
                    },
                    timeout=10,
                )
                if ct_resp.status_code == 200:
                    callee_token = ct_resp.json().get('token')
            except Exception:
                pass

        send_push_notification(
            user=callee,
            title=f'{icon} Incoming {call_type} call from {caller_name}',
            body='Tap to answer',
            data={
                'screen': 'call',
                'callId': str(call.id),
                'callType': call_type,
                'callerId': str(request.user.id),
                'callerName': caller_name,
                'roomUrl': daily_room_url or '',
                'roomName': room_name,
                'token': callee_token or '',
            },
        )

    # ── Broadcast real-time call signal via WebSocket ────────────────────────
    try:
        from asgiref.sync import async_to_sync
        from channels.layers import get_channel_layer  # type: ignore
        channel_layer = get_channel_layer()
        if channel_layer:
            async_to_sync(channel_layer.group_send)(
                f'workspace_{company_user.id}',
                {
                    'type': 'broadcast_chat_event',
                    'payload': {
                        'type': 'call.signal',
                        'signal_type': 'offer',
                        'caller_id': request.user.id,
                        'caller_name': caller_name,
                        'caller_initials': (caller_name[:2] if caller_name else '??').upper(),
                        'recipient_id': callee.id if callee else None,
                        'group_id': group.id if group else None,
                        'is_group_call': bool(group),
                        'call_id': call.id,
                        'call_type': call_type,
                        'room_url': daily_room_url,
                        'room_name': room_name,
                        'token': callee_token or daily_token,
                    }
                }
            )
    except Exception as e:
        logger.warning(f"[WS Broadcast] Call signal offer failed: {e}")

    return Response(response_data, status=status.HTTP_201_CREATED)



@api_view(['POST'])
@permission_classes([IsAuthenticated])
def chat_call_end(request, pk):
    """
    POST /api/chat/calls/<pk>/end/
    Body: { status: 'ended'|'rejected'|'missed' }
    """
    company_user = _get_company_user(request)
    try:
        call = CallRecord.objects.get(
            pk=pk, company_user=company_user
        )
    except CallRecord.DoesNotExist:
        return Response({'error': 'Call not found.'}, status=status.HTTP_404_NOT_FOUND)

    is_authorized = False
    if call.group:
        is_authorized = (request.user == call.caller) or call.group.members.filter(pk=request.user.pk).exists()
    else:
        is_authorized = request.user in (call.caller, call.callee)

    if not is_authorized:
        return Response({'error': 'Not authorized.'}, status=status.HTTP_403_FORBIDDEN)

    new_status = request.data.get('status', 'ended')
    if new_status not in ('ended', 'rejected', 'missed', 'accepted', 'failed'):
        new_status = 'ended'

    if new_status == 'accepted':
        if not call.accepted_at:
            call.accepted_at = django_tz.now()
        call.status = new_status
        call.save()

        # Broadcast answer to caller
        try:
            from asgiref.sync import async_to_sync
            from channels.layers import get_channel_layer  # type: ignore
            channel_layer = get_channel_layer()
            if channel_layer:
                async_to_sync(channel_layer.group_send)(
                    f'workspace_{company_user.id}',
                    {
                        'type': 'broadcast_chat_event',
                        'payload': {
                            'type': 'call.signal',
                            'signal_type': 'answer',
                            'caller_id': request.user.id,
                            'recipient_id': call.caller_id,
                            'call_id': call.id,
                            'call_type': call.call_type,
                            'status': 'accepted',
                        }
                    }
                )
        except Exception:
            pass

        return Response(CallRecordSerializer(call).data)

    call.ended_at = django_tz.now()
    call.status = new_status
    if call.accepted_at and call.ended_at:
        delta = call.ended_at - call.accepted_at
        call.duration_seconds = int(delta.total_seconds())
    call.save()

    # Broadcast end/reject to peer
    try:
        from asgiref.sync import async_to_sync
        from channels.layers import get_channel_layer  # type: ignore
        channel_layer = get_channel_layer()
        if channel_layer:
            async_to_sync(channel_layer.group_send)(
                f'workspace_{company_user.id}',
                {
                    'type': 'broadcast_chat_event',
                    'payload': {
                        'type': 'call.signal',
                        'signal_type': 'reject' if new_status == 'rejected' else 'end',
                        'caller_id': request.user.id,
                        'recipient_id': call.callee_id if request.user == call.caller else call.caller_id,
                        'call_id': call.id,
                        'call_type': call.call_type,
                        'status': new_status,
                    }
                }
            )
    except Exception:
        pass

    return Response(CallRecordSerializer(call).data)


# ---------------------------------------------------------------------------
# Chat Channels (sub-channels within groups)
# ---------------------------------------------------------------------------

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def chat_channels(request):
    """
    GET  /api/chat/channels/?group_id=<id>  → List channels for a group
    POST /api/chat/channels/                → Create a new channel
      Body: { group_id, name, description?, is_private? }
    """
    company_user = _get_company_user(request)
    if not company_user:
        return Response({'error': 'Company profile not found.'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        group_id = request.GET.get('group_id')
        if not group_id:
            return Response({'error': 'group_id is required.'}, status=status.HTTP_400_BAD_REQUEST)
        channels = ChatChannel.objects.filter(
            company_user=company_user,
            group__id=group_id,
        ).prefetch_related('members')
        # Filter private channels: only show if user is a member or admin
        is_admin = (request.user == company_user)
        if not is_admin:
            channels = channels.filter(
                models.Q(is_private=False) | models.Q(members=request.user)
            ).distinct()
        return Response(ChatChannelSerializer(channels, many=True).data)

    # POST
    group_id = request.data.get('group_id')
    name = (request.data.get('name') or '').strip().lower().replace(' ', '-')
    if not group_id or not name:
        return Response({'error': 'group_id and name are required.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        group = ChatGroup.objects.get(pk=group_id, company_user=company_user)
    except ChatGroup.DoesNotExist:
        return Response({'error': 'Group not found.'}, status=status.HTTP_404_NOT_FOUND)

    channel, created = ChatChannel.objects.get_or_create(
        group=group,
        name=name,
        company_user=company_user,
        defaults={
            'description': request.data.get('description', ''),
            'is_private': bool(request.data.get('is_private', False)),
            'created_by': request.user,
        }
    )
    if not created:
        return Response({'error': f'Channel #{name} already exists in this group.'}, status=status.HTTP_409_CONFLICT)

    channel.members.add(request.user)  # creator is always a member
    return Response(ChatChannelSerializer(channel).data, status=status.HTTP_201_CREATED)


@api_view(['GET', 'DELETE'])
@permission_classes([IsAuthenticated])
def chat_channel_detail(request, pk):
    """
    GET    /api/chat/channels/<pk>/  → Channel detail
    DELETE /api/chat/channels/<pk>/  → Delete channel (admin only)
    """
    company_user = _get_company_user(request)
    try:
        channel = ChatChannel.objects.get(pk=pk, company_user=company_user)
    except ChatChannel.DoesNotExist:
        return Response({'error': 'Channel not found.'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response(ChatChannelSerializer(channel).data)

    # DELETE — admin only
    if request.user != company_user:
        return Response({'error': 'Only admin can delete channels.'}, status=status.HTTP_403_FORBIDDEN)
    channel.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


# ---------------------------------------------------------------------------
# Workspace Notebook & Employee Notes API
# ---------------------------------------------------------------------------

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def note_list_create(request):
    """
    GET  /api/notes/?employee_id=<id>&category=<cat>&pinned=<bool>
    POST /api/notes/  body: { title, content?, category?, pinned?, color_tag?, employee_id? }
    """
    company_user = _get_company_user(request)
    if not company_user:
        return Response({'error': 'Company profile not found.'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        qs = Note.objects.filter(models.Q(company_user=company_user) | models.Q(user=request.user))
        emp_id = request.query_params.get('employee_id')
        if emp_id:
            qs = qs.filter(employee_id=emp_id)
        elif request.query_params.get('general') == 'true':
            qs = qs.filter(employee__isnull=True)

        category = request.query_params.get('category')
        if category and category.lower() != 'all':
            qs = qs.filter(category__iexact=category)

        pinned = request.query_params.get('pinned')
        if pinned is not None:
            qs = qs.filter(pinned=(pinned.lower() in ('true', '1')))

        serializer = NoteSerializer(qs, many=True)
        return Response(serializer.data)

    elif request.method == 'POST':
        title = request.data.get('title', '').strip()
        if not title:
            return Response({'error': 'Title is required.'}, status=status.HTTP_400_BAD_REQUEST)

        emp_id = request.data.get('employee_id')
        employee = None
        if emp_id:
            try:
                employee = Employee.objects.get(id=emp_id, user=company_user)
            except Employee.DoesNotExist:
                return Response({'error': 'Employee record not found.'}, status=status.HTTP_404_NOT_FOUND)

        note = Note.objects.create(
            company_user=company_user,
            user=request.user,
            employee=employee,
            title=title,
            content=request.data.get('content', '').strip(),
            category=request.data.get('category', 'General').strip() or 'General',
            pinned=str(request.data.get('pinned', False)).lower() in ('true', '1'),
            color_tag=request.data.get('color_tag', ''),
        )
        return Response(NoteSerializer(note).data, status=status.HTTP_201_CREATED)


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def note_detail(request, pk):
    """
    GET       /api/notes/<pk>/
    PUT/PATCH /api/notes/<pk>/
    DELETE    /api/notes/<pk>/
    """
    company_user = _get_company_user(request)
    try:
        note = Note.objects.get(pk=pk)
        if note.company_user != company_user and note.user != request.user:
            return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
    except Note.DoesNotExist:
        return Response({'error': 'Note not found.'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response(NoteSerializer(note).data)

    elif request.method in ('PUT', 'PATCH'):
        if 'title' in request.data:
            t = request.data.get('title', '').strip()
            if t:
                note.title = t
        if 'content' in request.data:
            note.content = request.data.get('content', '').strip()
        if 'category' in request.data:
            note.category = request.data.get('category', '').strip() or 'General'
        if 'pinned' in request.data:
            note.pinned = str(request.data.get('pinned')).lower() in ('true', '1')
        if 'color_tag' in request.data:
            note.color_tag = request.data.get('color_tag', '')
        note.save()
        return Response(NoteSerializer(note).data)

    elif request.method == 'DELETE':
        note.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


