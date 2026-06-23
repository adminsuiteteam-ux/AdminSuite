import os
import django
os.environ['DJANGO_SETTINGS_MODULE'] = 'core.settings'
django.setup()

from django.contrib.auth.models import User
from django.contrib.auth import authenticate

u = User.objects.filter(username='admin').first()
if u:
    auth1 = authenticate(username='admin', password='AdminDimaro2210!')
    auth2 = authenticate(username='admin', password='AdminSuite#2210')
    print(f'User exists: YES')
    print(f'is_staff={u.is_staff}, is_superuser={u.is_superuser}')
    print(f'Password AdminDimaro2210! works: {bool(auth1)}')
    print(f'Password AdminSuite#2210 works: {bool(auth2)}')
    # Force reset to correct password
    u.set_password('AdminDimaro2210!')
    u.save()
    print('Password reset to AdminDimaro2210! in Supabase - DONE')
else:
    print('NO admin user found - creating one now...')
    u = User.objects.create_superuser('admin', 'admin@adminsuite.app', 'AdminDimaro2210!')
    print('Admin created with password AdminDimaro2210!')
