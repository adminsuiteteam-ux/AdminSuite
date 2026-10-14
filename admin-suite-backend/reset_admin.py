import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth.models import User
from api.models import UserProfile

import sys
import getpass

password = os.environ.get('ADMIN_PASSWORD')
if not password:
    if sys.stdin.isatty():
        password = getpass.getpass("Enter new admin password: ")
    else:
        print("[ERROR] ADMIN_PASSWORD environment variable is required.")
        sys.exit(1)

username = os.environ.get('ADMIN_USERNAME', 'admin')
email = os.environ.get('ADMIN_EMAIL', 'admin@adminsuite.app')

u, created = User.objects.get_or_create(
    username=username,
    defaults={
        'email': email,
        'first_name': 'Admin',
        'last_name': 'Suite',
        'is_staff': True,
        'is_superuser': True,
    }
)
u.set_password(password)
u.is_staff = True
u.is_superuser = True
u.email = email
u.save()

p, _ = UserProfile.objects.get_or_create(user=u)
p.role = 'CEO'
p.business_name = 'AdminSuite'
p.profile_complete = True
p.save()

action = 'CREATED' if created else 'UPDATED'
print(f'[OK] Admin user {action}')
print(f'     Username: {username}')
print(f'     Email:    {email}')
print(f'     Password: [CONFIGURED VIA ENV / INPUT]')
