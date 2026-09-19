"""
Quick verification script to test email delivery (ZeptoMail / SMTP).
Usage:
    python test_email.py your-email@example.com
"""
import os
import sys
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.conf import settings
from django.core.mail import EmailMultiAlternatives


def test_send(target_email: str):
    print("=" * 60)
    print("AdminSuite Email Configuration Check:")
    print(f"  EMAIL_BACKEND:       {settings.EMAIL_BACKEND}")
    print(f"  EMAIL_HOST:          {settings.EMAIL_HOST}")
    print(f"  EMAIL_PORT:          {settings.EMAIL_PORT}")
    print(f"  EMAIL_USE_TLS:       {settings.EMAIL_USE_TLS}")
    print(f"  EMAIL_USE_SSL:       {settings.EMAIL_USE_SSL}")
    print(f"  EMAIL_HOST_USER:     {settings.EMAIL_HOST_USER}")
    print(f"  DEFAULT_FROM_EMAIL:  {settings.DEFAULT_FROM_EMAIL}")
    print("=" * 60)

    print(f"Attempting to send test email to {target_email}...")
    try:
        subject = "ZeptoMail Test from AdminSuite 🚀"
        text_content = "This is a test email sent from AdminSuite via ZeptoMail SMTP."
        html_content = """
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
            <h2 style="color: #4f46e5;">ZeptoMail Integration Successful!</h2>
            <p>Your AdminSuite backend is properly configured to dispatch transactional emails via ZeptoMail.</p>
            <p style="color: #6b7280; font-size: 13px;">Sent from AdminSuite Backend Test Runner.</p>
        </div>
        """
        msg = EmailMultiAlternatives(
            subject=subject,
            body=text_content,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[target_email],
        )
        msg.attach_alternative(html_content, "text/html")
        result = msg.send(fail_silently=False)
        
        if result == 1:
            print(f"[SUCCESS] Test email successfully sent to {target_email}!")
        else:
            print(f"[WARNING] msg.send() returned {result}")
    except Exception as e:
        print(f"[ERROR] Failed to send email: {type(e).__name__}: {e}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Please provide a recipient email address:")
        print("  python test_email.py your-email@example.com")
        sys.exit(1)
    
    test_send(sys.argv[1])
