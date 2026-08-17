from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime, timedelta, timezone
from urllib.parse import urlparse
import re
import csv
import io
from app.db.mysql_session import get_db
from app.models.mysql import (
    User, GuideProfile, TouristPlace, Booking, Rating,
    GuidePlaceAssignment, PlaceAddRequest,
    UserRole, ApprovalStatus, BookingStatus, MeetStatus,
)
from app.core.dependencies import get_current_admin
from app.core.security import hash_password, generate_default_password
from app.utils import email_service
from app.utils.notification_helpers import create_notification
from app.models.extra import NotificationType

router = APIRouter(prefix="/admin", tags=["Admin"])


# ─── Dashboard ────────────────────────────────────────────────────────────────

@router.get("/dashboard")
def get_dashboard(
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    now = datetime.now(timezone.utc)
    seven_days_ago = now - timedelta(days=7)

    total_users  = db.query(User).filter(User.role == UserRole.user).count()
    total_guides = db.query(User).filter(User.role == UserRole.guide, User.is_active == True).count()
    total_places = db.query(TouristPlace).filter(TouristPlace.is_active == True).count()

    pending_guides  = db.query(GuideProfile).filter(GuideProfile.approval_status == ApprovalStatus.pending).count()
    pending_places  = db.query(PlaceAddRequest).filter(PlaceAddRequest.status == ApprovalStatus.pending).count()

    # Last 7 days bookings aggregated by day
    bookings_agg = (
        db.query(func.date(Booking.created_at).label('day'), func.count().label('cnt'))
        .filter(Booking.created_at >= seven_days_ago)
        .group_by(func.date(Booking.created_at))
        .all()
    )
    bookings_by_day = {day.strftime("%Y-%m-%d") if isinstance(day, (datetime,)) else str(day): cnt for day, cnt in bookings_agg}

    # Status breakdown aggregated in one query
    status_counts = (
        db.query(Booking.status, func.count())
        .filter(Booking.created_at >= seven_days_ago)
        .group_by(Booking.status)
        .all()
    )
    status_breakdown = {status.value: count for status, count in status_counts}
    # Ensure all possible statuses are represented
    for s in BookingStatus:
        if s.value not in status_breakdown:
            status_breakdown[s.value] = 0

    return {
        "total_users": total_users,
        "total_guides": total_guides,
        "total_places": total_places,
        "pending_approvals": pending_guides + pending_places,
        "pending_guide_registrations": pending_guides,
        "pending_place_requests": pending_places,
        "bookings_last_7_days": bookings_by_day,
        "booking_status_breakdown": status_breakdown,
    }

@router.get("/export/report/{period}")
def export_report(
    period: str,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    if period not in ("weekly", "monthly"):
        raise HTTPException(400, "Invalid export period")

    days = 7 if period == "weekly" else 30
    cutoff_date = datetime.now(timezone.utc) - timedelta(days=days)

    bookings = db.query(Booking).filter(Booking.created_at >= cutoff_date).order_by(Booking.created_at.desc()).all()
    new_users = db.query(User).filter(User.created_at >= cutoff_date, User.role == UserRole.user).count()
    new_guides = db.query(User).filter(User.created_at >= cutoff_date, User.role == UserRole.guide).count()

    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write Summary Metrics
    writer.writerow(["YATRIKA PLATFORM REPORT", f"Past {days} Days"])
    writer.writerow([])
    writer.writerow(["SUMMARY METRICS"])
    writer.writerow(["Total Bookings Created", len(bookings)])
    writer.writerow(["New Tourist Registrations", new_users])
    writer.writerow(["New Guide Registrations", new_guides])
    writer.writerow([])
    
    # Write Detailed Bookings Header
    writer.writerow(["BOOKING DETAILS"])
    writer.writerow(["Booking ID", "Date", "Status", "User ID", "Guide ID", "Place ID", "Verification Code"])
    
    for b in bookings:
        writer.writerow([
            b.id,
            b.created_at.strftime("%Y-%m-%d %H:%M"),
            b.status.value,
            b.user_id,
            b.guide_id,
            b.place_id,
            b.start_code or "N/A"
        ])
        
    output.seek(0)
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=yatrika_report_{period}.csv"}
    )


# ─── User CRUD ────────────────────────────────────────────────────────────────

@router.get("/users")
def list_users(
    page: int = Query(1, ge=1),
    per_page: int = Query(20),
    role: Optional[str] = None,
    search: Optional[str] = None,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    import math
    q = db.query(User)
    if role: q = q.filter(User.role == role)
    if search:
        term = f"%{search}%"
        q = q.filter(User.full_name.ilike(term) | User.email.ilike(term))
    total = q.count()
    users = q.offset((page - 1) * per_page).limit(per_page).all()
    return {
        "total": total,
        "total_pages": math.ceil(total / per_page),
        "items": [
            {
                "id": u.id, "full_name": u.full_name, "email": u.email,
                "role": u.role.value, "is_active": u.is_active,
                "is_verified": u.is_verified, "created_at": str(u.created_at),
            }
            for u in users
        ],
    }


class UserCreateAdmin(BaseModel):
    full_name: str
    email: EmailStr
    role: str = "user"
    phone: Optional[str] = None


@router.post("/users", status_code=201)
def create_user(
    payload: UserCreateAdmin,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(400, "Email already exists")

    temp_password = generate_default_password()
    user = User(
        full_name=payload.full_name,
        email=payload.email,
        password_hash=hash_password(temp_password),
        phone=payload.phone,
        role=payload.role,
        is_verified=True,
        is_active=True,
    )
    db.add(user)

    if payload.role == "guide":
        db.flush()
        gp = GuideProfile(user_id=user.id, approval_status=ApprovalStatus.approved)
        db.add(gp)

    db.commit()
    background_tasks.add_task(
        email_service.send_default_password,
        payload.email, payload.full_name, temp_password, payload.role
    )
    return {"message": f"{payload.role.title()} account created. Default password sent via email."}


class UserUpdateAdmin(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    is_active: Optional[bool] = None
    role: Optional[str] = None


@router.put("/users/{user_id}")
def update_user(
    user_id: int,
    payload: UserUpdateAdmin,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    if user_id == current_user.id:
        raise HTTPException(400, "Cannot edit your own account from the admin panel")
    user = db.query(User).filter(User.id == user_id).first()
    if not user: raise HTTPException(404, "User not found")
    
    if payload.full_name: user.full_name = payload.full_name
    if payload.phone: user.phone = payload.phone
    if payload.is_active is not None: user.is_active = payload.is_active
    
    # Handle Role Transitions
    if payload.role and user.role != payload.role:
        user.role = payload.role
        if payload.role == "guide":
            # Check if Guide profile exists, if not create one
            gp = db.query(GuideProfile).filter(GuideProfile.user_id == user.id).first()
            if not gp:
                gp = GuideProfile(user_id=user.id, approval_status=ApprovalStatus.approved)
                db.add(gp)
        
    db.commit()
    return {"message": "User updated"}


@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user: raise HTTPException(404, "User not found")
    if user.id == current_user.id: raise HTTPException(400, "Cannot delete yourself")
    user.is_active = False
    db.commit()
    return {"message": "User deactivated"}


# ─── Guide Approvals ──────────────────────────────────────────────────────────

@router.get("/guides/pending")
def get_pending_guides(
    status: Optional[str] = Query(None, enum=["pending", "approved", "rejected"]),
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    q = (
        db.query(GuideProfile, User)
        .join(User, GuideProfile.user_id == User.id)
        .filter(User.is_verified == True)
    )
    if status:
        q = q.filter(GuideProfile.approval_status == status)
    else:
        q = q.filter(GuideProfile.approval_status == ApprovalStatus.pending)
    results = q.all()
    return [
        {
            "guide_profile_id": gp.id,
            "user_id": u.id,
            "full_name": u.full_name,
            "email": u.email,
            "bio": gp.bio,
            "languages": gp.languages,
            "experience_years": gp.experience_years,
            "approval_status": gp.approval_status.value,
            "admin_note": gp.admin_note,
            "created_at": str(u.created_at),
            "meet_title": gp.meet_title,
            "meet_link": gp.meet_link,
            "meet_scheduled_at": gp.meet_scheduled_at.isoformat() if gp.meet_scheduled_at else None,
            "meet_status": gp.meet_status.value if gp.meet_status else MeetStatus.not_scheduled.value,
        }
        for gp, u in results
    ]


class ScheduleMeetPayload(BaseModel):
    meet_title: str
    meet_scheduled_at: datetime
    meet_link: str


def _format_meet_datetime(dt: datetime) -> str:
    from zoneinfo import ZoneInfo
    ist = ZoneInfo("Asia/Kolkata")
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(ist).strftime("%d %b %Y, %I:%M %p IST")


def _is_valid_google_meet_link(url: str) -> bool:
    """Only accept real Google Meet / Calendar links (not random generated codes)."""
    try:
        parsed = urlparse(url.strip())
    except Exception:
        return False
    host = (parsed.netloc or "").lower().removeprefix("www.")
    if host == "meet.google.com":
        code = (parsed.path or "").strip("/")
        return bool(code) and re.match(r"^[a-z]{2,10}(-[a-z]{2,10}){1,3}$", code)
    if host in ("calendar.google.com", "calendar.app.google"):
        return "meet" in (parsed.path + parsed.query).lower()
    if host == "g.co" and parsed.path.startswith("/meet"):
        return True
    return False


@router.post("/guides/{guide_id}/schedule-meet")
def schedule_guide_meet(
    guide_id: int,
    payload: ScheduleMeetPayload,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    gp = db.query(GuideProfile).filter(GuideProfile.id == guide_id).first()
    if not gp:
        raise HTTPException(404, "Guide not found")
    user = db.query(User).filter(User.id == gp.user_id).first()
    if not user:
        raise HTTPException(404, "Guide user not found")

    meet_title = payload.meet_title.strip()
    meet_link = payload.meet_link.strip()
    if not meet_title:
        raise HTTPException(400, "Meeting title is required")
    if not meet_link.startswith(("http://", "https://")):
        raise HTTPException(400, "Meeting link must be a valid URL")
    if not _is_valid_google_meet_link(meet_link):
        raise HTTPException(
            400,
            "Use a real Google Meet link. Open meet.google.com/new, create a meeting, then copy the link here.",
        )

    scheduled_at = payload.meet_scheduled_at
    if scheduled_at.tzinfo is not None:
        scheduled_at = scheduled_at.astimezone(timezone.utc).replace(tzinfo=None)

    gp.meet_title = meet_title
    gp.meet_link = meet_link
    gp.meet_scheduled_at = scheduled_at
    gp.meet_status = MeetStatus.scheduled

    scheduled_display = _format_meet_datetime(scheduled_at)

    create_notification(
        db,
        user.id,
        NotificationType.system,
        "Verification Call Scheduled",
        f'"{meet_title}" on {scheduled_display}. Check your email for the Meet link.',
        "/guide/dashboard",
    )
    db.commit()

    email_result = email_service.send_verification_meet_scheduled(
        user.email,
        user.full_name,
        meet_title,
        scheduled_display,
        meet_link,
    )

    return {
        "meet_title": meet_title,
        "meet_link": meet_link,
        "meet_scheduled_at": scheduled_at.isoformat(),
        "email_sent": email_result.get("sent", False),
        "email_error": email_result.get("error"),
        "guide_email": user.email,
    }


class GuideApprovalAction(BaseModel):
    action: str   # "approve" or "reject"
    note: Optional[str] = None


@router.put("/guides/{guide_profile_id}/approve")
def review_guide(
    guide_profile_id: int,
    payload: GuideApprovalAction,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    if payload.action not in ("approve", "reject"):
        raise HTTPException(400, "action must be 'approve' or 'reject'")

    gp = db.query(GuideProfile).filter(GuideProfile.id == guide_profile_id).first()
    if not gp: raise HTTPException(404, "Guide not found")
    user = db.query(User).filter(User.id == gp.user_id).first()

    if gp.meet_status != MeetStatus.scheduled:
        raise HTTPException(
            400,
            "Schedule a verification call before approving or rejecting.",
        )

    if payload.action == "approve":
        gp.approval_status = ApprovalStatus.approved
        gp.approved_by = current_user.id
        gp.approved_at = datetime.now(timezone.utc)
        user.is_active = True
        create_notification(
            db,
            user.id,
            NotificationType.guide_approved,
            "Guide account approved",
            "Your guide registration was approved. You can now create slots and accept bookings.",
            "/guide/dashboard",
        )
        db.commit()
        background_tasks.add_task(email_service.send_guide_approved, user.email, user.full_name)
    else:
        gp.approval_status = ApprovalStatus.rejected
        gp.admin_note = payload.note
        create_notification(
            db,
            user.id,
            NotificationType.guide_rejected,
            "Guide registration declined",
            payload.note or "Your guide registration was not approved. Contact support for details.",
            "/login",
        )
        db.commit()
        background_tasks.add_task(
            email_service.send_guide_rejected, user.email, user.full_name, payload.note or ""
        )

    return {"message": f"Guide {payload.action}d successfully"}


class GuideUpdateAdmin(BaseModel):
    bio: Optional[str] = None
    languages: Optional[list[str]] = None
    experience_years: Optional[int] = None

@router.put("/guides/{guide_profile_id}")
def update_guide(
    guide_profile_id: int,
    payload: GuideUpdateAdmin,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    gp = db.query(GuideProfile).filter(GuideProfile.id == guide_profile_id).first()
    if not gp: 
        raise HTTPException(404, "Guide not found")
        
    if payload.bio is not None: gp.bio = payload.bio
    if payload.languages is not None: gp.languages = payload.languages
    if payload.experience_years is not None: gp.experience_years = payload.experience_years
    
    db.commit()
    return {"message": "Guide profile updated"}


# ─── Place Requests ───────────────────────────────────────────────────────────

@router.get("/place-requests")
def get_place_requests(
    status: Optional[str] = Query(None, enum=["pending", "approved", "rejected"]),
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    q = db.query(PlaceAddRequest)
    filter_status = status or "pending"
    q = q.filter(PlaceAddRequest.status == filter_status)
    requests = q.order_by(PlaceAddRequest.created_at.desc()).all()
    result = []
    for r in requests:
        gp = db.query(GuideProfile).filter(GuideProfile.id == r.guide_id).first()
        u = db.query(User).filter(User.id == gp.user_id).first() if gp else None
        result.append({
            "id": r.id,
            "guide_name": u.full_name if u else None,
            "guide_email": u.email if u else None,
            "place_name": r.place_name,
            "city": r.city, "state": r.state, "zone": r.zone,
            "type": r.type, "significance": r.significance,
            "description": r.description,
            "entrance_fee_inr": r.entrance_fee_inr,
            "status": r.status.value,
            "admin_note": r.admin_note,
            "created_at": str(r.created_at),
        })
    return result


class PlaceRequestAction(BaseModel):
    action: str   # "approve" or "reject"
    note: Optional[str] = None


@router.put("/place-requests/{request_id}/review")
def review_place_request(
    request_id: int,
    payload: PlaceRequestAction,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    if payload.action not in ("approve", "reject"):
        raise HTTPException(400, "action must be 'approve' or 'reject'")

    req = db.query(PlaceAddRequest).filter(PlaceAddRequest.id == request_id).first()
    if not req: raise HTTPException(404, "Request not found")

    gp = db.query(GuideProfile).filter(GuideProfile.id == req.guide_id).first()
    guide_user = db.query(User).filter(User.id == gp.user_id).first() if gp else None

    if payload.action == "approve":
        req.status = ApprovalStatus.approved
        req.reviewed_by = current_user.id
        req.reviewed_at = datetime.now(timezone.utc)
        # Create the actual place
        new_place = TouristPlace(
            name=req.place_name, city=req.city, state=req.state, zone=req.zone,
            type=req.type, significance=req.significance, description=req.description,
            entrance_fee_inr=req.entrance_fee_inr, added_by_guide_id=gp.user_id,
            approval_status=ApprovalStatus.approved, is_active=True,
        )
        db.add(new_place)
        db.flush()
        if guide_user:
            create_notification(
                db,
                guide_user.id,
                NotificationType.place_approved,
                "Place request approved",
                f'Your place "{req.place_name}" was added to Yatrika. You can request assignment or create slots.',
                "/guide/dashboard?tab=places",
            )
        db.commit()
        if guide_user:
            background_tasks.add_task(
                email_service.send_place_request_approved,
                guide_user.email, guide_user.full_name, req.place_name
            )
    else:
        req.status = ApprovalStatus.rejected
        req.admin_note = payload.note
        req.reviewed_by = current_user.id
        req.reviewed_at = datetime.now(timezone.utc)
        if guide_user:
            create_notification(
                db,
                guide_user.id,
                NotificationType.place_rejected,
                "Place request declined",
                payload.note or f'Your place request for "{req.place_name}" was not approved.',
                "/guide/dashboard?tab=places",
            )
        db.commit()
        if guide_user:
            background_tasks.add_task(
                email_service.send_place_request_rejected,
                guide_user.email, guide_user.full_name, req.place_name, payload.note or ""
            )

    return {"message": f"Place request {payload.action}d"}


# ─── Guide Assignment Requests ────────────────────────────────────────────────

@router.get("/guide-assignment-requests")
def get_guide_assignment_requests(
    status: Optional[str] = Query(None, enum=["pending", "approved", "rejected"]),
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    from app.models.extra import GuidePlaceAssignmentRequest
    q = db.query(GuidePlaceAssignmentRequest)
    filter_status = status or "pending"
    q = q.filter(GuidePlaceAssignmentRequest.status == filter_status)
    requests = q.order_by(GuidePlaceAssignmentRequest.created_at.desc()).all()
    
    result = []
    for r in requests:
        gp = db.query(GuideProfile).filter(GuideProfile.id == r.guide_id).first()
        u = db.query(User).filter(User.id == gp.user_id).first() if gp else None
        place = db.query(TouristPlace).filter(TouristPlace.id == r.place_id).first()
        result.append({
            "id": r.id,
            "guide_id": r.guide_id,
            "place_id": r.place_id,
            "guide_name": u.full_name if u else None,
            "guide_email": u.email if u else None,
            "place_name": place.name if place else "Unknown",
            "city": place.city if place else "",
            "status": r.status.value,
            "admin_note": r.admin_note,
            "created_at": str(r.created_at),
        })
    return result


class AssignmentRequestAction(BaseModel):
    action: str   # "approve" or "reject"
    note: Optional[str] = None


@router.put("/guide-assignment-requests/{request_id}/review")
def review_guide_assignment_request(
    request_id: int,
    payload: AssignmentRequestAction,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    from app.models.extra import GuidePlaceAssignmentRequest
    if payload.action not in ("approve", "reject"):
        raise HTTPException(400, "action must be 'approve' or 'reject'")

    req = db.query(GuidePlaceAssignmentRequest).filter(GuidePlaceAssignmentRequest.id == request_id).first()
    if not req: raise HTTPException(404, "Assignment request not found")

    gp = db.query(GuideProfile).filter(GuideProfile.id == req.guide_id).first()
    guide_user = db.query(User).filter(User.id == gp.user_id).first() if gp else None
    place = db.query(TouristPlace).filter(TouristPlace.id == req.place_id).first()

    if payload.action == "approve":
        req.status = ApprovalStatus.approved
        
        # Check if already assigned
        existing = db.query(GuidePlaceAssignment).filter(
            GuidePlaceAssignment.guide_id == req.guide_id,
            GuidePlaceAssignment.place_id == req.place_id
        ).first()
        
        if not existing:
            assignment = GuidePlaceAssignment(
                guide_id=req.guide_id, 
                place_id=req.place_id, 
                assigned_by=current_user.id
            )
            db.add(assignment)
            
        if guide_user and place:
            create_notification(
                db,
                guide_user.id,
                NotificationType.guide_assigned,
                "Place assignment approved",
                f'You can now guide at {place.name} ({place.city}). Create time slots from your dashboard.',
                "/guide/dashboard?tab=slots",
            )
        db.commit()
        if guide_user and place:
            background_tasks.add_task(
                email_service.send_guide_assigned,
                guide_user.email, guide_user.full_name, place.name, place.city or ""
            )
    else:
        req.status = ApprovalStatus.rejected
        req.admin_note = payload.note
        if guide_user and place:
            create_notification(
                db,
                guide_user.id,
                NotificationType.place_rejected,
                "Assignment request declined",
                payload.note or f'Your request to guide {place.name} was not approved.',
                "/guide/dashboard?tab=places",
            )
        db.commit()

    return {"message": f"Assignment request {payload.action}d"}


# ─── Place Management ─────────────────────────────────────────────────────────

@router.post("/places/{place_id}/assign-guide")
def assign_guide_to_place(
    place_id: int,
    background_tasks: BackgroundTasks,
    guide_id: int = Query(...),
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    place = db.query(TouristPlace).filter(TouristPlace.id == place_id).first()
    if not place: raise HTTPException(404, "Place not found")
    gp = db.query(GuideProfile).filter(GuideProfile.id == guide_id).first()
    if not gp: raise HTTPException(404, "Guide not found")

    exists = db.query(GuidePlaceAssignment).filter(
        GuidePlaceAssignment.guide_id == guide_id,
        GuidePlaceAssignment.place_id == place_id,
    ).first()
    if exists: raise HTTPException(400, "Guide already assigned to this place")

    assignment = GuidePlaceAssignment(
        guide_id=guide_id, place_id=place_id, assigned_by=current_user.id
    )
    db.add(assignment)
    guide_user = db.query(User).filter(User.id == gp.user_id).first()
    if guide_user:
        create_notification(
            db,
            guide_user.id,
            NotificationType.guide_assigned,
            "Assigned to a place",
            f"You were assigned to guide at {place.name} ({place.city or ''}). Create time slots to start receiving bookings.",
            "/guide/dashboard?tab=slots",
        )
    db.commit()

    if guide_user:
        background_tasks.add_task(
            email_service.send_guide_assigned,
            guide_user.email, guide_user.full_name, place.name, place.city or ""
        )
    return {"message": f"Guide assigned to {place.name}"}


# ─── All Bookings ─────────────────────────────────────────────────────────────

@router.get("/bookings")
def get_all_bookings(
    status: Optional[str] = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(20),
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    import math
    q = db.query(Booking)
    if status: q = q.filter(Booking.status == status)
    total = q.count()
    bookings = q.order_by(Booking.created_at.desc()).offset((page-1)*per_page).limit(per_page).all()
    return {
        "total": total,
        "total_pages": math.ceil(total / per_page),
        "items": [
            {
                "id": b.id, "status": b.status.value,
                "booking_date": str(b.booking_date),
                "user_id": b.user_id, "guide_id": b.guide_id,
                "place_id": b.place_id, "created_at": str(b.created_at),
            }
            for b in bookings
        ],
    }


# ─── Place CRUD (admin) ───────────────────────────────────────────────────────

from app.schemas.places import PlaceCreate, PlaceUpdate

@router.post("/places", status_code=201)
def create_place(
    payload: PlaceCreate,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    place = TouristPlace(**payload.model_dump(), is_active=True, approval_status=ApprovalStatus.approved)
    db.add(place)
    db.commit()
    db.refresh(place)
    return {"message": "Place created", "id": place.id}


@router.put("/places/{place_id}")
def update_place(
    place_id: int,
    payload: PlaceUpdate,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    place = db.query(TouristPlace).filter(TouristPlace.id == place_id).first()
    if not place:
        raise HTTPException(404, "Place not found")
    for k, v in payload.model_dump(exclude_none=True).items():
        setattr(place, k, v)
    db.commit()
    return {"message": "Place updated"}


@router.delete("/places/{place_id}")
def delete_place(
    place_id: int,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    place = db.query(TouristPlace).filter(TouristPlace.id == place_id).first()
    if not place:
        raise HTTPException(404, "Place not found")

    place_name = place.name
    place_city = place.city or ""

    # ── 1. Find all guides assigned to this place and collect their emails ──
    assignments = db.query(GuidePlaceAssignment).filter(
        GuidePlaceAssignment.place_id == place_id
    ).all()

    notified_guide_user_ids = set()
    for assignment in assignments:
        gp = db.query(GuideProfile).filter(GuideProfile.id == assignment.guide_id).first()
        if gp:
            guide_user = db.query(User).filter(User.id == gp.user_id).first()
            if guide_user and guide_user.id not in notified_guide_user_ids:
                notified_guide_user_ids.add(guide_user.id)
                background_tasks.add_task(
                    email_service.send_place_deleted_to_guide,
                    guide_user.email, guide_user.full_name, place_name, place_city
                )

    # ── 2. Cancel all active bookings for this place ──────────────────────
    active_statuses = [BookingStatus.pending, BookingStatus.accepted, BookingStatus.started]
    active_bookings = db.query(Booking).filter(
        Booking.place_id == place_id,
        Booking.status.in_(active_statuses)
    ).all()
    for booking in active_bookings:
        booking.status = BookingStatus.cancelled

    # ── 3. Mark all guide assignments as inactive (soft delete) ───────────
    db.query(GuidePlaceAssignment).filter(
        GuidePlaceAssignment.place_id == place_id
    ).delete(synchronize_session=False)

    # ── 4. Soft-delete the place ──────────────────────────────────────────
    place.is_active = False
    db.commit()

    return {
        "message": f"Place '{place_name}' deactivated. "
                   f"{len(active_bookings)} booking(s) cancelled. "
                   f"{len(notified_guide_user_ids)} guide(s) notified."
    }



