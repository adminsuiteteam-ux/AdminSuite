from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from api.models import UserProfile
import os


class Command(BaseCommand):
    help = 'Ensure the admin superuser exists, create it if not.'

    def handle(self, *args, **options):
        username = os.environ.get('ADMIN_USERNAME', 'admin')
        email = os.environ.get('ADMIN_EMAIL', 'admin@adminsuite.app')
        password = os.environ.get('ADMIN_PASSWORD', 'AdminDimaro2210!')

        user, created = User.objects.get_or_create(
            username=username,
            defaults={
                'email': email,
                'first_name': 'Admin',
                'last_name': 'Suite',
                'is_staff': True,
                'is_superuser': True,
            }
        )

        if created:
            user.set_password(password)
            user.save()
            self.stdout.write(self.style.SUCCESS(
                f'[OK] Superuser "{username}" created with email {email}.'
            ))
        else:
            # Always sync password and staff flags on existing user
            user.set_password(password)
            user.is_staff = True
            user.is_superuser = True
            user.email = email
            user.save()
            self.stdout.write(self.style.SUCCESS(
                f'[OK] Superuser "{username}" already exists — password and flags synced.'
            ))

        # Ensure UserProfile exists
        profile, _ = UserProfile.objects.get_or_create(user=user)
        profile.role = 'CEO'
        profile.business_name = 'AdminSuite'
        profile.profile_complete = True
        profile.save()
        self.stdout.write(self.style.SUCCESS('[OK] UserProfile synced.'))
