from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    EmployeeViewSet, ClientViewSet, ProjectViewSet,
    TransactionViewSet, NotificationViewSet, DebtViewSet,
    BudgetCategoryViewSet, SavingsViewSet, metrics, client_metrics, payroll_metrics,
    debts_grouped, me, register, google_login, apple_login, send_otp, verify_otp,
    send_email_verification, verify_email, export_data,
    ThrottledObtainAuthToken, send_password_reset_code,
    verify_password_reset_code, confirm_password_reset,
    EmployeeActivityLogViewSet, EmployeeQueryViewSet, EmployeeTaskViewSet,
    EmployeeLeaveViewSet, EmployeeMessageViewSet, EmployeeDocumentViewSet,
    SalaryAdjustmentViewSet, toggle_payroll_month,
    employee_dashboard, employee_finance, employee_update_task,
    chat_messages, chat_send, chat_message_detail, chat_pin_message, chat_contacts,
)

router = DefaultRouter()
router.register(r'employees', EmployeeViewSet, basename='employee')
router.register(r'employee-activities', EmployeeActivityLogViewSet, basename='employee-activity')
router.register(r'employee-queries', EmployeeQueryViewSet, basename='employee-query')
router.register(r'employee-tasks', EmployeeTaskViewSet, basename='employee-task')
router.register(r'employee-leaves', EmployeeLeaveViewSet, basename='employee-leave')
router.register(r'employee-messages', EmployeeMessageViewSet, basename='employee-message')
router.register(r'employee-documents', EmployeeDocumentViewSet, basename='employee-document')
router.register(r'salary-adjustments', SalaryAdjustmentViewSet, basename='salary-adjustment')
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
    path('payroll-metrics/toggle/', toggle_payroll_month, name='toggle-payroll-month'),
    path('debts-grouped/', debts_grouped, name='debts-grouped'),
    # Social / Phone auth
    path('auth/google/', google_login, name='google_login'),
    path('auth/apple/', apple_login, name='apple_login'),
    path('auth/phone/send-otp/', send_otp, name='send_otp'),
    path('auth/phone/verify/', verify_otp, name='verify_otp'),
    path('auth/email/send-code/', send_email_verification, name='send_email_verification'),
    path('auth/email/verify/', verify_email, name='verify_email'),
    # Password Reset
    path('auth/password-reset/send-code/', send_password_reset_code, name='send_password_reset_code'),
    path('auth/password-reset/verify/', verify_password_reset_code, name='verify_password_reset_code'),
    path('auth/password-reset/confirm/', confirm_password_reset, name='confirm_password_reset'),
    # Employee Portal
    path('employee-portal/dashboard/', employee_dashboard, name='employee-dashboard'),
    path('employee-portal/finance/', employee_finance, name='employee-finance'),
    path('employee-portal/tasks/<int:pk>/update/', employee_update_task, name='employee-update-task'),
    # Chat
    path('chat/messages/', chat_messages, name='chat-messages'),
    path('chat/send/', chat_send, name='chat-send'),
    path('chat/messages/<int:pk>/', chat_message_detail, name='chat-message-detail'),
    path('chat/messages/<int:pk>/pin/', chat_pin_message, name='chat-pin-message'),
    path('chat/contacts/', chat_contacts, name='chat-contacts'),
    path('export/', export_data, name='export-data'),
]
