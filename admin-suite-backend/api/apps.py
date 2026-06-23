from django.apps import AppConfig


class ApiConfig(AppConfig):
    name = 'api'

    def ready(self):
        import api.signals  # noqa: F401
        self._ensure_admin_exists()

    def _ensure_admin_exists(self):
        """Auto-create/sync the admin superuser on every server start.
        Reads credentials from environment variables so they can be set
        securely in the Render dashboard without hardcoding.
        """
        import os
        try:
            from django.contrib.auth.models import User
            from api.models import UserProfile

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

            # Always sync password + flags (handles password changes via env var)
            user.set_password(password)
            user.is_staff = True
            user.is_superuser = True
            user.email = email
            user.save()

            UserProfile.objects.get_or_create(
                user=user,
                defaults={'role': 'CEO', 'business_name': 'AdminSuite', 'profile_complete': True}
            )

            action = 'Created' if created else 'Synced'
            print(f'[AdminSuite] {action} superuser "{username}" ({email})')
        except Exception as exc:
            # Never crash the app if admin setup fails
            print(f'[AdminSuite] Warning: Could not ensure admin user: {exc}')

