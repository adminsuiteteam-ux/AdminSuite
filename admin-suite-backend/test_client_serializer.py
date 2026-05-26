import os
import sys
import django

os.environ['DJANGO_SETTINGS_MODULE'] = 'core.settings'
sys.path.insert(0, '.')
django.setup()

from api.serializers import ClientSerializer
from django.contrib.auth.models import User

payload = {
    'company': 'Northwind Retail',
    'contact': 'Sarah Lin',
    'status': 'active',
    'email': 'client@company.co',
    'location': '',
    'website': 'https://company.co',
    'description': 'What they do',
    'remark': 'Notes',
    'coords': {'lat': 0, 'lng': 0}
}

serializer = ClientSerializer(data=payload)
is_valid = serializer.is_valid()
print("Is valid:", is_valid)
if not is_valid:
    print("Errors:", serializer.errors)
