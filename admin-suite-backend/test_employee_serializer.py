import os
import sys
import django

os.environ['DJANGO_SETTINGS_MODULE'] = 'core.settings'
sys.path.insert(0, '.')
django.setup()

from api.serializers import EmployeeSerializer
from django.contrib.auth.models import User
from django.http import QueryDict

# Create dummy querydict resembling multipart/form-data
q = QueryDict('', mutable=True)
q.update({
    'name': 'John Doe',
    'role': 'Developer',
    'department': 'Engineering',
    'office': '',
    'status': 'active',
    'email': 'john.doe@example.com',
    'phone': '1234567890',
    'location': 'NY',
    'bio': 'Test bio',
    'salary': '5000',
    'performance': '3',
    'initials': 'JD',
    'socials': '{"whatsapp": "123", "facebook": "fb"}',
    'finance_data': '{"employee_owes_company": 0, "company_owes_employee": 0, "shares": 0, "current_pay": 5000}'
})

class EmployeeSerializerTestPatch(EmployeeSerializer):
    def to_internal_value(self, data):
        if hasattr(data, 'dict'):
            data = data.dict()
        else:
            data = dict(data)
            
        if isinstance(data.get('socials'), str):
            import json
            try:
                data['socials'] = json.loads(data['socials'])
            except:
                pass
        if isinstance(data.get('finance_data'), str):
            import json
            try:
                data['finance_data'] = json.loads(data['finance_data'])
            except:
                pass
        return super().to_internal_value(data)

user = User.objects.first()
serializer = EmployeeSerializer(data=q)
is_valid = serializer.is_valid()
print("Is valid:", is_valid)
if not is_valid:
    print("Errors:", serializer.errors)
else:
    print("Validated data:", serializer.validated_data)
