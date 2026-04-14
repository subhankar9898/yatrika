"""
APScheduler background tasks for Yatrika.
- Daily: mark accepted bookings whose date has passed as 'completed'
- Daily: increment guide tour count for newly completed bookings
- Daily: check guides with avg rating < 3.0 and alert admin
- Note: cancelled and rejected bookings NEVER affect tour completion count
"""
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from datetime import date, datetime, timezone
from sqlalchemy.orm import Session
from app.db.mysql_session import SessionLocal
from app.models.mysql import Booking, GuideProfile, BookingStatus, User, UserRole, Rating
from app.utils import email_service
from sqlalchemy import func

scheduler = AsyncIOScheduler()


def _mark_completed_bookings():
    db: Session = SessionLocal()
    try:
        today = date.today()
        # Only bookings that were ACCEPTED and whose date has passed
        bookings = db.query(Booking).filter(
            Booking.status == BookingStatus.accepted,
            Booking.booking_date < today,
        ).all()

        for b in bookings:
            b.status = BookingStatus.completed
            # Increment guide's completed tour count (ONLY for accepted→completed)
            gp = db.query(GuideProfile).filter(GuideProfile.id == b.guide_id).first()
            if gp:
                gp.total_tours_completed += 1

        db.commit()
        if bookings:
            print(f"[Scheduler] Marked {len(bookings)} bookings as completed")
    except Exception as e:
        db.rollback()
        print(f"[Scheduler] Error in mark_completed: {e}")
    finally:
        db.close()


def _check_low_ratings():
    db: Session = SessionLocal()
    try:
        low_guides = db.query(GuideProfile).filter(
            GuideProfile.average_rating < 3.0,
            GuideProfile.total_tours_completed >= 3,  # only after min 3 tours
        ).all()

        admin = db.query(User).filter(User.role == UserRole.admin, User.is_active == True).first()
        if not admin:
            return

        for gp in low_guides:
            u = db.query(User).filter(User.id == gp.user_id).first()
            if u:
                email_service.send_low_rating_alert(
                    admin.email,
                    u.full_name,
                    u.email,
                    float(gp.average_rating),
                    gp.total_tours_completed,
                )
        if low_guides:
            print(f"[Scheduler] Sent {len(low_guides)} low-rating alerts")
    except Exception as e:
        print(f"[Scheduler] Error in check_low_ratings: {e}")
    finally:
        db.close()


def start_scheduler():
    # Run daily at 1:00 AM
    scheduler.add_job(_mark_completed_bookings, 'cron', hour=1, minute=0, id='mark_completed')
    # Run daily at 6:00 AM
    scheduler.add_job(_check_low_ratings, 'cron', hour=6, minute=0, id='low_ratings')
    scheduler.start()
    print("✅ Background scheduler started")


def stop_scheduler():
    scheduler.shutdown()
