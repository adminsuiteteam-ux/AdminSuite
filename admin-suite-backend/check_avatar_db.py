import os
import sys
import django

# Add django project to path and initialize it
sys.path.insert(0, r'c:\Users\Dimacode.x\Desktop\AdminSuite\admin-suite-backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth.models import User
from api.models import UserProfile, Employee
import urllib.request
import urllib.error

print("Checking Profiles:")
for p in UserProfile.objects.all():
    print(f"User: {p.user.username}, email: {p.user.email}, avatar: {p.avatar.name if p.avatar else None}")
    if p.avatar:
        try:
            url = p.avatar.url
            print(f"  avatar.url: {url}")
            # Request headers
            req = urllib.request.Request(url, method='HEAD')
            try:
                with urllib.request.urlopen(req) as resp:
                    print(f"  Status code: {resp.status}")
            except urllib.error.HTTPError as he:
                print(f"  HTTP Error {he.code}: {he.reason}")
            except Exception as ex:
                print(f"  Connection error: {ex}")
        except Exception as e:
            print(f"  Error getting url: {e}")
