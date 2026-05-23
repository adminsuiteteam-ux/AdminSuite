from django.conf import settings
from django.contrib.auth.models import User
from django.db import models
from django.db.models import Sum
from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.authtoken.views import ObtainAuthToken
from .models import (
    Employee, EmployeeFinance, PayHistory, Client, Project, Transaction,
    Notification, Debt, BudgetCategory, Savings
)
from .serializers import (
    EmployeeSerializer, ClientSerializer, ProjectSerializer,
    TransactionSerializer, NotificationSerializer, DebtSerializer,
    BudgetCategorySerializer, SavingsSerializer, UserSerializer,
    UserProfileSerializer, RegisterSerializer
)


class AuthRateThrottle(AnonRateThrottle):
    scope = 'auth'


class ThrottledObtainAuthToken(ObtainAuthToken):
    throttle_classes = [AuthRateThrottle]



class EmployeeViewSet(viewsets.ModelViewSet):
    serializer_class = EmployeeSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Employee.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


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


@api_view(['GET', 'PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def me(request):
    from .models import UserProfile
    user = request.user
    profile, _ = UserProfile.objects.get_or_create(user=user)

    if request.method in ('PUT', 'PATCH'):
        # Update user fields
        first_name = request.data.get('first_name')
        if first_name is not None:
            user.first_name = first_name
            user.save(update_fields=['first_name'])

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

    return Response({
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'name': name,
        'profile_complete': profile.profile_complete,
        'location': profile_data.get('location', ''),
        'heard_from': profile_data.get('heard_from', ''),
        'phone': profile_data.get('phone', ''),
        'bio': profile_data.get('bio', ''),
        'social_link': profile_data.get('social_link', ''),
        'avatar': avatar_url,
    })


@api_view(['POST'])
@throttle_classes([AuthRateThrottle])
def register(request):
    """Simplified user registration: email + password + confirm_password.
    Returns an auth token immediately on success."""
    from rest_framework.authtoken.models import Token
    from .models import UserProfile

    serializer = RegisterSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    user = serializer.save()
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
    """Payroll status — mirrors getPayrollMetrics()"""
    user = request.user
    # Uses a static 8-month calendar just like the frontend
    payroll_months = [
        {'month': 'Jan', 'paid': True}, {'month': 'Feb', 'paid': True},
        {'month': 'Mar', 'paid': True}, {'month': 'Apr', 'paid': True},
        {'month': 'May', 'paid': False}, {'month': 'Jun', 'paid': False},
        {'month': 'Jul', 'paid': False}, {'month': 'Aug', 'paid': False},
    ]
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

    # TODO(security): In production, integrate an email service (e.g. SendGrid, Amazon SES)
    # to deliver the verification code instead of returning it in the response.
    # For local dev/debugging we print it to console and return in response if settings.DEBUG is True.
    print(f"--- EMAIL VERIFICATION CODE FOR {email}: {code} ---")

    response_data = {'message': 'Verification code sent successfully.', 'email': email}
    if settings.DEBUG:
        response_data['code'] = code  # Dev convenience only

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
