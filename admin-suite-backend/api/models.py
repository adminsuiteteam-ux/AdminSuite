from django.db import models
from .extended_models import *

class EmployeeFinance(models.Model):
    current_pay = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    employee_owes_company = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    company_owes_employee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    shares = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    bonuses = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    deductions = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    user = models.ForeignKey('auth.User', on_delete=models.CASCADE, null=True, blank=True)

    def __str__(self):
        try:
            emp = getattr(self, 'employee', None)
            if emp:
                return f"Finance for {emp.name}"
            return f"EmployeeFinance #{self.pk}"
        except Exception:
            return f"EmployeeFinance #{self.pk}"

class PayHistory(models.Model):
    finance = models.ForeignKey(EmployeeFinance, related_name='pay_history', on_delete=models.CASCADE)
    month = models.CharField(max_length=20)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    paid = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.month} - {self.amount}"

class Employee(models.Model):
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('on_leave', 'On Leave'),
        ('terminated', 'Terminated'),
    ]
    name = models.CharField(max_length=255)
    role = models.CharField(max_length=255)
    department = models.CharField(max_length=255)
    office = models.CharField(max_length=255)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    performance = models.IntegerField(default=0)
    salary = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    initials = models.CharField(max_length=5)
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)
    user = models.ForeignKey('auth.User', on_delete=models.CASCADE, null=True, blank=True)
    linked_user = models.OneToOneField('auth.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='employee_profile')
    email = models.EmailField()
    phone = models.CharField(max_length=50, blank=True, null=True)
    location = models.CharField(max_length=255, blank=True, null=True)
    bio = models.TextField(blank=True, null=True)
    socials = models.JSONField(default=dict, blank=True)
    finance = models.OneToOneField(EmployeeFinance, on_delete=models.CASCADE, related_name='employee')
    is_flagged = models.BooleanField(default=False)
    flag_reason = models.CharField(max_length=255, blank=True, null=True)
    flag_note = models.TextField(blank=True, null=True)
    is_archived = models.BooleanField(default=False)

    def __str__(self):
        return self.name

class Client(models.Model):
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('completed', 'Completed'),
        ('pending', 'Pending'),
    ]
    company = models.CharField(max_length=255)
    contact = models.CharField(max_length=255)
    email = models.EmailField()
    location = models.CharField(max_length=255)
    coords = models.JSONField(default=dict, blank=True)
    paid = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    projects_count = models.IntegerField(default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    website = models.URLField(blank=True, null=True)
    user = models.ForeignKey('auth.User', on_delete=models.CASCADE, null=True, blank=True)
    description = models.TextField(blank=True, null=True)
    remark = models.TextField(blank=True, null=True)
    lifetime_value = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    pending_payments = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    client_owes_company = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    company_owes_client = models.DecimalField(max_digits=15, decimal_places=2, default=0)

    def __str__(self):
        return self.company

class Project(models.Model):
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('completed', 'Completed'),
        ('on_hold', 'On Hold'),
        ('planned', 'Planned'),
    ]
    name = models.CharField(max_length=255)
    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='projects')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    value = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    progress = models.IntegerField(default=0)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    location = models.CharField(max_length=255, blank=True, null=True)
    image = models.ImageField(upload_to='projects/images/', blank=True, null=True)
    video = models.FileField(upload_to='projects/videos/', blank=True, null=True)
    user = models.ForeignKey('auth.User', on_delete=models.CASCADE, null=True, blank=True)

    def __str__(self):
        return self.name

class Transaction(models.Model):
    TYPE_CHOICES = [
        ('income', 'Income'),
        ('expense', 'Expense'),
    ]
    type = models.CharField(max_length=10, choices=TYPE_CHOICES)
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    category = models.CharField(max_length=255)
    description = models.CharField(max_length=255)
    date = models.CharField(max_length=50) # Matching frontend string format like "Apr 28"
    user = models.ForeignKey('auth.User', on_delete=models.CASCADE, null=True, blank=True)

    def __str__(self):
        return f"{self.type}: {self.description}"

class Notification(models.Model):
    title = models.CharField(max_length=255)
    body = models.TextField()
    time = models.CharField(max_length=50) # Matching frontend format like "12m", "1h"
    user = models.ForeignKey('auth.User', on_delete=models.CASCADE, null=True, blank=True)

    def __str__(self):
        return self.title

class Debt(models.Model):
    TYPE_CHOICES = [
        ('weOwe', 'We Owe'),
        ('owedToUs', 'Owed To Us'),
    ]
    type = models.CharField(max_length=10, choices=TYPE_CHOICES)
    party = models.CharField(max_length=255) # 'to' or 'from' in frontend
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    due = models.CharField(max_length=50)
    user = models.ForeignKey('auth.User', on_delete=models.CASCADE, null=True, blank=True)

    def __str__(self):
        return f"{self.type}: {self.party}"

class BudgetCategory(models.Model):
    name = models.CharField(max_length=255)
    allocated = models.DecimalField(max_digits=15, decimal_places=2)
    spent = models.DecimalField(max_digits=15, decimal_places=2)
    color = models.CharField(max_length=20)
    user = models.ForeignKey('auth.User', on_delete=models.CASCADE, null=True, blank=True)

    def __str__(self):
        return self.name

class Savings(models.Model):
    name = models.CharField(max_length=255)
    target = models.DecimalField(max_digits=15, decimal_places=2)
    saved = models.DecimalField(max_digits=15, decimal_places=2)
    purpose = models.CharField(max_length=255)
    user = models.ForeignKey('auth.User', on_delete=models.CASCADE, null=True, blank=True)

    def __str__(self):
        return self.name


class PhoneOTP(models.Model):
    """Stores one-time verification codes for phone-based authentication."""
    phone = models.CharField(max_length=20, unique=True)
    otp = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.phone} - {self.otp}"


class EmailVerificationCode(models.Model):
    """Stores one-time verification codes for email-based registration verification."""
    email = models.EmailField(unique=True)
    code = models.CharField(max_length=8)
    created_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.email} - {self.code}"


class UserProfile(models.Model):
    """Extended profile data for admin users, created after registration."""
    HEARD_FROM_CHOICES = [
        ('youtube', 'YouTube'),
        ('tiktok', 'TikTok'),
        ('facebook', 'Facebook'),
        ('friend', 'Friend'),
        ('others', 'Others'),
    ]
    user = models.OneToOneField('auth.User', on_delete=models.CASCADE, related_name='profile')
    location = models.CharField(max_length=255, blank=True, default='')
    heard_from = models.CharField(max_length=20, choices=HEARD_FROM_CHOICES, blank=True, default='')
    role = models.CharField(max_length=50, blank=True, default='')
    phone = models.CharField(max_length=30, blank=True, default='')
    avatar = models.ImageField(upload_to='profile_avatars/', blank=True, null=True)
    bio = models.TextField(blank=True, default='')
    social_link = models.URLField(blank=True, default='')
    biometrics_enabled = models.BooleanField(default=False)
    notifications_enabled = models.BooleanField(default=False)
    profile_complete = models.BooleanField(default=False)
    is_first_login = models.BooleanField(default=False)
    
    # Organisational details
    business_name = models.CharField(max_length=255, blank=True, default='')
    org_location = models.CharField(max_length=255, blank=True, default='')
    org_email = models.EmailField(blank=True, default='')
    company_line = models.CharField(max_length=50, blank=True, default='')
    social_handles = models.CharField(max_length=255, blank=True, default='')
    total_workers = models.CharField(max_length=50, blank=True, default='')
    opening_time = models.CharField(max_length=20, blank=True, default='')
    closing_time = models.CharField(max_length=20, blank=True, default='')
    working_days = models.CharField(max_length=100, blank=True, default='')
    average_revenue = models.CharField(max_length=50, blank=True, default='')
    company_logo = models.ImageField(upload_to='company_logos/', blank=True, null=True)

    # Throttling & suspension lockout details
    failed_login_attempts = models.IntegerField(default=0)
    suspended_until = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Profile for {self.user.username}"


class PasswordResetCode(models.Model):
    """Stores 6-digit verification codes for forgotten password resets."""
    email = models.EmailField(unique=True)
    code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Reset code for {self.email}: {self.code}"


class EmployeeActivityLog(models.Model):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='activity_logs')
    action = models.CharField(max_length=100)
    details = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.employee.name} - {self.action} on {self.created_at}"


class EmployeeQuery(models.Model):
    STATUS_CHOICES = [
        ('open', 'Open'),
        ('in_progress', 'In Progress'),
        ('resolved', 'Resolved'),
    ]
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='queries')
    query_type = models.CharField(max_length=100)
    message = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='open')
    attachment = models.FileField(upload_to='query_attachments/', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Query for {self.employee.name} - {self.status}"


class EmployeeTask(models.Model):
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
    ]
    STATUS_CHOICES = [
        ('assigned', 'Assigned'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
    ]
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='tasks')
    title = models.CharField(max_length=255)
    description = models.TextField()
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='medium')
    due_date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='assigned')
    attachment = models.FileField(upload_to='task_attachments/', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Task for {self.employee.name} - {self.title}"


class EmployeeLeave(models.Model):
    STATUS_CHOICES = [
        ('scheduled', 'Scheduled'),
        ('active', 'Active'),
        ('completed', 'Completed'),
    ]
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='leaves')
    leave_type = models.CharField(max_length=100)
    start_date = models.DateField()
    end_date = models.DateField()
    duration_days = models.IntegerField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='scheduled')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Leave for {self.employee.name} ({self.start_date} to {self.end_date})"


class EmployeeMessage(models.Model):
    DELIVERY_CHOICES = [
        ('in_app', 'In-App'),
        ('email', 'Email'),
        ('both', 'Both'),
        ('whatsapp', 'WhatsApp'),
        ('sms', 'SMS'),
    ]
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='messages')
    subject = models.CharField(max_length=255)
    body = models.TextField()
    delivery_mode = models.CharField(max_length=20, choices=DELIVERY_CHOICES, default='both')
    attachment = models.FileField(upload_to='message_attachments/', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Message to {self.employee.name} - {self.subject}"


class EmployeeDocument(models.Model):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='documents')
    name = models.CharField(max_length=255)
    document_type = models.CharField(max_length=100)
    file = models.FileField(upload_to='employee_documents/')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} for {self.employee.name}"


class SalaryAdjustment(models.Model):
    TYPE_CHOICES = [
        ('increment', 'Increment'),
        ('decrement', 'Decrement'),
        ('bonus', 'Bonus'),
        ('correction', 'Correction'),
    ]
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='salary_adjustments')
    adjustment_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    previous_salary = models.DecimalField(max_digits=10, decimal_places=2)
    new_salary = models.DecimalField(max_digits=10, decimal_places=2)
    effective_date = models.DateField()
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.adjustment_type} for {self.employee.name} - {self.amount}"


class PayrollStatus(models.Model):
    user = models.ForeignKey('auth.User', on_delete=models.CASCADE, related_name='payroll_statuses')
    month = models.CharField(max_length=20)
    paid = models.BooleanField(default=False)

    class Meta:
        unique_together = ('user', 'month')

    def __str__(self):
        return f"{self.user.username} - {self.month}: {'Paid' if self.paid else 'Pending'}"


class ChatGroup(models.Model):
    company_user = models.ForeignKey('auth.User', on_delete=models.CASCADE, related_name='company_chat_groups')
    name = models.CharField(max_length=255)
    avatar = models.ImageField(upload_to='group_avatars/', blank=True, null=True)
    members = models.ManyToManyField('auth.User', related_name='chat_groups')
    admins = models.ManyToManyField('auth.User', related_name='admin_chat_groups')
    only_admins_can_chat = models.BooleanField(default=False)
    is_archived = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


class ChatMessage(models.Model):
    """
    Stores chat messages between the admin and employees.
    - If recipient is None → group/company-wide message.
    - If recipient is set → private message between two users.
    The 'company_user' field identifies which admin workspace this message belongs to.
    """
    company_user = models.ForeignKey(
        'auth.User', on_delete=models.CASCADE, related_name='company_chat_messages'
    )
    sender = models.ForeignKey(
        'auth.User', on_delete=models.CASCADE, related_name='sent_chat_messages'
    )
    recipient = models.ForeignKey(
        'auth.User', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='received_chat_messages'
    )
    group = models.ForeignKey(
        'ChatGroup', on_delete=models.CASCADE, null=True, blank=True, related_name='messages'
    )
    text = models.TextField()
    is_pinned = models.BooleanField(default=False)
    is_edited = models.BooleanField(default=False)
    is_deleted = models.BooleanField(default=False)
    reply_to = models.ForeignKey(
        'self', on_delete=models.SET_NULL, null=True, blank=True, related_name='replies'
    )
    read_by = models.ManyToManyField(
        'auth.User', blank=True, related_name='read_chat_messages'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        dest = f"→ {self.recipient.username}" if self.recipient else "→ Group"
        return f"[{self.sender.username} {dest}]: {self.text[:40]}"


class ChatSettings(models.Model):
    """
    Per-admin-workspace chat configuration.
    - group_locked: when True, only the admin (company_user) can post to the group.
    - blocked_user_ids: list of user PKs blocked from posting in the group chat.
    """
    company_user = models.OneToOneField(
        'auth.User', on_delete=models.CASCADE, related_name='chat_settings'
    )
    group_locked = models.BooleanField(default=False)
    blocked_user_ids = models.JSONField(default=list, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"ChatSettings for {self.company_user.username} (locked={self.group_locked})"


class ChatTypingStatus(models.Model):
    company_user = models.ForeignKey(
        'auth.User', on_delete=models.CASCADE, related_name='chat_typing_statuses'
    )
    user = models.ForeignKey(
        'auth.User', on_delete=models.CASCADE, related_name='typing_statuses'
    )
    recipient = models.ForeignKey(
        'auth.User', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='received_typing_statuses'
    )
    group = models.ForeignKey(
        'ChatGroup', on_delete=models.CASCADE, null=True, blank=True,
        related_name='typing_statuses'
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = 'Chat typing statuses'
        unique_together = ('company_user', 'user', 'recipient', 'group')

    def __str__(self):
        dest = f"→ {self.recipient.username}" if self.recipient else (f"→ Group {self.group.name}" if self.group else "→ Team Chat")
        return f"{self.user.username} is typing {dest}"

