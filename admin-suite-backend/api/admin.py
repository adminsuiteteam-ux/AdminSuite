from django.contrib import admin
from .models import (
    Employee, EmployeeFinance, PayHistory, Client, Project,
    Transaction, Notification, Debt, BudgetCategory, Savings,
    UserProfile, PhoneOTP, EmailVerificationCode, PasswordResetCode, PayrollStatus, UserDevice,
    ReportedAccount, BlockedAccount, ChatMessage, ChatGroup, ChatSettings
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


@admin.register(UserDevice)
class UserDeviceAdmin(admin.ModelAdmin):
    list_display = ('user', 'expo_push_token', 'device_name', 'device_type', 'is_active', 'created_at')
    list_filter = ('is_active', 'device_type')
    search_fields = ('user__username', 'expo_push_token', 'device_name')


@admin.register(ReportedAccount)
class ReportedAccountAdmin(admin.ModelAdmin):
    list_display = ('id', 'reported_user', 'reporter', 'reason', 'status', 'action_taken', 'created_at')
    list_filter = ('status', 'reason', 'action_taken', 'created_at')
    search_fields = ('reported_user__username', 'reported_user__email', 'reporter__username', 'details', 'admin_notes')
    readonly_fields = ('created_at', 'updated_at')
    actions = ['mark_resolved', 'mark_dismissed', 'suspend_reported_user', 'reactivate_reported_user']

    @admin.action(description="Mark selected reports as Resolved")
    def mark_resolved(self, request, queryset):
        queryset.update(status='resolved', action_taken='warned')

    @admin.action(description="Mark selected reports as Dismissed")
    def mark_dismissed(self, request, queryset):
        queryset.update(status='dismissed')

    @admin.action(description="Suspend reported user accounts (Deactivate)")
    def suspend_reported_user(self, request, queryset):
        for report in queryset:
            report.reported_user.is_active = False
            report.reported_user.save(update_fields=['is_active'])
            report.status = 'resolved'
            report.action_taken = 'suspended'
            report.save(update_fields=['status', 'action_taken'])

    @admin.action(description="Reactivate reported user accounts")
    def reactivate_reported_user(self, request, queryset):
        for report in queryset:
            report.reported_user.is_active = True
            report.reported_user.save(update_fields=['is_active'])


@admin.register(BlockedAccount)
class BlockedAccountAdmin(admin.ModelAdmin):
    list_display = ('id', 'blocked_user', 'blocked_by', 'scope', 'is_active', 'created_at')
    list_filter = ('is_active', 'scope', 'created_at')
    search_fields = ('blocked_user__username', 'blocked_by__username', 'reason')
    readonly_fields = ('created_at', 'updated_at')
    actions = ['activate_blocks', 'unblock_users']

    @admin.action(description="Activate selected blocks")
    def activate_blocks(self, request, queryset):
        queryset.update(is_active=True)

    @admin.action(description="Deactivate (Unblock) selected blocks")
    def unblock_users(self, request, queryset):
        queryset.update(is_active=False)


@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    list_display = ('id', 'company_user', 'sender', 'recipient', 'group', 'text_preview', 'delivery_status', 'created_at')
    list_filter = ('delivery_status', 'is_pinned', 'is_deleted', 'created_at')
    search_fields = ('sender__username', 'recipient__username', 'text')
    readonly_fields = ('created_at', 'updated_at')

    def text_preview(self, obj):
        return obj.text[:50] + ('...' if len(obj.text) > 50 else '')


@admin.register(ChatGroup)
class ChatGroupAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'company_user', 'only_admins_can_chat', 'is_archived', 'created_at')
    search_fields = ('name', 'company_user__username')


@admin.register(ChatSettings)
class ChatSettingsAdmin(admin.ModelAdmin):
    list_display = ('company_user', 'group_locked', 'blocked_user_count', 'updated_at')

    def blocked_user_count(self, obj):
        return len(obj.blocked_user_ids or [])
