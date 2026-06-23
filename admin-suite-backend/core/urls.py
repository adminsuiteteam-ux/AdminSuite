"""
URL configuration for core project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
import os
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse
from api.views import ThrottledObtainAuthToken

# Secret token to protect the setup endpoint (set via env var)
_SETUP_TOKEN = os.environ.get('SETUP_SECRET_TOKEN', 'adminsuite-setup-9x7k2p')


def health_check(request):
    return JsonResponse({"status": "ok", "service": "adminsuite-api"})


def sentry_debug(request):
    raise Exception("Sentry backend integration test error!")


def setup_admin(request):
    """One-time endpoint to create/reset admin superuser.
    Protected by a secret token query param: /setup-admin/?token=SECRET
    """
    token = request.GET.get('token', '')
    if token != _SETUP_TOKEN:
        return JsonResponse({"error": "Forbidden"}, status=403)

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
        user.set_password(password)
        user.is_staff = True
        user.is_superuser = True
        user.email = email
        user.save()

        UserProfile.objects.get_or_create(
            user=user,
            defaults={'role': 'CEO', 'business_name': 'AdminSuite', 'profile_complete': True}
        )

        action = 'created' if created else 'password reset'
        return JsonResponse({
            "success": True,
            "action": action,
            "username": username,
            "email": email,
            "password": password,
            "admin_url": "/admin/",
        })
    except Exception as exc:
        return JsonResponse({"success": False, "error": str(exc)}, status=500)


urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('api.urls')),
    path('api-token-auth/', ThrottledObtainAuthToken.as_view(), name='api_token_auth'),
    path('health/', health_check, name='health-check'),
    path('api/sentry-debug/', sentry_debug, name='sentry-debug'),
    path('setup-admin/', setup_admin, name='setup-admin'),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

