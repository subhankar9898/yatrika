from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import date

from app.db.mysql_session import get_db
from app.models.mysql import GuideProfile, User
from app.models.extra import Notification, GuideBlockedDate, NotificationType
from app.core.dependencies import get_current_user, get_current_guide, get_any_authenticated

router = APIRouter(tags=["Notifications & Vacation"])


def create_notification(db, user_id, ntype, title, message, link=None):
    n = Notification(user_id=user_id, type=ntype, title=title, message=message, link=link)
    db.add(n)


@router.get("/notifications")
def get_notifications(
    limit: int = 20,
    current_user: User = Depends(get_any_authenticated),
    db: Session = Depends(get_db),
):
    notifs = (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc())
        .limit(limit).all()
    )
    unread_count = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False,
    ).count()
    return {
        "unread_count": unread_count,
        "notifications": [
            {"id": n.id, "type": n.type.value, "title": n.title, "message": n.message,
             "link": n.link, "is_read": n.is_read, "created_at": str(n.created_at)}
            for n in notifs
        ],
    }


@router.put("/notifications/read-all")
def mark_all_read(current_user: User = Depends(get_any_authenticated), db: Session = Depends(get_db)):
    db.query(Notification).filter(
        Notification.user_id == current_user.id, Notification.is_read == False
    ).update({"is_read": True})
    db.commit()
    return {"message": "All notifications marked as read"}


@router.put("/notifications/{notif_id}/read")
def mark_read(notif_id: int, current_user: User = Depends(get_any_authenticated), db: Session = Depends(get_db)):
    n = db.query(Notification).filter(Notification.id == notif_id, Notification.user_id == current_user.id).first()
    if not n: raise HTTPException(404, "Not found")
    n.is_read = True
    db.commit()
    return {"message": "Marked as read"}


class BlockDateRequest(BaseModel):
    blocked_date: date
    reason: Optional[str] = None


@router.get("/guides/me/blocked-dates")
def get_my_blocked_dates(current_user: User = Depends(get_current_guide), db: Session = Depends(get_db)):
    gp = db.query(GuideProfile).filter(GuideProfile.user_id == current_user.id).first()
    blocked = db.query(GuideBlockedDate).filter(GuideBlockedDate.guide_id == gp.id).order_by(GuideBlockedDate.blocked_date).all()
    return [{"id": b.id, "blocked_date": str(b.blocked_date), "reason": b.reason} for b in blocked]


@router.post("/guides/me/blocked-dates", status_code=201)
def block_date(payload: BlockDateRequest, current_user: User = Depends(get_current_guide), db: Session = Depends(get_db)):
    gp = db.query(GuideProfile).filter(GuideProfile.user_id == current_user.id).first()
    if db.query(GuideBlockedDate).filter(GuideBlockedDate.guide_id == gp.id, GuideBlockedDate.blocked_date == payload.blocked_date).first():
        raise HTTPException(400, "Date already blocked")
    db.add(GuideBlockedDate(guide_id=gp.id, blocked_date=payload.blocked_date, reason=payload.reason))
    db.commit()
    return {"message": f"{payload.blocked_date} blocked"}


@router.delete("/guides/me/blocked-dates/{bid}")
def unblock_date(bid: int, current_user: User = Depends(get_current_guide), db: Session = Depends(get_db)):
    gp = db.query(GuideProfile).filter(GuideProfile.user_id == current_user.id).first()
    b = db.query(GuideBlockedDate).filter(GuideBlockedDate.id == bid, GuideBlockedDate.guide_id == gp.id).first()
    if not b: raise HTTPException(404, "Not found")
    db.delete(b)
    db.commit()
    return {"message": "Date unblocked"}


@router.get("/guides/{guide_id}/blocked-dates")
def get_guide_blocked_dates(guide_id: int, db: Session = Depends(get_db)):
    blocked = db.query(GuideBlockedDate).filter(GuideBlockedDate.guide_id == guide_id).all()
    return [str(b.blocked_date) for b in blocked]
