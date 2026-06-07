# Implementation Plan - Employee Portal and Role-Based Access Control

This plan details the steps to implement the Employee Portal feature. The update allows Admins to create employees with unique credentials. When employees log in, they access their own dashboard, profile editor, personal financial history, team chat space, and task boards.

## User Review Required

> [!IMPORTANT]
> **Database Migrations:** We will be modifying the Django database schema. A backend migration will need to be run to add the `linked_user` field to `Employee` and `is_first_login` to `UserProfile`.
> 
> **Supabase Auth Sync:** We will utilize Supabase for realtime chat capabilities. The backend will sync newly created employee users to Supabase Auth so they can participate in the chat instantly.

## Open Questions

> [!NOTE]
> 1. **Initial Password Generation:** Would you prefer the backend to generate a random 8-character password for the employee and display it to the Admin upon creation, or should the Admin define the initial password manually when adding the employee? (We propose generating it automatically and showing it to the Admin).
> 2. **Realtime Chat Integration:** Do you want group chat channels (e.g. #general, #announcements) or should direct messaging (DMs) between employees also be supported? (We propose starting with a general company channel and direct messages).

---

## Proposed Changes

### Backend (Django)

#### [MODIFY] [models.py](file:///c:/Users/Dimacode.x/Desktop/AdminSuite/admin-suite-backend/api/models.py)
* Add `linked_user = models.OneToOneField('auth.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='employee_profile')` to `Employee` model to link a created employee to their specific user login.
* Add `is_first_login = models.BooleanField(default=False)` to `UserProfile` model.

#### [MODIFY] [serializers.py](file:///c:/Users/Dimacode.x/Desktop/AdminSuite/admin-suite-backend/api/serializers.py)
* Update `EmployeeSerializer` to:
  * Automatically create a corresponding Django `User` and `UserProfile` when an employee is created by an Admin (if one doesn't exist yet).
  * Return the auto-generated initial password to the Admin in the response.
* Update `UserProfileSerializer` to include `is_first_login` and `role`.

#### [MODIFY] [views.py](file:///c:/Users/Dimacode.x/Desktop/AdminSuite/admin-suite-backend/api/views.py)
* Update `me(request)` view to return `is_first_login` and `role` fields.
* Add custom endpoints for employee access:
  * `/api/employee-portal/dashboard/`: returns tasks, announcements, and key stats.
  * `/api/employee-portal/profile/`: PUT/PATCH requests to edit employee profile.
  * `/api/employee-portal/finance/`: returns personal financial breakdown and pay history.
  * `/api/employee-portal/tasks/`: endpoint for list, update status, and submit completion reports.

---

### Frontend (React Native & Expo Router)

#### [NEW] [employee-setup.tsx](file:///c:/Users/Dimacode.x/Desktop/AdminSuite/admin-suite-app/app/(auth)/employee-setup.tsx)
* Create a layout for first-time employee login to force password reset before entering the app.

#### [MODIFY] [index.tsx](file:///c:/Users/Dimacode.x/Desktop/AdminSuite/admin-suite-app/app/index.tsx)
* Update redirection logic: If `user.role === 'employee'`, redirect to `/(auth)/employee-setup` (if `is_first_login` is true) or `/(employee)/` layout.

#### [NEW] [(employee) Layout & Screens](file:///c:/Users/Dimacode.x/Desktop/AdminSuite/admin-suite-app/app/(employee)/_layout.tsx)
* Add a glassmorphic tab layout for the employee portal:
  * `index.tsx`: Dashboard with greeting, announcements, task summary.
  * `tasks.tsx`: Kanban-like task list, status toggler, and submit report button.
  * `chat.tsx`: Group chat channel and DMs powered by Supabase.
  * `finance.tsx`: Salary breakdown, pay slips, and bonus details.
  * `profile.tsx`: Self-profile editor syncing with the database.

#### [MODIFY] [AuthContext.tsx](file:///c:/Users/Dimacode.x/Desktop/AdminSuite/admin-suite-app/context/AuthContext.tsx)
* Ensure `User` object contains `role` and `is_first_login`.

---

## Verification Plan

### Automated Tests
* Run Django test suite to verify serializers and views:
  `python manage.py test api`

### Manual Verification
1. **Admin creates employee:** Add an employee from the Admin dashboard and verify the login credentials (email and temporary password) are returned.
2. **Employee First Login:** Log in as the employee and verify the password reset screen is shown.
3. **Redirection check:** Verify the employee cannot access the admin tabs, and is redirected to `/(employee)`.
4. **Data Sync:** Edit profile from the employee dashboard and verify the changes update instantly in the admin directory.
5. **Task Execution:** Log in as employee, set task to "In Progress" -> "Completed" with a report, and verify the admin receives the report.
6. **Chat Verification:** Test typing and receiving messages in the company general chat.
