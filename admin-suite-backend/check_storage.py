import os
import sys
import django

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
sys.path.insert(0, '.')
django.setup()

from django.db import connection

def check_db():
    print("Connecting to DB...")
    with connection.cursor() as cursor:
        try:
            cursor.execute("SELECT version();")
            print("Postgres Version:", cursor.fetchone()[0])
            
            # Check existing buckets
            cursor.execute("SELECT id, name, public FROM storage.buckets;")
            buckets = cursor.fetchall()
            print("Existing Buckets:", buckets)
        except Exception as e:
            print("Error query DB:", e)

if __name__ == '__main__':
    check_db()
