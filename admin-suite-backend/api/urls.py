from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    EmployeeViewSet, ClientViewSet, ProjectViewSet,
    TransactionViewSet, NotificationViewSet, DebtViewSet,
    BudgetCategoryViewSet, SavingsViewSet, metrics, client_metrics, payroll_metrics,
    debts_grouped, me, register, google_login, apple_login, send_otp, verify_otp,
    send_email_verification, verify_email, export_data,
    ThrottledObtainAuthToken
)

router = DefaultRouter()
router.register(r'employees', EmployeeViewSet, basename='employee')
router.register(r'clients', ClientViewSet, basename='client')
router.register(r'projects', ProjectViewSet, basename='project')
router.register(r'transactions', TransactionViewSet, basename='transaction')
router.register(r'notifications', NotificationViewSet, basename='notification')
router.register(r'debts', DebtViewSet, basename='debt')
router.register(r'budgets', BudgetCategoryViewSet, basename='budget')
router.register(r'savings', SavingsViewSet, basename='savings')

urlpatterns = [
    path('', include(router.urls)),
    path('me/', me, name='me'),
    path('register/', register, name='register'),
    path('token-auth/', ThrottledObtainAuthToken.as_view(), name='api_token_auth'),
    path('metrics/', metrics, name='metrics'),
    path('client-metrics/', client_metrics, name='client-metrics'),
    path('payroll-metrics/', payroll_metrics, name='payroll-metrics'),
    path('debts-grouped/', debts_grouped, name='debts-grouped'),
    # Social / Phone auth
    path('auth/google/', google_login, name='google_login'),
    path('auth/apple/', apple_login, name='apple_login'),
    path('auth/phone/send-otp/', send_otp, name='send_otp'),
    path('auth/phone/verify/', verify_otp, name='verify_otp'),
    path('auth/email/send-code/', send_email_verification, name='send_email_verification'),
    path('auth/email/verify/', verify_email, name='verify_email'),
    path('export/', export_data, name='export-data'),
]
