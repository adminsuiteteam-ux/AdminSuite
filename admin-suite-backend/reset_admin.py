import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth.models import User
from api.models import UserProfile

u, created = User.objects.get_or_create(
    username='admin',
    defaults={
        'email': 'admin@adminsuite.app',
        'first_name': 'Admin',
        'last_name': 'Suite',
        'is_staff': True,
        'is_superuser': True,
    }
)
u.set_password('AdminSuite#2210')
u.is_staff = True
u.is_superuser = True
u.email = 'admin@adminsuite.app'
u.save()

p, _ = UserProfile.objects.get_or_create(user=u)
p.role = 'CEO'
p.business_name = 'AdminSuite'
p.profile_complete = True
p.save()

action = 'CREATED' if created else 'UPDATED'
print(f'[OK] Admin user {action} in Supabase DB')
print(f'     Username: admin')
print(f'     Email:    admin@adminsuite.app')
print(f'     Password: AdminSuite#2210')
