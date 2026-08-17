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
from app.utils.notification_helpers import create_notification
from app.models.extra import NotificationType

router = APIRouter(tags=["Bookings & Ratings"])


class BookingCreate(BaseModel):
    slot_id: int
    user_message: Optional[str] = None

class BookingReschedule(BaseModel):
    new_slot_id: int

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

    guide_profile = db.query(GuideProfile).filter(GuideProfile.id == slot.guide_id).first()
    guide_user = db.query(User).filter(User.id == guide_profile.user_id).first() if guide_profile else None
    place = db.query(TouristPlace).filter(TouristPlace.id == slot.place_id).first()
    place_name = place.name if place else "your place"

    if guide_user:
        create_notification(
            db,
            guide_user.id,
            NotificationType.booking_request,
            "New booking request",
            f"{current_user.full_name} requested a tour at {place_name} on {slot.slot_date} "
            f"({str(slot.start_time)[:5]}–{str(slot.end_time)[:5]}).",
            "/guide/dashboard",
        )

    db.commit()
    db.refresh(booking)

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
            "guide_id": b.guide_id,
            "guide_name": guide_user.full_name if guide_user else None,
            "guide_email": guide_email,
            "guide_photo": guide_user.profile_photo_url if guide_user else None,
            "slot_id": b.slot_id,
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

    is_guide = False
    gp = db.query(GuideProfile).filter(GuideProfile.user_id == current_user.id).first()
    if gp and booking.guide_id == gp.id:
        is_guide = True
    elif booking.user_id == current_user.id:
        is_guide = False
    else:
        raise HTTPException(403, "Not allowed")

    if booking.status == BookingStatus.completed:
        return {"message": "This tour is already fully completed."}

    if is_guide and booking.guide_completed:
        return {"message": "Guide completion recorded. Waiting for the traveller to confirm."}
    if not is_guide and booking.user_completed:
        return {"message": "Your completion is recorded. Waiting for the guide to confirm."}

    if booking.status != BookingStatus.started:
        raise HTTPException(
            400,
            "The tour must be started with the verification code before it can be marked complete.",
        )

    both_were_done = booking.user_completed and booking.guide_completed

    if is_guide:
        booking.guide_completed = True
    else:
        booking.user_completed = True

    place = db.query(TouristPlace).filter(TouristPlace.id == booking.place_id).first()
    place_name = place.name if place else "your tour"
    if is_guide:
        other_user_id = booking.user_id
        other_link = "/user/dashboard"
    else:
        gp_other = db.query(GuideProfile).filter(GuideProfile.id == booking.guide_id).first()
        other_user_id = gp_other.user_id if gp_other else None
        other_link = "/guide/dashboard"

    if booking.user_completed and booking.guide_completed:
        booking.status = BookingStatus.completed
        if other_user_id:
            create_notification(
                db,
                other_user_id,
                NotificationType.system,
                "Tour completed",
                f"Your tour at {place_name} is fully marked complete by both parties.",
                other_link,
            )
        db.commit()
        return {"message": "Tour fully completed! Both parties have confirmed."}

    if other_user_id:
        create_notification(
            db,
            other_user_id,
            NotificationType.system,
            "Tour completion pending",
            f"{'Your guide' if is_guide else 'Your traveller'} marked the {place_name} tour complete. Please confirm on your dashboard.",
            other_link,
        )

    db.commit()
    if not both_were_done:
        asyncio.create_task(check_completion_timeout(booking.id))

    if is_guide:
        return {"message": "Guide completion recorded. Waiting for the traveller to confirm."}
    return {"message": "Your completion is recorded. Waiting for the guide to confirm."}


# ─── Reschedule Booking ───────────────────────────────────────────────────────

@router.put("/bookings/{booking_id}/reschedule")
def reschedule_booking(
    booking_id: int,
    payload: BookingReschedule,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Reschedule a pending booking to a new slot (same guide, any available slot).
    Only allowed while the booking is still pending (before guide accepts).
    """
    booking = db.query(Booking).filter(
        Booking.id == booking_id,
        Booking.user_id == current_user.id,
    ).first()
    if not booking:
        raise HTTPException(404, "Booking not found")
    if booking.status != BookingStatus.pending:
        raise HTTPException(400, "Only pending bookings can be rescheduled. Cancel and re-book for confirmed bookings.")

    new_slot = db.query(GuideTimeSlot).filter(GuideTimeSlot.id == payload.new_slot_id).first()
    if not new_slot:
        raise HTTPException(404, "New slot not found")
    if new_slot.status != SlotStatus.available:
        raise HTTPException(400, "The selected slot is no longer available")
    if new_slot.id == booking.slot_id:
        raise HTTPException(400, "The new slot is the same as the current slot")
    if new_slot.guide_id != booking.guide_id:
        raise HTTPException(400, "Reschedule must use a slot from the same guide")

    # Double-booking check for the user at the new date/time
    conflict = db.query(Booking).join(
        GuideTimeSlot, Booking.slot_id == GuideTimeSlot.id
    ).filter(
        Booking.user_id == current_user.id,
        Booking.id != booking_id,
        Booking.status.in_([BookingStatus.pending, BookingStatus.accepted]),
        GuideTimeSlot.slot_date == new_slot.slot_date,
        GuideTimeSlot.start_time == new_slot.start_time,
    ).first()
    if conflict:
        raise HTTPException(400, "You already have a booking at this date and time slot")

    # Free the old slot back to available
    old_slot = db.query(GuideTimeSlot).filter(GuideTimeSlot.id == booking.slot_id).first()
    if old_slot:
        old_slot.status = SlotStatus.available

    # Claim the new slot
    new_slot.status = SlotStatus.pending
    booking.slot_id = new_slot.id
    booking.place_id = new_slot.place_id
    booking.booking_date = new_slot.slot_date
    db.commit()
    db.refresh(booking)

    # Notify the guide about the reschedule
    guide_profile = db.query(GuideProfile).filter(GuideProfile.id == booking.guide_id).first()
    guide_user = db.query(User).filter(User.id == guide_profile.user_id).first() if guide_profile else None
    place = db.query(TouristPlace).filter(TouristPlace.id == new_slot.place_id).first()
    if guide_user:
        create_notification(
            db,
            guide_user.id,
            NotificationType.booking_request,
            "Booking rescheduled",
            f"{current_user.full_name} rescheduled their tour at {place.name if place else 'your place'} "
            f"to {new_slot.slot_date} ({str(new_slot.start_time)[:5]}–{str(new_slot.end_time)[:5]}).",
            "/guide/dashboard",
        )
        db.commit()
        background_tasks.add_task(
            email_service.send_booking_request_to_guide,
            guide_user.email, guide_user.full_name,
            current_user.full_name, current_user.email,
            place.name if place else "", str(new_slot.slot_date),
            str(new_slot.start_time), str(new_slot.end_time),
            f"[RESCHEDULED] {booking.user_message or ''}"
        )

    return {
        "message": "Booking rescheduled successfully",
        "booking_id": booking.id,
        "new_date": str(new_slot.slot_date),
        "new_start": str(new_slot.start_time),
        "new_end": str(new_slot.end_time),
    }


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
