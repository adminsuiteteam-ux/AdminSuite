"""
AdminSuite AI Services
Handles all communication with the Google Gemini API and context building.
"""

import os
import json
import logging
from decimal import Decimal

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Gemini client initialisation (lazy — only when feature is enabled)
# ---------------------------------------------------------------------------

def _get_gemini_client():
    """Returns a configured Gemini GenerativeModel, or raises if not available."""
    try:
        import google.generativeai as genai
    except ImportError:
        raise RuntimeError("google-generativeai is not installed. Run: pip install google-generativeai==0.8.3")

    api_key = os.environ.get('GEMINI_API_KEY', '')
    if not api_key or api_key == 'YOUR_GEMINI_API_KEY_HERE':
        raise RuntimeError("GEMINI_API_KEY is not configured. Add it to your .env file.")

    genai.configure(api_key=api_key)
    return genai.GenerativeModel(
        model_name='gemini-2.0-flash',
        generation_config={
            'temperature': 0.3,      # Low temp for factual business answers
            'top_p': 0.8,
            'max_output_tokens': 2048,
        }
    )


def ai_enabled() -> bool:
    """Returns True if AI features are enabled and configured."""
    return os.environ.get('AI_ENABLED', 'True').lower() in ('true', '1', 'yes')


def call_gemini(prompt: str) -> str:
    """
    Send a prompt to Gemini and return the text response.
    Returns an error string (not an exception) so callers can handle gracefully.
    """
    try:
        model = _get_gemini_client()
        response = model.generate_content(prompt)
        return response.text.strip()
    except RuntimeError as e:
        logger.error("AI configuration error: %s", e)
        return f"__AI_CONFIG_ERROR__: {e}"
    except Exception as e:
        logger.error("Gemini API error: %s", e)
        return f"__AI_API_ERROR__: {e}"


def parse_json_response(raw: str) -> dict:
    """
    Parse a Gemini JSON response, stripping markdown fences if present.
    Returns a dict, or {'error': 'Failed to parse AI response'} on failure.
    """
    cleaned = raw.strip()
    # Strip markdown code fences that Gemini sometimes adds
    if cleaned.startswith('```'):
        lines = cleaned.split('\n')
        # Remove first and last fence lines
        cleaned = '\n'.join(lines[1:-1]) if lines[-1].strip() == '```' else '\n'.join(lines[1:])
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        logger.warning("Failed to parse AI JSON response: %s", raw[:200])
        return {'error': 'Failed to parse AI response', 'raw': raw[:500]}


# ---------------------------------------------------------------------------
# Context builders — convert DB data into prompt-ready strings
# ---------------------------------------------------------------------------

def _fmt(value) -> str:
    """Format a Decimal or float as a comma-separated money string."""
    try:
        return f"{float(value):,.2f}"
    except (TypeError, ValueError):
        return str(value)


def build_business_context(user) -> dict:
    """
    Fetch all relevant business data for a user and return a dict of
    formatted strings ready to inject into prompts.
    """
    from api.models import (
        Employee, Client, Project, Transaction,
        BudgetCategory, Savings, Debt
    )
    from django.db.models import Sum

    def scoped(model, field='user'):
        return model.objects.filter(**{field: user})

    employees = scoped(Employee).exclude(is_archived=True)
    clients = scoped(Client)
    projects = scoped(Project)
    transactions = scoped(Transaction)
    budgets = scoped(BudgetCategory)
    savings = scoped(Savings)
    debts = scoped(Debt)

    total_income = transactions.filter(type='income').aggregate(t=Sum('amount'))['t'] or Decimal('0')
    total_expense = transactions.filter(type='expense').aggregate(t=Sum('amount'))['t'] or Decimal('0')
    net_profit = total_income - total_expense

    # ---- Employees summary ----
    emp_lines = []
    for e in employees.order_by('name')[:10]:
        tasks_done = e.tasks.filter(status='completed').count()
        tasks_total = e.tasks.count()
        emp_lines.append(
            f"  - {e.name} | {e.role} | {e.department} | Status: {e.status} | "
            f"Performance: {e.performance}/100 | Tasks: {tasks_done}/{tasks_total} done"
        )
    employees_summary = '\n'.join(emp_lines) if emp_lines else '  (no employees)'

    # ---- Clients summary ----
    client_lines = []
    for c in clients.order_by('company')[:10]:
        client_lines.append(
            f"  - {c.company} | Status: {c.status} | "
            f"Paid: ${_fmt(c.paid)} | Owes us: ${_fmt(c.client_owes_company)} | "
            f"Projects: {c.projects_count}"
        )
    clients_summary = '\n'.join(client_lines) if client_lines else '  (no clients)'

    # ---- Projects summary ----
    project_lines = []
    for p in projects.filter(status='active').order_by('name')[:10]:
        project_lines.append(
            f"  - {p.name} | Client: {p.client.company} | "
            f"Value: ${_fmt(p.value)} | Progress: {p.progress}%"
        )
    projects_summary = '\n'.join(project_lines) if project_lines else '  (no active projects)'

    # ---- Transactions summary ----
    tx_lines = []
    for t in transactions.order_by('-id')[:20]:
        tx_lines.append(
            f"  - [{t.type.upper()}] {t.description} | {t.category} | ${_fmt(t.amount)} | {t.date}"
        )
    transactions_summary = '\n'.join(tx_lines) if tx_lines else '  (no transactions)'

    # ---- Budgets summary ----
    budget_lines = []
    for b in budgets:
        pct = (float(b.spent) / float(b.allocated) * 100) if b.allocated else 0
        budget_lines.append(
            f"  - {b.name}: Allocated ${_fmt(b.allocated)} | Spent ${_fmt(b.spent)} ({pct:.0f}%)"
        )
    budgets_summary = '\n'.join(budget_lines) if budget_lines else '  (no budget categories)'

    # ---- Debts summary ----
    debt_lines = []
    for d in debts:
        debt_lines.append(
            f"  - [{d.type}] {d.party}: ${_fmt(d.amount)} | Due: {d.due}"
        )
    debts_summary = '\n'.join(debt_lines) if debt_lines else '  (no debts)'

    return {
        'employee_count': employees.filter(status='active').count(),
        'active_projects': projects.filter(status='active').count(),
        'client_count': clients.count(),
        'total_income': _fmt(total_income),
        'total_expense': _fmt(total_expense),
        'net_profit': _fmt(net_profit),
        'employees_summary': employees_summary,
        'clients_summary': clients_summary,
        'projects_summary': projects_summary,
        'transactions_summary': transactions_summary,
        'budgets_summary': budgets_summary,
        'debts_summary': debts_summary,
        # Raw querysets for detail views
        '_employees': employees,
        '_clients': clients,
        '_projects': projects,
        '_transactions': transactions,
        '_budgets': budgets,
        '_savings': savings,
        '_debts': debts,
        '_total_income': total_income,
        '_total_expense': total_expense,
        '_net_profit': net_profit,
    }


def build_finance_detail(ctx: dict) -> dict:
    """Build detailed finance strings for the forecast prompt."""
    budgets = ctx['_budgets']
    transactions = ctx['_transactions']
    savings = ctx['_savings']
    debts = ctx['_debts']

    budget_lines = []
    for b in budgets:
        remaining = float(b.allocated) - float(b.spent)
        pct = (float(b.spent) / float(b.allocated) * 100) if b.allocated else 0
        budget_lines.append(
            f"  - {b.name}: Allocated ${_fmt(b.allocated)}, Spent ${_fmt(b.spent)} "
            f"({pct:.0f}%), Remaining ${_fmt(remaining)}"
        )

    tx_lines = [
        f"  - [{t.type.upper()}] {t.category}: ${_fmt(t.amount)} — {t.description} ({t.date})"
        for t in transactions.order_by('-id')[:30]
    ]

    savings_lines = [
        f"  - {s.name}: Target ${_fmt(s.target)}, Saved ${_fmt(s.saved)} | Purpose: {s.purpose}"
        for s in savings
    ]

    debt_lines = [
        f"  - [{d.type}] {d.party}: ${_fmt(d.amount)} | Due: {d.due}"
        for d in debts
    ]

    return {
        'budgets_detail': '\n'.join(budget_lines) or '  (none)',
        'transactions_detail': '\n'.join(tx_lines) or '  (none)',
        'savings_detail': '\n'.join(savings_lines) or '  (none)',
        'debts_detail': '\n'.join(debt_lines) or '  (none)',
    }


def build_client_detail(clients) -> str:
    """Build detailed client strings for the client insights prompt."""
    lines = []
    for c in clients:
        active_projects = c.projects.filter(status='active').count()
        completed_projects = c.projects.filter(status='completed').count()
        lines.append(
            f"  Client ID: {c.id} | Name: {c.company} | Contact: {c.contact}\n"
            f"    Status: {c.status} | Amount paid: ${_fmt(c.paid)}\n"
            f"    Client owes us: ${_fmt(c.client_owes_company)} | "
            f"We owe client: ${_fmt(c.company_owes_client)}\n"
            f"    Active projects: {active_projects} | Completed: {completed_projects}\n"
            f"    Lifetime value: ${_fmt(c.lifetime_value)} | Remark: {c.remark or 'None'}"
        )
    return '\n\n'.join(lines) if lines else '  (no clients)'


def build_employee_detail(employee) -> dict:
    """Build detailed employee strings for the insights prompt."""
    tasks = employee.tasks.order_by('-created_at')[:10]
    tasks_total = tasks.count()
    tasks_completed = tasks.filter(status='completed').count()
    completion_rate = round((tasks_completed / tasks_total * 100) if tasks_total else 0)

    task_lines = [
        f"  - {t.title} | Priority: {t.priority} | Status: {t.status} | Due: {t.due_date}"
        for t in tasks
    ]

    leaves = employee.leaves.order_by('-created_at')[:5]
    leave_lines = [
        f"  - {l.leave_type}: {l.start_date} to {l.end_date} ({l.duration_days} days) | {l.status}"
        for l in leaves
    ]

    adjustments = employee.salary_adjustments.order_by('-created_at')[:5]
    adj_lines = [
        f"  - {a.adjustment_type}: ${_fmt(a.amount)} on {a.effective_date}"
        for a in adjustments
    ]

    activity = employee.activity_logs.order_by('-created_at')[:5]
    activity_lines = [
        f"  - {a.action}: {a.details[:80]} ({a.created_at.strftime('%Y-%m-%d')})"
        for a in activity
    ]

    return {
        'tasks_summary': '\n'.join(task_lines) or '  (none)',
        'tasks_total': tasks_total,
        'tasks_completed': tasks_completed,
        'completion_rate': completion_rate,
        'leaves_summary': '\n'.join(leave_lines) or '  (none)',
        'salary_adjustments': '\n'.join(adj_lines) or '  (none)',
        'activity_log': '\n'.join(activity_lines) or '  (none)',
        'current_salary': _fmt(employee.finance.current_pay) if hasattr(employee, 'finance') else '0',
    }


def translate_search_to_filters(model_name: str, raw_filters: dict) -> dict:
    """
    Convert Gemini's filter dict into Django ORM-safe kwargs.
    Only allows whitelisted fields to prevent injection.
    """
    ALLOWED_FIELDS = {
        'employees': {'name', 'role', 'department', 'status', 'is_flagged',
                      'name__icontains', 'role__icontains', 'department__icontains'},
        'clients': {'company', 'contact', 'status',
                    'company__icontains', 'contact__icontains'},
        'projects': {'name', 'status', 'value__gte', 'value__lte',
                     'name__icontains', 'start_date__gte', 'end_date__lte'},
        'transactions': {'type', 'category', 'amount__gte', 'amount__lte',
                         'description__icontains', 'category__icontains'},
    }
    allowed = ALLOWED_FIELDS.get(model_name, set())
    return {k: v for k, v in raw_filters.items() if k in allowed}
