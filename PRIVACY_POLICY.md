# Privacy Policy for Admin Suite

**Last Updated:** October 5, 2026  
**Effective Date:** October 5, 2026  
**Application Name:** Admin Suite  
**Package / Bundle ID:** `com.adminsuite.app`  
**Developer:** Admin Suite Team / ThirdParti  
**Contact Email:** privacy@adminsuite.com / support@adminsuite.com  

---

## 1. Introduction

Welcome to **Admin Suite** ("we," "our," or "us"). We provide an all-in-one workforce management, enterprise communication, and workplace productivity platform accessible via mobile applications, web portals, and desktop interfaces.

This Privacy Policy explains how Admin Suite collects, uses, protects, and discloses personal information and sensitive data when you use the Admin Suite mobile application, website, and related services (collectively, the "Services").

By downloading, accessing, or using Admin Suite, you consent to the practices described in this Privacy Policy. If you do not agree with any part of this policy, please do not use our Services.

---

## 2. Information We Collect

We collect information necessary to provide workplace administration, employee collaboration, and secure account management.

### A. Personal Identification Information
* **Account Credentials:** Full name, email address, password hash, and phone number (if provided).
* **Google Account Profile:** When you authenticate using "Sign in with Google", we receive your name, verified email address, Google user ID, and profile avatar image from Google Identity Services.

### B. Workplace & Employment Information
* **Organization Details:** Company/business name, branch or location, department, and assigned workspace role (Admin, Manager, Employee).
* **Workforce Records:** Employee ID, job title, employment status, shift assignments, and manager reporting lines.
* **Attendance & Time Tracking:** Clock-in and clock-out timestamps, shift duration, working hours, and leave/vacation request history.
* **Payroll & Compensation (Administrative):** Salary grade/structure, payslip summaries, expense claims, and deduction details as configured by your organization’s administrators.
* **Task & Project Data:** Task assignments, deadlines, completion statuses, and workplace priorities.

### C. Communications & Media
* **Workspace Chat & Messaging:** Direct messages, team channels, text content, timestamps, and message delivery statuses.
* **Attachments & Files:** Documents, images, or media files that you choose to upload to chat channels, tasks, or your user profile.
* **Real-Time Voice and Video Calling:** Real-time peer-to-peer and relayed voice and video streams enabled through Daily.co WebRTC infrastructure.  
  * **No Call Recording:** Admin Suite **does not** record, transcribe, or store audio or video call content on our servers. All call audio and video streams exist purely in real-time transit during the duration of the call.

### D. Device and Technical Data
* **Device Telemetry:** Device brand, model, operating system version, app version, screen resolution, and language settings.
* **Push Notification Tokens:** Unique push tokens (Firebase Cloud Messaging / Expo Push Notification Service) generated to deliver real-time incoming call rings and workspace alerts to your specific device.
* **Diagnostic & Crash Logs:** Error reports, stack traces, and performance telemetry gathered via Sentry to diagnose technical crashes and system stability issues.

---

## 3. Device Permissions and Why We Request Them

Admin Suite requests explicit Android and iOS system permissions only when required to provide core operational features:

| Permission | Technical Name | Purpose in Admin Suite |
| :--- | :--- | :--- |
| **Microphone** | `RECORD_AUDIO` | Enables voice transmission during workspace audio and video calls. |
| **Camera** | `CAMERA` | Enables live video transmission during video calls and capturing photos for profile avatars or task attachments. |
| **Audio Settings** | `MODIFY_AUDIO_SETTINGS` | Manages speakerphone, earpiece, and Bluetooth headset routing during active voice and video calls. |
| **Notifications** | `POST_NOTIFICATIONS` | Delivers real-time incoming call alerts, direct messages, urgent task updates, and workspace announcements. |
| **Vibration** | `VIBRATE` | Rings and vibrates your device on incoming voice or video calls, mirroring standard telephone behavior. |
| **Wake Lock** | `WAKE_LOCK` | Keeps the incoming call screen illuminated and active so you can accept or decline an incoming call promptly. |
| **Boot Completed** | `RECEIVE_BOOT_COMPLETED` | Restores push notification listeners and call alert channels after your device restarts. |

> **User Control:** You may grant or revoke these permissions at any time through your device's **Settings > Apps > Admin Suite > Permissions**. Note that disabling microphone or camera permissions will prevent you from participating in voice or video calls.

---

## 4. How We Use Your Information

We process collected information strictly for legitimate business and operational purposes:
1. **Facilitating Core Services:** Providing workspace dashboards, attendance tracking, task management, payroll overviews, and chat communication.
2. **Connecting Real-Time Communications:** Signaling and establishing peer-to-peer audio/video calls between verified workspace members.
3. **Account Authentication & Security:** Authenticating users via JWT and Google OAuth 2.0, verifying organization membership, and preventing unauthorized access.
4. **Push Notifications:** Alerting you of incoming calls, new messages, assigned tasks, and shift schedules.
5. **System Maintenance & Diagnostics:** Troubleshooting application bugs, monitoring server performance, and preventing fraudulent or abusive usage.

---

## 5. Third-Party Service Providers

We collaborate with trusted third-party technology providers to operate infrastructure, analytics, and communications:

* **Google Identity & Google Play Services:** Facilitates secure Google Sign-In authentication and app delivery on Android devices.  
  * [Google Privacy Policy](https://policies.google.com/privacy)
* **Daily.co (Daily Inc.):** Powers high-performance WebRTC voice and video calls. Audio and video streams are transmitted securely and are not recorded.  
  * [Daily.co Privacy Policy](https://www.daily.co/legal/privacy)
* **Expo / Firebase Cloud Messaging (Google):** Powers real-time push notification delivery to mobile devices.  
  * [Expo Privacy Policy](https://expo.dev/privacy)
* **Sentry (Functional Software, Inc.):** Collects anonymized crash logs and exception traces to maintain app stability.  
  * [Sentry Privacy Policy](https://sentry.io/privacy/)

---

## 6. Data Sharing and Disclosure

We respect your privacy and enforce strict data boundaries:
* **No Sale of Personal Data:** We do **never** sell, rent, trade, or monetize your personal information or workspace data to advertisers or data brokers.
* **Workspace Visibility:** Within your organization, your name, avatar, job title, attendance records, and public channel messages are visible to colleagues and administrators according to role privileges.
* **Legal Requirements:** We may disclose information only if strictly required by applicable law, court order, or governmental authority.

---

## 7. Data Security

We implement industry-standard administrative, physical, and technical safeguards:
* **Encryption in Transit:** All network communication between the app, web interface, and backend servers is encrypted using modern TLS 1.3 / HTTPS.
* **Secure Token Storage:** Sensitive session tokens and authentication keys are stored using hardware-backed secure storage (`expo-secure-store` / Android Keystore / iOS Keychain).
* **Role-Based Access Control (RBAC):** Backend APIs enforce strict tenancy separation; members of one organization cannot view, query, or modify another organization's data.

---

## 8. Data Retention and Account Deletion (Google Play Compliance)

### A. Retention Period
We retain personal and workspace data for as long as your organization maintains an active Admin Suite subscription or as long as necessary to fulfill the operational purposes described herein.

### B. User Right to Deletion
In accordance with Google Play developer policies and global data protection standards (GDPR / CCPA):
1. **In-App Request:** You can request account deletion directly within the mobile application by navigating to **Settings > Help & Support > Request Account Deletion**.
2. **Direct Email Request:** You or your organization's designated administrator may email **privacy@adminsuite.com** with the subject line `"Account & Data Deletion Request"`, providing your registered email address and organization name.
3. **Execution Timeline:** Upon identity verification, all personal identification records, authentication tokens, and user-associated logs will be permanently deleted or irreversibly anonymized from our live databases within thirty (30) days, except where retention is mandated by law (e.g., tax or accounting compliance).

---

## 9. Children's Privacy

Admin Suite is an enterprise workplace productivity tool intended exclusively for business and organizational use by adult professionals. We do not knowingly solicit or collect personal information from children under the age of 13 (or under 16 in the European Economic Area). If we learn that personal data of a minor has been collected, we will take immediate steps to delete such data.

---

## 10. Your Rights (GDPR, CCPA & Global Rights)

Depending on your geographic location, you may have specific rights regarding your personal information:
* **Right of Access:** Request a copy of the personal information we hold about you.
* **Right to Rectification:** Request correction of inaccurate or incomplete personal details.
* **Right to Erasure ("Right to be Forgotten"):** Request deletion of your personal data.
* **Right to Restrict Processing:** Request restrictions on how your data is processed.
* **Right to Data Portability:** Receive your data in a structured, commonly used, and machine-readable format.
* **Non-Discrimination:** We will never deny services or charge differing rates for exercising your privacy rights.

To exercise any of these rights, contact us at **privacy@adminsuite.com**.

---

## 11. Changes to This Privacy Policy

We may update this Privacy Policy periodically to reflect changes in our technology, legal requirements, or operational practices. When updates are published, the "Last Updated" date at the top of this document will be revised. For significant changes, we will provide prominent in-app notification or email alert before the changes take effect.

---

## 12. Contact Information

If you have questions, feedback, or concerns regarding this Privacy Policy or our privacy practices, please contact us:

* **Email:** [privacy@adminsuite.com](mailto:privacy@adminsuite.com) or [support@adminsuite.com](mailto:support@adminsuite.com)  
* **Developer Name:** ThirdParti / Admin Suite Team  
* **Application Website:** [https://adminsuite.onrender.com](https://adminsuite.onrender.com)  
