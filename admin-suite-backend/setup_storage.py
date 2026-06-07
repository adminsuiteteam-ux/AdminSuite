import os
import sys
import django

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
sys.path.insert(0, '.')
django.setup()

from django.db import connection

def setup_storage():
    print("Setting up Supabase Storage releases bucket and policies...")
    with connection.cursor() as cursor:
        try:
            # 1. Insert bucket
            cursor.execute("""
                INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
                VALUES ('releases', 'releases', true, null, null)
                ON CONFLICT (id) DO UPDATE 
                SET public = true;
            """)
            print("[OK] releases bucket created or updated.")
            
            # 2. Check existing policies
            cursor.execute("""
                SELECT policyname, cmd, qual, with_check 
                FROM pg_policies 
                WHERE tablename = 'objects' AND schemaname = 'storage';
            """)
            policies = cursor.fetchall()
            print("Existing storage.objects policies:")
            for p in policies:
                print(f" - {p[0]} ({p[1]})")
                
            # 3. Create public read/write policies for the releases bucket
            # Drop policies if they exist to avoid collision
            cursor.execute("DROP POLICY IF EXISTS \"Public Select Releases\" ON storage.objects;")
            cursor.execute("DROP POLICY IF EXISTS \"Public Insert Releases\" ON storage.objects;")
            cursor.execute("DROP POLICY IF EXISTS \"Public Update Releases\" ON storage.objects;")
            cursor.execute("DROP POLICY IF EXISTS \"Public Delete Releases\" ON storage.objects;")
            
            # Create policies
            cursor.execute("""
                CREATE POLICY "Public Select Releases" ON storage.objects 
                FOR SELECT USING (bucket_id = 'releases');
            """)
            cursor.execute("""
                CREATE POLICY "Public Insert Releases" ON storage.objects 
                FOR INSERT WITH CHECK (bucket_id = 'releases');
            """)
            cursor.execute("""
                CREATE POLICY "Public Update Releases" ON storage.objects 
                FOR UPDATE USING (bucket_id = 'releases') WITH CHECK (bucket_id = 'releases');
            """)
            cursor.execute("""
                CREATE POLICY "Public Delete Releases" ON storage.objects 
                FOR DELETE USING (bucket_id = 'releases');
            """)
            print("[OK] Public read/write policies created for 'releases' bucket.")
            
            # Verify setup
            cursor.execute("SELECT id, name, public FROM storage.buckets;")
            print("Current Buckets:", cursor.fetchall())
            
        except Exception as e:
            print("Error setting up storage:", e)

if __name__ == '__main__':
    setup_storage()
