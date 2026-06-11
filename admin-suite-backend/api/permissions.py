from rest_framework.permissions import BasePermission, SAFE_METHODS
from .models import UserExtension

class IsCEO(BasePermission):
    """Allow access only to users with role 'CEO'"""
    def has_permission(self, request, view):
        try:
            return request.user.userextension.role == 'CEO'
        except UserExtension.DoesNotExist:
            return False

class IsBranchAdmin(BasePermission):
    """Allow access to branch admins for their branch"""
    def has_permission(self, request, view):
        try:
            ext = request.user.userextension
            return ext.role == 'BRANCH_ADMIN'
        except UserExtension.DoesNotExist:
            return False

    def has_object_permission(self, request, view, obj):
        # obj can be Branch or any model with a branch field
        try:
            ext = request.user.userextension
            if hasattr(obj, 'branch'):
                return obj.branch == ext.branch
            if hasattr(obj, 'organization'):
                return obj.organization == ext.organization
            return False
        except UserExtension.DoesNotExist:
            return False

class BranchScopePermission(BasePermission):
    """Access allowed if user belongs to same organization or same branch"""
    def has_object_permission(self, request, view, obj):
        try:
            ext = request.user.userextension
            org_match = getattr(obj, 'organization', None) == ext.organization
            branch_match = getattr(obj, 'branch', None) == ext.branch
            return org_match or branch_match
        except UserExtension.DoesNotExist:
            return False

class SubscriptionFeaturePermission(BasePermission):
    """Check if user's organization subscription meets required plan"""
    required_plan = 'PRO'  # default, can be overridden per view

    def has_permission(self, request, view):
        try:
            ext = request.user.userextension
            org = ext.organization
            if not hasattr(org, 'subscription'):
                return False
            plan = org.subscription.plan
            # Simple ordering: BASIC < PREMIUM < PRO
            order = {'BASIC': 1, 'PREMIUM': 2, 'PRO': 3}
            return order.get(plan, 0) >= order.get(self.required_plan, 0)
        except UserExtension.DoesNotExist:
            return False
