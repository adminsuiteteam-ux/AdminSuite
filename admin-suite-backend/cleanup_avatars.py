import os
import sys
import django

# Add django project to path and initialize it
sys.path.insert(0, r'c:\Users\Dimacode.x\Desktop\AdminSuite\admin-suite-backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth.models import User
from api.models import UserProfile, Employee, ChatGroup
import urllib.request
import urllib.error

def is_url_broken(url):
    if not url:
        return False
    try:
        req = urllib.request.Request(url, method='HEAD')
        with urllib.request.urlopen(req) as resp:
            return resp.status != 200
    except urllib.error.HTTPError as he:
        if he.code == 404:
            return True
        return False
    except Exception:
        return True

print("Cleaning up User Profiles...")
for p in UserProfile.objects.all():
    if p.avatar:
        try:
            url = p.avatar.url
            if is_url_broken(url):
                print(f"Clearing broken avatar for profile {p.user.username}: {p.avatar.name}")
                p.avatar = None
                p.save(update_fields=['avatar'])
        except Exception as e:
            print(f"Error checking profile avatar {p.user.username}: {e}")
            p.avatar = None
            p.save(update_fields=['avatar'])

print("\nCleaning up Employees...")
for e in Employee.objects.all():
    if e.avatar:
        try:
            url = e.avatar.url
            if is_url_broken(url):
                print(f"Clearing broken avatar for employee {e.name}: {e.avatar.name}")
                e.avatar = None
                e.save(update_fields=['avatar'])
        except Exception as ex:
            print(f"Error checking employee avatar {e.name}: {ex}")
            e.avatar = None
            e.save(update_fields=['avatar'])

print("\nCleaning up Chat Groups...")
for g in ChatGroup.objects.all():
    if g.avatar:
        try:
            url = g.avatar.url
            if is_url_broken(url):
                print(f"Clearing broken avatar for group {g.name}: {g.avatar.name}")
                g.avatar = None
                g.save(update_fields=['avatar'])
        except Exception as ex:
            print(f"Error checking group avatar {g.name}: {ex}")
            g.avatar = None
            g.save(update_fields=['avatar'])

print("\nCleanup complete!")
