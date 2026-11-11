import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super(NumberedCanvas, self).showPage()
        super(NumberedCanvas, self).save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        
        # Don't draw header/footer on cover page if page 1
        if self._pageNumber > 1:
            # Header
            self.setFont("Helvetica", 8)
            self.setFillColor(colors.HexColor("#64748b"))
            self.drawString(54, 755, "ONEMODO PATRONS — Gate Control & Quarry Logistics System")
            self.drawRightString(612 - 54, 755, "System Architecture & Workflow Manual")
            self.setStrokeColor(colors.HexColor("#cbd5e1"))
            self.setLineWidth(0.5)
            self.line(54, 747, 612 - 54, 747)

            # Footer
            self.line(54, 45, 612 - 54, 45)
            self.drawString(54, 32, "Confidential — For Internal & Operational Use Only")
            self.drawRightString(612 - 54, 32, f"Page {self._pageNumber} of {page_count}")
            
        self.restoreState()

def build_pdf(filename):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()

    # Custom styles
    PRIMARY = colors.HexColor("#1d4ed8")
    SECONDARY = colors.HexColor("#2563eb")
    DARK = colors.HexColor("#0f172a")
    SLATE = colors.HexColor("#334155")
    MUTED = colors.HexColor("#64748b")
    LIGHT_BG = colors.HexColor("#f8fafc")
    BORDER_COLOR = colors.HexColor("#e2e8f0")

    title_style = ParagraphStyle(
        'CoverTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=30,
        textColor=PRIMARY,
        alignment=0, # Left
        spaceAfter=8
    )

    subtitle_style = ParagraphStyle(
        'CoverSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=12,
        leading=16,
        textColor=SLATE,
        spaceAfter=15
    )

    h1_style = ParagraphStyle(
        'Header1',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=15,
        leading=19,
        textColor=PRIMARY,
        spaceBefore=14,
        spaceAfter=8,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'Header2',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=DARK,
        spaceBefore=10,
        spaceAfter=5,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'Body',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=14,
        textColor=SLATE,
        spaceAfter=6
    )

    body_bold = ParagraphStyle(
        'BodyBold',
        parent=body_style,
        fontName='Helvetica-Bold',
        textColor=DARK
    )

    bullet_style = ParagraphStyle(
        'Bullet',
        parent=body_style,
        leftIndent=15,
        bulletIndent=5,
        spaceAfter=4
    )

    callout_style = ParagraphStyle(
        'Callout',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=PRIMARY,
    )

    table_header = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.white,
        alignment=1 # Center
    )

    table_body = ParagraphStyle(
        'TableBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=11,
        textColor=DARK
    )

    table_code = ParagraphStyle(
        'TableCode',
        parent=styles['Normal'],
        fontName='Courier-Bold',
        fontSize=8,
        leading=10,
        textColor=PRIMARY
    )

    story = []

    # ================= COVER / HEADER =================
    story.append(Paragraph("ONEMODO PATRONS", ParagraphStyle(
        'SuperTitle', fontName='Helvetica-Bold', fontSize=10, leading=12, textColor=SECONDARY, spaceAfter=4
    )))
    story.append(Paragraph("Smart Gate Control & Quarry Logistics System", title_style))
    story.append(Paragraph("Complete Operational Workflow, Hardware Integration & API Technical Manual", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=2, color=PRIMARY, spaceBefore=0, spaceAfter=15))

    # Meta Info Box
    meta_data = [
        [
            Paragraph("<b>Application:</b> Onemodo Patrons (Mobile App)", table_body),
            Paragraph("<b>Target Environment:</b> Android & iOS", table_body),
        ],
        [
            Paragraph("<b>Core Framework:</b> React Native & Expo Router", table_body),
            Paragraph("<b>State Manager:</b> Redux Toolkit", table_body),
        ],
        [
            Paragraph("<b>Server Host:</b> https://sat.modomines.com/apiv3/", table_body),
            Paragraph("<b>Date of Documentation:</b> October 2026", table_body),
        ]
    ]
    meta_table = Table(meta_data, colWidths=[250, 250])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f1f5f3")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#cbd5e1")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 15))

    # ================= SECTION 1: SYSTEM OVERVIEW =================
    story.append(Paragraph("1. System Overview & Objectives", h1_style))
    story.append(Paragraph(
        "The <b>Onemodo Patrons</b> mobile application is designed specifically for quarry gate security personnel, "
        "weighbridge operators, and fleet supervisors. Its primary mission is to automate vehicle ingress/egress, "
        "eliminate unauthorized gate access, and maintain 100% accurate time-in-quarry tracking for both third-party visitor "
        "trucks and internal company-owned fleets.",
        body_style
    ))
    story.append(Paragraph(
        "<b>Key Operational Capabilities:</b>", body_style
    ))
    story.append(Paragraph("• <b>Dual-Step Automated Gate Access:</b> Instant photo verification followed by barcode ticket scan.", bullet_style))
    story.append(Paragraph("• <b>Direct LAN Boom Barrier Triggering:</b> Communicates with IoT relay controllers via local network HTTP calls to open and close security barriers in real-time.", bullet_style))
    story.append(Paragraph("• <b>Autocomplete & Searchable Registry:</b> Pre-fetches registered commercial trucks to eliminate manual data entry errors.", bullet_style))
    story.append(Paragraph("• <b>Real-Time Pending Vehicle Monitor:</b> Live dashboard of all active vehicles inside the quarry with live turnaround timers.", bullet_style))
    story.append(Paragraph("• <b>Automated Daily Exit Logging:</b> Daily filtered departures for auditing and material reconciliation.", bullet_style))
    story.append(Paragraph("• <b>Employee Self-Service:</b> Shift punch attendance records and digital PDF payslip viewing.", bullet_style))

    story.append(Spacer(1, 10))

    # ================= SECTION 2: SYSTEM ARCHITECTURE =================
    story.append(Paragraph("2. System Architecture & Authentication", h1_style))
    story.append(Paragraph(
        "The application architecture consists of three interconnected layers:",
        body_style
    ))

    arch_data = [
        [
            Paragraph("<b>Mobile App Client</b><br/>React Native / Expo<br/>• Redux Auth Store<br/>• Camera & Barcode Engine<br/>• Dynamic Segmented UI", table_body),
            Paragraph("<b>Cloud Backend APIs</b><br/>https://sat.modomines.com/apiv3/<br/>• JWT Authentication<br/>• Truck Plate Validation<br/>• Trip Logs & Barcode DB", table_body),
            Paragraph("<b>Gate Relay Hardware</b><br/>Local IP Controller (LAN)<br/>• Relay 1: Gate Close<br/>• Relay 2: Gate Open<br/>• 5000 Port HTTP Switch", table_body),
        ]
    ]
    arch_table = Table(arch_data, colWidths=[165, 175, 165])
    arch_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), LIGHT_BG),
        ('BOX', (0,0), (-1,-1), 1, PRIMARY),
        ('INNERGRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('PADDING', (0,0), (-1,-1), 8),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(arch_table)
    story.append(Spacer(1, 10))

    story.append(Paragraph("<b>JWT Security & Dynamic Company Routing:</b>", h2_style))
    story.append(Paragraph(
        "When an employee logs in via <code>/employeeLogin</code>, the server returns a cryptographically signed JWT. "
        "The app decodes the token payload on the device to extract <code>employee_id</code> and <code>company_id</code> (e.g., Company 23). "
        "Every subsequent vehicle entry, barrier configuration request, and log query is dynamically scoped to that exact company.",
        body_style
    ))

    story.append(Spacer(1, 10))

    # ================= SECTION 3: OPERATIONAL WORKFLOWS =================
    story.append(Paragraph("3. Core Operational Workflows", h1_style))

    story.append(Paragraph("3.1 Vehicle Gate Entry Flow (Register Entry & Open Gate)", h2_style))
    story.append(Paragraph(
        "1. <b>Select Wheeler Count:</b> The operator selects the truck category (e.g., 6 Wheeler, 10 Wheeler, 12 Wheeler, Car, Bike).<br/>"
        "2. <b>Search / Enter Plate:</b> The operator types the registration plate. The auto-complete dropdown searches <code>/activevehiclelist</code> in real time. If matched, the vehicle type is auto-selected.<br/>"
        "3. <b>Photo Capture:</b> The operator captures a live photo of the incoming vehicle using the integrated camera.<br/>"
        "4. <b>Submission:</b> Tapping <b>'Register Entry & Open Gate'</b> sends the vehicle data to <code>/boomentry</code>.<br/>"
        "5. <b>Barrier Open:</b> Upon API success, the app immediately fires an HTTP command to the local barrier controller (Relay 2) to lift the barrier.<br/>"
        "6. <b>Status:</b> The vehicle moves to the <i>'Vehicles Inside Quarry'</i> active list.",
        body_style
    ))

    # Callout Note
    callout_data = [[
        Paragraph("<b>Important Validation Rule:</b> For Visitor vehicles, the <code>is_own</code> parameter is strictly omitted so the backend defaults to visitor without triggering validation errors. For Own Fleet vehicles, <code>is_own: 1</code> is passed.", callout_style)
    ]]
    callout_table = Table(callout_data, colWidths=[504])
    callout_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#e8f5e9")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#a5d6a7")),
        ('PADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(callout_table)
    story.append(Spacer(1, 10))

    story.append(Paragraph("3.2 Quick-Step Exit Flow (Photo -> Barcode Scan -> Gate Open)", h2_style))
    story.append(Paragraph(
        "To maximize weighbridge throughput, the exit process is engineered into an automated 2-step pipeline:<br/>"
        "• <b>Step 1 — Immediate Exit Photo:</b> The operator taps <b>'Scan & Exit'</b> on any vehicle card inside the quarry. The camera immediately launches to photograph the departing truck and cargo.<br/>"
        "• <b>Step 2 — Automated Barcode Scanner:</b> As soon as the exit photo is taken, the screen seamlessly switches to the high-speed barcode scanner.<br/>"
        "• <b>Step 3 — Auto Exit & Barrier Lift:</b> The operator scans the ticket barcode (e.g., <code>3354841</code>). The app instantly calls <code>/boomexit</code> (passing only <code>barcode</code> and <code>exit_image</code>) and sends an automated command to the gate controller to lift the boom barrier.<br/>"
        "• <b>Fallback Override:</b> For non-truck vehicles (cars, motorcycles) or damaged tickets, a <b>'Skip Barcode & Open Gate'</b> option performs a direct exit (<code>barcode: 0</code>).",
        body_style
    ))

    story.append(Spacer(1, 10))

    story.append(Paragraph("3.3 Logs & Traffic Monitoring", h2_style))
    story.append(Paragraph(
        "• <b>Inside Quarry (Pending List):</b> Lists all vehicles currently inside the premises. Displays duration spent on-site (e.g., <code>45m</code>), entry timestamp, wheeler type, and entry photo preview.<br/>"
        "• <b>Today's Exited Records:</b> Automatically queries <code>/boomexitedlist</code> for today's date (<code>from_date = today, to_date = today</code>) without requiring manual date picker selection.",
        body_style
    ))

    story.append(Spacer(1, 15))

    # ================= SECTION 4: API REFERENCE =================
    story.append(Paragraph("4. Complete API Endpoint Reference", h1_style))
    story.append(Paragraph(
        "All APIs use Base URL: <code>https://sat.modomines.com/apiv3/</code>. All endpoints accept <code>User-Agent: DashboardApp</code>.",
        body_style
    ))

    api_headers = [
        Paragraph("<b>#</b>", table_header),
        Paragraph("<b>Method & Endpoint</b>", table_header),
        Paragraph("<b>Category</b>", table_header),
        Paragraph("<b>Key Request Parameters</b>", table_header),
        Paragraph("<b>Expected Output</b>", table_header),
    ]

    api_rows = [
        api_headers,
        [
            Paragraph("1", table_body),
            Paragraph("<b>POST</b><br/><code>employeeLogin</code>", table_code),
            Paragraph("Auth", table_body),
            Paragraph("<code>username, password</code>", table_body),
            Paragraph("JWT Token, employee details, shift hour", table_body),
        ],
        [
            Paragraph("2", table_body),
            Paragraph("<b>POST</b><br/><code>boomsettings</code>", table_code),
            Paragraph("Hardware", table_body),
            Paragraph("<code>company_id, token</code>", table_body),
            Paragraph("Local relay URLs for barrier open & close", table_body),
        ],
        [
            Paragraph("3", table_body),
            Paragraph("<b>GET</b><br/><code>activevehiclelist</code>", table_code),
            Paragraph("Lookup", table_body),
            Paragraph("<code>company_id, search</code>", table_body),
            Paragraph("Array of registered trucks & wheelers", table_body),
        ],
        [
            Paragraph("4", table_body),
            Paragraph("<b>POST</b><br/><code>boomentry</code>", table_code),
            Paragraph("Gate Entry", table_body),
            Paragraph("<code>truck, vehicle_type, entry_datetime, entry_image, company_id, [is_own:1]</code>", table_body),
            Paragraph("Saves entry record, generates ticket barcode", table_body),
        ],
        [
            Paragraph("5", table_body),
            Paragraph("<b>GET</b><br/><code>boompendinglist</code>", table_code),
            Paragraph("Gate Logs", table_body),
            Paragraph("<code>company_id, truck, limit, offset</code>", table_body),
            Paragraph("Active vehicles currently inside quarry", table_body),
        ],
        [
            Paragraph("6", table_body),
            Paragraph("<b>POST</b><br/><code>boomexit</code>", table_code),
            Paragraph("Gate Exit", table_body),
            Paragraph("<b>Scan:</b> <code>barcode, exit_image</code><br/><b>Direct:</b> <code>barcode:0, truck, is_own</code>", table_body),
            Paragraph("Marks vehicle exited, logs duration", table_body),
        ],
        [
            Paragraph("7", table_body),
            Paragraph("<b>GET</b><br/><code>boomexitedlist</code>", table_code),
            Paragraph("Gate Logs", table_body),
            Paragraph("<code>company_id, from_date, to_date</code>", table_body),
            Paragraph("Historical/today's exited vehicles list", table_body),
        ],
        [
            Paragraph("8", table_body),
            Paragraph("<b>GET</b><br/><code>boomownvehiclelist</code>", table_code),
            Paragraph("Fleet", table_body),
            Paragraph("<code>company_id</code>", table_body),
            Paragraph("Registered company-owned vehicles", table_body),
        ],
        [
            Paragraph("9", table_body),
            Paragraph("<b>POST</b><br/><code>boomownvehiclelog</code>", table_code),
            Paragraph("Fleet", table_body),
            Paragraph("<code>truck, is_own:1, vehicle_type, [image]</code>", table_body),
            Paragraph("Toggles entry/exit status for company fleet", table_body),
        ],
        [
            Paragraph("10", table_body),
            Paragraph("<b>POST</b><br/><code>attendancelist</code>", table_code),
            Paragraph("HR", table_body),
            Paragraph("<code>token, employee_id, company_id</code>", table_body),
            Paragraph("Employee shift punch records", table_body),
        ],
        [
            Paragraph("11", table_body),
            Paragraph("<b>POST</b><br/><code>getpayslip</code>", table_code),
            Paragraph("HR", table_body),
            Paragraph("<code>token</code>", table_body),
            Paragraph("List of issued payslip months & UUIDs", table_body),
        ],
        [
            Paragraph("12", table_body),
            Paragraph("<b>POST</b><br/><code>publicpayslip</code>", table_code),
            Paragraph("HR", table_body),
            Paragraph("<code>token, uuid</code>", table_body),
            Paragraph("Binary PDF payslip document", table_body),
        ],
    ]

    api_table = Table(api_rows, colWidths=[20, 115, 60, 175, 134])
    api_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), PRIMARY),
        ('ALIGN', (0,0), (-1,0), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 4),
        ('RIGHTPADDING', (0,0), (-1,-1), 4),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, LIGHT_BG]),
    ]))
    story.append(api_table)
    story.append(Spacer(1, 15))

    # ================= SECTION 5: HARDWARE CONFIG =================
    story.append(Paragraph("5. Boom Barrier Hardware Controller Setup", h1_style))
    story.append(Paragraph(
        "The mobile app controls physical barrier gates by issuing local network POST requests to the controller switch IP:",
        body_style
    ))
    story.append(Paragraph("• <b>Gate OPEN Command (Relay 2):</b> <code>http://192.168.1.64:5000/relay/2/on</code> — Triggered immediately after successful entry registration or barcode exit verification.", bullet_style))
    story.append(Paragraph("• <b>Gate CLOSE Command (Relay 1):</b> <code>http://192.168.1.64:5000/relay/1/on</code> — Triggered automatically after passage or via manual close override.", bullet_style))
    story.append(Paragraph("• <b>Dynamic IP Resolution:</b> The URLs are never hardcoded in the client. On login, the app requests <code>/boomsettings</code> which returns the exact configured IP endpoints for that specific quarry site.", bullet_style))

    story.append(Spacer(1, 20))
    story.append(HRFlowable(width="100%", thickness=1, color=BORDER_COLOR, spaceBefore=5, spaceAfter=15))
    story.append(Paragraph("© 2026 Onemodo Patrons. All rights reserved. Generated automatically by Antigravity IDE.", ParagraphStyle(
        'FooterNote', fontName='Helvetica', fontSize=8, textColor=MUTED, alignment=1
    )))

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Documentation generated successfully at: {filename}")

if __name__ == "__main__":
    out_path = r"c:\patornsApp\onemodopatrons\Patrons_App_Documentation.pdf"
    build_pdf(out_path)
