import os
import sys
import django

# Force SQLite by clearing DATABASE_URL from env
if 'DATABASE_URL' in os.environ:
    del os.environ['DATABASE_URL']

os.environ['DJANGO_SETTINGS_MODULE'] = 'core.settings'
sys.path.insert(0, '.')
django.setup()

from django.contrib.auth.models import User
from api.models import Employee, Client, Project, Transaction, Debt, BudgetCategory

print("SQLite DB Users:", [(u.username, u.email) for u in User.objects.all()])
print("SQLite DB Employees:", [e.name for e in Employee.objects.all()])
print("SQLite DB Clients:", [c.company for c in Client.objects.all()])
