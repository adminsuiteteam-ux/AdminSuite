from django.db import models

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
    email = models.EmailField()
    phone = models.CharField(max_length=50, blank=True, null=True)
    location = models.CharField(max_length=255, blank=True, null=True)
    bio = models.TextField(blank=True, null=True)
    socials = models.JSONField(default=dict, blank=True)
    finance = models.OneToOneField(EmployeeFinance, on_delete=models.CASCADE, related_name='employee')

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
    code = models.CharField(max_length=6)
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

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Profile for {self.user.username}"
