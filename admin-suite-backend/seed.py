import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth.models import User
from api.models import (
    Employee, EmployeeFinance, PayHistory, Client, Project,
    Transaction, Notification, Debt, BudgetCategory
)

def seed():
    # Get or create a default admin user for seeded data
    admin_user, created = User.objects.get_or_create(
        username='admin',
        defaults={
            'email': 'admin@adminsuite.app',
            'first_name': 'Admin',
            'last_name': 'Suite',
            'is_staff': True,
            'is_superuser': True,
        }
    )
    if created:
        admin_user.set_password('admin123')
        admin_user.save()
        print(f"Created admin user: admin / admin123")
    else:
        print(f"Using existing admin user: {admin_user.username}")

    # Clear existing data
    PayHistory.objects.all().delete()
    Employee.objects.all().delete()
    EmployeeFinance.objects.all().delete()
    Client.objects.all().delete()
    Project.objects.all().delete()
    Transaction.objects.all().delete()
    Notification.objects.all().delete()
    Debt.objects.all().delete()
    BudgetCategory.objects.all().delete()

    print("Seeding data...")

    # ── Employees ──────────────────────────────────────────
    employees_data = [
        {
            "name": "Amara Okonkwo", "role": "Senior Engineer", "department": "Engineering",
            "office": "Lagos HQ", "status": "active", "performance": 5, "salary": 8500,
            "initials": "AO", "avatar": "https://i.pravatar.cc/300?img=47",
            "email": "amara@adminsuite.app", "phone": "+234 803 555 0118",
            "location": "Lagos, NG",
            "bio": "Engineering lead obsessed with reliable infra and gentle code reviews. Loves jollof and CI pipelines that finish in under 3 minutes.",
            "socials": {"whatsapp": "+2348035550118", "instagram": "@amara.builds", "facebook": "amara.okonkwo", "twitter": "@amara_dev", "linkedin": "amara-okonkwo"},
            "finance": {"current_pay": 8500, "employee_owes_company": 0, "company_owes_employee": 1200, "shares": 2.5, "bonuses": 3200, "deductions": 850},
            "pay_history": [
                {"month": "Jan", "amount": 8500, "paid": True}, {"month": "Feb", "amount": 8500, "paid": True},
                {"month": "Mar", "amount": 8500, "paid": True}, {"month": "Apr", "amount": 8500, "paid": True},
                {"month": "May", "amount": 8500, "paid": False},
            ],
        },
        {
            "name": "James Carter", "role": "Product Manager", "department": "Product",
            "office": "Remote · UK", "status": "active", "performance": 4, "salary": 7200,
            "initials": "JC", "avatar": "https://i.pravatar.cc/300?img=12",
            "email": "james@adminsuite.app", "phone": "+44 7700 900441",
            "location": "Manchester, UK",
            "bio": "Translates ambiguous problems into shipped features. Ex-startup PM turned roadmap whisperer.",
            "socials": {"whatsapp": "+447700900441", "instagram": "@james.builds", "facebook": "james.carter", "twitter": "@jcarter", "linkedin": "james-carter-pm", "discord": "james#4521"},
            "finance": {"current_pay": 7200, "employee_owes_company": 500, "company_owes_employee": 0, "shares": 1.0, "bonuses": 1800, "deductions": 620},
            "pay_history": [
                {"month": "Jan", "amount": 7200, "paid": True}, {"month": "Feb", "amount": 7200, "paid": True},
                {"month": "Mar", "amount": 7200, "paid": True}, {"month": "Apr", "amount": 7200, "paid": True},
                {"month": "May", "amount": 7200, "paid": False},
            ],
        },
        {
            "name": "Priya Shah", "role": "HR Specialist", "department": "People",
            "office": "Mumbai Hub", "status": "on_leave", "performance": 4, "salary": 5400,
            "initials": "PS", "avatar": "https://i.pravatar.cc/300?img=45",
            "email": "priya@adminsuite.app", "phone": "+91 98200 33421",
            "location": "Mumbai, IN",
            "bio": "People-first HR partner. Building inclusive hiring loops and onboarding that actually feels human.",
            "socials": {"whatsapp": "+919820033421", "instagram": "@priya.people", "facebook": "priya.shah"},
            "finance": {"current_pay": 5400, "employee_owes_company": 0, "company_owes_employee": 0, "shares": 0, "bonuses": 800, "deductions": 400},
            "pay_history": [
                {"month": "Jan", "amount": 5400, "paid": True}, {"month": "Feb", "amount": 5400, "paid": True},
                {"month": "Mar", "amount": 5400, "paid": True}, {"month": "Apr", "amount": 5400, "paid": True},
                {"month": "May", "amount": 5400, "paid": False},
            ],
        },
        {
            "name": "Diego Alvarez", "role": "Senior Designer", "department": "Design",
            "office": "Mexico City", "status": "active", "performance": 5, "salary": 6300,
            "initials": "DA", "avatar": "https://i.pravatar.cc/300?img=33",
            "email": "diego@adminsuite.app", "phone": "+52 55 4423 7891",
            "location": "Mexico City, MX",
            "bio": "Visual systems thinker. Wireframes by day, generative art by night.",
            "socials": {"whatsapp": "+525544237891", "instagram": "@diego.draws", "facebook": "diego.alvarez", "twitter": "@diego_design"},
            "finance": {"current_pay": 6300, "employee_owes_company": 2000, "company_owes_employee": 0, "shares": 1.5, "bonuses": 1500, "deductions": 300},
            "pay_history": [
                {"month": "Jan", "amount": 6300, "paid": True}, {"month": "Feb", "amount": 6300, "paid": True},
                {"month": "Mar", "amount": 6300, "paid": True}, {"month": "Apr", "amount": 6300, "paid": False},
                {"month": "May", "amount": 6300, "paid": False},
            ],
        },
        {
            "name": "Mei Tanaka", "role": "Finance Analyst", "department": "Finance",
            "office": "Tokyo Studio", "status": "active", "performance": 4, "salary": 5900,
            "initials": "MT", "avatar": "https://i.pravatar.cc/300?img=49",
            "email": "mei@adminsuite.app", "phone": "+81 3 5500 1872",
            "location": "Tokyo, JP",
            "bio": "Spreadsheet sommelier. Forecasting cashflows and naming pivot tables like racehorses.",
            "socials": {"whatsapp": "+81355001872", "instagram": "@mei.finance", "facebook": "mei.tanaka", "linkedin": "mei-tanaka"},
            "finance": {"current_pay": 5900, "employee_owes_company": 0, "company_owes_employee": 3400, "shares": 0.5, "bonuses": 2100, "deductions": 500},
            "pay_history": [
                {"month": "Jan", "amount": 5900, "paid": True}, {"month": "Feb", "amount": 5900, "paid": True},
                {"month": "Mar", "amount": 5900, "paid": True}, {"month": "Apr", "amount": 5900, "paid": True},
                {"month": "May", "amount": 5900, "paid": False},
            ],
        },
        {
            "name": "Liam Brown", "role": "Sales Lead", "department": "Sales",
            "office": "Remote · US", "status": "terminated", "performance": 2, "salary": 0,
            "initials": "LB", "avatar": "https://i.pravatar.cc/300?img=15",
            "email": "liam@adminsuite.app", "phone": "+1 415 555 0234",
            "location": "San Francisco, US",
            "bio": "Former sales lead. Off-boarded after Q1 review.",
            "socials": {"whatsapp": "+14155550234", "facebook": "liam.brown"},
            "finance": {"current_pay": 0, "employee_owes_company": 4500, "company_owes_employee": 0, "shares": 0, "bonuses": 0, "deductions": 0},
            "pay_history": [
                {"month": "Jan", "amount": 6800, "paid": True}, {"month": "Feb", "amount": 6800, "paid": True},
                {"month": "Mar", "amount": 0, "paid": False}, {"month": "Apr", "amount": 0, "paid": False},
                {"month": "May", "amount": 0, "paid": False},
            ],
        },
        {
            "name": "Aisha Bello", "role": "Account Executive", "department": "Sales",
            "office": "Lagos HQ", "status": "active", "performance": 5, "salary": 6700,
            "initials": "AB", "avatar": "https://i.pravatar.cc/300?img=44",
            "email": "aisha@adminsuite.app", "phone": "+234 802 555 0991",
            "location": "Lagos, NG",
            "bio": "Closes deals with empathy. Loves cold calls more than is medically advisable.",
            "socials": {"whatsapp": "+2348025550991", "instagram": "@aisha.sells", "facebook": "aisha.bello", "twitter": "@aisha_b", "discord": "aisha#9012"},
            "finance": {"current_pay": 6700, "employee_owes_company": 0, "company_owes_employee": 800, "shares": 3.0, "bonuses": 4200, "deductions": 720},
            "pay_history": [
                {"month": "Jan", "amount": 6700, "paid": True}, {"month": "Feb", "amount": 6700, "paid": True},
                {"month": "Mar", "amount": 6700, "paid": True}, {"month": "Apr", "amount": 6700, "paid": True},
                {"month": "May", "amount": 6700, "paid": False},
            ],
        },
    ]

    for emp_data in employees_data:
        fin_data = emp_data.pop("finance")
        pay_data = emp_data.pop("pay_history")
        socials = emp_data.pop("socials")

        finance = EmployeeFinance.objects.create(user=admin_user, **fin_data)
        for ph in pay_data:
            PayHistory.objects.create(finance=finance, **ph)

        Employee.objects.create(finance=finance, socials=socials, user=admin_user, **emp_data)

    # ── Clients ────────────────────────────────────────────
    clients_data = [
        {"company": "Northwind Retail", "contact": "Sarah Lin", "email": "sarah@northwind.co", "location": "Lagos, NG", "coords": {"lat": 6.5244, "lng": 3.3792}, "paid": 48200, "projects_count": 3, "status": "active", "website": "https://northwind.co", "description": "Pan-African retail chain with 42 stores. Migrating their POS to a unified inventory cloud.", "remark": "Renewed annual contract. Push for premium support tier next quarter."},
        {"company": "Helios Energy", "contact": "Marcus Reed", "email": "m.reed@helios.io", "location": "Berlin, DE", "coords": {"lat": 52.52, "lng": 13.405}, "paid": 96500, "projects_count": 5, "status": "active", "website": "https://helios.io", "description": "Renewable energy startup deploying solar microgrids across the EU. Heavy data pipeline workload.", "remark": "Fastest growing account. Schedule executive QBR for May."},
        {"company": "Kira Studios", "contact": "Yuki Mori", "email": "yuki@kira.studio", "location": "Tokyo, JP", "coords": {"lat": 35.6762, "lng": 139.6503}, "paid": 31000, "projects_count": 2, "status": "completed", "website": "https://kira.studio", "description": "Boutique anime studio. Brand refresh and merchandising portal delivered Q1.", "remark": "Wrap-up complete. Excellent NPS — request case study."},
        {"company": "Bluepeak Logistics", "contact": "Nadia Khan", "email": "nadia@bluepeak.com", "location": "Dubai, AE", "coords": {"lat": 25.2048, "lng": 55.2708}, "paid": 72400, "projects_count": 4, "status": "pending", "website": "https://bluepeak.com", "description": "Regional freight operator. Awaiting sign-off on phase 3 of the live tracking platform.", "remark": "Decision pending board approval. Follow up with Nadia on Friday."},
        {"company": "Verdant Foods", "contact": "Tomas Silva", "email": "tomas@verdant.bio", "location": "São Paulo, BR", "coords": {"lat": -23.5505, "lng": -46.6333}, "paid": 18900, "projects_count": 1, "status": "active", "website": "https://verdant.bio", "description": "Organic food D2C brand. Building a subscription commerce experience.", "remark": "Small but high-margin. Upsell loyalty module after launch."},
        {"company": "Cardinal Health Co.", "contact": "Adaeze Nwosu", "email": "adaeze@cardinal.health", "location": "Abuja, NG", "coords": {"lat": 9.0765, "lng": 7.3986}, "paid": 24500, "projects_count": 2, "status": "pending", "website": "https://cardinal.health", "description": "Hospital network rolling out a patient records portal across 6 sites.", "remark": "Onboarding kickoff next week. Compliance review in progress."},
    ]

    client_objs = {}
    for cd in clients_data:
        c = Client.objects.create(user=admin_user, **cd)
        client_objs[c.company] = c

    # ── Projects ───────────────────────────────────────────
    projects_data = [
        {"name": "Atlas Dashboard", "client": "Northwind Retail", "status": "active", "value": 24000, "progress": 65},
        {"name": "Helios CRM Migration", "client": "Helios Energy", "status": "active", "value": 58000, "progress": 40},
        {"name": "Kira Brand Refresh", "client": "Kira Studios", "status": "completed", "value": 18000, "progress": 100},
        {"name": "Logistics Tracker", "client": "Bluepeak Logistics", "status": "on_hold", "value": 32000, "progress": 30},
        {"name": "Verdant E-Commerce", "client": "Verdant Foods", "status": "active", "value": 18900, "progress": 80},
        {"name": "Northwind POS", "client": "Northwind Retail", "status": "planned", "value": 14000, "progress": 5},
    ]

    for pd in projects_data:
        client_name = pd.pop("client")
        Project.objects.create(client=client_objs[client_name], user=admin_user, **pd)

    # ── Transactions ───────────────────────────────────────
    transactions_data = [
        {"type": "income", "amount": 12000, "category": "Project Payment", "description": "Atlas Dashboard – milestone 2", "date": "Apr 28"},
        {"type": "expense", "amount": 4200, "category": "Salaries", "description": "Engineering payroll", "date": "Apr 27"},
        {"type": "income", "amount": 24000, "category": "Project Payment", "description": "Helios CRM – initial", "date": "Apr 25"},
        {"type": "expense", "amount": 1850, "category": "Software", "description": "Cloud + tooling", "date": "Apr 24"},
        {"type": "expense", "amount": 3000, "category": "Office", "description": "Lagos workspace rent", "date": "Apr 22"},
        {"type": "income", "amount": 8400, "category": "Project Payment", "description": "Bluepeak – sprint billing", "date": "Apr 20"},
        {"type": "expense", "amount": 1200, "category": "Marketing", "description": "Q2 campaign assets", "date": "Apr 18"},
        {"type": "income", "amount": 5600, "category": "Retainer", "description": "Verdant Foods – April", "date": "Apr 15"},
        {"type": "expense", "amount": 920, "category": "Travel", "description": "Helios on-site visit", "date": "Apr 12"},
    ]

    for td in transactions_data:
        Transaction.objects.create(user=admin_user, **td)

    # ── Notifications ──────────────────────────────────────
    notifications_data = [
        {"title": "New expenditure recorded", "body": "Marcus added a $1,850 expense in Software", "time": "12m"},
        {"title": "Project status changed", "body": "Helios CRM Migration moved to Active", "time": "1h"},
        {"title": "Employee onboarded", "body": "Aisha Bello joined Sales", "time": "3h"},
        {"title": "Custom field created", "body": "Admin added 'Tax ID' to Employees", "time": "1d"},
    ]

    for nd in notifications_data:
        Notification.objects.create(user=admin_user, **nd)

    # ── Debts ──────────────────────────────────────────────
    debts_data = [
        {"type": "weOwe", "party": "AWS Cloud", "amount": 4200, "due": "May 5"},
        {"type": "weOwe", "party": "Office landlord", "amount": 3000, "due": "May 1"},
        {"type": "weOwe", "party": "Adobe Creative Cloud", "amount": 540, "due": "May 12"},
        {"type": "owedToUs", "party": "Bluepeak Logistics", "amount": 18500, "due": "May 8"},
        {"type": "owedToUs", "party": "Cardinal Health Co.", "amount": 9200, "due": "May 14"},
    ]

    for dd in debts_data:
        Debt.objects.create(user=admin_user, **dd)

    # ── Budget Categories ──────────────────────────────────
    budgets_data = [
        {"name": "Payroll", "allocated": 45000, "spent": 42100, "color": "#22c55e"},
        {"name": "Infrastructure", "allocated": 12000, "spent": 8400, "color": "#f97316"},
        {"name": "Marketing", "allocated": 8000, "spent": 5300, "color": "#ef4444"},
        {"name": "Office & Travel", "allocated": 6500, "spent": 4920, "color": "#2563eb"},
        {"name": "Tools & SaaS", "allocated": 4500, "spent": 3850, "color": "#a855f7"},
    ]

    for bd in budgets_data:
        BudgetCategory.objects.create(user=admin_user, **bd)

    print("Successfully seeded ALL data!")

if __name__ == '__main__':
    seed()
