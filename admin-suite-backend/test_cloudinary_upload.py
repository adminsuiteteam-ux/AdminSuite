import os
import sys
import django

# Add django project to path and initialize it
sys.path.insert(0, r'c:\Users\Dimacode.x\Desktop\AdminSuite\admin-suite-backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
import base64

# Tiny 1x1 transparent GIF
gif_data = base64.b64decode("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7")

if __name__ == '__main__':
    print("Using default storage class:", default_storage.__class__)

    try:
        print("Attempting to save a test GIF image via default_storage...")
        file_name = default_storage.save("test_avatar.gif", ContentFile(gif_data))
        print("File saved successfully! Name:", file_name)
        url = default_storage.url(file_name)
        print("File URL:", url)
        print("Attempting to delete the test file...")
        default_storage.delete(file_name)
        print("File deleted successfully!")
    except Exception as e:
        print("Error during storage operation:")
        import traceback
        traceback.print_exc()
