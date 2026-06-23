import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth.models import User
from api.models import UserProfile

def create_admin():
    # Create fresh superuser admin
    if User.objects.filter(username='admin').exists():
        User.objects.filter(username='admin').delete()
        print("Removed existing admin user.")

    admin = User.objects.create_superuser(
        username='admin',
        email='admin@adminsuite.app',
        password='AdminSuite@2025',
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
    print("  URL:      http://localhost:8000/")
    print("  Admin Panel: http://localhost:8000/admin/")
    print("  Email:    admin@adminsuite.app")
    print("  Username: admin")
    print("  Password: AdminSuite@2025")
    print("========================================\n")

if __name__ == '__main__':
    create_admin()
