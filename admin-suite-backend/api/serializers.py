import json
import random
import string
from rest_framework import serializers
from django.contrib.auth.models import User
from .models import (
    Employee, EmployeeFinance, PayHistory, Client, Project, 
    Transaction, Notification, Debt, BudgetCategory, Savings,
    UserProfile, EmployeeActivityLog, EmployeeQuery, EmployeeTask,
    EmployeeLeave, EmployeeMessage, EmployeeDocument, SalaryAdjustment,
    ChatMessage, ChatSettings, ChatGroup,
    MessageAttachment, MessageReaction, UserPresence, ChatChannel, CallRecord,
    ReportedAccount, BlockedAccount, Note,
)
from .extended_models import Organization, Branch, Subscription, UserExtension  # multi‑branch models

from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError

# Multi‑branch and subscription serializers
class OrganizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = ['id', 'name', 'created_by', 'created_at']

class BranchSerializer(serializers.ModelSerializer):
    class Meta:
        model = Branch
        fields = ['id', 'name', 'organization', 'created_by', 'is_active', 'archived_at']

class SubscriptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subscription
        fields = ['id', 'organization', 'plan', 'start_date', 'end_date', 'max_records_per_field', 'features']

class UserExtensionSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserExtension
        fields = ['user', 'role', 'organization', 'branch', 'updated_at']


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'password']
        extra_kwargs = {'password': {'write_only': True}}

    def validate_password(self, value):
        if len(value) < 8:
            raise serializers.ValidationError("Password must be at least 8 characters long.")
        try:
            validate_password(value)
        except DjangoValidationError as e:
            raise serializers.ValidationError(list(e.messages))
        return value

    def create(self, validated_data):
        user = User.objects.create_user(**validated_data) # type: ignore
        return user

class PayHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = PayHistory
        fields = ['month', 'amount', 'paid']

class EmployeeFinanceSerializer(serializers.ModelSerializer):
    pay_history = PayHistorySerializer(many=True, read_only=True)

    class Meta:
        model = EmployeeFinance
        fields = [
            'id', 'current_pay', 'employee_owes_company', 'company_owes_employee',
            'shares', 'pay_history', 'bonuses', 'deductions', 'last_finance_update'
        ]

class EmployeeActivityLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmployeeActivityLog
        fields = ['id', 'employee', 'action', 'details', 'created_at']

class EmployeeQuerySerializer(serializers.ModelSerializer):
    class Meta:
        model = EmployeeQuery
        fields = ['id', 'employee', 'query_type', 'message', 'status', 'attachment', 'created_at']

class EmployeeTaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmployeeTask
        fields = ['id', 'employee', 'title', 'description', 'priority', 'due_date', 'status', 'attachment', 'created_at']

class EmployeeLeaveSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmployeeLeave
        fields = ['id', 'employee', 'leave_type', 'start_date', 'end_date', 'duration_days', 'status', 'created_at']

class EmployeeMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmployeeMessage
        fields = ['id', 'employee', 'subject', 'body', 'delivery_mode', 'attachment', 'created_at']

class EmployeeDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmployeeDocument
        fields = ['id', 'employee', 'name', 'document_type', 'file', 'created_at', 'updated_at']

class SalaryAdjustmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = SalaryAdjustment
        fields = ['id', 'employee', 'adjustment_type', 'amount', 'previous_salary', 'new_salary', 'effective_date', 'notes', 'created_at']

class EmployeeSerializer(serializers.ModelSerializer):
    finance = EmployeeFinanceSerializer(read_only=True)
    finance_data = serializers.JSONField(write_only=True, required=False)
    activity_logs = EmployeeActivityLogSerializer(many=True, read_only=True)
    queries = EmployeeQuerySerializer(many=True, read_only=True)
    tasks = EmployeeTaskSerializer(many=True, read_only=True)
    leaves = EmployeeLeaveSerializer(many=True, read_only=True)
    messages = EmployeeMessageSerializer(many=True, read_only=True)
    documents = EmployeeDocumentSerializer(many=True, read_only=True)
    salary_adjustments = SalaryAdjustmentSerializer(many=True, read_only=True)
    temp_password = serializers.SerializerMethodField()
    avatar = serializers.ImageField(required=False, allow_null=True)
    branch_name = serializers.CharField(write_only=True, required=False, allow_blank=True)
    branch_location = serializers.CharField(write_only=True, required=False, allow_blank=True)
    
    class Meta:
        model = Employee
        fields = [
            'id', 'name', 'role', 'department', 'office', 'status', 
            'performance', 'salary', 'initials', 'avatar', 'email', 'personal_email',
            'phone', 'location', 'bio', 'socials', 'finance', 'finance_data',
            'is_flagged', 'flag_reason', 'flag_note', 'is_archived',
            'activity_logs', 'queries', 'tasks', 'leaves', 'messages',
            'documents', 'salary_adjustments', 'linked_user', 'temp_password',
            'branch_name', 'branch_location'
        ]
        read_only_fields = ['user', 'linked_user']
        extra_kwargs = {
            'email': {'required': False, 'allow_blank': True},
            'personal_email': {'required': False, 'allow_blank': True},
            'office': {'required': False, 'allow_blank': True, 'default': ''},
            'phone': {'required': False, 'allow_blank': True},
            'location': {'required': False, 'allow_blank': True},
            'bio': {'required': False, 'allow_blank': True},
            'performance': {'required': False, 'default': 0},
            'salary': {'required': False, 'default': 0},
            'initials': {'required': False, 'default': ''},
            'socials': {'required': False},
        }

    def validate(self, attrs):
        if not attrs.get('email') and not attrs.get('personal_email') and self.instance is None:
            raise serializers.ValidationError({
                "personal_email": "Please provide an email address (e.g. employee@gmail.com)."
            })
        return super().validate(attrs)

    def get_temp_password(self, obj):
        return getattr(obj, '_temp_password', None)

    def to_representation(self, instance):
        is_new = getattr(instance, '_temp_password', None) is not None
        if is_new:
            # Newly created employee has zero related logs, queries, tasks, etc.
            # Pop these fields before serialization to avoid 7 slow round-trip DB queries.
            saved_fields = {}
            for field_name in ['activity_logs', 'queries', 'tasks', 'leaves', 'messages', 'documents', 'salary_adjustments']:
                if field_name in self.fields:
                    saved_fields[field_name] = self.fields.pop(field_name)
            ret = super().to_representation(instance)
            for field_name, fld in saved_fields.items():
                self.fields[field_name] = fld
                ret[field_name] = []
        else:
            ret = super().to_representation(instance)

        if instance.avatar:
            request = self.context.get('request')
            if request is not None:
                ret['avatar'] = request.build_absolute_uri(instance.avatar.url)
            else:
                ret['avatar'] = instance.avatar.url
        else:
            ret['avatar'] = None
        return ret

    def to_internal_value(self, data):
        # Convert QueryDict to standard dict to prevent list-wrapping issues for complex fields
        if hasattr(data, 'dict'):
            data = data.dict()
        else:
            data = dict(data)

        # Handle FormData stringified JSON
        if isinstance(data.get('socials'), str):
            try:
                data['socials'] = json.loads(data['socials'])
            except Exception:
                pass
        if isinstance(data.get('finance_data'), str):
            try:
                data['finance_data'] = json.loads(data['finance_data'])
            except Exception:
                pass
        return super().to_internal_value(data)

    def create(self, validated_data):
        import re
        from django.db import transaction
        with transaction.atomic():
            finance_data = validated_data.pop('finance_data', {})
            user = validated_data.get('user')
            branch_name = validated_data.pop('branch_name', '').strip()
            branch_location = validated_data.pop('branch_location', '').strip()
            role_display = validated_data.get('role', 'Employee')

            # Auto-create or link user account for the employee
            email = validated_data.get('email', '').strip().lower()
            personal_email = validated_data.get('personal_email', '').strip().lower()
            name = validated_data.get('name', '').strip()

            creator_user = self.context['request'].user if 'request' in self.context else user

            # Determine company organization name / slug for company work email
            target_company_name = None
            if creator_user:
                try:
                    if hasattr(creator_user, 'extension') and creator_user.extension.organization:
                        target_company_name = creator_user.extension.organization.name
                except Exception:
                    pass
                if not target_company_name:
                    try:
                        if hasattr(creator_user, 'profile') and creator_user.profile.business_name:
                            target_company_name = creator_user.profile.business_name
                    except Exception:
                        pass

            company_slug = "adminsuite"
            if target_company_name:
                slug_cand = re.sub(r'[^a-zA-Z0-9]', '', target_company_name).lower()
                if slug_cand:
                    company_slug = slug_cand

            # Generate base local part (firstname.lastname)
            name_parts = [re.sub(r'[^a-zA-Z0-9]', '', p).lower() for p in name.split() if p.strip()]
            if len(name_parts) >= 2:
                base_local = f"{name_parts[0]}.{name_parts[-1]}"
            elif len(name_parts) == 1:
                base_local = name_parts[0]
            else:
                base_local = "employee"

            # Auto-detect if 'email' was submitted as a personal email (e.g. @gmail.com) with personal_email empty
            personal_domains = ('gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com', 'aol.com', 'mail.com')
            if not personal_email and email and any(email.endswith(f"@{dom}") for dom in personal_domains):
                personal_email = email
                email = ''

            # If work email is blank or matches personal email, generate unique firstname.lastname@companyname.com
            if not email or email == personal_email:
                candidate = f"{base_local}@{company_slug}.com"
                counter = 2
                while User.objects.filter(username__iexact=candidate).exists() or \
                      User.objects.filter(email__iexact=candidate).exists() or \
                      Employee.objects.filter(email__iexact=candidate).exists():
                    candidate = f"{base_local}{counter}@{company_slug}.com"
                    counter += 1
                email = candidate

            validated_data['email'] = email
            validated_data['personal_email'] = personal_email

            # Guard 1: Prevent creating an employee with the current Admin's email
            if creator_user and creator_user.email:
                admin_em = creator_user.email.strip().lower()
                if admin_em in (email, personal_email):
                    raise serializers.ValidationError({
                        "email": "You cannot create an employee record with your own Admin account email. As the Admin, you already have full company access."
                    })

            # Check if an Employee profile already exists for this work email
            if Employee.objects.filter(email=email).exists():
                raise serializers.ValidationError({"email": f"An employee record with the login email '{email}' already exists. Please customize the company email."})

            # Guard 2: Prevent overwriting any existing Admin or CEO account
            emp_user = User.objects.filter(username__iexact=email).first() or User.objects.filter(email=email).first()
            if emp_user:
                existing_profile = getattr(emp_user, 'profile', None)
                existing_ext = getattr(emp_user, 'extension', None)
                is_admin_account = (
                    (existing_profile and existing_profile.role and existing_profile.role.upper() in ('ADMIN', 'CEO')) or
                    (existing_ext and existing_ext.role and existing_ext.role.upper() in ('ADMIN', 'CEO')) or
                    emp_user.is_superuser or emp_user.is_staff
                )
                if is_admin_account:
                    raise serializers.ValidationError({
                        "email": "This email belongs to an active Admin account and cannot be registered as an employee."
                    })

            temp_password = "Temp#" + "".join(random.choices(string.ascii_letters + string.digits, k=8))
            
            # Reuse existing User if orphaned, or create a new Django User
            if emp_user:
                emp_user.set_password(temp_password)
                if name:
                    emp_user.first_name = name.split(' ')[0]
                    emp_user.last_name = ' '.join(name.split(' ')[1:])
                emp_user.save()
            else:
                emp_user = User.objects.create_user(
                    username=email,
                    email=email,
                    password=temp_password,
                    first_name=name.split(' ')[0] if name else '',
                    last_name=' '.join(name.split(' ')[1:]) if name else ''
                )
            
            # Setup Employee UserProfile
            profile, _ = UserProfile.objects.get_or_create(user=emp_user)
            # Setup role for UserProfile and UserExtension
            role_map = {
                'CEO': 'CEO',
                'ADMIN': 'CEO',
                'NEW ADMIN': 'BRANCH_ADMIN',
                'BRANCH_ADMIN': 'BRANCH_ADMIN',
                'HR MANAGER': 'HR',
                'HR': 'HR',
                'FINANCE OFFICER': 'FINANCE',
                'FINANCE': 'FINANCE',
                'OPERATIONS MANAGER': 'OPERATIONS',
                'OPERATING OFFICER': 'OPERATIONS',
                'OPERATIONAL OFFICER': 'OPERATIONS',
                'OPERATIONS': 'OPERATIONS',
                'SECRETARY': 'SECRETARY',
                'DEPARTMENT MANAGER': 'DEPT_MANAGER',
                'DEPT_MANAGER': 'DEPT_MANAGER',
                'EMPLOYEE': 'EMPLOYEE'
            }
            system_role = role_map.get(role_display.strip().upper(), 'EMPLOYEE')
            
            # Determine organization and branch from creator user
            creator_user = self.context['request'].user if 'request' in self.context else user
            creator_org = None
            creator_branch = None
            if creator_user:
                try:
                    # related_name on UserExtension is 'extension' (not 'userextension')
                    creator_ext = creator_user.extension
                    creator_org = creator_ext.organization
                    creator_branch = creator_ext.branch
                except Exception:
                    pass

            target_branch = creator_branch

            # Handle Branch Creation
            if system_role == 'BRANCH_ADMIN' and branch_name and creator_org:
                from .extended_models import Branch
                from .views import check_subscription_limit
                check_subscription_limit(creator_org, 'branches')
                # Create a new branch under organization
                target_branch = Branch.objects.create(
                    name=branch_name,
                    organization=creator_org,
                    created_by=creator_user,
                    location=branch_location
                )

            # Setup UserExtension
            from .extended_models import UserExtension
            ext, ext_created = UserExtension.objects.get_or_create(
                user=emp_user,
                defaults={
                    'role': system_role,
                    'organization': creator_org,
                    'branch': target_branch
                }
            )
            if not ext_created:
                ext.role = system_role
                if creator_org:
                    ext.organization = creator_org
                if target_branch:
                    ext.branch = target_branch
                ext.save()
            
            validated_data['linked_user'] = emp_user
            validated_data['branch'] = target_branch

            if not user and creator_user:
                user = creator_user
                validated_data['user'] = user

            # Filter finance_data to only valid EmployeeFinance fields
            valid_finance_fields = {f.name for f in EmployeeFinance._meta.get_fields() if hasattr(f, 'column')} # type: ignore
            clean_finance = {k: v for k, v in finance_data.items() if k in valid_finance_fields and k != 'id'}
            if 'current_pay' not in clean_finance or clean_finance['current_pay'] in (None, '', 0):
                clean_finance['current_pay'] = validated_data.get('salary', 0)
            
            # Create finance record and Employee record
            finance = EmployeeFinance.objects.create(user=user, **clean_finance) # type: ignore
            employee = Employee.objects.create(finance=finance, **validated_data) # type: ignore
            
            # Sync avatar to profile now that the uploaded file has been persisted to storage
            if employee.avatar:
                try:
                    profile.avatar = employee.avatar.name
                except Exception:
                    profile.avatar = employee.avatar
            profile.role = system_role.lower()
            profile.is_first_login = True
            profile.profile_complete = True
            profile.save()

            # Save temp password to display to Admin
            employee._temp_password = temp_password  # type: ignore[attr-defined]

        # Send onboarding email asynchronously in background thread so HTTP response is instant (<200ms)
        import threading
        target_company = target_company_name or (creator_org.name if creator_org else "AdminSuite Company")
        dispatch_recipient = personal_email if personal_email else email

        def _dispatch_onboarding_email():
            try:
                from .emails import send_onboarding_email
                send_onboarding_email(
                    email=dispatch_recipient,
                    name=name,
                    temp_password=temp_password,
                    company_name=target_company,
                    role_display=role_display,
                    work_email=email
                )
            except Exception as e:
                import logging
                logging.getLogger('adminsuite').warning(
                    f'[EmployeeCreate] Onboarding email failed for {dispatch_recipient}: {e}'
                )

        threading.Thread(target=_dispatch_onboarding_email, daemon=True).start()

        return employee

    def update(self, instance, validated_data):
        finance_data = validated_data.pop('finance_data', None)
        if finance_data:
            try:
                plan = instance.branch.organization.subscription.plan
            except Exception:
                plan = 'BASIC'
                
            if plan not in ('PRO', 'PRO_YEARLY'):
                raise serializers.ValidationError({"error": "Detailed financial modifications are Pro features. Please upgrade your plan."})

            from django.utils import timezone
            from .notifications import send_push_notification
            valid_finance_fields = {f.name for f in EmployeeFinance._meta.get_fields() if hasattr(f, 'column')} # type: ignore
            has_changes = False
            for attr, value in finance_data.items():
                if attr in valid_finance_fields and attr != 'id':
                    old_value = getattr(instance.finance, attr, None)
                    if str(old_value) != str(value):
                        setattr(instance.finance, attr, value)
                        has_changes = True
            if has_changes:
                instance.finance.last_finance_update = timezone.now()
                instance.finance.save() # type: ignore
                if instance.linked_user:
                    send_push_notification(
                        user=instance.linked_user,
                        title='💰 Financial Record Updated',
                        body='Your financial record has been updated by the administrator.',
                        data={'screen': 'finance'}
                    )
            
        employee = super().update(instance, validated_data)
        if employee.linked_user:
            emp_u = employee.linked_user
            fields_to_update = []
            if employee.email and (emp_u.email != employee.email or emp_u.username != employee.email):
                emp_u.email = employee.email
                emp_u.username = employee.email
                fields_to_update.extend(['email', 'username'])
            if fields_to_update:
                emp_u.save(update_fields=fields_to_update)
            profile, _ = UserProfile.objects.get_or_create(user=employee.linked_user)
            profile.avatar = employee.avatar
            profile.save()
        return employee

class ProjectSerializer(serializers.ModelSerializer):
    client_name = serializers.ReadOnlyField(source='client.company')
    image = serializers.ImageField(required=False, allow_null=True)
    video = serializers.FileField(required=False, allow_null=True)

    class Meta:
        model = Project
        fields = [
            'id', 'name', 'client', 'client_name', 'status', 'value', 'progress',
            'start_date', 'end_date', 'location', 'image', 'video'
        ]

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        if instance.image:
            request = self.context.get('request')
            if request is not None:
                ret['image'] = request.build_absolute_uri(instance.image.url)
            else:
                ret['image'] = instance.image.url
        else:
            ret['image'] = None

        if instance.video:
            request = self.context.get('request')
            if request is not None:
                ret['video'] = request.build_absolute_uri(instance.video.url)
            else:
                ret['video'] = instance.video.url
        else:
            ret['video'] = None
        return ret

class ClientSerializer(serializers.ModelSerializer):
    projects = ProjectSerializer(many=True, read_only=True)

    def to_internal_value(self, data):
        if 'website' in data and data['website']:
            mutable_data = dict(data)
            val = str(mutable_data['website']).strip()
            if val and not val.startswith(('http://', 'https://')):
                mutable_data['website'] = 'https://' + val
            data = mutable_data
        return super().to_internal_value(data)
    
    class Meta:
        model = Client
        fields = [
            'id', 'company', 'contact', 'email', 'location', 'coords', 
            'paid', 'projects_count', 'status', 'website', 'description', 
            'remark', 'projects', 'lifetime_value', 'pending_payments',
            'client_owes_company', 'company_owes_client'
        ]
        read_only_fields = ['user']
        extra_kwargs = {
            'location': {'required': False, 'allow_blank': True, 'allow_null': True, 'default': ''},
            'website': {'required': False, 'allow_blank': True, 'allow_null': True, 'default': None},
            'description': {'required': False, 'allow_blank': True, 'allow_null': True, 'default': ''},
            'remark': {'required': False, 'allow_blank': True, 'allow_null': True, 'default': ''},
            'coords': {'required': False},
            'paid': {'required': False, 'default': 0},
            'projects_count': {'required': False, 'default': 0},
            'lifetime_value': {'required': False, 'default': 0},
            'pending_payments': {'required': False, 'default': 0},
            'client_owes_company': {'required': False, 'default': 0},
            'company_owes_client': {'required': False, 'default': 0},
        }

class TransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Transaction
        fields = ['id', 'type', 'amount', 'category', 'description', 'date']

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ['id', 'title', 'body', 'time']

class DebtSerializer(serializers.ModelSerializer):
    class Meta:
        model = Debt
        fields = ['id', 'type', 'party', 'amount', 'due']

class BudgetCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = BudgetCategory
        fields = ['id', 'name', 'allocated', 'spent', 'color']

class SavingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = Savings
        fields = ['id', 'name', 'target', 'saved', 'purpose']


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = [
            'location', 'heard_from', 'role', 'phone', 'avatar',
            'bio', 'social_link', 'biometrics_enabled', 'notifications_enabled',
            'profile_complete', 'is_first_login',
            'business_name', 'org_location', 'org_email', 'company_line',
            'social_handles', 'total_workers', 'opening_time', 'closing_time',
            'working_days', 'average_revenue', 'company_logo',
        ]
        extra_kwargs = {
            'heard_from': {'required': False, 'allow_blank': True},
            'location': {'required': False, 'allow_blank': True},
            'phone': {'required': False, 'allow_blank': True},
            'bio': {'required': False, 'allow_blank': True},
            'social_link': {'required': False, 'allow_blank': True},
            'business_name': {'required': False, 'allow_blank': True},
            'org_location': {'required': False, 'allow_blank': True},
            'org_email': {'required': False, 'allow_blank': True},
            'company_line': {'required': False, 'allow_blank': True},
            'social_handles': {'required': False, 'allow_blank': True},
            'total_workers': {'required': False, 'allow_blank': True},
            'opening_time': {'required': False, 'allow_blank': True},
            'closing_time': {'required': False, 'allow_blank': True},
            'working_days': {'required': False, 'allow_blank': True},
            'average_revenue': {'required': False, 'allow_blank': True},
        }

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        request = self.context.get('request')
        if instance.avatar:
            if request is not None:
                ret['avatar'] = request.build_absolute_uri(instance.avatar.url)
            else:
                ret['avatar'] = instance.avatar.url
        else:
            ret['avatar'] = None

        if instance.company_logo:
            if request is not None:
                ret['company_logo'] = request.build_absolute_uri(instance.company_logo.url)
            else:
                ret['company_logo'] = instance.company_logo.url
        else:
            ret['company_logo'] = None
        return ret


class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True, min_length=8)

    def validate_email(self, value):
        value = value.strip().lower()
        if User.objects.filter(email=value).exists(): # type: ignore
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def validate(self, data):
        if data['password'] != data['confirm_password']:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
        try:
            validate_password(data['password'])
        except DjangoValidationError as e:
            raise serializers.ValidationError({"password": list(e.messages)})
        return data

    def create(self, validated_data):
        email = validated_data['email']
        password = validated_data['password']
        username = email  # Use email as username
        user = User.objects.create_user( # type: ignore
            username=username,
            email=email,
            password=password,
        )
        return user


class ChatGroupSerializer(serializers.ModelSerializer):
    members_details = serializers.SerializerMethodField()
    admins_details = serializers.SerializerMethodField()
    avatar = serializers.ImageField(required=False, allow_null=True)

    class Meta:
        model = ChatGroup
        fields = [
            'id', 'name', 'avatar', 'members', 'admins', 'only_admins_can_chat', 
            'is_archived', 'members_details', 'admins_details', 'created_at', 'updated_at'
        ]

    def get_members_details(self, obj):
        return [{'id': u.id, 'name': f"{u.first_name} {u.last_name}".strip() or u.username} for u in obj.members.all()]

    def get_admins_details(self, obj):
        return [{'id': u.id, 'name': f"{u.first_name} {u.last_name}".strip() or u.username} for u in obj.admins.all()]

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        if instance.avatar:
            request = self.context.get('request')
            if request is not None:
                ret['avatar'] = request.build_absolute_uri(instance.avatar.url)
            else:
                ret['avatar'] = instance.avatar.url
        else:
            ret['avatar'] = None
        return ret


class ChatMessageSerializer(serializers.ModelSerializer):
    sender_id = serializers.ReadOnlyField(source='sender.id')
    sender_name = serializers.SerializerMethodField()
    sender_initials = serializers.SerializerMethodField()
    sender_avatar = serializers.SerializerMethodField()
    recipient_id = serializers.ReadOnlyField(source='recipient.id', default=None)
    group_id = serializers.ReadOnlyField(source='group.id', default=None)
    reply_to_id = serializers.PrimaryKeyRelatedField(
        queryset=ChatMessage.objects.all(), source='reply_to', required=False, allow_null=True
    )
    reply_to_text = serializers.SerializerMethodField()
    reply_to_sender = serializers.SerializerMethodField()
    display_text = serializers.SerializerMethodField()
    attachment = serializers.SerializerMethodField()
    attachment_type = serializers.CharField(read_only=True)
    attachment_name = serializers.CharField(read_only=True)
    attachment_size = serializers.IntegerField(read_only=True)
    delivery_status = serializers.SerializerMethodField()

    class Meta:
        model = ChatMessage
        fields = [
            'id', 'sender_id', 'sender_name', 'sender_initials', 'sender_avatar',
            'recipient_id', 'group_id', 'text', 'display_text', 'is_pinned', 'is_edited', 'is_deleted',
            'delivery_status',
            'reply_to_id', 'reply_to_text', 'reply_to_sender',
            'attachment', 'attachment_type', 'attachment_name', 'attachment_size',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['sender_id', 'sender_name', 'sender_initials', 'sender_avatar',
                            'recipient_id', 'delivery_status', 'is_edited', 'is_deleted', 'created_at', 'updated_at']

    def get_delivery_status(self, obj):
        if obj.delivery_status == 'read':
            return 'read'
        if obj.recipient_id and obj.read_by.filter(id=obj.recipient_id).exists():
            return 'read'
        if obj.read_by.exclude(id=obj.sender_id).exists():
            return 'read'
        return obj.delivery_status or 'sent'

    def get_sender_name(self, obj):
        emp = getattr(obj.sender, 'employee_profile', None)
        if emp:
            return emp.name
        return f"{obj.sender.first_name} {obj.sender.last_name}".strip() or obj.sender.username

    def get_sender_initials(self, obj):
        name = self.get_sender_name(obj)
        parts = name.split()
        if len(parts) >= 2:
            return (parts[0][0] + parts[-1][0]).upper()
        return name[:2].upper()

    def get_sender_avatar(self, obj):
        request = self.context.get('request')
        emp = getattr(obj.sender, 'employee_profile', None)
        if emp and emp.avatar:
            if request:
                return request.build_absolute_uri(emp.avatar.url)
            return emp.avatar.url
        profile = getattr(obj.sender, 'profile', None)
        if profile and profile.avatar:
            if request:
                return request.build_absolute_uri(profile.avatar.url)
            return profile.avatar.url
        return None

    def get_reply_to_text(self, obj):
        if obj.reply_to:
            if obj.reply_to.is_deleted:
                return "This message was deleted"
            return obj.reply_to.text[:80]
        return None

    def get_reply_to_sender(self, obj):
        if obj.reply_to:
            emp = getattr(obj.reply_to.sender, 'employee_profile', None)
            if emp:
                return emp.name
            return f"{obj.reply_to.sender.first_name} {obj.reply_to.sender.last_name}".strip() or obj.reply_to.sender.username
        return None

    def get_display_text(self, obj):
        if obj.is_deleted:
            return "This message was deleted"
        return obj.text

    def get_attachment(self, obj):
        if not obj.attachment:
            return None
        request = self.context.get('request')
        url = obj.attachment.url
        if request and not url.startswith('http'):
            return request.build_absolute_uri(url)
        return url


class ChatSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatSettings
        fields = ['group_locked', 'blocked_user_ids', 'updated_at']
        read_only_fields = ['updated_at']

# ------------------------------
# New serializers for multi-branch architecture
# ------------------------------

class OrganizationSerializer(serializers.ModelSerializer):
    created_by = serializers.ReadOnlyField(source='created_by.id')
    class Meta:
        model = Organization
        fields = ['id', 'name', 'created_by', 'created_at']
        read_only_fields = ['id', 'created_at']

class BranchSerializer(serializers.ModelSerializer):
    organization = serializers.PrimaryKeyRelatedField(queryset=Organization.objects.all())
    created_by = serializers.ReadOnlyField(source='created_by.id')
    class Meta:
        model = Branch
        fields = ['id', 'name', 'organization', 'created_by', 'is_active', 'archived_at']
        read_only_fields = ['id', 'archived_at']

class SubscriptionSerializer(serializers.ModelSerializer):
    organization = serializers.PrimaryKeyRelatedField(queryset=Organization.objects.all())
    class Meta:
        model = Subscription
        fields = ['id', 'organization', 'plan', 'start_date', 'end_date', 'max_records_per_field', 'features']
        read_only_fields = ['id']

class UserExtensionSerializer(serializers.ModelSerializer):
    user = serializers.PrimaryKeyRelatedField(queryset=User.objects.all())
    organization = serializers.PrimaryKeyRelatedField(queryset=Organization.objects.all())
    branch = serializers.PrimaryKeyRelatedField(queryset=Branch.objects.all(), allow_null=True, required=False)
    class Meta:
        model = UserExtension
        fields = ['id', 'user', 'role', 'organization', 'branch']
        read_only_fields = ['id']


# ---------------------------------------------------------------------------
# Enterprise Communication Serializers
# ---------------------------------------------------------------------------

class MessageAttachmentSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = MessageAttachment
        fields = ['id', 'original_filename', 'file_type', 'file_size', 'file_url', 'uploaded_at']
        read_only_fields = ['id', 'uploaded_at']

    def get_file_url(self, obj):
        request = self.context.get('request')
        if request and obj.file:
            return request.build_absolute_uri(obj.file.url)
        return obj.file.url if obj.file else None


class MessageReactionSerializer(serializers.ModelSerializer):
    username = serializers.ReadOnlyField(source='user.username')

    class Meta:
        model = MessageReaction
        fields = ['id', 'emoji', 'user', 'username', 'created_at']
        read_only_fields = ['id', 'created_at']


class UserPresenceSerializer(serializers.ModelSerializer):
    user_id = serializers.ReadOnlyField(source='user.id')
    username = serializers.ReadOnlyField(source='user.username')
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = UserPresence
        fields = ['user_id', 'username', 'full_name', 'status', 'status_message', 'last_seen']
        read_only_fields = ['last_seen']

    def get_full_name(self, obj):
        return obj.user.get_full_name() or obj.user.username


class ChatChannelSerializer(serializers.ModelSerializer):
    member_count = serializers.SerializerMethodField()
    created_by_username = serializers.ReadOnlyField(source='created_by.username')

    class Meta:
        model = ChatChannel
        fields = [
            'id', 'group', 'name', 'description', 'is_private',
            'member_count', 'created_by_username', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_member_count(self, obj):
        return obj.members.count()


class CallRecordSerializer(serializers.ModelSerializer):
    caller_name = serializers.SerializerMethodField()
    caller_avatar = serializers.SerializerMethodField()
    callee_name = serializers.SerializerMethodField()
    callee_avatar = serializers.SerializerMethodField()
    duration_label = serializers.SerializerMethodField()

    class Meta:
        model = CallRecord
        fields = [
            'id', 'caller', 'caller_name', 'caller_avatar',
            'callee', 'callee_name', 'callee_avatar',
            'call_type', 'status', 'started_at', 'accepted_at', 'ended_at',
            'duration_seconds', 'duration_label',
        ]
        read_only_fields = ['id', 'started_at']

    def get_caller_name(self, obj):
        return obj.caller.get_full_name() or obj.caller.username

    def get_caller_avatar(self, obj):
        emp = getattr(obj.caller, 'employee_profile', None)
        if emp and emp.photo:
            return emp.photo.url
        profile = getattr(obj.caller, 'profile', None)
        if profile and profile.avatar:
            return profile.avatar.url
        return None

    def get_callee_name(self, obj):
        if obj.callee:
            return obj.callee.get_full_name() or obj.callee.username
        return None

    def get_callee_avatar(self, obj):
        if not obj.callee:
            return None
        emp = getattr(obj.callee, 'employee_profile', None)
        if emp and emp.photo:
            return emp.photo.url
        profile = getattr(obj.callee, 'profile', None)
        if profile and profile.avatar:
            return profile.avatar.url
        return None

    def get_duration_label(self, obj):
        secs = obj.duration_seconds
        if not secs:
            return None
        m, s = divmod(secs, 60)
        h, m = divmod(m, 60)
        if h:
            return f'{h}h {m}m {s}s'
        if m:
            return f'{m}m {s}s'
        return f'{s}s'


class ReportedAccountSerializer(serializers.ModelSerializer):
    reporter_name = serializers.SerializerMethodField()
    reported_user_name = serializers.SerializerMethodField()
    reason_display = serializers.CharField(source='get_reason_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = ReportedAccount
        fields = [
            'id', 'reporter', 'reporter_name', 'reported_user', 'reported_user_name',
            'reason', 'reason_display', 'details', 'chat_message', 'status', 'status_display',
            'action_taken', 'admin_notes', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'reporter', 'created_at', 'updated_at']

    def get_reporter_name(self, obj):
        if not obj.reporter:
            return 'Anonymous'
        emp = getattr(obj.reporter, 'employee_profile', None)
        return emp.name if emp else (obj.reporter.get_full_name() or obj.reporter.username)

    def get_reported_user_name(self, obj):
        emp = getattr(obj.reported_user, 'employee_profile', None)
        return emp.name if emp else (obj.reported_user.get_full_name() or obj.reported_user.username)


class BlockedAccountSerializer(serializers.ModelSerializer):
    blocked_user_name = serializers.SerializerMethodField()
    blocked_by_name = serializers.SerializerMethodField()

    class Meta:
        model = BlockedAccount
        fields = [
            'id', 'blocked_by', 'blocked_by_name', 'blocked_user', 'blocked_user_name',
            'scope', 'reason', 'is_active', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'blocked_by', 'created_at', 'updated_at']

    def get_blocked_user_name(self, obj):
        emp = getattr(obj.blocked_user, 'employee_profile', None)
        return emp.name if emp else (obj.blocked_user.get_full_name() or obj.blocked_user.username)

    def get_blocked_by_name(self, obj):
        emp = getattr(obj.blocked_by, 'employee_profile', None)
        return emp.name if emp else (obj.blocked_by.get_full_name() or obj.blocked_by.username)


class NoteSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    employee_name = serializers.SerializerMethodField()

    class Meta:
        model = Note
        fields = [
            'id', 'user', 'user_name', 'employee', 'employee_name',
            'title', 'content', 'category', 'pinned', 'color_tag',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']

    def get_user_name(self, obj):
        return obj.user.get_full_name() or obj.user.username

    def get_employee_name(self, obj):
        return obj.employee.name if obj.employee else None


