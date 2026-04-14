from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_
from pydantic import BaseModel
from typing import Optional
from datetime import date, time, datetime, timezone

from app.db.mysql_session import get_db
from app.models.mysql import (
    GuideTimeSlot, GuideProfile, Booking, User,
    SlotStatus, BookingStatus, TouristPlace, GuidePlaceAssignment
)
from app.core.dependencies import get_current_user, get_current_guide, get_any_authenticated
from app.utils import email_service

router = APIRouter(tags=["Guides & Slots"])


# ─── Schemas ─────────────────────────────────────────────────────────────────

class SlotCreate(BaseModel):
    place_id: int
    slot_date: date
    start_time: time
    end_time: time


class SlotUpdate(BaseModel):
    slot_date: Optional[date] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None


class BookingCreate(BaseModel):
    slot_id: int
    user_message: Optional[str] = None


class BookingRespond(BaseModel):
    action: str   # "accept" or "reject"
    guide_response: Optional[str] = None


# ─── Placeholder for moved routes ─────────────────────────────────────────────



# ─── Guide Dashboard: My Profile ─────────────────────────────────────────────

@router.get("/guides/me")
def get_my_guide_profile(
    current_user: User = Depends(get_current_guide),
    db: Session = Depends(get_db),
):
    gp = db.query(GuideProfile).filter(GuideProfile.user_id == current_user.id).first()
    if not gp:
        raise HTTPException(404, "Guide profile not found")
    # Fetch assigned places so the guide can create slots
    places = (
        db.query(TouristPlace)
        .join(GuidePlaceAssignment, GuidePlaceAssignment.place_id == TouristPlace.id)
        .filter(GuidePlaceAssignment.guide_id == gp.id)
        .all()
    )
    return {
        "id": gp.id,
        "full_name": current_user.full_name,
        "email": current_user.email,
        "profile_photo_url": current_user.profile_photo_url,
        "bio": gp.bio,
        "languages": gp.languages,
        "experience_years": gp.experience_years,
        "average_rating": float(gp.average_rating),
        "total_tours_completed": gp.total_tours_completed,
        "places": [{"id": p.id, "name": p.name, "city": p.city, "photo_url": p.photo_url} for p in places],
    }


# ─── Guide: Manage Own Slots ──────────────────────────────────────────────────

@router.get("/guides/me/slots")
def get_my_slots(
    current_user: User = Depends(get_current_guide),
    db: Session = Depends(get_db),
):
    gp = db.query(GuideProfile).filter(GuideProfile.user_id == current_user.id).first()
    slots = db.query(GuideTimeSlot).filter(GuideTimeSlot.guide_id == gp.id).order_by(
        GuideTimeSlot.slot_date, GuideTimeSlot.start_time
    ).all()
    return [
        {
            "id": s.id, "place_id": s.place_id, "slot_date": str(s.slot_date),
            "start_time": str(s.start_time), "end_time": str(s.end_time), "status": s.status.value,
        }
        for s in slots
    ]


@router.post("/guides/me/slots", status_code=201)
def create_slot(
    payload: SlotCreate,
    current_user: User = Depends(get_current_guide),
    db: Session = Depends(get_db),
):
    gp = db.query(GuideProfile).filter(GuideProfile.user_id == current_user.id).first()

    # No limits on slots per day

    # Check guide is assigned to this place
    assigned = db.query(GuidePlaceAssignment).filter(
        GuidePlaceAssignment.guide_id == gp.id,
        GuidePlaceAssignment.place_id == payload.place_id,
    ).first()
    if not assigned:
        raise HTTPException(403, "You are not assigned to this place")

    slot = GuideTimeSlot(
        guide_id=gp.id,
        place_id=payload.place_id,
        slot_date=payload.slot_date,
        start_time=payload.start_time,
        end_time=payload.end_time,
        status=SlotStatus.available,
    )
    db.add(slot)
    db.commit()
    db.refresh(slot)
    return {"message": "Slot created", "slot_id": slot.id}


@router.put("/guides/me/slots/{slot_id}")
def update_slot(
    slot_id: int,
    payload: SlotUpdate,
    current_user: User = Depends(get_current_guide),
    db: Session = Depends(get_db),
):
    gp = db.query(GuideProfile).filter(GuideProfile.user_id == current_user.id).first()
    slot = db.query(GuideTimeSlot).filter(
        GuideTimeSlot.id == slot_id, GuideTimeSlot.guide_id == gp.id
    ).first()
    if not slot:
        raise HTTPException(404, "Slot not found")
    if slot.status != SlotStatus.available:
        raise HTTPException(400, "Cannot modify a pending or booked slot")

    if payload.slot_date: slot.slot_date = payload.slot_date
    if payload.start_time: slot.start_time = payload.start_time
    if payload.end_time: slot.end_time = payload.end_time
    db.commit()
    return {"message": "Slot updated"}


@router.delete("/guides/me/slots/{slot_id}")
def delete_slot(
    slot_id: int,
    current_user: User = Depends(get_current_guide),
    db: Session = Depends(get_db),
):
    gp = db.query(GuideProfile).filter(GuideProfile.user_id == current_user.id).first()
    slot = db.query(GuideTimeSlot).filter(
        GuideTimeSlot.id == slot_id, GuideTimeSlot.guide_id == gp.id
    ).first()
    if not slot:
        raise HTTPException(404, "Slot not found")
    if slot.status == SlotStatus.booked:
        raise HTTPException(400, "Cannot delete a booked slot")
    db.delete(slot)
    db.commit()
    return {"message": "Slot deleted"}


# ─── Guide: My Bookings ───────────────────────────────────────────────────────

@router.get("/guides/me/bookings")
def get_guide_bookings(
    current_user: User = Depends(get_current_guide),
    db: Session = Depends(get_db),
):
    gp = db.query(GuideProfile).filter(GuideProfile.user_id == current_user.id).first()
    bookings = db.query(Booking).filter(Booking.guide_id == gp.id).order_by(
        Booking.created_at.desc()
    ).all()
    result = []
    for b in bookings:
        user = db.query(User).filter(User.id == b.user_id).first()
        place = db.query(TouristPlace).filter(TouristPlace.id == b.place_id).first()
        slot = db.query(GuideTimeSlot).filter(GuideTimeSlot.id == b.slot_id).first()
        result.append({
            "id": b.id,
            "status": b.status.value,
            "booking_date": str(b.booking_date),
            "user_name": user.full_name if user else None,
            "user_email": user.email if user else None,   # guide can see user email
            "place_name": place.name if place else None,
            "slot_start": str(slot.start_time) if slot else None,
            "slot_end": str(slot.end_time) if slot else None,
            "user_message": b.user_message,
            "start_code": b.start_code,
            "user_completed": b.user_completed,
            "guide_completed": b.guide_completed,
            "created_at": str(b.created_at),
        })
    return result


# ─── Guide: Respond to Booking ────────────────────────────────────────────────

@router.put("/bookings/{booking_id}/respond")
def respond_to_booking(
    booking_id: int,
    payload: BookingRespond,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_guide),
    db: Session = Depends(get_db),
):
    if payload.action not in ("accept", "reject"):
        raise HTTPException(400, "action must be 'accept' or 'reject'")

    gp = db.query(GuideProfile).filter(GuideProfile.user_id == current_user.id).first()
    booking = db.query(Booking).filter(
        Booking.id == booking_id, Booking.guide_id == gp.id
    ).first()
    if not booking:
        raise HTTPException(404, "Booking not found")
    if booking.status != BookingStatus.pending:
        raise HTTPException(400, f"Booking is already {booking.status.value}")

    slot = db.query(GuideTimeSlot).filter(GuideTimeSlot.id == booking.slot_id).first()
    user = db.query(User).filter(User.id == booking.user_id).first()
    place = db.query(TouristPlace).filter(TouristPlace.id == booking.place_id).first()

    if payload.action == "accept":
        import random
        booking.status = BookingStatus.accepted
        booking.guide_response = payload.guide_response
        booking.start_code = str(random.randint(1000, 9999))
        slot.status = SlotStatus.booked
        db.commit()
        # User now sees guide email — send confirmation
        background_tasks.add_task(
            email_service.send_booking_accepted_to_user,
            user.email, user.full_name,
            current_user.full_name, current_user.email,
            place.name if place else "", str(booking.booking_date),
            str(slot.start_time), str(slot.end_time)
        )
    else:
        booking.status = BookingStatus.rejected
        booking.guide_response = payload.guide_response
        slot.status = SlotStatus.available   # re-open slot
        db.commit()
        background_tasks.add_task(
            email_service.send_booking_rejected_to_user,
            user.email, user.full_name,
            current_user.full_name,
            place.name if place else "", str(booking.booking_date)
        )

    return {"message": f"Booking {payload.action}ed successfully"}


# ─── Guide: My Ratings ────────────────────────────────────────────────────────

@router.get("/guides/me/ratings")
def get_my_ratings(
    current_user: User = Depends(get_current_guide),
    db: Session = Depends(get_db),
):
    from app.models.mysql import Rating
    gp = db.query(GuideProfile).filter(GuideProfile.user_id == current_user.id).first()
    ratings = db.query(Rating).filter(Rating.guide_id == gp.id).order_by(
        Rating.created_at.desc()
    ).all()
    result = []
    for r in ratings:
        u = db.query(User).filter(User.id == r.user_id).first()
        result.append({
            "id": r.id,
            "rating": r.rating,
            "review_text": r.review_text,
            "user_name": u.full_name if u else "Anonymous",
            "created_at": str(r.created_at),
        })
    return {
        "average_rating": float(gp.average_rating),
        "total_tours_completed": gp.total_tours_completed,
        "ratings": result,
    }


# ─── Guide: Place Add Request ─────────────────────────────────────────────────

class PlaceRequestCreate(BaseModel):
    place_name: str
    city: str
    state: str
    zone: str
    type: str
    significance: Optional[str] = None
    description: Optional[str] = None
    entrance_fee_inr: int = 0


@router.post("/guides/place-requests", status_code=201)
def submit_place_request(
    payload: PlaceRequestCreate,
    current_user: User = Depends(get_current_guide),
    db: Session = Depends(get_db),
):
    from app.models.mysql import PlaceAddRequest
    gp = db.query(GuideProfile).filter(GuideProfile.user_id == current_user.id).first()
    req = PlaceAddRequest(
        guide_id=gp.id,
        **payload.model_dump(),
    )
    db.add(req)
    db.commit()
    return {"message": "Place request submitted. Admin will review shortly."}


# ─── Guide: Assignment Requests (Existing Place) ──────────────────────────────

class AssignmentRequestCreate(BaseModel):
    place_id: int

@router.post("/guides/me/assignment-requests", status_code=201)
def request_place_assignment(
    payload: AssignmentRequestCreate,
    current_user: User = Depends(get_current_guide),
    db: Session = Depends(get_db),
):
    from app.models.extra import GuidePlaceAssignmentRequest
    from app.models.mysql import ApprovalStatus
    gp = db.query(GuideProfile).filter(GuideProfile.user_id == current_user.id).first()
    
    place = db.query(TouristPlace).filter(TouristPlace.id == payload.place_id).first()
    if not place:
        raise HTTPException(404, "Place not found")
        
    # Check if already assigned
    existing = db.query(GuidePlaceAssignment).filter(
        GuidePlaceAssignment.guide_id == gp.id,
        GuidePlaceAssignment.place_id == payload.place_id
    ).first()
    if existing:
        raise HTTPException(400, "You are already a guide for this place")
        
    # Check if pending request exists
    pending = db.query(GuidePlaceAssignmentRequest).filter(
        GuidePlaceAssignmentRequest.guide_id == gp.id,
        GuidePlaceAssignmentRequest.place_id == payload.place_id,
        GuidePlaceAssignmentRequest.status == ApprovalStatus.pending
    ).first()
    if pending:
        raise HTTPException(400, "You already have a pending request for this place")
        
    req = GuidePlaceAssignmentRequest(
        guide_id=gp.id,
        place_id=payload.place_id,
        status=ApprovalStatus.pending
    )
    db.add(req)
    db.commit()
    return {"message": "Assignment request submitted to admin"}

@router.get("/guides/me/assignment-requests")
def get_my_assignment_requests(
    current_user: User = Depends(get_current_guide),
    db: Session = Depends(get_db),
):
    from app.models.extra import GuidePlaceAssignmentRequest
    gp = db.query(GuideProfile).filter(GuideProfile.user_id == current_user.id).first()
    
    requests = db.query(GuidePlaceAssignmentRequest).filter(
        GuidePlaceAssignmentRequest.guide_id == gp.id
    ).order_by(GuidePlaceAssignmentRequest.created_at.desc()).all()
    
    res = []
    for r in requests:
        place = db.query(TouristPlace).filter(TouristPlace.id == r.place_id).first()
        res.append({
            "id": r.id,
            "place_id": r.place_id,
            "place_name": place.name if place else "Unknown",
            "city": place.city if place else "",
            "status": r.status.value,
            "admin_note": r.admin_note,
            "created_at": str(r.created_at)
        })
    return res


# ─── Guide Vacation Mode ──────────────────────────────────────────────────────

class VacationAdd(BaseModel):
    dates: list[str]   # list of "YYYY-MM-DD" strings
    reason: Optional[str] = None


@router.get("/guides/me/vacations")
def get_my_vacations(
    current_user: User = Depends(get_current_guide),
    db: Session = Depends(get_db),
):
    from app.models.mysql import GuideVacation
    from datetime import date as dateobj
    gp = db.query(GuideProfile).filter(GuideProfile.user_id == current_user.id).first()
    vacations = db.query(GuideVacation).filter(
        GuideVacation.guide_id == gp.id,
        GuideVacation.blocked_date >= dateobj.today(),
    ).order_by(GuideVacation.blocked_date).all()
    return [{"id": v.id, "date": str(v.blocked_date), "reason": v.reason} for v in vacations]


@router.post("/guides/me/vacations", status_code=201)
def add_vacation_dates(
    payload: VacationAdd,
    current_user: User = Depends(get_current_guide),
    db: Session = Depends(get_db),
):
    from app.models.mysql import GuideVacation
    from datetime import date as dateobj
    gp = db.query(GuideProfile).filter(GuideProfile.user_id == current_user.id).first()

    added = []
    for d in payload.dates:
        blocked = dateobj.fromisoformat(d)
        exists = db.query(GuideVacation).filter(
            GuideVacation.guide_id == gp.id,
            GuideVacation.blocked_date == blocked,
        ).first()
        if not exists:
            db.add(GuideVacation(guide_id=gp.id, blocked_date=blocked, reason=payload.reason))
            added.append(d)

        # Also mark all available slots on that date as unavailable
        db.query(GuideTimeSlot).filter(
            GuideTimeSlot.guide_id == gp.id,
            GuideTimeSlot.slot_date == blocked,
            GuideTimeSlot.status == SlotStatus.available,
        ).update({"status": SlotStatus.available})  # keep slots but vacation day blocks booking on frontend

    db.commit()
    return {"message": f"Blocked {len(added)} date(s)", "added": added}


@router.delete("/guides/me/vacations/{vacation_id}")
def remove_vacation_date(
    vacation_id: int,
    current_user: User = Depends(get_current_guide),
    db: Session = Depends(get_db),
):
    from app.models.mysql import GuideVacation
    gp = db.query(GuideProfile).filter(GuideProfile.user_id == current_user.id).first()
    v = db.query(GuideVacation).filter(
        GuideVacation.id == vacation_id,
        GuideVacation.guide_id == gp.id,
    ).first()
    if not v:
        raise HTTPException(404, "Vacation date not found")
    db.delete(v)
    db.commit()
    return {"message": "Vacation date removed"}


# ─── Public: Guide Vacation Dates (for slot calendar) ────────────────────────

@router.get("/guides/{guide_id}/vacations")
def get_guide_vacations(guide_id: int, db: Session = Depends(get_db)):
    from app.models.mysql import GuideVacation
    from datetime import date as dateobj
    gp = db.query(GuideProfile).filter(GuideProfile.id == guide_id).first()
    if not gp:
        raise HTTPException(404, "Guide not found")
    vacations = db.query(GuideVacation).filter(
        GuideVacation.guide_id == guide_id,
        GuideVacation.blocked_date >= dateobj.today(),
    ).all()
    return [str(v.blocked_date) for v in vacations]


# ─── Guide Public Profile ─────────────────────────────────────────────────────

@router.get("/guides/{guide_id}")
def get_guide_profile(guide_id: int, db: Session = Depends(get_db)):
    gp = db.query(GuideProfile).filter(GuideProfile.id == guide_id).first()
    if not gp:
        raise HTTPException(404, "Guide not found")
    u = db.query(User).filter(User.id == gp.user_id).first()
    places = (
        db.query(TouristPlace)
        .join(GuidePlaceAssignment, GuidePlaceAssignment.place_id == TouristPlace.id)
        .filter(GuidePlaceAssignment.guide_id == gp.id)
        .all()
    )
    return {
        "id": gp.id,
        "full_name": u.full_name,
        "profile_photo_url": u.profile_photo_url,
        "bio": gp.bio,
        "languages": gp.languages,
        "experience_years": gp.experience_years,
        "average_rating": float(gp.average_rating),
        "total_tours_completed": gp.total_tours_completed,
        "places": [{"id": p.id, "name": p.name, "city": p.city, "photo_url": p.photo_url} for p in places],
    }


# ─── Guide Slots (Public Read) ────────────────────────────────────────────────

@router.get("/guides/{guide_id}/slots")
def get_guide_slots(
    guide_id: int,
    from_date: Optional[date] = Query(None),
    to_date: Optional[date] = Query(None),
    db: Session = Depends(get_db),
):
    query = db.query(GuideTimeSlot).filter(GuideTimeSlot.guide_id == guide_id)
    if from_date: query = query.filter(GuideTimeSlot.slot_date >= from_date)
    if to_date:   query = query.filter(GuideTimeSlot.slot_date <= to_date)
    slots = query.order_by(GuideTimeSlot.slot_date, GuideTimeSlot.start_time).all()
    return [
        {
            "id": s.id,
            "place_id": s.place_id,
            "slot_date": str(s.slot_date),
            "start_time": str(s.start_time),
            "end_time": str(s.end_time),
            "status": s.status.value,
        }
        for s in slots
    ]
