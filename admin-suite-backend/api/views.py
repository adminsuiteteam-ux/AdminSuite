from django.conf import settings
from django.contrib.auth.models import User
from django.db import models
from django.db.models import Sum
from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes, throttle_classes, action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.exceptions import PermissionDenied, ValidationError
from .models import (
    Employee, EmployeeFinance, PayHistory, Client, Project, Transaction,
    Notification, Debt, BudgetCategory, Savings, EmployeeActivityLog,
    EmployeeQuery, EmployeeTask, EmployeeLeave, EmployeeMessage,
    EmployeeDocument, SalaryAdjustment, PayrollStatus, ChatMessage
)
from .serializers import (
    EmployeeSerializer, ClientSerializer, ProjectSerializer,
    TransactionSerializer, NotificationSerializer, DebtSerializer,
    BudgetCategorySerializer, SavingsSerializer, UserSerializer,
    UserProfileSerializer, RegisterSerializer, EmployeeActivityLogSerializer,
    EmployeeQuerySerializer, EmployeeTaskSerializer, EmployeeLeaveSerializer,
    EmployeeMessageSerializer, EmployeeDocumentSerializer, SalaryAdjustmentSerializer,
    EmployeeFinanceSerializer, PayHistorySerializer, ChatMessageSerializer
)


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

        username = request.data.get('username', '').strip()
        password = request.data.get('password', '')

        if not username or not password:
            return Response({'error': 'Username and password are required.'}, status=status.HTTP_400_BAD_REQUEST)

        # Resolve email to username if email is used
        target_user = None
        if '@' in username:
            try:
                target_user = User.objects.get(email__iexact=username)
            except User.DoesNotExist:
                pass
        else:
            try:
                target_user = User.objects.get(username__iexact=username)
            except User.DoesNotExist:
                pass

        profile = None
        if target_user:
            profile, _ = UserProfile.objects.get_or_create(user=target_user)
            # Check if currently suspended
            if profile.suspended_until and profile.suspended_until > timezone.now():
                time_left = int((profile.suspended_until - timezone.now()).total_seconds())
                minutes_left = max(1, (time_left + 59) // 60)
                # Show standard lockout screen block
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



class EmployeeViewSet(viewsets.ModelViewSet):
    serializer_class = EmployeeSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Employee.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

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
        return Response({'status': 'success', 'is_flagged': employee.is_flagged})

    @action(detail=True, methods=['post'])
    def archive(self, request, pk=None):
        employee = self.get_object()
        employee.is_archived = True
        employee.save(update_fields=['is_archived'])
        # Log activity
        EmployeeActivityLog.objects.create(
            employee=employee,
            action="Archived",
            details="Employee profile has been archived/deactivated."
        )
        return Response({'status': 'success', 'is_archived': True})

    @action(detail=True, methods=['post'])
    def restore(self, request, pk=None):
        employee = self.get_object()
        employee.is_archived = False
        employee.save(update_fields=['is_archived'])
        # Log activity
        EmployeeActivityLog.objects.create(
            employee=employee,
            action="Restored",
            details="Employee profile has been restored/reactivated."
        )
        return Response({'status': 'success', 'is_archived': False})


class ClientViewSet(viewsets.ModelViewSet):
    serializer_class = ClientSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Client.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class ProjectViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Project.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class TransactionViewSet(viewsets.ModelViewSet):
    serializer_class = TransactionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Transaction.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class DebtViewSet(viewsets.ModelViewSet):
    serializer_class = DebtSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Debt.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class BudgetCategoryViewSet(viewsets.ModelViewSet):
    serializer_class = BudgetCategorySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return BudgetCategory.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class SavingsViewSet(viewsets.ModelViewSet):
    serializer_class = SavingsSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Savings.objects.filter(user=self.request.user)

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
            if len(password) < 8:
                return Response({'password': ['Password must be at least 8 characters long.']}, status=status.HTTP_400_BAD_REQUEST)
            user.set_password(password)
            user.save()
            profile.is_first_login = False
            profile.save()

        # Update profile fields
        profile_serializer = UserProfileSerializer(profile, data=request.data, partial=True)
        if profile_serializer.is_valid():
            profile_serializer.save(profile_complete=True)
        else:
            return Response(profile_serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    name = f"{user.first_name} {user.last_name}".strip() or user.username
    profile_data = UserProfileSerializer(profile).data
    avatar_url = None
    if profile.avatar:
        avatar_url = request.build_absolute_uri(profile.avatar.url)
    company_logo_url = None
    if profile.company_logo:
        company_logo_url = request.build_absolute_uri(profile.company_logo.url)

    employee_id = None
    if profile.role == 'employee':
        employee = getattr(user, 'employee_profile', None)
        if employee:
            employee_id = employee.id

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
    })


@api_view(['POST'])
@throttle_classes([AuthRateThrottle])
def register(request):
    """Simplified user registration: email + password + confirm_password.
    Returns an auth token immediately on success."""
    from rest_framework.authtoken.models import Token
    from .models import UserProfile, EmailVerificationCode

    email = request.data.get('email', '').strip().lower()
    supabase_verified = request.data.get('supabase_verified')

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

    # Enforce that email verification has been completed (optional for external Supabase validation)
    verification = None
    if not supabase_verified:
        try:
            verification = EmailVerificationCode.objects.get(email=email)
            if verification.code != 'VERIFIED':
                return Response({'error': 'Email verification has not been completed.'}, status=status.HTTP_400_BAD_REQUEST)
        except EmailVerificationCode.DoesNotExist:
            return Response({'error': 'Email verification has not been completed.'}, status=status.HTTP_400_BAD_REQUEST)

    serializer = RegisterSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    user = serializer.save()
    
    # Delete the verification record after successful registration if it exists
    if verification:
        verification.delete()
    
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
    user = request.user
    total_income = Transaction.objects.filter(
        user=user, type='income'
    ).aggregate(total=Sum('amount'))['total'] or 0
    total_expense = Transaction.objects.filter(
        user=user, type='expense'
    ).aggregate(total=Sum('amount'))['total'] or 0
    return Response({
        'employees': Employee.objects.filter(user=user).exclude(status='terminated').count(),
        'activeProjects': Project.objects.filter(user=user, status='active').count(),
        'clients': Client.objects.filter(user=user).count(),
        'netProfit': float(total_income) - float(total_expense),
        'totalIncome': float(total_income),
        'totalExpense': float(total_expense),
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def client_metrics(request):
    """Client breakdown — mirrors getClientMetrics()"""
    user = request.user
    return Response({
        'active': Client.objects.filter(user=user, status='active').count(),
        'pending': Client.objects.filter(user=user, status='pending').count(),
        'completed': Client.objects.filter(user=user, status='completed').count(),
        'total': Client.objects.filter(user=user).count(),
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
    staff_paid = Employee.objects.filter(user=user, status='active').count()
    
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
    
    return Response({
        'month': payroll_status.month,
        'paid': payroll_status.paid,
        'success': True
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def debts_grouped(request):
    """Debts grouped as weOwe / owedToUs — mirrors the frontend structure"""
    user = request.user
    we_owe = DebtSerializer(Debt.objects.filter(user=user, type='weOwe'), many=True).data
    owed_to_us = DebtSerializer(Debt.objects.filter(user=user, type='owedToUs'), many=True).data
    return Response({
        'weOwe': we_owe,
        'owedToUs': owed_to_us,
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

    if not google_verified and not settings.DEBUG:
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
    Send an 8-digit verification code to the given email address.
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

    # Generate 8-digit code using a secure PRNG
    code = ''.join([str(secrets.randbelow(10)) for _ in range(8)])

    # Store/Update verification code
    EmailVerificationCode.objects.update_or_create(
        email=email,
        defaults={'code': code},
    )

    # TODO(security): In production, integrate an email service (e.g. SendGrid, Amazon SES)
    # to deliver the verification code instead of returning it in the response.
    # For local dev/debugging we print it to console and return in response if settings.DEBUG is True.
    from core.safe_logger import safe_log, mask_email
    safe_log("info", "Verification code generated", extra={"email": mask_email(email), "code": "***"})

    response_data = {'message': 'Verification code sent successfully.', 'email': email}
    if settings.DEBUG:
        response_data['code'] = code  # Dev convenience only

    return Response(response_data)


@api_view(['POST'])
@throttle_classes([AuthRateThrottle])
def verify_email(request):
    """
    Verify the 8-digit email code.
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


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def export_data(request):
    from .pdf_generator import build_pdf_report
    import csv
    from django.http import HttpResponse

    export_format = request.GET.get('format', 'pdf').strip().lower()
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

    # The email must be the same with what they used to create their account with
    try:
        user = User.objects.get(email__iexact=email)
    except User.DoesNotExist:
        return Response({'error': 'No account found with this email.'}, status=status.HTTP_400_BAD_REQUEST)

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

    # Store/Update verification code
    PasswordResetCode.objects.update_or_create(
        email=email,
        defaults={'code': code},
    )

    from core.safe_logger import safe_log, mask_email
    safe_log("info", "Password reset code generated", extra={"email": mask_email(email), "code": "***"})

    response_data = {'message': 'Verification code sent successfully.', 'email': email}
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

    if len(new_password) < 8:
        return Response({'error': 'Password must be at least 8 characters long.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        record = PasswordResetCode.objects.get(email=email)
    except PasswordResetCode.DoesNotExist:
        return Response({'error': 'No reset code found for this email. Please request a new one.'}, status=status.HTTP_400_BAD_REQUEST)

    if record.code != "VERIFIED":
        return Response({'error': 'OTP verification has not been completed.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = User.objects.get(email__iexact=email)
    except User.DoesNotExist:
        return Response({'error': 'User not found.'}, status=status.HTTP_400_BAD_REQUEST)

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
        return EmployeeActivityLog.objects.filter(employee__user=self.request.user).order_by('-created_at')


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


class EmployeeTaskViewSet(viewsets.ModelViewSet):
    serializer_class = EmployeeTaskSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return EmployeeTask.objects.filter(employee__user=self.request.user).order_by('-created_at')

    def perform_create(self, serializer):
        employee = serializer.validated_data.get('employee')
        if employee.user != self.request.user:
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


class EmployeeLeaveViewSet(viewsets.ModelViewSet):
    serializer_class = EmployeeLeaveSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return EmployeeLeave.objects.filter(employee__user=self.request.user).order_by('-created_at')

    def perform_create(self, serializer):
        employee = serializer.validated_data.get('employee')
        if employee.user != self.request.user:
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

    def perform_destroy(self, instance):
        employee = instance.employee
        doc_name = instance.name
        instance.delete()
        EmployeeActivityLog.objects.create(
            employee=employee,
            action="Document Deleted",
            details=f"Deleted document: {doc_name}"
        )


class SalaryAdjustmentViewSet(viewsets.ModelViewSet):
    serializer_class = SalaryAdjustmentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return SalaryAdjustment.objects.filter(employee__user=self.request.user).order_by('-created_at')

    def perform_create(self, serializer):
        employee = serializer.validated_data.get('employee')
        if employee.user != self.request.user:
            raise PermissionDenied("You do not have permission to adjust salary for this employee.")
        
        adj_type = serializer.validated_data.get('adjustment_type')
        amount = serializer.validated_data.get('amount')
        prev_salary = employee.salary
        
        if adj_type == 'increment':
            new_salary = prev_salary + amount
        elif adj_type == 'decrement':
            new_salary = max(0, prev_salary - amount)
        elif adj_type == 'bonus':
            new_salary = prev_salary
            employee.finance.bonuses += amount
            employee.finance.save(update_fields=['bonuses'])
        elif adj_type == 'correction':
            new_salary = amount
        else:
            new_salary = prev_salary
            
        instance = serializer.save(previous_salary=prev_salary, new_salary=new_salary)
        
        if adj_type != 'bonus':
            employee.salary = new_salary
            employee.finance.current_pay = new_salary
            employee.save(update_fields=['salary'])
            employee.finance.save(update_fields=['current_pay'])
            
        EmployeeActivityLog.objects.create(
            employee=employee,
            action="Salary Adjusted",
            details=f"Adjusted salary ({adj_type}): {prev_salary} -> {new_salary} (Amount: {amount})"
        )


# ---------------------------------------------------------------------------
# Employee Portal Endpoints
# ---------------------------------------------------------------------------

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def employee_dashboard(request):
    user = request.user
    profile = getattr(user, 'profile', None)
    if not profile or profile.role != 'employee':
        raise PermissionDenied("Only employees can access this portal.")
        
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
    if not profile or profile.role != 'employee':
        raise PermissionDenied("Only employees can access this portal.")
        
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
    if not profile or profile.role != 'employee':
        raise PermissionDenied("Only employees can access this portal.")
        
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
    profile = getattr(user, 'profile', None)
    if profile and profile.role == 'employee':
        employee = getattr(user, 'employee_profile', None)
        if employee:
            return employee.user
        return None
    return user


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def chat_messages(request):
    """
    GET /api/chat/messages/
    Returns messages for a conversation.
    Query params:
      - recipient_id: user ID for private chat (omit for group chat)
    """
    company_user = _get_company_user(request)
    if not company_user:
        return Response({'error': 'Company profile not found.'}, status=status.HTTP_404_NOT_FOUND)

    recipient_id = request.GET.get('recipient_id')
    profile = getattr(request.user, 'profile', None)
    is_employee = profile and profile.role == 'employee'

    if recipient_id:
        try:
            recipient = User.objects.get(id=recipient_id)
        except User.DoesNotExist:
            return Response({'error': 'Recipient not found.'}, status=status.HTTP_404_NOT_FOUND)

        # Private messages between the two users in this company workspace
        msgs = ChatMessage.objects.filter(
            company_user=company_user,
            recipient__isnull=False
        ).filter(
            models.Q(sender=request.user, recipient=recipient) |
            models.Q(sender=recipient, recipient=request.user)
        ).select_related('sender', 'recipient', 'reply_to', 'reply_to__sender')
    else:
        # Group messages (recipient=None)
        msgs = ChatMessage.objects.filter(
            company_user=company_user,
            recipient__isnull=True
        ).select_related('sender', 'reply_to', 'reply_to__sender')

    serializer = ChatMessageSerializer(msgs, many=True, context={'request': request})
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def chat_send(request):
    """
    POST /api/chat/send/
    Body: { text, recipient_id? (for DM), reply_to_id? }
    """
    company_user = _get_company_user(request)
    if not company_user:
        return Response({'error': 'Company profile not found.'}, status=status.HTTP_404_NOT_FOUND)

    text = request.data.get('text', '').strip()
    if not text:
        return Response({'error': 'Message text is required.'}, status=status.HTTP_400_BAD_REQUEST)
    if len(text) > 2000:
        return Response({'error': 'Message too long (max 2000 chars).'}, status=status.HTTP_400_BAD_REQUEST)

    recipient_id = request.data.get('recipient_id')
    reply_to_id = request.data.get('reply_to_id')

    recipient = None
    if recipient_id:
        try:
            recipient = User.objects.get(id=recipient_id)
        except User.DoesNotExist:
            return Response({'error': 'Recipient not found.'}, status=status.HTTP_404_NOT_FOUND)

    reply_to = None
    if reply_to_id:
        try:
            reply_to = ChatMessage.objects.get(id=reply_to_id, company_user=company_user)
        except ChatMessage.DoesNotExist:
            pass

    msg = ChatMessage.objects.create(
        company_user=company_user,
        sender=request.user,
        recipient=recipient,
        text=text,
        reply_to=reply_to,
    )
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
    - Admin: group + all employees
    - Employee: group + admin only
    """
    company_user = _get_company_user(request)
    if not company_user:
        return Response({'error': 'Company profile not found.'}, status=status.HTTP_404_NOT_FOUND)

    profile = getattr(request.user, 'profile', None)
    is_employee = profile and profile.role == 'employee'

    contacts = []

    # Always include group chat
    contacts.append({
        'id': 'group',
        'type': 'group',
        'name': 'Team Chat',
        'initials': '#',
        'avatar': None,
    })

    if is_employee:
        # Employee can only DM the admin
        admin_profile = getattr(company_user, 'profile', None)
        admin_name = f"{company_user.first_name} {company_user.last_name}".strip() or company_user.username
        contacts.append({
            'id': company_user.id,
            'type': 'private',
            'name': admin_name,
            'initials': admin_name[:2].upper(),
            'avatar': None,
        })
    else:
        # Admin can DM any employee
        employees = Employee.objects.filter(user=company_user, is_archived=False).select_related('linked_user')
        for emp in employees:
            if emp.linked_user:
                contacts.append({
                    'id': emp.linked_user.id,
                    'type': 'private',
                    'name': emp.name,
                    'initials': emp.initials or emp.name[:2].upper(),
                    'avatar': None,
                })

    return Response(contacts)
