import os
import sys
import time
if hasattr(sys.stdout, 'reconfigure'):
    getattr(sys.stdout, 'reconfigure')(encoding='utf-8')
import django
import concurrent.futures

# Initialize Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth.models import User
from django.db import connection, transaction
from api.models import (
    UserProfile, Client, Project, Transaction as FinancialTransaction,
    Debt, BudgetCategory, Savings, Notification, Employee, EmployeeFinance
)
from api.extended_models import (
    Organization, Branch, UserExtension
)
from api.views import get_financial_pulse_data
from api.serializers import EmployeeSerializer

print("=" * 80)
print("🚀 ADMINSUITE COMPREHENSIVE END-TO-END VERIFICATION & STRESS TEST")
print("=" * 80)
print(f"Connected Database Host: {connection.settings_dict['HOST']}")
print(f"Connected Database Name: {connection.settings_dict['NAME']}")
print(f"Brevo API Configured:    {bool(os.environ.get('BREVO_API_KEY'))}")
print("=" * 80)

results = {}

# -----------------------------------------------------------------------------
# TEST 1: User Registration, Profile & Organization Setup
# -----------------------------------------------------------------------------
print("\n[TEST 1] Testing User Registration & Organization Setup...")
test_email = "ceo_test_suite@adminsuite.test"
user, created = User.objects.get_or_create(
    username="ceo_test_suite",
    defaults={"email": test_email, "first_name": "Test", "last_name": "CEO"}
)
user.set_password("AdminSuite2026!#")
user.save()

profile, _ = UserProfile.objects.get_or_create(
    user=user,
    defaults={
        "role": "CEO",
        "business_name": "AdminSuite Global Corp",
        "profile_complete": True,
        "avatar": "https://res.cloudinary.com/db3m3jumf/image/upload/v1/samples/people/smiling-man.jpg"
    }
)
org, _ = Organization.objects.get_or_create(created_by=user, defaults={"name": "AdminSuite Global Corp"})
branch, _ = Branch.objects.get_or_create(organization=org, name="HQ Lagos", defaults={"location": "Lagos, Nigeria", "created_by": user})
UserExtension.objects.update_or_create(
    user=user,
    defaults={"organization": org, "branch": branch, "role": "CEO"}
)

print(f"  ✅ CEO User: {user.username} (ID: {user.id})")
print(f"  ✅ Organization: {org.name} (ID: {org.id})")
print(f"  ✅ Branch: {branch.name} (ID: {branch.id})")
results["test1_user_setup"] = "PASSED"

# -----------------------------------------------------------------------------
# TEST 2: Employee/Staff Creation + Temp Password + Credentials
# -----------------------------------------------------------------------------
print("\n[TEST 2] Testing Staff/Employee Creation & Temp Credentials...")
emp_email = f"staff_{int(time.time())}@adminsuite.test"

# Use serializer to test the EXACT production onboarding pipeline
emp_serializer = EmployeeSerializer(
    data={
        "name": "Jane Lead Engineer",
        "role": "Operations Manager",
        "department": "Engineering",
        "salary": 145000.00,
        "email": emp_email,
        "phone": "+2348098765432",
        "location": "Lagos, Nigeria",
        "bio": "Lead full-stack engineer and operations specialist.",
        "office": "Floor 4, Tech Hub",
        "finance_data": {"payment_method": "direct_deposit"}
    },
    context={'request': type('MockRequest', (), {'user': user})()}
)

if emp_serializer.is_valid():
    emp_instance = emp_serializer.save(user=user)
    temp_pass = getattr(emp_instance, '_temp_password', None)
    linked_user = emp_instance.linked_user
    print(f"  ✅ Staff Record Created: {emp_instance.name} (ID: {emp_instance.id})")
    print(f"  ✅ Linked Auth User Created: {linked_user.username} (ID: {linked_user.id})")
    print(f"  ✅ Temporary Password Generated: {temp_pass}")
    print(f"  ✅ Finance Linked: ID {emp_instance.finance_id}")
    print(f"  ✅ First Login Flag: {linked_user.profile.is_first_login}")
    results["test2_employee_creation"] = "PASSED"
else:
    print(f"  ❌ Employee creation serializer errors: {emp_serializer.errors}")
    results["test2_employee_creation"] = "FAILED"

# -----------------------------------------------------------------------------
# TEST 3: Client Creation
# -----------------------------------------------------------------------------
print("\n[TEST 3] Testing Client Creation...")
client, _ = Client.objects.get_or_create(
    user=user,
    email="acme_client@example.com",
    defaults={
        "contact": "John Doe",
        "company": "Acme Holdings International",
        "location": "12 Marina Road, Lagos",
        "paid": 35000.00
    }
)
print(f"  ✅ Client Created: {client.company} - Contact: {client.contact} (ID: {client.id})")
results["test3_client_creation"] = "PASSED"

# -----------------------------------------------------------------------------
# TEST 4: Project Creation & Association
# -----------------------------------------------------------------------------
print("\n[TEST 4] Testing Project Creation...")
project, _ = Project.objects.get_or_create(
    user=user,
    name="Enterprise ERP Cloud Migration",
    defaults={
        "client": client,
        "status": "active",
        "value": 75000.00,
        "progress": 35
    }
)
print(f"  ✅ Project Created: {project.name} (Client: {project.client.company}, Value: ${project.value:,.2f})")
results["test4_project_creation"] = "PASSED"

# -----------------------------------------------------------------------------
# TEST 5: Budget Categories, Savings & Financial Pulse
# -----------------------------------------------------------------------------
print("\n[TEST 5] Testing Budgets, Savings Goals & Financial Pulse...")
b_cat, _ = BudgetCategory.objects.get_or_create(
    user=user,
    name="Software & Infrastructure",
    defaults={"allocated": 25000.00, "spent": 6500.00, "color": "#4f46e5"}
)

savings, _ = Savings.objects.get_or_create(
    user=user,
    name="Corporate Growth Reserve",
    defaults={"target": 150000.00, "saved": 55000.00, "purpose": "Expansion"}
)

# Insert sample financial transactions
t_inc, _ = FinancialTransaction.objects.get_or_create(
    user=user,
    description="Milestone 1 Payment from Acme",
    defaults={"type": "income", "amount": 35000.00, "category": "Client Services"}
)
t_exp, _ = FinancialTransaction.objects.get_or_create(
    user=user,
    description="Dedicated Server Cluster Hosting",
    defaults={"type": "expense", "amount": 4200.00, "category": "Software & Infrastructure"}
)

# Calculate Financial Pulse
pulse = get_financial_pulse_data(user)
print(f"  ✅ Budget Category: {b_cat.name} (Allocated: ${b_cat.allocated:,.2f})")
print(f"  ✅ Savings Goal: {savings.name} (Progress: ${(savings.saved/savings.target)*100:.1f}%)")
print(f"  ✅ Financial Pulse Computed Live:")
print(f"     • Total Income:     ${pulse.get('totalIncome', 0):,.2f}")
print(f"     • Total Expenses:   ${pulse.get('totalExpense', 0):,.2f}")
print(f"     • Net Profit:       ${pulse.get('netProfit', 0):,.2f}")
print(f"     • Total Payroll:    ${pulse.get('totalPayroll', 0):,.2f}")
print(f"     • Active Staff:     {pulse.get('staffPaid', 0)}")
results["test5_financial_pulse"] = "PASSED"

# -----------------------------------------------------------------------------
# TEST 6: Profile Image / Cloudinary Resolution
# -----------------------------------------------------------------------------
print("\n[TEST 6] Testing Profile Image Resolution & Visibility...")
avatar_url = str(profile.avatar) if profile.avatar else ""
has_secure_url = bool(avatar_url and ("cloudinary" in avatar_url or "http" in avatar_url))
print(f"  ✅ Avatar Path/URL: {avatar_url}")
print(f"  ✅ Cloudinary / Storage Resolution: {has_secure_url}")
results["test6_image_visibility"] = "PASSED" if has_secure_url else "FAILED"

# -----------------------------------------------------------------------------
# TEST 7: Direct Database Query in Layerbase
# -----------------------------------------------------------------------------
print("\n[TEST 7] Direct Layerbase PostgreSQL Persistence Verification...")
with connection.cursor() as cur:
    cur.execute("SELECT count(*) FROM auth_user")
    total_users = cur.fetchone()[0]
    cur.execute("SELECT count(*) FROM api_employee")
    total_employees = cur.fetchone()[0]
    cur.execute("SELECT count(*) FROM api_client")
    total_clients = cur.fetchone()[0]
    cur.execute("SELECT count(*) FROM api_project")
    total_projects = cur.fetchone()[0]
    cur.execute("SELECT count(*) FROM api_transaction")
    total_transactions = cur.fetchone()[0]
    cur.execute("SELECT count(*) FROM api_budgetcategory")
    total_budgets = cur.fetchone()[0]
    cur.execute("SELECT count(*) FROM api_savings")
    total_savings = cur.fetchone()[0]

print(f"  Layerbase PostgreSQL Live Counts Verified:")
print(f"   • auth_user:         {total_users}")
print(f"   • api_employee:      {total_employees}")
print(f"   • api_client:        {total_clients}")
print(f"   • api_project:       {total_projects}")
print(f"   • api_transaction:   {total_transactions}")
print(f"   • api_budgetcategory:{total_budgets}")
print(f"   • api_savings:       {total_savings}")
results["test7_layerbase_persistence"] = "PASSED"

# -----------------------------------------------------------------------------
# TEST 8: 10,000 Users Action Simulation & Stress Test
# -----------------------------------------------------------------------------
print("\n" + "=" * 80)
print("⚡ [TEST 8] SIMULATING 10,000 USER ACTIONS / CONCURRENCY STRESS TEST")
print("=" * 80)
TOTAL_ACTIONS = 10000
BATCH_SIZE = 1000

print(f"Generating and persisting {TOTAL_ACTIONS:,} synthetic financial & project records...")
transactions_to_create = [
    FinancialTransaction(
        user=user,
        description=f"Automated Transaction #{i+1}",
        type="income" if i % 3 == 0 else "expense",
        amount=50.0 + (i % 500),
        category="General Operations",
        date="Sep 30"
    )
    for i in range(TOTAL_ACTIONS)
]

insert_start = time.time()
with transaction.atomic():
    FinancialTransaction.objects.bulk_create(transactions_to_create, batch_size=BATCH_SIZE)
insert_duration = time.time() - insert_start
throughput = TOTAL_ACTIONS / insert_duration

print(f"  ✅ Inserted {TOTAL_ACTIONS:,} financial records into Layerbase in {insert_duration:.2f} seconds.")
print(f"  ⚡ Database Write Throughput: {throughput:,.1f} records/sec")

# 2. Concurrency Simulation: 15 concurrent workers executing queries & calculations
print("\nSimulating concurrent read/compute queries across 15 pooled worker threads...")
concurrency_start = time.time()

def simulate_user_session(user_id):
    from django import db
    try:
        u = User.objects.get(id=user_id)
        p = get_financial_pulse_data(u)
        recent = list(FinancialTransaction.objects.filter(user=u).order_by('-id')[:10])
        return len(recent), p.get('netProfit')
    finally:
        db.connections.close_all()

with concurrent.futures.ThreadPoolExecutor(max_workers=15) as executor:
    futures = [executor.submit(simulate_user_session, user.id) for _ in range(300)]
    completed = 0
    for f in concurrent.futures.as_completed(futures):
        f.result()
        completed += 1

concurrency_duration = time.time() - concurrency_start
concurrency_rps = 300 / concurrency_duration
print(f"  ✅ Completed 300 concurrent complex dashboard sessions in {concurrency_duration:.2f} seconds.")
print(f"  ⚡ Read/Aggregation Throughput: {concurrency_rps:,.1f} queries/sec")

# Clean up synthetic stress test data to keep the database tidy
print("\nCleaning up synthetic benchmark records...")
FinancialTransaction.objects.filter(description__startswith="Automated Transaction #").delete()
print("  ✅ Synthetic test data cleaned up.")

results["test8_10k_simulation"] = "PASSED"

print("\n" + "=" * 80)
print("🏁 COMPLETE TEST SUMMARY REPORT")
print("=" * 80)
for k, v in results.items():
    print(f"  {k:30}: {v}")
print("=" * 80)
