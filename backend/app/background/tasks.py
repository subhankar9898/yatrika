import asyncio
from app.db.mysql_session import SessionLocal
from app.models.mysql import Booking, BookingStatus, User, UserRole
from app.models.extra import Notification, NotificationType

async def check_completion_timeout(booking_id: int):
    await asyncio.sleep(30)
    db = SessionLocal()
    try:
        b = db.query(Booking).filter(Booking.id == booking_id).first()
        if not b or b.status == BookingStatus.completed:
            return
        
        admin = db.query(User).filter(User.role == UserRole.admin).first()
        if not admin:
            return
            
        missing_party = []
        if not b.user_completed: missing_party.append("User")
        if not b.guide_completed: missing_party.append("Guide")
        
        n = Notification(
            user_id=admin.id,
            type=NotificationType.booking_timeout,
            title="Booking Completion Timeout",
            message=f"Booking #{booking_id} timeout: {', '.join(missing_party)} failed to mark as complete.",
            link=f"/admin/bookings"
        )
        db.add(n)
        db.commit()
    finally:
        db.close()
