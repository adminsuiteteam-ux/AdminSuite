import os
import django
os.environ['DJANGO_SETTINGS_MODULE'] = 'core.settings'
django.setup()

import sys
import getpass
from django.contrib.auth.models import User
from django.contrib.auth import authenticate

username = os.environ.get('ADMIN_USERNAME', 'admin')
password = os.environ.get('ADMIN_PASSWORD')
if not password:
    if sys.stdin.isatty():
        password = getpass.getpass("Enter admin password to verify: ")
    else:
        print("[ERROR] ADMIN_PASSWORD environment variable is required.")
        sys.exit(1)

u = User.objects.filter(username=username).first()
if u:
    auth = authenticate(username=username, password=password)
    print(f'User "{username}" exists: YES')
    print(f'is_staff={u.is_staff}, is_superuser={u.is_superuser}')
    print(f'Password authentication works: {bool(auth)}')
else:
    print(f'NO user found for "{username}"')
