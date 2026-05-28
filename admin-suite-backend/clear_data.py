import os
import sys
import django

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
sys.path.insert(0, '.')
django.setup()

from django.contrib.auth.models import User
from rest_framework.authtoken.models import Token
from api.models import (
    Employee, EmployeeFinance, PayHistory, Client, Project, 
    Transaction, Notification, Debt, BudgetCategory, Savings, 
    UserProfile, PhoneOTP, EmailVerificationCode
)
from django.core.cache import cache

def clear_all_data():
    print("--- Database Cleanup started ---")
    
    # 1. Clear django default cache
    try:
        cache.clear()
        print("[OK] Django cache cleared successfully.")
    except Exception as e:
        print(f"Error clearing cache: {str(e).encode('ascii', 'ignore').decode('ascii')}")

    # 2. Delete all model records in order of dependencies
    models_to_clear = [
        Token,
        PhoneOTP,
        EmailVerificationCode,
        Debt,
        Transaction,
        Savings,
        BudgetCategory,
        Project,
        Client,
        Notification,
        PayHistory,
        Employee,
        EmployeeFinance,
        UserProfile,
        User
    ]
    
    for model in models_to_clear:
        try:
            count, _ = model.objects.all().delete()
            print(f"[OK] Cleared {count} records from {model.__name__}")
        except Exception as e:
            err_msg = str(e).encode('ascii', 'ignore').decode('ascii')
            print(f"Error clearing {model.__name__}: {err_msg}")

    print("--- Database Cleanup completed successfully! ---")

if __name__ == '__main__':
    clear_all_data()
