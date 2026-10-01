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

    # Safety: ZeptoMail requires sending from the verified custom domain
    if not sender_email.endswith("@brownforte.com"):
        sender_email = "noreply@brownforte.com"

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
        timeout=8,
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
        timeout=6,
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
    # If using Gmail SMTP directly, fallback sender must match authenticated user
    if 'gmail' in getattr(settings, 'EMAIL_HOST', '').lower() and getattr(settings, 'EMAIL_HOST_USER', None):
        from_email = f"AdminSuite <{settings.EMAIL_HOST_USER}>"
    
    msg = EmailMultiAlternatives(
        subject=subject,
        body=text_body,
        from_email=from_email,
        to=[to_email]
    )
    msg.attach_alternative(html_body, "text/html")
    
    orig_timeout = socket.getdefaulttimeout()
    try:
        socket.setdefaulttimeout(5)
        msg.send(fail_silently=False)
    except socket.timeout:
        safe_log("error", f"SMTP timeout sending to {to_email} — EMAIL_TIMEOUT may be too low")
        raise
    except OSError as e:
        safe_log("error", f"SMTP connection error to {settings.EMAIL_HOST}:{settings.EMAIL_PORT} — {type(e).__name__}: {e}")
        raise
    finally:
        socket.setdefaulttimeout(orig_timeout)



def send_onboarding_email(email, name, temp_password, company_name, role_display):
    """
    Sends an onboarding email with account creation confirmation, temporary credentials,
    and a workplace newsletter bulletin.
    """
    subject = f"Your Account Has Been Created! Welcome to {company_name} 🎉"
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your Account Has Been Created</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f1117; margin: 0; padding: 20px 10px; color: #1a1a1a; -webkit-font-smoothing: antialiased;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 18px; overflow: hidden; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25); border: 1px solid #e5e7eb;">
            <!-- Header Banner -->
            <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #6366f1 100%); padding: 42px 30px; text-align: center; color: #ffffff;">
                <div style="display: inline-block; background: rgba(255, 255, 255, 0.2); padding: 6px 14px; border-radius: 20px; font-size: 11px; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase; margin-bottom: 12px; backdrop-filter: blur(10px);">
                    Account Created by Administrator
                </div>
                <div style="font-size: 30px; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 6px;">Welcome to {company_name}! 🚀</div>
                <div style="font-size: 14px; opacity: 0.92; font-weight: 500;">Your employee account has been created and is ready to use</div>
            </div>
            
            <!-- Main Content -->
            <div style="padding: 36px 32px; line-height: 1.6;">
                <h2 style="font-size: 21px; font-weight: 700; margin-top: 0; margin-bottom: 14px; color: #111827;">Hello {name},</h2>
                <p style="font-size: 15px; color: #374151; margin-bottom: 16px; line-height: 1.6;">
                    Your organization administrator at <strong>{company_name}</strong> has created an employee account for you on <strong>AdminSuite</strong> with the assigned role of <strong>{role_display}</strong>.
                </p>
                <p style="font-size: 15px; color: #374151; margin-bottom: 24px; line-height: 1.6;">
                    You can log in to your workplace account immediately using the temporary credentials below:
                </p>
                
                <!-- Credentials Box -->
                <div style="background: linear-gradient(145deg, #f8fafc 0%, #f1f5f9 100%); border: 1.5px solid #e2e8f0; border-radius: 14px; padding: 22px; margin: 24px 0;">
                    <div style="margin-bottom: 16px; font-size: 14px;">
                        <span style="font-weight: 700; color: #64748b; display: inline-block; width: 110px; font-size: 12px; letter-spacing: 0.5px; text-transform: uppercase;">Work Email</span>
                        <span style="font-family: monospace; font-size: 15px; color: #1e293b; font-weight: 700; background-color: #ffffff; padding: 6px 12px; border-radius: 8px; border: 1px solid #cbd5e1;">{email}</span>
                    </div>
                    <div style="font-size: 14px;">
                        <span style="font-weight: 700; color: #64748b; display: inline-block; width: 110px; font-size: 12px; letter-spacing: 0.5px; text-transform: uppercase;">Temp Password</span>
                        <span style="font-family: monospace; font-size: 17px; color: #4f46e5; font-weight: 800; background-color: #ffffff; padding: 6px 14px; border-radius: 8px; border: 1px solid #c7d2fe; letter-spacing: 1px;">{temp_password}</span>
                    </div>
                </div>
                
                <!-- Security Reminder -->
                <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 6px; padding: 14px 16px; margin: 22px 0;">
                    <p style="margin: 0; font-size: 13.5px; color: #92400e; font-weight: 600; line-height: 1.5;">
                        🔒 <strong>First-Time Login:</strong> When you log in with this temporary password, the system will prompt you to set your own private, permanent password.
                    </p>
                </div>

                <!-- Workplace Newsletter & Welcome Bulletin -->
                <div style="margin-top: 36px; padding-top: 28px; border-top: 2px dashed #e2e8f0;">
                    <div style="display: flex; align-items: center; margin-bottom: 16px;">
                        <span style="background: #eef2ff; color: #4f46e5; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; padding: 4px 10px; border-radius: 6px; display: inline-block;">
                            📰 Workplace Newsletter & Updates
                        </span>
                    </div>
                    <h3 style="font-size: 18px; font-weight: 700; color: #111827; margin: 0 0 14px 0;">
                        Welcome to {company_name} — What's Next?
                    </h3>
                    <p style="font-size: 14px; color: #4b5563; margin-bottom: 18px; line-height: 1.6;">
                        You have been automatically subscribed to the monthly <strong>{company_name} Workplace Bulletin</strong>! Here are key features and updates to help you get started:
                    </p>

                    <!-- Newsletter Card 1 -->
                    <div style="background-color: #f9fafb; border-radius: 12px; padding: 16px 18px; margin-bottom: 12px; border: 1px solid #f3f4f6;">
                        <div style="font-size: 14px; font-weight: 700; color: #1f2937; margin-bottom: 4px;">
                            📱 1. Complete Your Employee Profile
                        </div>
                        <div style="font-size: 13px; color: #4b5563; line-height: 1.5;">
                            Open the AdminSuite mobile app or web dashboard to add your photo, bio, phone number, and social handles so teammates can connect with you.
                        </div>
                    </div>

                    <!-- Newsletter Card 2 -->
                    <div style="background-color: #f9fafb; border-radius: 12px; padding: 16px 18px; margin-bottom: 12px; border: 1px solid #f3f4f6;">
                        <div style="font-size: 14px; font-weight: 700; color: #1f2937; margin-bottom: 4px;">
                            ⏱️ 2. Attendance & Shift Management
                        </div>
                        <div style="font-size: 13px; color: #4b5563; line-height: 1.5;">
                            Clock in and out directly from your smartphone. Track your logged hours, leave requests, and schedule in real-time.
                        </div>
                    </div>

                    <!-- Newsletter Card 3 -->
                    <div style="background-color: #f9fafb; border-radius: 12px; padding: 16px 18px; margin-bottom: 12px; border: 1px solid #f3f4f6;">
                        <div style="font-size: 14px; font-weight: 700; color: #1f2937; margin-bottom: 4px;">
                            💰 3. Payslips & Financial Pulse
                        </div>
                        <div style="font-size: 13px; color: #4b5563; line-height: 1.5;">
                            Access your salary records, compensation breakdowns, and downloadable payslips securely whenever you need them.
                        </div>
                    </div>

                    <!-- Newsletter Card 4 -->
                    <div style="background-color: #f9fafb; border-radius: 12px; padding: 16px 18px; margin-bottom: 18px; border: 1px solid #f3f4f6;">
                        <div style="font-size: 14px; font-weight: 700; color: #1f2937; margin-bottom: 4px;">
                            📢 4. Team Announcements & Project Collaboration
                        </div>
                        <div style="font-size: 13px; color: #4b5563; line-height: 1.5;">
                            Stay up-to-date with branch broadcasts, department objectives, and collaborative task boards with fellow colleagues.
                        </div>
                    </div>

                    <!-- Newsletter subscription confirmation notice -->
                    <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 14px 16px; margin-top: 14px;">
                        <p style="margin: 0; font-size: 13px; color: #166534; font-weight: 500; line-height: 1.5;">
                            📬 <strong>Newsletter Subscription Confirmed:</strong> You will receive our monthly workplace bulletin with company updates, event calendars, employee spotlights, and helpful productivity tips.
                        </p>
                    </div>
                </div>
            </div>
            
            <!-- Footer -->
            <div style="background-color: #f8fafc; padding: 28px 24px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
                <p style="margin: 0 0 10px 0;">This account onboarding message and workplace newsletter was sent on behalf of <strong>{company_name}</strong>.</p>
                <div style="margin: 16px 0; border-top: 1px solid #e2e8f0; padding-top: 16px;">
                    <span style="font-size: 10px; letter-spacing: 1.5px; text-transform: uppercase; font-weight: 700; color: #94a3b8; display: block; margin-bottom: 4px;">POWERED BY</span>
                    <span style="font-size: 15px; font-weight: 800; color: #4f46e5; letter-spacing: -0.3px;">AdminSuite</span>
                </div>
                <p style="margin: 0;">&copy; 2026 AdminSuite Workspace. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    text_content = (
        f"Hello {name},\n\n"
        f"Your employee account has been created by your administrator at {company_name} on AdminSuite!\n\n"
        f"Role: {role_display}\n\n"
        f"Your login credentials are:\n"
        f"Work Email: {email}\n"
        f"Temporary Password: {temp_password}\n\n"
        f"Security Notice: You must reset this temporary password to your personal secure password upon your first login.\n\n"
        f"--------------------------------------------------\n"
        f"NEWSLETTER & WORKPLACE BULLETIN\n"
        f"Welcome to {company_name}!\n"
        f"You are subscribed to the monthly Workplace Bulletin. Here is what to do next:\n"
        f"1. Profile Setup: Complete your photo and contact info in the app.\n"
        f"2. Shift & Attendance: Clock in and out using your smartphone.\n"
        f"3. Payslips & Finance: View your pay and financial summaries securely.\n"
        f"4. Projects & Tasks: Collaborate with your team on active objectives.\n\n"
        f"Monthly newsletters with company news, upcoming events, and tips will be sent to this email.\n"
        f"--------------------------------------------------\n\n"
        f"Best regards,\n"
        f"The {company_name} Team\n"
        f"Powered by AdminSuite"
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
