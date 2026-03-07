"""Leave & OD request routes — submit, review, and PDF letter download."""

import io
import os
import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Form, UploadFile, File
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload

from database.db import get_db
from models.leave_request import LeaveRequest
from models.student_profile import StudentProfile
from models.user import User
from models.department import Department
from auth.dependencies import get_current_user

router = APIRouter(prefix="/leave-requests", tags=["Leave & OD"])

PROOF_DIR = os.path.join(os.path.dirname(__file__), "..", "uploads", "leave_proofs")
os.makedirs(PROOF_DIR, exist_ok=True)


# ── Schemas ───────────────────────────────────────────────────────────────────
class ReviewBody(BaseModel):
    action: str              # "approved" or "rejected"
    comment: Optional[str] = None


# ── Student: Submit request (multipart form + file) ──────────────────────────
@router.post("", status_code=201)
async def submit_request(
    request_type: str = Form(...),
    start_date: str = Form(...),
    end_date: str = Form(...),
    reason: str = Form(...),
    event_name: Optional[str] = Form(None),
    proof: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != "student":
        raise HTTPException(403, "Only students can submit leave/OD requests")

    if request_type not in ("leave", "od"):
        raise HTTPException(400, "Type must be 'leave' or 'od'")

    profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(404, "Student profile not found")

    # Save proof file if provided
    proof_url = None
    if proof and proof.filename:
        ext = os.path.splitext(proof.filename)[1] or ".pdf"
        safe_name = f"{uuid.uuid4().hex}{ext}"
        path = os.path.join(PROOF_DIR, safe_name)
        content = await proof.read()
        with open(path, "wb") as f:
            f.write(content)
        proof_url = f"/uploads/leave_proofs/{safe_name}"

    req = LeaveRequest(
        student_id=profile.id,
        request_type=request_type,
        start_date=datetime.strptime(start_date, "%Y-%m-%d").date(),
        end_date=datetime.strptime(end_date, "%Y-%m-%d").date(),
        reason=reason,
        event_name=event_name,
        proof_url=proof_url,
        status="pending",
    )
    db.add(req)
    db.commit()
    db.refresh(req)
    return {"message": f"{'OD' if request_type == 'od' else 'Leave'} request submitted", "id": req.id}


# ── Student: List own requests ───────────────────────────────────────────────
@router.get("/my")
def get_my_requests(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(404, "Student profile not found")

    reqs = (
        db.query(LeaveRequest)
        .filter(LeaveRequest.student_id == profile.id)
        .order_by(LeaveRequest.created_at.desc())
        .all()
    )
    return {"requests": [_req_dict(r, db) for r in reqs]}


# ── Faculty/HOD: List all requests ───────────────────────────────────────────
@router.get("")
def list_requests(
    status_filter: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in ("faculty", "hod", "admin"):
        raise HTTPException(403, "Access denied")

    q = (
        db.query(LeaveRequest)
        .join(StudentProfile)
        .order_by(LeaveRequest.created_at.desc())
    )

    if status_filter:
        q = q.filter(LeaveRequest.status == status_filter)

    # Faculty/HOD see only their department
    if current_user.role in ("faculty", "hod"):
        q = q.filter(StudentProfile.department_id == current_user.department_id)

    reqs = q.all()
    return {
        "requests": [_req_dict(r, db, include_student=True) for r in reqs],
        "pending_count": sum(1 for r in reqs if r.status == "pending"),
    }


# ── Faculty/HOD: Review request ─────────────────────────────────────────────
@router.put("/{request_id}/review")
def review_request(
    request_id: int,
    body: ReviewBody,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in ("faculty", "hod", "admin"):
        raise HTTPException(403, "Only faculty/HOD/admin can review requests")
    if body.action not in ("approved", "rejected"):
        raise HTTPException(400, "Action must be 'approved' or 'rejected'")

    req = db.query(LeaveRequest).filter(LeaveRequest.id == request_id).first()
    if not req:
        raise HTTPException(404, "Request not found")

    req.status = body.action
    req.review_comment = body.comment
    req.reviewed_by = current_user.id
    req.reviewed_at = datetime.utcnow()
    db.commit()

    return {"message": f"Request {body.action}", "id": req.id}


# ── Download OD Letter as PDF ────────────────────────────────────────────────
@router.get("/{request_id}/letter")
def download_od_letter(
    request_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    req = db.query(LeaveRequest).filter(LeaveRequest.id == request_id).first()
    if not req:
        raise HTTPException(404, "Request not found")
    if req.status != "approved":
        raise HTTPException(400, "Letter is only available for approved requests")

    # Access control: student can download own, faculty/hod/admin can download any
    if current_user.role == "student":
        profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
        if not profile or req.student_id != profile.id:
            raise HTTPException(403, "You can only download your own letters")

    # Gather data
    student = db.query(StudentProfile).filter(StudentProfile.id == req.student_id).first()
    student_user = db.query(User).filter(User.id == student.user_id).first()
    dept = db.query(Department).filter(Department.id == student.department_id).first()
    reviewer = db.query(User).filter(User.id == req.reviewed_by).first() if req.reviewed_by else None

    # Generate PDF
    pdf_buffer = _generate_letter_pdf(
        student_name=student_user.name if student_user else "Unknown",
        roll_number=student.roll_number,
        department=dept.name if dept else "N/A",
        dept_code=dept.code if dept else "N/A",
        year=student.year,
        section=student.section,
        request_type=req.request_type,
        start_date=req.start_date,
        end_date=req.end_date,
        reason=req.reason,
        event_name=req.event_name,
        reviewer_name=reviewer.name if reviewer else "N/A",
        approved_date=req.reviewed_at,
    )

    filename = f"{'OD' if req.request_type == 'od' else 'Leave'}_Letter_{student.roll_number}_{req.start_date}.pdf"
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ── PDF Generation ───────────────────────────────────────────────────────────
def _generate_letter_pdf(
    student_name, roll_number, department, dept_code, year, section,
    request_type, start_date, end_date, reason, event_name,
    reviewer_name, approved_date,
):
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm, cm
    from reportlab.lib import colors
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=2.5*cm, rightMargin=2.5*cm, topMargin=2*cm, bottomMargin=2*cm)

    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle("Title2", parent=styles["Title"], fontSize=18, textColor=colors.HexColor("#1e3a5f"), spaceAfter=4)
    subtitle_style = ParagraphStyle("Sub", parent=styles["Normal"], fontSize=10, textColor=colors.grey, alignment=TA_CENTER)
    heading_style = ParagraphStyle("Heading", parent=styles["Heading2"], fontSize=14, textColor=colors.HexColor("#1e3a5f"), spaceBefore=20, spaceAfter=10)
    body_style = ParagraphStyle("Body", parent=styles["Normal"], fontSize=11, leading=18, spaceAfter=6)
    bold_style = ParagraphStyle("Bold", parent=body_style, fontName="Helvetica-Bold")
    small_style = ParagraphStyle("Small", parent=styles["Normal"], fontSize=9, textColor=colors.grey)
    right_style = ParagraphStyle("Right", parent=body_style, alignment=TA_RIGHT)

    letter_type = "ON DUTY LETTER" if request_type == "od" else "LEAVE APPROVAL LETTER"
    is_od = request_type == "od"

    elements = []

    # Header
    elements.append(Paragraph("ScholarSafe — Early Warning System", title_style))
    elements.append(Paragraph("Student Monitoring & Risk Assessment Platform", subtitle_style))
    elements.append(Spacer(1, 4 * mm))
    elements.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor("#1e3a5f")))
    elements.append(Spacer(1, 8 * mm))

    # Letter title
    letter_title = ParagraphStyle("LT", parent=styles["Title"], fontSize=16, alignment=TA_CENTER, textColor=colors.HexColor("#2d3d50"))
    elements.append(Paragraph(letter_type, letter_title))
    elements.append(Spacer(1, 6 * mm))

    # Date
    date_str = approved_date.strftime("%B %d, %Y") if approved_date else "N/A"
    elements.append(Paragraph(f"Date: {date_str}", right_style))
    elements.append(Spacer(1, 4 * mm))

    # Student details table
    details = [
        ["Student Name", student_name],
        ["Roll Number", roll_number],
        ["Department", f"{department} ({dept_code})"],
        ["Year / Section", f"Year {year or 'N/A'} — Section {section or 'N/A'}"],
    ]
    if is_od and event_name:
        details.append(["Event / Activity", event_name])
    details.append(["Period", f"{start_date} to {end_date}"])

    tbl = Table(details, colWidths=[4.5 * cm, 11 * cm])
    tbl.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTNAME", (1, 0), (1, -1), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -1), 11),
        ("TEXTCOLOR", (0, 0), (0, -1), colors.HexColor("#1e3a5f")),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("LINEBELOW", (0, 0), (-1, -2), 0.5, colors.HexColor("#e0e0e0")),
    ]))
    elements.append(tbl)
    elements.append(Spacer(1, 6 * mm))

    # Reason
    elements.append(Paragraph("Reason:", bold_style))
    elements.append(Paragraph(reason, body_style))
    elements.append(Spacer(1, 8 * mm))

    # Approval section
    elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#cccccc")))
    elements.append(Spacer(1, 6 * mm))

    if is_od:
        elements.append(Paragraph(
            f"This is to certify that <b>{student_name}</b> (Roll No: <b>{roll_number}</b>) "
            f"has been granted <b>On Duty</b> status from <b>{start_date}</b> to <b>{end_date}</b>"
            f"{f' for attending <b>{event_name}</b>' if event_name else ''}.",
            body_style,
        ))
    else:
        elements.append(Paragraph(
            f"This is to certify that the leave application of <b>{student_name}</b> "
            f"(Roll No: <b>{roll_number}</b>) from <b>{start_date}</b> to <b>{end_date}</b> "
            f"has been <b>approved</b>.",
            body_style,
        ))

    elements.append(Spacer(1, 14 * mm))

    # Signature
    sig_data = [
        ["", ""],
        ["", f"Approved by: {reviewer_name}"],
        ["", f"Date: {date_str}"],
        ["", ""],
    ]
    sig_tbl = Table(sig_data, colWidths=[9 * cm, 7 * cm])
    sig_tbl.setStyle(TableStyle([
        ("FONTNAME", (1, 1), (1, 1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 2),
        ("LINEABOVE", (1, 1), (1, 1), 1, colors.black),
    ]))
    elements.append(sig_tbl)

    elements.append(Spacer(1, 12 * mm))
    elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#1e3a5f")))
    elements.append(Paragraph("This is a system-generated document from ScholarSafe.", small_style))

    doc.build(elements)
    buf.seek(0)
    return buf


# ── Helper ───────────────────────────────────────────────────────────────────
def _req_dict(r: LeaveRequest, db: Session, include_student: bool = False) -> dict:
    d = {
        "id": r.id,
        "request_type": r.request_type,
        "start_date": str(r.start_date),
        "end_date": str(r.end_date),
        "reason": r.reason,
        "event_name": r.event_name,
        "proof_url": r.proof_url,
        "status": r.status,
        "review_comment": r.review_comment,
        "reviewed_by": r.reviewed_by,
        "reviewed_at": str(r.reviewed_at) if r.reviewed_at else None,
        "created_at": str(r.created_at) if r.created_at else None,
    }
    if include_student and r.student:
        user = db.query(User).filter(User.id == r.student.user_id).first()
        d["student_name"] = user.name if user else None
        d["roll_number"] = r.student.roll_number
        d["student_id"] = r.student_id
        d["year"] = r.student.year
        d["section"] = r.student.section
    if r.reviewed_by:
        reviewer = db.query(User).filter(User.id == r.reviewed_by).first()
        d["reviewer_name"] = reviewer.name if reviewer else None
    return d
