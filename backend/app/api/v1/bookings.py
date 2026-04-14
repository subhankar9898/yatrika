from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import and_
from pydantic import BaseModel, Field
from typing import Optional
from datetime import date

from app.db.mysql_session import get_db
from app.models.mysql import (
    Booking, GuideTimeSlot, User, TouristPlace, GuideProfile,
    SlotStatus, BookingStatus, Rating
)
from app.core.dependencies import get_current_user, get_any_authenticated
from app.utils import email_service

router = APIRouter(tags=["Bookings & Ratings"])


class BookingCreate(BaseModel):
    slot_id: int
    user_message: Optional[str] = None

class BookingStart(BaseModel):
    code: str


class RatingCreate(BaseModel):
    booking_id: int
    rating: int = Field(..., ge=1, le=5)
    review_text: Optional[str] = None


# ─── Create Booking ───────────────────────────────────────────────────────────

@router.post("/bookings", status_code=201)
def create_booking(
    payload: BookingCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    slot = db.query(GuideTimeSlot).filter(GuideTimeSlot.id == payload.slot_id).first()
    if not slot:
        raise HTTPException(404, "Slot not found")
    if slot.status != SlotStatus.available:
        raise HTTPException(400, "This slot is not available")

    # Double-booking check: same user, same date+time, any guide/place
    conflict = db.query(Booking).join(
        GuideTimeSlot, Booking.slot_id == GuideTimeSlot.id
    ).filter(
        Booking.user_id == current_user.id,
        Booking.status.in_([BookingStatus.pending, BookingStatus.accepted]),
        GuideTimeSlot.slot_date == slot.slot_date,
        GuideTimeSlot.start_time == slot.start_time,
    ).first()
    if conflict:
        raise HTTPException(400, "You already have a booking at this date and time slot")

    # Create booking
    booking = Booking(
        user_id=current_user.id,
        guide_id=slot.guide_id,
        slot_id=slot.id,
        place_id=slot.place_id,
        status=BookingStatus.pending,
        booking_date=slot.slot_date,
        user_message=payload.user_message,
    )
    db.add(booking)

    # Set slot to pending — deactivates it for all users
    slot.status = SlotStatus.pending
    db.commit()
    db.refresh(booking)

    # Email the guide
    guide_profile = db.query(GuideProfile).filter(GuideProfile.id == slot.guide_id).first()
    guide_user = db.query(User).filter(User.id == guide_profile.user_id).first()
    place = db.query(TouristPlace).filter(TouristPlace.id == slot.place_id).first()

    background_tasks.add_task(
        email_service.send_booking_request_to_guide,
        guide_user.email, guide_user.full_name,
        current_user.full_name, current_user.email,
        place.name if place else "", str(slot.slot_date),
        str(slot.start_time), str(slot.end_time),
        payload.user_message or ""
    )

    return {"message": "Booking request sent to guide!", "booking_id": booking.id}


# ─── User: My Bookings ────────────────────────────────────────────────────────

@router.get("/bookings/mine")
def get_my_bookings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    bookings = db.query(Booking).filter(
        Booking.user_id == current_user.id
    ).order_by(Booking.created_at.desc()).all()

    result = []
    for b in bookings:
        slot = db.query(GuideTimeSlot).filter(GuideTimeSlot.id == b.slot_id).first()
        place = db.query(TouristPlace).filter(TouristPlace.id == b.place_id).first()
        gp = db.query(GuideProfile).filter(GuideProfile.id == b.guide_id).first()
        guide_user = db.query(User).filter(User.id == gp.user_id).first() if gp else None

        # Only show guide email after acceptance
        guide_email = guide_user.email if (b.status == BookingStatus.accepted and guide_user) else None

        has_rating = db.query(Rating).filter(Rating.booking_id == b.id).first() is not None

        result.append({
            "id": b.id,
            "status": b.status.value,
            "booking_date": str(b.booking_date),
            "place_name": place.name if place else None,
            "place_photo": place.photo_url if place else None,
            "guide_name": guide_user.full_name if guide_user else None,
            "guide_email": guide_email,
            "guide_photo": guide_user.profile_photo_url if guide_user else None,
            "slot_start": str(slot.start_time) if slot else None,
            "slot_end": str(slot.end_time) if slot else None,
            "user_message": b.user_message,
            "guide_response": b.guide_response,
            "start_code": b.start_code,
            "user_completed": b.user_completed,
            "guide_completed": b.guide_completed,
            "has_rating": has_rating,
            "created_at": str(b.created_at),
        })
    return result


# ─── Start Booking ────────────────────────────────────────────────────────────

@router.put("/bookings/{booking_id}/start")
def start_booking(
    booking_id: int,
    payload: BookingStart,
    current_user: User = Depends(get_any_authenticated),
    db: Session = Depends(get_db),
):
    gp = db.query(GuideProfile).filter(GuideProfile.user_id == current_user.id).first()
    if not gp:
        raise HTTPException(403, "Only guides can start bookings")
    
    booking = db.query(Booking).filter(
        Booking.id == booking_id, Booking.guide_id == gp.id
    ).first()
    
    if not booking:
        raise HTTPException(404, "Booking not found")
    if booking.status != BookingStatus.accepted:
        raise HTTPException(400, f"Booking status must be accepted, current is {booking.status.value}")
    
    if payload.code != booking.start_code:
        raise HTTPException(400, "Invalid start code provided")
        
    booking.status = BookingStatus.started
    db.commit()
    return {"message": "Booking started successfully"}


# ─── Complete Booking ─────────────────────────────────────────────────────────

@router.put("/bookings/{booking_id}/complete")
def complete_booking(
    booking_id: int,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_any_authenticated),
    db: Session = Depends(get_db),
):
    from app.background.tasks import check_completion_timeout
    import asyncio
    
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(404, "Booking not found")
    if booking.status != BookingStatus.started:
        raise HTTPException(400, f"Booking status must be started, current is {booking.status.value}")
    
    is_guide = False
    gp = db.query(GuideProfile).filter(GuideProfile.user_id == current_user.id).first()
    if gp and booking.guide_id == gp.id:
        is_guide = True
    elif booking.user_id == current_user.id:
        is_guide = False
    else:
        raise HTTPException(403, "Not allowed")
        
    if is_guide:
        booking.guide_completed = True
    else:
        booking.user_completed = True
        
    previously_completed = int(booking.user_completed or 0) + int(booking.guide_completed or 0)
        
    if booking.user_completed and booking.guide_completed:
        booking.status = BookingStatus.completed
        db.commit()
        return {"message": "Tour fully completed! Awesome job!"}
    else:
        db.commit()
        # If this is the FIRST party to complete, dispatch the 30s timeout check
        if previously_completed == 1: # meaning it was 0 before this request, and is now 1
            asyncio.create_task(check_completion_timeout(booking.id))
        
        msg = "Partially completed! Waiting for user's confirmation." if is_guide else "Partially completed! Waiting for guide's confirmation."
        return {"message": msg}


# ─── Cancel Booking ───────────────────────────────────────────────────────────

@router.delete("/bookings/{booking_id}")
def cancel_booking(
    booking_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    booking = db.query(Booking).filter(
        Booking.id == booking_id,
        Booking.user_id == current_user.id,
    ).first()
    if not booking:
        raise HTTPException(404, "Booking not found")
    if booking.status not in (BookingStatus.pending,):
        raise HTTPException(400, "Only pending bookings can be cancelled")

    # Re-open the slot
    slot = db.query(GuideTimeSlot).filter(GuideTimeSlot.id == booking.slot_id).first()
    if slot:
        slot.status = SlotStatus.available

    booking.status = BookingStatus.cancelled
    db.commit()
    return {"message": "Booking cancelled"}


# ─── Submit Rating ────────────────────────────────────────────────────────────

@router.post("/ratings", status_code=201)
def submit_rating(
    payload: RatingCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    booking = db.query(Booking).filter(
        Booking.id == payload.booking_id,
        Booking.user_id == current_user.id,
        Booking.status == BookingStatus.completed,
    ).first()
    if not booking:
        raise HTTPException(404, "Completed booking not found")

    existing = db.query(Rating).filter(Rating.booking_id == payload.booking_id).first()
    if existing:
        raise HTTPException(400, "You have already rated this booking")

    rating = Rating(
        booking_id=payload.booking_id,
        user_id=current_user.id,
        guide_id=booking.guide_id,
        rating=payload.rating,
        review_text=payload.review_text,
    )
    db.add(rating)
    db.flush()

    # Recalculate guide average rating
    from sqlalchemy import func
    gp = db.query(GuideProfile).filter(GuideProfile.id == booking.guide_id).first()
    avg = db.query(func.avg(Rating.rating)).filter(Rating.guide_id == gp.id).scalar()
    gp.average_rating = round(float(avg), 2)
    db.commit()

    return {"message": "Rating submitted. Thank you!"}
