from django.contrib import admin
from .models import (
    Employee, EmployeeFinance, PayHistory, Client, Project,
    Transaction, Notification, Debt, BudgetCategory, Savings,
    UserProfile, PhoneOTP, EmailVerificationCode, PasswordResetCode, PayrollStatus
)


@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    list_display = ('name', 'role', 'department', 'status', 'salary', 'performance')
    list_filter = ('status', 'department')
    search_fields = ('name', 'role', 'email')
    list_editable = ('status', 'salary')


@admin.register(EmployeeFinance)
class EmployeeFinanceAdmin(admin.ModelAdmin):
    list_display = ('__str__', 'current_pay', 'employee_owes_company', 'company_owes_employee', 'shares')


@admin.register(PayHistory)
class PayHistoryAdmin(admin.ModelAdmin):
    list_display = ('finance', 'month', 'amount', 'paid')
    list_filter = ('paid',)


@admin.register(Client)
class ClientAdmin(admin.ModelAdmin):
    list_display = ('company', 'contact', 'email', 'status', 'paid', 'projects_count')
    list_filter = ('status',)
    search_fields = ('company', 'contact', 'email')
    list_editable = ('status',)


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ('name', 'client', 'status', 'value', 'progress')
    list_filter = ('status',)
    search_fields = ('name',)
    list_editable = ('status', 'progress')


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ('description', 'type', 'amount', 'category', 'date')
    list_filter = ('type', 'category')
    search_fields = ('description',)


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('title', 'body', 'time')
    search_fields = ('title',)


@admin.register(Debt)
class DebtAdmin(admin.ModelAdmin):
    list_display = ('party', 'type', 'amount', 'due')
    list_filter = ('type',)


@admin.register(BudgetCategory)
class BudgetCategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'allocated', 'spent', 'color')
    search_fields = ('name',)


@admin.register(Savings)
class SavingsAdmin(admin.ModelAdmin):
    list_display = ('name', 'target', 'saved', 'purpose')
    search_fields = ('name',)


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'business_name', 'role', 'phone', 'profile_complete')
    search_fields = ('user__username', 'business_name', 'org_email')


@admin.register(PhoneOTP)
class PhoneOTPAdmin(admin.ModelAdmin):
    list_display = ('phone', 'otp', 'created_at')


@admin.register(EmailVerificationCode)
class EmailVerificationCodeAdmin(admin.ModelAdmin):
    list_display = ('email', 'code', 'created_at')


@admin.register(PasswordResetCode)
class PasswordResetCodeAdmin(admin.ModelAdmin):
    list_display = ('email', 'code', 'created_at')


@admin.register(PayrollStatus)
class PayrollStatusAdmin(admin.ModelAdmin):
    list_display = ('user', 'month', 'paid')
    list_filter = ('paid', 'month')
    search_fields = ('user__username', 'month')
