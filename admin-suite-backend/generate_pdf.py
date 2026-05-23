import os
import re
from fpdf import FPDF

class ModernPDF(FPDF):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.set_margins(20, 20, 20)
        self.set_auto_page_break(auto=True, margin=20)
        
    def header(self):
        if self.page_no() > 1:
            self.set_font("helvetica", "I", 8)
            self.set_text_color(120, 120, 120)
            self.cell(0, 10, "AdminSuite: Full-Stack Architectural Analysis", align="R")
            self.ln(10)
            # Draw header line
            self.set_draw_color(220, 220, 220)
            self.set_line_width(0.2)
            self.line(20, 18, 190, 18)

    def footer(self):
        self.set_y(-15)
        self.set_font("helvetica", "I", 8)
        self.set_text_color(120, 120, 120)
        self.cell(0, 10, f"Page {self.page_no()}", align="C")

def sanitize_text(text):
    # Replace common emoji and special characters to fit standard Latin-1 Helvetica fonts
    replacements = {
        "🗺️": "",
        "🗄️": "",
        "🔒": "",
        "📱": "",
        "💎": "",
        "💡": "",
        "₦": "NGN ",
        "₦": "NGN",
        "·": "-",
        "–": "-",
        "—": "-",
        "’": "'",
        "‘": "'",
        "”": '"',
        "“": '"',
    }
    for k, v in replacements.items():
        text = text.replace(k, v)
        
    # Strip any other character outside Latin-1
    text = "".join(c for c in text if ord(c) < 256)
    return text

def parse_and_write_markdown(pdf, text):
    lines = text.split("\n")
    in_code_block = False
    in_mermaid = False
    in_table = False
    table_headers = []
    table_rows = []
    
    # Process lines
    i = 0
    while i < len(lines):
        line = lines[i]
        
        # Check for code blocks
        if line.strip().startswith("```"):
            if in_code_block:
                in_code_block = False
                in_mermaid = False
                pdf.ln(5)
            else:
                in_code_block = True
                if "mermaid" in line:
                    in_mermaid = True
                pdf.set_font("courier", "", 9)
                pdf.set_fill_color(245, 245, 245)
                pdf.set_text_color(50, 50, 50)
            i += 1
            continue
            
        if in_code_block:
            if in_mermaid:
                # We skip detailed rendering of raw mermaid code in the PDF
                if "graph" in line or "subgraph" in line or "-->" in line:
                    i += 1
                    continue
            # Render normal code block line
            clean_line = sanitize_text(line)
            pdf.cell(0, 5, clean_line, fill=True)
            pdf.ln(5)
            i += 1
            continue

        # Check for Tables
        if line.strip().startswith("|"):
            if not in_table:
                in_table = True
                table_headers = [sanitize_text(c.strip()) for c in line.split("|")[1:-1]]
                table_rows = []
                # skip divider line next
                i += 2
                continue
            else:
                row_cols = [sanitize_text(c.strip()) for c in line.split("|")[1:-1]]
                if row_cols:
                    table_rows.append(row_cols)
                i += 1
                continue
        elif in_table:
            # Table ended, render it
            render_table(pdf, table_headers, table_rows)
            in_table = False
            pdf.ln(5)
            # do not continue, process the current line as normal text

        # Headers
        if line.startswith("# "):
            title_text = sanitize_text(line[2:])
            pdf.set_font("helvetica", "B", 20)
            pdf.set_text_color(15, 23, 42) # slate-900
            pdf.ln(10)
            pdf.cell(0, 12, title_text)
            pdf.ln(12)
            pdf.set_draw_color(30, 58, 138) # Navy line
            pdf.set_line_width(1)
            pdf.line(20, pdf.get_y(), 190, pdf.get_y())
            pdf.ln(5)
            i += 1
            continue
        elif line.startswith("## "):
            sec_text = sanitize_text(line[3:])
            pdf.set_font("helvetica", "B", 15)
            pdf.set_text_color(30, 58, 138) # Dark blue/Navy
            pdf.ln(6)
            pdf.cell(0, 10, sec_text)
            pdf.ln(10)
            pdf.ln(2)
            i += 1
            continue
        elif line.startswith("### "):
            sub_text = sanitize_text(line[4:])
            pdf.set_font("helvetica", "B", 12)
            pdf.set_text_color(15, 23, 42)
            pdf.ln(4)
            pdf.cell(0, 8, sub_text)
            pdf.ln(8)
            pdf.ln(1)
            i += 1
            continue
            
        # Horizontal rules
        if line.strip() == "---":
            pdf.ln(5)
            pdf.set_draw_color(220, 220, 220)
            pdf.set_line_width(0.5)
            pdf.line(20, pdf.get_y(), 190, pdf.get_y())
            pdf.ln(5)
            i += 1
            continue
            
        # Alert / Note blocks
        if line.strip().startswith("> [!"):
            alert_type = re.search(r'\[!(.*?)\]', line).group(1)
            # Read all succeeding block lines
            block_lines = []
            i += 1
            while i < len(lines) and lines[i].strip().startswith(">"):
                block_lines.append(lines[i].strip()[1:].strip())
                i += 1
            
            # Setup alert colors
            if alert_type == "NOTE":
                bg_color = (239, 246, 255) # Light blue
                border_color = (59, 130, 246) # Blue
                text_color = (30, 58, 138)
            elif alert_type == "IMPORTANT" or alert_type == "WARNING":
                bg_color = (254, 243, 199) # Light amber
                border_color = (245, 158, 11) # Amber
                text_color = (120, 53, 4)
            else:
                bg_color = (243, 244, 246) # Light grey
                border_color = (107, 114, 128) # Grey
                text_color = (31, 41, 55)
                
            clean_text = sanitize_text(f"{alert_type}: " + " ".join(block_lines))
            render_callout(pdf, clean_text, bg_color, border_color, text_color)
            pdf.ln(3)
            continue

        # Normal text or list items
        stripped = line.strip()
        if stripped:
            pdf.set_text_color(51, 65, 85) # Slate-700
            
            # Bullet list
            if stripped.startswith("* ") or stripped.startswith("- "):
                bullet_text = sanitize_text(stripped[2:])
                pdf.set_font("helvetica", "", 10)
                pdf.set_x(25)
                pdf.cell(5, 6, chr(149))
                write_formatted_text(pdf, bullet_text)
                pdf.ln(6)
            else:
                clean_stripped = sanitize_text(stripped)
                pdf.set_font("helvetica", "", 10)
                write_formatted_text(pdf, clean_stripped)
                pdf.ln(6)
        else:
            pdf.ln(2)
            
        i += 1

def write_formatted_text(pdf, text):
    parts = re.split(r'(\*\*.*?\*\*)', text)
    for part in parts:
        if part.startswith("**") and part.endswith("**"):
            pdf.set_font("helvetica", "B", 10)
            pdf.write(5, part[2:-2])
        else:
            pdf.set_font("helvetica", "", 10)
            pdf.write(5, part)

def render_callout(pdf, text, bg_color, border_color, text_color):
    pdf.set_fill_color(*bg_color)
    pdf.set_draw_color(*border_color)
    pdf.set_text_color(*text_color)
    pdf.set_line_width(0.8)
    
    pdf.set_font("helvetica", "I", 10)
    w = 170
    pdf.multi_cell(w, 6, text, border="L", fill=True)

def render_table(pdf, headers, rows):
    pdf.set_font("helvetica", "B", 9)
    pdf.set_fill_color(241, 245, 249) # slate-100
    pdf.set_draw_color(226, 232, 240)
    pdf.set_text_color(15, 23, 42)
    pdf.set_line_width(0.2)
    
    col_widths = []
    num_cols = len(headers)
    
    if num_cols == 4:
        col_widths = [45, 45, 40, 40]
    elif num_cols == 3:
        col_widths = [50, 50, 70]
    else:
        col_widths = [170 / num_cols] * num_cols
        
    # Render headers
    for h, width in zip(headers, col_widths):
        pdf.cell(width, 8, h, border=1, align="L", fill=True)
    pdf.ln()
    
    # Render rows
    pdf.set_font("helvetica", "", 9)
    pdf.set_text_color(51, 65, 85)
    
    for row in rows:
        while len(row) < num_cols:
            row.append("")
        row = row[:num_cols]
        
        max_lines = 1
        for cell_text, width in zip(row, col_widths):
            lines = len(pdf.multi_cell(width, 6, cell_text, split_only=True))
            if lines > max_lines:
                max_lines = lines
                
        h = max_lines * 5 + 2
        
        x_start = pdf.get_x()
        y_start = pdf.get_y()
        
        for cell_text, width in zip(row, col_widths):
            pdf.multi_cell(width, h / max_lines, cell_text, border=1, align="L")
            pdf.set_xy(x_start + width, y_start)
            x_start = pdf.get_x()
            
        pdf.ln(h)

def convert_md_to_pdf(md_path, pdf_path):
    with open(md_path, "r", encoding="utf-8") as f:
        md_content = f.read()
        
    md_content_clean = re.sub(r'```mermaid.*?```', '```\n[System Architecture Diagram: Rendered in the digital version of this document]\n```', md_content, flags=re.DOTALL)

    pdf = ModernPDF()
    pdf.add_page()
    
    # Cover page style banner
    pdf.set_fill_color(30, 58, 138) # Deep Navy banner
    pdf.rect(0, 0, 210, 45, "F")
    pdf.set_y(15)
    pdf.set_font("helvetica", "B", 18)
    pdf.set_text_color(255, 255, 255)
    pdf.cell(0, 10, "ADMINSUITE DEVELOPMENT ECOSYSTEM", align="C")
    pdf.ln(10)
    pdf.set_font("helvetica", "", 10)
    pdf.cell(0, 6, "Architectural Analysis & Design Review Report", align="C")
    pdf.ln(6)
    
    pdf.set_y(55)
    
    parse_and_write_markdown(pdf, md_content_clean)
    
    pdf.output(pdf_path)
    print(f"Successfully generated PDF at {pdf_path}")

if __name__ == "__main__":
    src = r"C:\Users\Dimacode.x\.gemini\antigravity-ide\brain\ab23e808-491e-45ea-8818-781cecacb23a\analysis_results.md"
    dest = r"C:\Users\Dimacode.x\.gemini\antigravity-ide\brain\ab23e808-491e-45ea-8818-781cecacb23a\analysis_results.pdf"
    dest_dev = r"c:\Users\Dimacode.x\Desktop\AdminSuite\analysis_results.pdf"
    
    convert_md_to_pdf(src, dest)
    convert_md_to_pdf(src, dest_dev)
