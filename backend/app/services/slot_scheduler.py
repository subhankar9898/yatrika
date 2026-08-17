"""
Auto-slot scheduler: runs daily at midnight and ensures every approved guide
has at least 2 available slots per day for the next 7 days.
"""
from datetime import date, timedelta, time
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from app.db.mysql_session import SessionLocal
from app.models.mysql import (
    GuideProfile, GuideTimeSlot, GuidePlaceAssignment,
    SlotStatus, ApprovalStatus
)

scheduler = AsyncIOScheduler()

DEFAULT_SLOTS = [
    (time(9, 0),  time(11, 0)),   # Morning: 9 AM – 11 AM
    (time(14, 0), time(16, 0)),   # Afternoon: 2 PM – 4 PM
]


def refresh_guide_slots():
    """Ensure every approved guide has slots for the next 7 days."""
    db = SessionLocal()
    try:
        today = date.today()
        guides = db.query(GuideProfile).filter(
            GuideProfile.approval_status == ApprovalStatus.approved
        ).all()

        created = 0
        for guide in guides:
            assignment = db.query(GuidePlaceAssignment).filter(
                GuidePlaceAssignment.guide_id == guide.id
            ).first()
            if not assignment:
                continue

            for day_offset in range(7):
                slot_date = today + timedelta(days=day_offset)
                for start_t, end_t in DEFAULT_SLOTS:
                    exists = db.query(GuideTimeSlot).filter(
                        GuideTimeSlot.guide_id == guide.id,
                        GuideTimeSlot.place_id == assignment.place_id,
                        GuideTimeSlot.slot_date == slot_date,
                        GuideTimeSlot.start_time == start_t,
                    ).first()
                    if not exists:
                        db.add(GuideTimeSlot(
                            guide_id=guide.id,
                            place_id=assignment.place_id,
                            slot_date=slot_date,
                            start_time=start_t,
                            end_time=end_t,
                            status=SlotStatus.available,
                        ))
                        created += 1

        db.commit()
        if created:
            print(f"[Scheduler] Auto-created {created} guide slots for next 7 days")
    except Exception as e:
        print(f"[Scheduler] Slot refresh error: {e}")
        db.rollback()
    finally:
        db.close()


def start_scheduler():
    scheduler.add_job(
        refresh_guide_slots,
        trigger="cron",
        hour=0, minute=5,   # runs every day at 00:05
        id="daily_slot_refresh",
        replace_existing=True,
    )
    scheduler.start()
    print("✅ Slot auto-refresh scheduler started (runs daily at 00:05)")


def stop_scheduler():
    scheduler.shutdown(wait=False)
