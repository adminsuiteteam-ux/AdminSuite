import logging
import os
from django.conf import settings
from core.safe_logger import safe_log

logger = logging.getLogger(__name__)


def _send_via_zeptomail_api(to_email: str, subject: str, html_body: str, text_body: str, send_token: str) -> None:
    """Dispatches a transactional email via ZeptoMail's HTTPS REST API.
    Bypasses cloud provider SMTP firewall port blocks (ports 25/465/587) and authenticates
    with verified custom domain brownforte.com (DKIM/SPF) for 100% Primary Inbox delivery.
    """
    import requests
    from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'AdminSuite <noreply@brownforte.com>')
    sender_name = "AdminSuite"
    sender_email = "noreply@brownforte.com"
    if "<" in from_email and ">" in from_email:
        sender_name = from_email.split("<")[0].strip() or "AdminSuite"
        sender_email = from_email.split("<")[1].split(">")[0].strip() or "noreply@brownforte.com"
    elif "@" in from_email:
        sender_email = from_email.strip()

    auth_header = send_token.strip()
    if not auth_header.startswith("Zoho-enczapikey"):
        auth_header = f"Zoho-enczapikey {auth_header}"

    payload = {
        "from": {
            "address": sender_email,
            "name": sender_name,
        },
        "to": [
            {
                "email_address": {
                    "address": to_email,
                    "name": to_email.split("@")[0],
                }
            }
        ],
        "subject": subject,
        "htmlbody": html_body,
        "textbody": text_body,
    }
    resp = requests.post(
        "https://api.zeptomail.com/v1.1/email",
        headers={
            "accept": "application/json",
            "content-type": "application/json",
            "authorization": auth_header,
        },
        json=payload,
        timeout=12,
    )
    if resp.status_code in (200, 201, 202):
        safe_log("info", f"Successfully dispatched transactional email via ZeptoMail HTTPS API to {to_email}")
        return

    err_msg = f"ZeptoMail API error ({resp.status_code}): {resp.text}"
    safe_log("error", err_msg)
    raise Exception(err_msg)


def _send_via_brevo_api(to_email: str, subject: str, html_body: str, text_body: str, api_key: str) -> None:
    """Dispatches a transactional email via Brevo's HTTPS REST API.
    Bypasses cloud provider SMTP firewall port blocks (ports 25/465/587).
    """
    import requests
    from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'AdminSuite <noreply@brownforte.com>')
    sender_name = "AdminSuite"
    sender_email = "noreply@brownforte.com"
    if "<" in from_email and ">" in from_email:
        sender_name = from_email.split("<")[0].strip() or "AdminSuite"
        sender_email = from_email.split("<")[1].split(">")[0].strip() or "noreply@brownforte.com"

    payload = {
        "sender": {"name": sender_name, "email": sender_email},
        "to": [{"email": to_email}],
        "subject": subject,
        "htmlContent": html_body,
        "textContent": text_body,
    }
    resp = requests.post(
        "https://api.brevo.com/v3/smtp/email",
        headers={
            "api-key": api_key,
            "content-type": "application/json",
            "accept": "application/json",
        },
        json=payload,
        timeout=12,
    )
    if resp.status_code in (200, 201, 202):
        safe_log("info", f"Successfully dispatched transactional email via Brevo HTTPS API to {to_email}")
        return

    err_msg = f"Brevo API error ({resp.status_code}): {resp.text}"
    safe_log("error", err_msg)
    raise Exception(err_msg)


def _send_via_django_mail(to_email: str, subject: str, html_body: str, text_body: str) -> None:
    """
    Internal helper — dispatches a transactional email.
    1. Primary: ZeptoMail HTTPS API using verified domain brownforte.com (bypasses spam filters).
    2. Fallback 1: Brevo HTTPS API.
    3. Fallback 2: Django native SMTP / console email backend.
    """
    zeptomail_token = getattr(settings, 'ZEPTOMAIL_SEND_MAIL_TOKEN', None) or os.environ.get('ZEPTOMAIL_SEND_MAIL_TOKEN')
    if zeptomail_token and zeptomail_token.strip():
        try:
            _send_via_zeptomail_api(to_email, subject, html_body, text_body, zeptomail_token.strip())
            return
        except Exception as e:
            safe_log("warn", f"ZeptoMail dispatch failed, falling back to Brevo/SMTP: {e}")

    brevo_key = getattr(settings, 'BREVO_API_KEY', None) or os.environ.get('BREVO_API_KEY')
    if brevo_key and brevo_key.strip():
        try:
            _send_via_brevo_api(to_email, subject, html_body, text_body, brevo_key.strip())
            return
        except Exception as e:
            safe_log("warn", f"Brevo dispatch failed, falling back to Django SMTP: {e}")

    from django.core.mail import EmailMultiAlternatives
    import socket

    from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'AdminSuite <noreply@brownforte.com>')
    
    msg = EmailMultiAlternatives(
        subject=subject,
        body=text_body,
        from_email=from_email,
        to=[to_email]
    )
    msg.attach_alternative(html_body, "text/html")
    
    try:
        msg.send(fail_silently=False)
    except socket.timeout:
        safe_log("error", f"SMTP timeout sending to {to_email} — EMAIL_TIMEOUT may be too low")
        raise
    except OSError as e:
        safe_log("error", f"SMTP connection error to {settings.EMAIL_HOST}:{settings.EMAIL_PORT} — {type(e).__name__}: {e}")
        raise



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
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to AdminSuite</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #fafafa; margin: 0; padding: 0; color: #1a1a1a; -webkit-font-smoothing: antialiased;">
        <div style="max-width: 580px; margin: 40px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05); border: 1px solid #eaeaea;">
            <!-- Premium Gradient Header -->
            <div style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); padding: 40px 30px; text-align: center; color: #ffffff;">
                <div style="font-size: 28px; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 8px;">AdminSuite</div>
                <div style="font-size: 14px; opacity: 0.9; font-weight: 500; letter-spacing: 0.5px; text-transform: uppercase;">Workspace Onboarding</div>
            </div>
            
            <!-- Main Content -->
            <div style="padding: 40px 35px; line-height: 1.6;">
                <h2 style="font-size: 22px; font-weight: 700; margin-top: 0; margin-bottom: 20px; color: #111111;">Hello {name},</h2>
                <p style="font-size: 15px; color: #4b5563; margin-bottom: 12px;">Welcome to <strong>{company_name}</strong>! Your account has been initialized with the role of <strong>{role_display}</strong>.</p>
                <p style="font-size: 15px; color: #4b5563; margin-bottom: 24px;">You can now log in to the AdminSuite workspace app using the temporary credentials below:</p>
                
                <!-- Credentials Card -->
                <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; margin: 24px 0;">
                    <div style="margin-bottom: 14px; font-size: 14px;">
                        <span style="font-weight: 700; color: #6b7280; display: inline-block; width: 100px;">EMAIL:</span>
                        <span style="font-family: monospace; font-size: 15px; color: #4f46e5; font-weight: bold; background-color: #f3f4f6; padding: 4px 8px; border-radius: 6px;">{email}</span>
                    </div>
                    <div style="font-size: 14px;">
                        <span style="font-weight: 700; color: #6b7280; display: inline-block; width: 100px;">PASSWORD:</span>
                        <span style="font-family: monospace; font-size: 15px; color: #4f46e5; font-weight: bold; background-color: #f3f4f6; padding: 4px 8px; border-radius: 6px;">{temp_password}</span>
                    </div>
                </div>
                
                <!-- Security Warning -->
                <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 4px; padding: 16px; margin: 24px 0;">
                    <p style="margin: 0; font-size: 13.5px; color: #b45309; font-weight: 600; line-height: 1.5;">
                        ⚠️ Security requirement: You must update this temporary password to your personal secure password immediately upon logging in for the first time.
                    </p>
                </div>
                
                <p style="font-size: 14px; color: #6b7280; margin-top: 24px;">Open your AdminSuite mobile application, enter these details, and complete your profile setup.</p>
            </div>
            
            <!-- Footer with "Powered by DimaCode" branding -->
            <div style="background-color: #f9fafb; padding: 30px; text-align: center; font-size: 12px; color: #9ca3af; border-top: 1px solid #f3f4f6;">
                <p style="margin: 0 0 10px 0;">This is an automated onboarding message sent on behalf of {company_name}.</p>
                <div style="margin: 18px 0; border-top: 1px solid #e5e7eb; padding-top: 18px;">
                    <span style="font-size: 11px; letter-spacing: 1px; text-transform: uppercase; font-weight: 700; color: #cbd5e1; display: block; margin-bottom: 4px;">Powered By</span>
                    <span style="font-size: 14px; font-weight: 800; color: #6b7280; letter-spacing: -0.5px;">DimaCode</span>
                </div>
                <p style="margin: 0;">&copy; 2026 AdminSuite. All rights reserved.</p>
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
        _send_via_django_mail(email, subject, html_content, text_content)
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
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>AdminSuite Password Reset</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #fafafa; margin: 0; padding: 0; color: #1a1a1a; -webkit-font-smoothing: antialiased;">
        <div style="max-width: 580px; margin: 40px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05); border: 1px solid #eaeaea;">
            <!-- Premium Gradient Header -->
            <div style="background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%); padding: 45px 30px; text-align: center; color: #ffffff;">
                <div style="font-size: 28px; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 8px;">AdminSuite</div>
                <div style="font-size: 14px; opacity: 0.9; font-weight: 500; letter-spacing: 0.5px; text-transform: uppercase;">Account Security</div>
            </div>
            
            <!-- Main Content -->
            <div style="padding: 45px 35px; line-height: 1.6; text-align: center;">
                <h2 style="font-size: 22px; font-weight: 700; margin-top: 0; margin-bottom: 12px; color: #111111;">Reset Your Password</h2>
                <p style="font-size: 15px; color: #4b5563; margin-bottom: 28px;">We received a request to change the password for your AdminSuite account.<br>Use the secure verification code below to authorize this request:</p>
                
                <!-- Premium OTP Presentation -->
                <div style="background: #fdf2f2; border: 2px dashed #f87171; border-radius: 16px; padding: 24px 45px; display: inline-block; margin-bottom: 28px;">
                    <span style="font-family: monospace; font-size: 38px; letter-spacing: 8px; color: #b91c1c; font-weight: 900;">{code}</span>
                </div>
                
                <p style="font-size: 13.5px; color: #6b7280; margin: 0 auto; max-w: 400px; line-height: 1.5;">
                    ⏱️ This verification code is temporary and will expire in <strong>10 minutes</strong>.<br>
                    If you did not request a password reset, you can safely ignore this email.
                </p>
            </div>
            
            <!-- Footer with "Powered by DimaCode" branding -->
            <div style="background-color: #f9fafb; padding: 30px; text-align: center; font-size: 12px; color: #9ca3af; border-top: 1px solid #f3f4f6;">
                <p style="margin: 0 0 10px 0;">This is an automated security message. Please do not reply to this email.</p>
                <div style="margin: 18px 0; border-top: 1px solid #e5e7eb; padding-top: 18px;">
                    <span style="font-size: 11px; letter-spacing: 1px; text-transform: uppercase; font-weight: 700; color: #cbd5e1; display: block; margin-bottom: 4px;">Powered By</span>
                    <span style="font-size: 14px; font-weight: 800; color: #6b7280; letter-spacing: -0.5px;">DimaCode</span>
                </div>
                <p style="margin: 0;">&copy; 2026 AdminSuite. All rights reserved.</p>
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
        _send_via_django_mail(email, subject, html_content, text_content)
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
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>AdminSuite Email Verification</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #fafafa; margin: 0; padding: 0; color: #1a1a1a; -webkit-font-smoothing: antialiased;">
        <div style="max-width: 580px; margin: 40px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05); border: 1px solid #eaeaea;">
            <!-- Premium Gradient Header -->
            <div style="background: linear-gradient(135deg, #818cf8 0%, #4f46e5 100%); padding: 45px 30px; text-align: center; color: #ffffff;">
                <div style="font-size: 28px; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 8px;">AdminSuite</div>
                <div style="font-size: 14px; opacity: 0.9; font-weight: 500; letter-spacing: 0.5px; text-transform: uppercase;">Verify Your Email</div>
            </div>
            
            <!-- Main Content -->
            <div style="padding: 45px 35px; line-height: 1.6; text-align: center;">
                <h2 style="font-size: 22px; font-weight: 700; margin-top: 0; margin-bottom: 12px; color: #111111;">One Step Left!</h2>
                <p style="font-size: 15px; color: #4b5563; margin-bottom: 28px;">To finish setting up your AdminSuite account, please verify your email address by entering this secure 6-digit verification code:</p>
                
                <!-- Premium OTP Presentation -->
                <div style="background: #eef2ff; border: 2px dashed #818cf8; border-radius: 16px; padding: 24px 45px; display: inline-block; margin-bottom: 28px;">
                    <span style="font-family: monospace; font-size: 38px; letter-spacing: 8px; color: #4f46e5; font-weight: 900;">{code}</span>
                </div>
                
                <p style="font-size: 13.5px; color: #6b7280; margin: 0 auto; max-w: 400px; line-height: 1.5;">
                    ⏱️ This verification code is temporary and will expire in <strong>10 minutes</strong>.<br>
                    If you did not initiate this registration request, you can safely ignore this email.
                </p>
            </div>
            
            <!-- Footer with "Powered by DimaCode" branding -->
            <div style="background-color: #f9fafb; padding: 30px; text-align: center; font-size: 12px; color: #9ca3af; border-top: 1px solid #f3f4f6;">
                <p style="margin: 0 0 10px 0;">This is an automated security message. Please do not reply to this email.</p>
                <div style="margin: 18px 0; border-top: 1px solid #e5e7eb; padding-top: 18px;">
                    <span style="font-size: 11px; letter-spacing: 1px; text-transform: uppercase; font-weight: 700; color: #cbd5e1; display: block; margin-bottom: 4px;">Powered By</span>
                    <span style="font-size: 14px; font-weight: 800; color: #6b7280; letter-spacing: -0.5px;">DimaCode</span>
                </div>
                <p style="margin: 0;">&copy; 2026 AdminSuite. All rights reserved.</p>
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
        _send_via_django_mail(email, subject, html_content, text_content)
        safe_log("info", f"Successfully dispatched signup OTP email to {email}")
    except Exception as e:
        safe_log("error", f"Failed to send signup OTP email to {email}: {str(e)}")
        raise
