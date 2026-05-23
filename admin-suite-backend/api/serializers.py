from rest_framework import serializers
from django.contrib.auth.models import User
from .models import (
    Employee, EmployeeFinance, PayHistory, Client, Project, 
    Transaction, Notification, Debt, BudgetCategory, Savings
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
        user = User.objects.create_user(**validated_data)
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

class EmployeeSerializer(serializers.ModelSerializer):
    finance = EmployeeFinanceSerializer(read_only=True)
    finance_data = serializers.JSONField(write_only=True, required=False)
    
    class Meta:
        model = Employee
        fields = [
            'id', 'name', 'role', 'department', 'office', 'status', 
            'performance', 'salary', 'initials', 'avatar', 'email', 
            'phone', 'location', 'bio', 'socials', 'finance', 'finance_data'
        ]
        read_only_fields = ['user']

    def to_internal_value(self, data):
        # Handle FormData stringified JSON
        if isinstance(data.get('socials'), str):
            import json
            try:
                data = data.copy()
                data['socials'] = json.loads(data['socials'])
            except:
                pass
        if isinstance(data.get('finance_data'), str):
            import json
            try:
                data = data.copy()
                data['finance_data'] = json.loads(data['finance_data'])
            except:
                pass
        return super().to_internal_value(data)

    def create(self, validated_data):
        finance_data = validated_data.pop('finance_data', {})
        user = validated_data.get('user')
        
        # Create finance record first
        finance = EmployeeFinance.objects.create(user=user, **finance_data)
        employee = Employee.objects.create(finance=finance, **validated_data)
        return employee

    def update(self, instance, validated_data):
        finance_data = validated_data.pop('finance_data', None)
        if finance_data:
            for attr, value in finance_data.items():
                setattr(instance.finance, attr, value)
            instance.finance.save()
            
        return super().update(instance, validated_data)

class ProjectSerializer(serializers.ModelSerializer):
    client_name = serializers.ReadOnlyField(source='client.company')

    class Meta:
        model = Project
        fields = ['id', 'name', 'client', 'client_name', 'status', 'value', 'progress']

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
        from .models import UserProfile
        model = UserProfile
        fields = [
            'location', 'heard_from', 'phone', 'avatar',
            'bio', 'social_link', 'profile_complete',
        ]


class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True, min_length=8)

    def validate_email(self, value):
        value = value.strip().lower()
        if User.objects.filter(email=value).exists():
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
        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
        )
        return user
