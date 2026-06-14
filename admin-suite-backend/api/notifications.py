import requests
from django.conf import settings
from .models import UserDevice
from core.safe_logger import safe_log

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"

def send_push_notification(user, title, body, data=None):
    """
    Sends a push notification to all active devices of a given User.
    """
    # Check if user has enabled notifications in their profile
    profile = getattr(user, 'profile', None)
    if profile and not profile.notifications_enabled:
        return
        
    devices = UserDevice.objects.filter(user=user, is_active=True)
    if not devices.exists():
        return
        
    recipients = [device.expo_push_token for device in devices]
    
    payload = {
        "to": recipients,
        "sound": "default",
        "title": title,
        "body": body,
        "data": data or {},
    }
    
    try:
        response = requests.post(EXPO_PUSH_URL, json=payload, timeout=10)
        response.raise_for_status()
        response_data = response.json()
        
        if 'data' in response_data:
            # Expo's response contains a list of status maps matching the index of recipients sent
            for item, device in zip(response_data['data'], list(devices)):
                if item.get('status') == 'error':
                    message = item.get('message', '')
                    if 'DeviceNotRegistered' in message:
                        # Prune token since the device is no longer registered
                        device.delete()
                        safe_log("info", f"Pruned expired push token for user {user.username}")
                        
    except Exception as e:
        safe_log("error", f"Error sending push notification to {user.username}: {str(e)}")
