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
    ChatMessage
)

from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError

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
            'shares', 'pay_history', 'bonuses', 'deductions'
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
    
    class Meta:
        model = Employee
        fields = [
            'id', 'name', 'role', 'department', 'office', 'status', 
            'performance', 'salary', 'initials', 'avatar', 'email', 
            'phone', 'location', 'bio', 'socials', 'finance', 'finance_data',
            'is_flagged', 'flag_reason', 'flag_note', 'is_archived',
            'activity_logs', 'queries', 'tasks', 'leaves', 'messages',
            'documents', 'salary_adjustments', 'linked_user', 'temp_password'
        ]
        read_only_fields = ['user', 'linked_user']
        extra_kwargs = {
            'office': {'required': False, 'allow_blank': True, 'default': ''},
            'phone': {'required': False, 'allow_blank': True},
            'location': {'required': False, 'allow_blank': True},
            'bio': {'required': False, 'allow_blank': True},
            'performance': {'required': False, 'default': 0},
            'salary': {'required': False, 'default': 0},
            'initials': {'required': False, 'default': ''},
            'socials': {'required': False},
        }

    def get_temp_password(self, obj):
        return getattr(obj, '_temp_password', None)

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
        finance_data = validated_data.pop('finance_data', {})
        user = validated_data.get('user')
        
        # Auto-create user account for the employee
        email = validated_data.get('email', '').strip().lower()
        name = validated_data.get('name', '').strip()
        
        if User.objects.filter(email=email).exists():
            raise serializers.ValidationError({"email": "A user with this email address already exists."})
            
        temp_password = "Temp#" + "".join(random.choices(string.ascii_letters + string.digits, k=8))
        
        # Create Django User
        emp_user = User.objects.create_user(
            username=email,
            email=email,
            password=temp_password,
            first_name=name.split(' ')[0] if name else '',
            last_name=' '.join(name.split(' ')[1:]) if name else ''
        )
        
        # Setup Employee UserProfile
        profile, _ = UserProfile.objects.get_or_create(user=emp_user)
        profile.role = 'employee'
        profile.is_first_login = True
        profile.profile_complete = True
        profile.save()
        
        validated_data['linked_user'] = emp_user

        # Filter finance_data to only valid EmployeeFinance fields
        valid_finance_fields = {f.name for f in EmployeeFinance._meta.get_fields() if hasattr(f, 'column')} # type: ignore
        clean_finance = {k: v for k, v in finance_data.items() if k in valid_finance_fields and k != 'id'}
        
        # Create finance record first
        finance = EmployeeFinance.objects.create(user=user, **clean_finance) # type: ignore
        employee = Employee.objects.create(finance=finance, **validated_data) # type: ignore
        
        # Save temp password to display to Admin
        employee._temp_password = temp_password
        return employee

    def update(self, instance, validated_data):
        finance_data = validated_data.pop('finance_data', None)
        if finance_data:
            valid_finance_fields = {f.name for f in EmployeeFinance._meta.get_fields() if hasattr(f, 'column')} # type: ignore
            for attr, value in finance_data.items():
                if attr in valid_finance_fields and attr != 'id':
                    setattr(instance.finance, attr, value)
            instance.finance.save() # type: ignore
            
        return super().update(instance, validated_data)

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
            'location': {'required': False, 'allow_blank': True, 'default': ''},
            'website': {'required': False, 'allow_blank': True, 'default': ''},
            'description': {'required': False, 'allow_blank': True, 'default': ''},
            'remark': {'required': False, 'allow_blank': True, 'default': ''},
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


class ChatMessageSerializer(serializers.ModelSerializer):
    sender_id = serializers.ReadOnlyField(source='sender.id')
    sender_name = serializers.SerializerMethodField()
    sender_initials = serializers.SerializerMethodField()
    sender_avatar = serializers.SerializerMethodField()
    recipient_id = serializers.ReadOnlyField(source='recipient.id', default=None)
    reply_to_id = serializers.PrimaryKeyRelatedField(
        queryset=ChatMessage.objects.all(), source='reply_to', required=False, allow_null=True
    )
    reply_to_text = serializers.SerializerMethodField()
    reply_to_sender = serializers.SerializerMethodField()
    display_text = serializers.SerializerMethodField()

    class Meta:
        model = ChatMessage
        fields = [
            'id', 'sender_id', 'sender_name', 'sender_initials', 'sender_avatar',
            'recipient_id', 'text', 'display_text', 'is_pinned', 'is_edited', 'is_deleted',
            'reply_to_id', 'reply_to_text', 'reply_to_sender',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['sender_id', 'sender_name', 'sender_initials', 'sender_avatar',
                            'recipient_id', 'is_edited', 'is_deleted', 'created_at', 'updated_at']

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
