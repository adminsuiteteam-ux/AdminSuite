import logging
import os
from django.conf import settings
from core.safe_logger import safe_log

logger = logging.getLogger(__name__)


def _send_via_courier(to_email: str, subject: str, html_body: str, text_body: str) -> None:
    """
    Internal helper — dispatches a transactional email via the Courier API.
    Django owns all auth/OTP logic; Courier is purely the email transport.
    """
    from courier import Courier  # lazy import keeps startup fast
    api_key = os.environ.get('COURIER_API_KEY') or getattr(settings, 'COURIER_API_KEY', '')
    if not api_key:
        raise RuntimeError(
            'COURIER_API_KEY is not set. Add it to your .env file or Render environment variables.'
        )
    from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'AdminSuite <no-reply@adminsuite.app>')
    client = Courier(authorization_token=api_key)
    client.send.message(
        message={
            "to": {"email": to_email},
            "content": {
                "title": subject,
                "body": html_body,
            },
            "routing": {"method": "single", "channels": ["email"]},
            "channels": {
                "email": {
                    "override": {
                        "subject": subject,
                        "from": from_email,
                    }
                }
            },
        }
    )

def send_onboarding_email(email, name, temp_password, company_name, role_display):
    """
    Sends an onboarding email with login credentials and next steps.
    """
    subject = f"Welcome to {company_name} on AdminSuite! 🚀"
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Welcome to AdminSuite</title>
        <style>
            body {{
                font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
                background-color: #f4f6f8;
                margin: 0;
                padding: 0;
                color: #333333;
            }}
            .container {{
                max-width: 600px;
                margin: 40px auto;
                background-color: #ffffff;
                border-radius: 12px;
                overflow: hidden;
                box-shadow: 0 4px 12px rgba(0,0,0,0.08);
                border: 1px solid #e1e8ed;
            }}
            .header {{
                background-color: #7C3AED;
                padding: 30px;
                text-align: center;
                color: #ffffff;
            }}
            .header h1 {{
                margin: 0;
                font-size: 24px;
                font-weight: 700;
            }}
            .content {{
                padding: 40px 30px;
                line-height: 1.6;
            }}
            .content h2 {{
                font-size: 20px;
                margin-top: 0;
                color: #111111;
            }}
            .creds-box {{
                background-color: #f3f0ff;
                border: 1px dashed #7C3AED;
                border-radius: 8px;
                padding: 20px;
                margin: 24px 0;
            }}
            .creds-row {{
                margin: 8px 0;
                font-size: 15px;
            }}
            .creds-label {{
                font-weight: bold;
                color: #4b5563;
                width: 150px;
                display: inline-block;
            }}
            .creds-value {{
                font-family: monospace;
                font-size: 16px;
                color: #7C3AED;
                font-weight: bold;
            }}
            .btn {{
                display: inline-block;
                background-color: #7C3AED;
                color: #ffffff !important;
                text-decoration: none;
                padding: 12px 28px;
                border-radius: 8px;
                font-weight: bold;
                margin: 20px 0;
                text-align: center;
            }}
            .footer {{
                background-color: #f9fafb;
                padding: 20px 30px;
                text-align: center;
                font-size: 12px;
                color: #6b7280;
                border-top: 1px solid #e5e7eb;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>AdminSuite Business Portal</h1>
            </div>
            <div class="content">
                <h2>Hello {name},</h2>
                <p>Welcome to <strong>{company_name}</strong>! Your account has been created with the role of <strong>{role_display}</strong>.</p>
                <p>You can now log in to the AdminSuite mobile application using the following temporary credentials:</p>
                
                <div class="creds-box">
                    <div class="creds-row">
                        <span class="creds-label">LOGIN EMAIL:</span>
                        <span class="creds-value">{email}</span>
                    </div>
                    <div class="creds-row">
                        <span class="creds-label">PASSWORD:</span>
                        <span class="creds-value">{temp_password}</span>
                    </div>
                </div>
                
                <p style="font-weight: bold; color: #ef4444;">Important: For security, you will be required to change your temporary password to your preferred password immediately upon your first login.</p>
                
                <p>Please launch your AdminSuite app, enter your email and temporary password to begin onboarding.</p>
            </div>
            <div class="footer">
                <p>This is an automated onboarding message sent on behalf of {company_name}.</p>
                <p>&copy; 2026 AdminSuite. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    text_content = (
        f"Hello {name},\n\n"
        f"Welcome to {company_name}! Your account has been created with the role of {role_display}.\n\n"
        f"Your login credentials are:\n"
        f"Email: {email}\n"
        f"Temporary Password: {temp_password}\n\n"
        f"Note: You will be required to reset this password upon your first login.\n\n"
        f"Best regards,\n"
        f"The {company_name} Admin Team"
    )
    
    try:
        _send_via_courier(email, subject, html_content, text_content)
        safe_log("info", f"Successfully dispatched onboarding email to {email}")
    except Exception as e:
        safe_log("error", f"Failed to send onboarding email to {email}: {str(e)}")


def send_password_reset_email(email, code):
    """
    Sends a password reset email with the 6-digit OTP verification code.
    """
    subject = "AdminSuite Password Reset Verification Code 🔑"
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>AdminSuite Password Reset</title>
        <style>
            body {{
                font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
                background-color: #f4f6f8;
                margin: 0;
                padding: 0;
                color: #333333;
            }}
            .container {{
                max-width: 600px;
                margin: 40px auto;
                background-color: #ffffff;
                border-radius: 12px;
                overflow: hidden;
                box-shadow: 0 4px 12px rgba(0,0,0,0.08);
                border: 1px solid #e1e8ed;
            }}
            .header {{
                background-color: #4F46E5;
                padding: 30px;
                text-align: center;
                color: #ffffff;
            }}
            .header h1 {{
                margin: 0;
                font-size: 24px;
                font-weight: 700;
            }}
            .content {{
                padding: 40px 30px;
                line-height: 1.6;
                text-align: center;
            }}
            .content h2 {{
                font-size: 20px;
                margin-top: 0;
                color: #111111;
            }}
            .otp-box {{
                background-color: #f0f4ff;
                border: 2px dashed #4F46E5;
                border-radius: 8px;
                padding: 15px 30px;
                margin: 24px auto;
                display: inline-block;
            }}
            .otp-value {{
                font-family: monospace;
                font-size: 32px;
                letter-spacing: 6px;
                color: #4F46E5;
                font-weight: bold;
            }}
            .footer {{
                background-color: #f9fafb;
                padding: 20px 30px;
                text-align: center;
                font-size: 12px;
                color: #6b7280;
                border-top: 1px solid #e5e7eb;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>AdminSuite Account Security</h1>
            </div>
            <div class="content">
                <h2>Reset Your Password</h2>
                <p>We received a request to reset your password. Use the verification code below to proceed:</p>
                
                <div class="otp-box">
                    <span class="otp-value">{code}</span>
                </div>
                
                <p>This code is valid for 10 minutes. If you did not make this request, you can safely ignore this email.</p>
            </div>
            <div class="footer">
                <p>This is an automated security message. Please do not reply to this email.</p>
                <p>&copy; 2026 AdminSuite. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    text_content = (
        "Hello,\n\n"
        "We received a request to reset your password for your AdminSuite account.\n"
        "Please use the following 6-digit OTP code to verify your identity:\n\n"
        f"Verification Code: {code}\n\n"
        "This code is valid for 10 minutes. If you did not request this, please ignore this email.\n\n"
        "Best regards,\n"
        "The AdminSuite Security Team"
    )
    
    try:
        _send_via_courier(email, subject, html_content, text_content)
        safe_log("info", f"Successfully dispatched password reset email to {email}")
    except Exception as e:
        safe_log("error", f"Failed to send password reset email to {email}: {str(e)}")


def send_signup_otp_email(email, code):
    """
    Sends a 6-digit OTP email for new account email verification during sign-up.
    Replaces Supabase's built-in OTP email delivery.
    """
    subject = "Your AdminSuite Verification Code ✉️"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>AdminSuite Email Verification</title>
        <style>
            body {{
                font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
                background-color: #f4f6f8;
                margin: 0;
                padding: 0;
                color: #333333;
            }}
            .container {{
                max-width: 600px;
                margin: 40px auto;
                background-color: #ffffff;
                border-radius: 12px;
                overflow: hidden;
                box-shadow: 0 4px 12px rgba(0,0,0,0.08);
                border: 1px solid #e1e8ed;
            }}
            .header {{
                background: linear-gradient(135deg, #7C3AED 0%, #4F46E5 100%);
                padding: 32px 30px;
                text-align: center;
                color: #ffffff;
            }}
            .header h1 {{
                margin: 0 0 6px 0;
                font-size: 26px;
                font-weight: 800;
                letter-spacing: -0.5px;
            }}
            .header p {{
                margin: 0;
                font-size: 14px;
                opacity: 0.85;
            }}
            .content {{
                padding: 40px 30px;
                line-height: 1.6;
                text-align: center;
            }}
            .content h2 {{
                font-size: 20px;
                margin-top: 0;
                color: #111111;
            }}
            .otp-box {{
                background-color: #f3f0ff;
                border: 2px dashed #7C3AED;
                border-radius: 12px;
                padding: 20px 40px;
                margin: 28px auto;
                display: inline-block;
            }}
            .otp-value {{
                font-family: 'Courier New', monospace;
                font-size: 38px;
                letter-spacing: 10px;
                color: #7C3AED;
                font-weight: 900;
            }}
            .note {{
                font-size: 13px;
                color: #6b7280;
                margin-top: 8px;
            }}
            .footer {{
                background-color: #f9fafb;
                padding: 20px 30px;
                text-align: center;
                font-size: 12px;
                color: #6b7280;
                border-top: 1px solid #e5e7eb;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>AdminSuite</h1>
                <p>Business Management Platform</p>
            </div>
            <div class="content">
                <h2>Verify Your Email Address</h2>
                <p>You're one step away from creating your AdminSuite account.<br>
                Enter the code below to confirm your email address:</p>

                <div class="otp-box">
                    <div class="otp-value">{code}</div>
                </div>

                <p class="note">⏱️ This code expires in <strong>10 minutes</strong>.</p>
                <p class="note">If you didn't request this, you can safely ignore this email.</p>
            </div>
            <div class="footer">
                <p>This is an automated security message from AdminSuite.</p>
                <p>&copy; 2026 AdminSuite. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    """

    text_content = (
        "AdminSuite — Email Verification\n\n"
        "Your verification code is:\n\n"
        f"  {code}\n\n"
        "This code is valid for 10 minutes.\n"
        "If you did not request this, please ignore this email.\n\n"
        "— The AdminSuite Team"
    )

    try:
        _send_via_courier(email, subject, html_content, text_content)
        safe_log("info", f"Successfully dispatched signup OTP email to {email}")
    except Exception as e:
        safe_log("error", f"Failed to send signup OTP email to {email}: {str(e)}")
        raise  # Re-raise so the view can return a proper error response
