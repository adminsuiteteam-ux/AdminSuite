import os
import re
from django.utils import timezone
from datetime import timedelta
from django.db.models import Sum
from fpdf import FPDF

class ExportPDF(FPDF):
    def __init__(self, business_name="", org_location="", org_email="", logo_path=None, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.business_name = business_name
        self.org_location = org_location
        self.org_email = org_email
        self.logo_path = logo_path
        self.set_margins(20, 20, 20)
        self.set_auto_page_break(auto=True, margin=20)

    def header(self):
        # Header banner styling
        self.set_fill_color(248, 250, 252) # Slate-50 background for header
        self.rect(0, 0, 210, 48, "F")
        
        # Render logo if available
        logo_x = 20
        if self.logo_path and os.path.exists(self.logo_path):
            try:
                self.image(self.logo_path, x=20, y=12, h=24)
                logo_x = 52 # Shift text right if logo is rendered
            except Exception:
                pass
                
        # Business metadata header
        self.set_xy(logo_x, 14)
        self.set_font("helvetica", "B", 14)
        self.set_text_color(15, 23, 42) # Slate-900
        self.cell(0, 6, self.business_name or "AdminSuite Workspace", ln=True)
        
        self.set_x(logo_x)
        self.set_font("helvetica", "", 9)
        self.set_text_color(71, 85, 105) # Slate-600
        
        location_str = self.org_location or "AdminSuite Cloud Platform"
        email_str = self.org_email or "support@adminsuite.com"
        self.cell(0, 5, f"{location_str}  |  {email_str}", ln=True)
        
        self.set_x(logo_x)
        self.set_font("helvetica", "I", 8)
        self.set_text_color(148, 163, 184) # Slate-400
        self.cell(0, 4, f"Exported: {timezone.now().strftime('%Y-%m-%d %H:%M:%S UTC')}", ln=True)
        
        # Divider line below header
        self.set_draw_color(226, 232, 240) # Slate-200
        self.set_line_width(0.5)
        self.line(20, 44, 190, 44)
        self.ln(20)

    def footer(self):
        self.set_y(-20)
        self.set_draw_color(241, 245, 249)
        self.set_line_width(0.3)
        self.line(20, self.get_y() - 2, 190, self.get_y() - 2)
        
        # Footer text - copyright and Powered by DimaCode
        self.set_font("helvetica", "", 8)
        self.set_text_color(148, 163, 184) # Slate-400
        self.cell(100, 10, "Copyright \xa9 Admin Suite. All rights reserved.", align="L")
        self.cell(70, 10, "Powered by DimaCode", align="R")

def sanitize_text(text):
    if not text:
        return ""
    text = str(text)
    replacements = {
        "🗺️": "", "🗄️": "", "🔒": "", "📱": "", "💎": "", "💡": "",
        "₦": "NGN ", "·": "-", "–": "-", "—": "-", "’": "'", "‘": "'",
        "”": '"', "“": '"',
    }
    for k, v in replacements.items():
        text = text.replace(k, v)
    return "".join(c for c in text if ord(c) < 256)

def render_pdf_table(pdf, title, headers, rows, col_widths=None):
    # Table Title
    pdf.set_font("helvetica", "B", 11)
    pdf.set_text_color(30, 41, 59) # Slate-800
    pdf.cell(0, 8, title, ln=True)
    pdf.ln(2)

    # Setup headers
    pdf.set_font("helvetica", "B", 9)
    pdf.set_fill_color(241, 245, 249) # slate-100
    pdf.set_draw_color(226, 232, 240)
    pdf.set_text_color(15, 23, 42)
    pdf.set_line_width(0.2)
    
    num_cols = len(headers)
    if not col_widths:
        col_widths = [170 / num_cols] * num_cols
        
    for h, w in zip(headers, col_widths):
        pdf.cell(w, 8, sanitize_text(h), border=1, align="L", fill=True)
    pdf.ln()
    
    # Rows
    pdf.set_font("helvetica", "", 9)
    pdf.set_text_color(51, 65, 85)
    
    if not rows:
        pdf.cell(170, 8, "No records found.", border=1, align="C")
        pdf.ln(12)
        return
        
    for row in rows:
        clean_row = [sanitize_text(c) for c in row]
        while len(clean_row) < num_cols:
            clean_row.append("")
        clean_row = clean_row[:num_cols]
        
        # Calculate max lines in a cell
        max_lines = 1
        for cell_text, w in zip(clean_row, col_widths):
            lines = len(pdf.multi_cell(w, 5, cell_text, split_only=True))
            if lines > max_lines:
                max_lines = lines
                
        h = max_lines * 5 + 2
        
        x_start = pdf.get_x()
        y_start = pdf.get_y()
        
        for cell_text, w in zip(clean_row, col_widths):
            pdf.multi_cell(w, h / max_lines, cell_text, border=1, align="L")
            pdf.set_xy(x_start + w, y_start)
            x_start = pdf.get_x()
            
        pdf.ln(h)
    pdf.ln(4)

def build_pdf_report(user, export_type, time_filter=None, individual_id=None):
    from .models import UserProfile, Employee, Client, Project, Transaction, BudgetCategory, Savings
    
    profile, _ = UserProfile.objects.get_or_create(user=user)
    logo_path = profile.company_logo.path if profile.company_logo else None
    
    pdf = ExportPDF(
        business_name=profile.business_name,
        org_location=profile.org_location,
        org_email=profile.org_email,
        logo_path=logo_path
    )
    pdf.add_page()
    
    if export_type == "general":
        pdf.set_font("helvetica", "B", 16)
        pdf.set_text_color(15, 23, 42)
        pdf.cell(0, 10, "GENERAL WORKSPACE STATUS REPORT", ln=True)
        pdf.ln(6)
        
        # 1. Employees Table
        emps = Employee.objects.filter(user=user)
        emp_headers = ["Name", "Role", "Department", "Salary", "Status"]
        emp_widths = [40, 40, 35, 30, 25]
        emp_rows = [[e.name, e.role, e.department, f"${e.salary}", e.status] for e in emps]
        render_pdf_table(pdf, "Active Staff & Team Members", emp_headers, emp_rows, emp_widths)
        
        # 2. Clients Table
        clients = Client.objects.filter(user=user)
        client_headers = ["Company", "Contact Person", "Email Address", "LTV", "Status"]
        client_widths = [45, 40, 45, 20, 20]
        client_rows = [[c.company, c.contact, c.email, f"${c.lifetime_value}", c.status] for c in clients]
        render_pdf_table(pdf, "Corporate Clients & Delivarebles", client_headers, client_rows, client_widths)
        
        # 3. Budgets Table
        budgets = BudgetCategory.objects.filter(user=user)
        budget_headers = ["Budget Category", "Allocated Amount", "Spent Amount", "Remaining"]
        budget_widths = [50, 40, 40, 40]
        budget_rows = [[b.name, f"${b.allocated}", f"${b.spent}", f"${b.allocated - b.spent}"] for b in budgets]
        render_pdf_table(pdf, "Company Operating Budgets", budget_headers, budget_rows, budget_widths)
        
        # 4. Savings Table
        savings = Savings.objects.filter(user=user)
        saving_headers = ["Savings Goal", "Purpose", "Target Amount", "Amount Saved"]
        saving_widths = [45, 45, 40, 40]
        saving_rows = [[s.name, s.purpose, f"${s.target}", f"${s.saved}"] for s in savings]
        render_pdf_table(pdf, "Savings & Future Reserves", saving_headers, saving_rows, saving_widths)
        
    elif export_type == "client":
        if individual_id:
            try:
                c = Client.objects.get(user=user, id=individual_id)
                pdf.set_font("helvetica", "B", 16)
                pdf.set_text_color(15, 23, 42)
                pdf.cell(0, 10, f"CLIENT DOSSIER: {c.company.upper()}", ln=True)
                pdf.ln(6)
                
                # Render metadata grid
                headers = ["Field", "Information"]
                widths = [50, 120]
                rows = [
                    ["Company Name", c.company],
                    ["Primary Contact", c.contact],
                    ["Corporate Email", c.email],
                    ["Location", c.location],
                    ["Website", c.website or "N/A"],
                    ["Status", c.status.upper()],
                    ["Total Paid", f"${c.paid}"],
                    ["Lifetime Value (LTV)", f"${c.lifetime_value}"],
                    ["Pending Payments", f"${c.pending_payments}"],
                    ["Client Owes", f"${c.client_owes_company}"],
                    ["Company Owes", f"${c.company_owes_client}"],
                    ["Description", c.description or "No description provided."],
                    ["Internal Remark", c.remark or "None."]
                ]
                render_pdf_table(pdf, "Client Overview & Parameters", headers, rows, widths)
                
                # Active projects for this client
                projs = Project.objects.filter(client=c)
                proj_headers = ["Project Name", "Contract Value", "Completion Progress", "Status"]
                proj_widths = [60, 35, 45, 30]
                proj_rows = [[p.name, f"${p.value}", f"{p.progress}% completed", p.status] for p in projs]
                render_pdf_table(pdf, "Associated Deliverables & Contracts", proj_headers, proj_rows, proj_widths)
            except Client.DoesNotExist:
                pdf.cell(0, 10, "Client record not found.", ln=True)
        else:
            pdf.set_font("helvetica", "B", 16)
            pdf.cell(0, 10, "CLIENT PORTFOLIO DATABASE", ln=True)
            pdf.ln(6)
            
            clients = Client.objects.filter(user=user)
            headers = ["Company", "Contact", "Corporate Email", "LTV", "Status"]
            widths = [45, 35, 45, 25, 20]
            rows = [[c.company, c.contact, c.email, f"${c.lifetime_value}", c.status] for c in clients]
            render_pdf_table(pdf, "Active Clients Portfolio", headers, rows, widths)
            
    elif export_type == "employee":
        if individual_id:
            try:
                e = Employee.objects.get(user=user, id=individual_id)
                pdf.set_font("helvetica", "B", 16)
                pdf.set_text_color(15, 23, 42)
                pdf.cell(0, 10, f"EMPLOYEE FILE: {e.name.upper()}", ln=True)
                pdf.ln(6)
                
                # Render metadata grid
                headers = ["Attribute", "Details"]
                widths = [50, 120]
                rows = [
                    ["Full Name", e.name],
                    ["Role Title", e.role],
                    ["Department", e.department],
                    ["Office Branch", e.office],
                    ["Official Email", e.email],
                    ["Phone Number", e.phone or "N/A"],
                    ["Location", e.location or "N/A"],
                    ["Contract Salary", f"${e.salary}"],
                    ["Performance Index", f"{e.performance}% rating"],
                    ["Employment Status", e.status.upper()],
                    ["Biographical Summary", e.bio or "No bio provided."]
                ]
                render_pdf_table(pdf, "General Employee Profile Information", headers, rows, widths)
                
                # Finance information
                f = e.finance
                fin_headers = ["Financial Param", "Amount"]
                fin_widths = [60, 110]
                fin_rows = [
                    ["Current Payroll", f"${f.current_pay}"],
                    ["Employee Owes Company", f"${f.employee_owes_company}"],
                    ["Company Owes Employee", f"${f.company_owes_employee}"],
                    ["Equity Shares (%)", f"{f.shares}% shares"],
                    ["Cumulative Bonuses", f"${f.bonuses}"],
                    ["Deductions (Tax/Benefit)", f"${f.deductions}"]
                ]
                render_pdf_table(pdf, "Compensation & Finance Ledger", fin_headers, fin_rows, fin_widths)
                
                # Pay History
                phs = f.pay_history.all()
                ph_headers = ["Calendar Month", "Pay Amount", "Payout Status"]
                ph_widths = [60, 50, 60]
                ph_rows = [[ph.month, f"${ph.amount}", "PAID" if ph.paid else "UNPAID"] for ph in phs]
                render_pdf_table(pdf, "Historical Payout Logs", ph_headers, ph_rows, ph_widths)
            except Employee.DoesNotExist:
                pdf.cell(0, 10, "Employee record not found.", ln=True)
        else:
            pdf.set_font("helvetica", "B", 16)
            pdf.cell(0, 10, "HUMAN RESOURCES DIRECTORY", ln=True)
            pdf.ln(6)
            
            emps = Employee.objects.filter(user=user)
            headers = ["Staff Name", "Role", "Department", "Salary", "Status"]
            widths = [45, 40, 35, 25, 25]
            rows = [[e.name, e.role, e.department, f"${e.salary}", e.status] for e in emps]
            render_pdf_table(pdf, "Active Workspace Staff", headers, rows, widths)
            
    elif export_type == "financials":
        pdf.set_font("helvetica", "B", 16)
        pdf.cell(0, 10, "FINANCIAL OPERATIONS & LEDGER REPORT", ln=True)
        pdf.ln(6)
        
        # Filter transactions based on date
        txs = Transaction.objects.filter(user=user)
        
        now = timezone.now()
        filter_label = "All Time"
        
        if time_filter == "24h":
            txs = txs.filter(created_at__gte=now - timedelta(days=1)) if hasattr(Transaction, 'created_at') else txs
            filter_label = "Past 24 Hours"
        elif time_filter == "3d":
            txs = txs.filter(created_at__gte=now - timedelta(days=3)) if hasattr(Transaction, 'created_at') else txs
            filter_label = "Past 3 Days"
        elif time_filter == "1w":
            txs = txs.filter(created_at__gte=now - timedelta(days=7)) if hasattr(Transaction, 'created_at') else txs
            filter_label = "Past Week"
        elif time_filter == "1m":
            txs = txs.filter(created_at__gte=now - timedelta(days=30)) if hasattr(Transaction, 'created_at') else txs
            filter_label = "Past Month"
        elif time_filter == "3m":
            txs = txs.filter(created_at__gte=now - timedelta(days=90)) if hasattr(Transaction, 'created_at') else txs
            filter_label = "Past 3 Months"
        elif time_filter == "6m":
            txs = txs.filter(created_at__gte=now - timedelta(days=180)) if hasattr(Transaction, 'created_at') else txs
            filter_label = "Past 6 Months"
        elif time_filter == "12m":
            txs = txs.filter(created_at__gte=now - timedelta(days=365)) if hasattr(Transaction, 'created_at') else txs
            filter_label = "Past 12 Months"
            
        # Summary
        income = txs.filter(type="income").aggregate(total=Sum("amount"))["total"] or 0
        expense = txs.filter(type="expense").aggregate(total=Sum("amount"))["total"] or 0
        net = income - expense
        
        pdf.set_font("helvetica", "B", 10)
        pdf.set_text_color(71, 85, 105)
        pdf.cell(0, 6, f"Filtering Criterion: {filter_label}", ln=True)
        pdf.ln(4)
        
        summary_headers = ["Total Income", "Total Expenses", "Net Cash Flow"]
        summary_widths = [55, 55, 60]
        summary_rows = [[f"${income}", f"${expense}", f"${net}"]]
        render_pdf_table(pdf, "Financial Consolidation", summary_headers, summary_rows, summary_widths)
        
        # Transaction rows
        tx_headers = ["Date", "Description", "Category", "Amount", "Type"]
        tx_widths = [30, 55, 35, 25, 25]
        tx_rows = [[t.date, t.description, t.category, f"${t.amount}", t.type.upper()] for t in txs]
        render_pdf_table(pdf, "Detailed Transaction Ledger", tx_headers, tx_rows, tx_widths)
        
    return pdf.output(dest="S")
