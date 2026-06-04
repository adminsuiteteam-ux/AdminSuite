import json
from rest_framework import serializers
from django.contrib.auth.models import User
from .models import (
    Employee, EmployeeFinance, PayHistory, Client, Project, 
    Transaction, Notification, Debt, BudgetCategory, Savings,
    UserProfile, EmployeeActivityLog, EmployeeQuery, EmployeeTask,
    EmployeeLeave, EmployeeMessage, EmployeeDocument, SalaryAdjustment
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
    
    class Meta:
        model = Employee
        fields = [
            'id', 'name', 'role', 'department', 'office', 'status', 
            'performance', 'salary', 'initials', 'avatar', 'email', 
            'phone', 'location', 'bio', 'socials', 'finance', 'finance_data',
            'is_flagged', 'flag_reason', 'flag_note', 'is_archived',
            'activity_logs', 'queries', 'tasks', 'leaves', 'messages',
            'documents', 'salary_adjustments'
        ]
        read_only_fields = ['user']
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
        
        # Filter finance_data to only valid EmployeeFinance fields
        valid_finance_fields = {f.name for f in EmployeeFinance._meta.get_fields() if hasattr(f, 'column')} # type: ignore
        clean_finance = {k: v for k, v in finance_data.items() if k in valid_finance_fields and k != 'id'}
        
        # Create finance record first
        finance = EmployeeFinance.objects.create(user=user, **clean_finance) # type: ignore
        employee = Employee.objects.create(finance=finance, **validated_data) # type: ignore
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

    class Meta:
        model = Project
        fields = [
            'id', 'name', 'client', 'client_name', 'status', 'value', 'progress',
            'start_date', 'end_date', 'location', 'image', 'video'
        ]

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
            'profile_complete',
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
