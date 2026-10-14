import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth.models import User
from api.models import UserProfile

import sys
import getpass

def create_admin():
    # Read password from environment or prompt securely
    password = os.environ.get('ADMIN_PASSWORD')
    if not password:
        if sys.stdin.isatty():
            password = getpass.getpass("Enter admin password: ")
        else:
            print("[ERROR] ADMIN_PASSWORD environment variable is required.")
            return

    username = os.environ.get('ADMIN_USERNAME', 'admin')
    email = os.environ.get('ADMIN_EMAIL', 'admin@adminsuite.app')

    # Create fresh superuser admin
    if User.objects.filter(username=username).exists():
        User.objects.filter(username=username).delete()
        print(f"Removed existing {username} user.")

    admin = User.objects.create_superuser(
        username=username,
        email=email,
        password=password,
        first_name='Admin',
        last_name='Suite',
    )

    # Create UserProfile for admin
    profile, _ = UserProfile.objects.get_or_create(user=admin)
    profile.role = 'CEO'
    profile.business_name = 'AdminSuite'
    profile.profile_complete = True
    profile.save()

    print("\n[OK] Fresh admin account created successfully!")
    print("\n========================================")
    print("  BACKEND LOGIN CREDENTIALS")
    print("========================================")
    print("  URL:         http://localhost:8000/")
    print("  Admin Panel: http://localhost:8000/admin/")
    print(f"  Email:       {email}")
    print(f"  Username:    {username}")
    print("  Password:    [CONFIGURED VIA ENV / INPUT]")
    print("========================================\n")

if __name__ == '__main__':
    create_admin()
