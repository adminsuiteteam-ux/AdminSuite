import os
import sys
import django

if __name__ == '__main__':
    # Add django project to path and initialize it
    sys.path.insert(0, r'c:\Users\Dimacode.x\Desktop\AdminSuite\admin-suite-backend')
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
    django.setup()

    from django.contrib.auth.models import User
    from api.models import UserProfile
    from django.core.files.base import ContentFile
    import base64
    import urllib.request
    import urllib.error

    # User 'adminsuiteteam@gmail.com'
    try:
        user = User.objects.get(username='adminsuiteteam@gmail.com')
        profile = user.profile
        print(f"Original avatar: {profile.avatar.name if profile.avatar else None}")
        
        # 1x1 GIF
        gif_data = base64.b64decode("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7")
        
        print("Patching avatar...")
        profile.avatar.save("dimacode_test.gif", ContentFile(gif_data))
        profile.save()
        
        # Refresh from DB
        profile.refresh_from_db()
        print(f"New avatar name: {profile.avatar.name}")
        print(f"New avatar URL: {profile.avatar.url}")
        
        # HTTP check
        req = urllib.request.Request(profile.avatar.url, method='HEAD')
        try:
            with urllib.request.urlopen(req) as resp:
                print(f"HTTP Status code for new avatar: {resp.status}")
        except urllib.error.HTTPError as he:
            print(f"HTTP Error {he.code}: {he.reason}")
        except Exception as ex:
            print(f"Connection/HTTP check error: {ex}")
            
    except Exception as e:
        import traceback
        traceback.print_exc()
