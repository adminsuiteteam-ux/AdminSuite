from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from api.models import Employee, EmployeeFinance, EmployeeTask, UserProfile, EmployeeActivityLog
from api.serializers import EmployeeSerializer

class EmployeePortalTests(APITestCase):
    def setUp(self):
        # Create an admin user
        self.admin_user = User.objects.create_superuser(
            username='admin',
            email='admin@example.com',
            password='adminpassword'
        )
        self.admin_profile, _ = UserProfile.objects.get_or_create(user=self.admin_user)
        self.admin_profile.role = 'admin'
        self.admin_profile.save()

        # Generate credentials for employee creation
        self.employee_email = 'emp@company.com'
        self.employee_name = 'John Employee'

    def test_employee_creation_flow(self):
        self.client.force_authenticate(user=self.admin_user)
        
        # Test EmployeeSerializer creation
        data = {
            'name': self.employee_name,
            'role': 'Developer',
            'department': 'Engineering',
            'office': 'NY Office',
            'email': self.employee_email,
            'salary': 75000,
            'finance_data': {
                'current_pay': 75000,
                'employee_owes_company': 0,
                'company_owes_employee': 0,
                'shares': 5.0
            }
        }
        
        serializer = EmployeeSerializer(data=data, context={'request': None})
        self.assertTrue(serializer.is_valid(), serializer.errors)
        
        # Save employee
        employee = serializer.save(user=self.admin_user)
        self.assertIsNotNone(employee.linked_user)
        self.assertEqual(employee.linked_user.email, self.employee_email)
        self.assertEqual(employee.linked_user.username, self.employee_email)
        
        # Verify user profile creation
        profile = UserProfile.objects.get(user=employee.linked_user)
        self.assertEqual(profile.role, 'employee')
        self.assertTrue(profile.is_first_login)
        
        # Verify temporary password generated and returned
        self.assertIsNotNone(serializer.data.get('temp_password'))
        self.assertTrue(serializer.data['temp_password'].startswith('Temp#'))

    def test_employee_portal_endpoints(self):
        # Create user for employee first
        emp_user = User.objects.create_user(
            username=self.employee_email,
            email=self.employee_email,
            password='temppassword123'
        )
        profile, _ = UserProfile.objects.get_or_create(user=emp_user)
        profile.role = 'employee'
        profile.is_first_login = True
        profile.save()

        # Create employee record linked to the user
        finance = EmployeeFinance.objects.create(
            user=self.admin_user,
            current_pay=5000,
            employee_owes_company=0,
            company_owes_employee=100
        )
        employee = Employee.objects.create(
            user=self.admin_user,
            linked_user=emp_user,
            name=self.employee_name,
            role='Developer',
            department='Engineering',
            office='Main',
            email=self.employee_email,
            salary=5000,
            finance=finance
        )

        # 1. Accessing portal without authentication should fail
        url_dashboard = reverse('employee-dashboard')
        response = self.client.get(url_dashboard)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

        # 2. Accessing portal as admin should fail with PermissionDenied (role restriction)
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get(url_dashboard)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # 3. Accessing portal as the employee
        self.client.force_authenticate(user=emp_user)
        response = self.client.get(url_dashboard)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['employee']['name'], self.employee_name)
        
        # 4. Accessing employee finance details
        url_finance = reverse('employee-finance')
        response = self.client.get(url_finance)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(float(response.data['finance']['company_owes_employee']), 100.0)

        # 5. Create a task assigned to the employee
        import datetime
        task = EmployeeTask.objects.create(
            employee=employee,
            title='Do Testing',
            description='Verify all features',
            priority='high',
            status='assigned',
            due_date=datetime.date.today()
        )

        # 6. Update task status as employee
        url_update_task = reverse('employee-update-task', kwargs={'pk': task.pk})
        response = self.client.post(url_update_task, {'status': 'in_progress', 'description': 'Started testing'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify task is updated
        task.refresh_from_db()
        self.assertEqual(task.status, 'in_progress')
        self.assertIn('Started testing', task.description)

        # Verify activity log was created
        activity = EmployeeActivityLog.objects.filter(employee=employee, action='Task Updated').first()
        self.assertIsNotNone(activity)
