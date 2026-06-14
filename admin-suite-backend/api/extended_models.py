from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator

class Organization(models.Model):
    """Top‑level company organization."""
    name = models.CharField(max_length=255, unique=True, help_text="Human‑readable organization name.")
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_organizations",
        help_text="User (usually a CEO) that created the organization.",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return self.name

class Subscription(models.Model):
    """Three‑tier subscription plan that gates premium features."""
    PLAN_CHOICES = [
        ("BASIC", "Basic – Free"),
        ("PREMIUM", "Premium – $25/mo"),
        ("PRO", "Pro – $45/mo"),
    ]
    organization = models.OneToOneField(
        Organization,
        on_delete=models.CASCADE,
        related_name="subscription",
        help_text="Each organization has exactly one active subscription.",
    )
    plan = models.CharField(max_length=10, choices=PLAN_CHOICES, default="BASIC", help_text="Current subscription tier.")
    start_date = models.DateField(auto_now_add=True)
    end_date = models.DateField(null=True, blank=True)
    max_records_per_field = models.PositiveIntegerField(default=15, validators=[MinValueValidator(1)], help_text="Maximum records allowed per field for this plan.")
    # Feature flags allow granular enabling/disabling of caps.
    features = models.JSONField(default=dict, blank=True, help_text="Feature toggles (e.g., {'ai_automation': True}).")

    def __str__(self) -> str:
        return f"{self.organization.name} – {self.get_plan_display()}"

class Branch(models.Model):
    """Represents a branch office under an organization. CEOs can create branches; branch admins manage their own branch."""
    name = models.CharField(max_length=100, help_text="Branch name (unique within its organization).")
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="branches",
        help_text="Parent organization.",
    )
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_branches",
        help_text="User who created the branch (usually a CEO or branch admin).",
    )
    is_active = models.BooleanField(default=True)
    location = models.CharField(max_length=255, blank=True, default="", help_text="Physical location/address of the branch.")
    archived_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ("organization", "name")
        ordering = ["name"]

    def __str__(self) -> str:
        return f"{self.name} ({self.organization.name})"

class UserExtension(models.Model):
    """Extends the built‑in auth.User with role, organization and branch links."""
    ROLE_CHOICES = [
        ("CEO", "Chief Executive Officer"),
        ("BRANCH_ADMIN", "Branch Administrator"),
        ("HR", "HR Manager"),
        ("FINANCE", "Finance Officer"),
        ("OPERATIONS", "Operations Manager"),
        ("SECRETARY", "Secretary"),
        ("DEPT_MANAGER", "Department Manager"),
        ("EMPLOYEE", "Employee"),
    ]
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="extension",
        primary_key=True,
        help_text="Link to the Django auth user.",
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="MANAGER", help_text="Role within the organization/branch.")
    organization = models.ForeignKey(
        Organization,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="members",
        help_text="Organization the user belongs to (null for branch‑only admins).",
    )
    branch = models.ForeignKey(
        Branch,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="admin_members",
        help_text="Branch the user manages (if applicable).",
    )
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return f"{self.user.username} – {self.get_role_display()}"
