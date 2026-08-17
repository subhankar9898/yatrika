"""
Additional models — append these to app/models/mysql.py
Covers: Q4 (GuideBlockedDate), Q3 (Notification), Q8 (export support)
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Date, Text, Enum, ForeignKey, func
from sqlalchemy.orm import relationship
from app.db.mysql_session import Base
import enum
from app.models.mysql import ApprovalStatus


class NotificationType(str, enum.Enum):
    booking_request  = "booking_request"
    booking_accepted = "booking_accepted"
    booking_rejected = "booking_rejected"
    guide_approved   = "guide_approved"
    guide_rejected   = "guide_rejected"
    place_approved   = "place_approved"
    place_rejected   = "place_rejected"
    guide_assigned   = "guide_assigned"
    low_rating       = "low_rating"
    system           = "system"
    booking_timeout  = "booking_timeout"


class Notification(Base):
    """In-app notifications for navbar bell icon (Q3)."""
    __tablename__ = "notifications"

    id          = Column(Integer, primary_key=True, autoincrement=True)
    user_id     = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    type        = Column(Enum(NotificationType), nullable=False)
    title       = Column(String(200), nullable=False)
    message     = Column(Text, nullable=False)
    link        = Column(String(500), nullable=True)   # optional deep-link
    is_read     = Column(Boolean, default=False)
    created_at  = Column(DateTime, default=func.now())

    user = relationship("User", foreign_keys=[user_id])


class GuideBlockedDate(Base):
    """Guides can block specific dates — vacation mode (Q4)."""
    __tablename__ = "guide_blocked_dates"

    id          = Column(Integer, primary_key=True, autoincrement=True)
    guide_id    = Column(Integer, ForeignKey("guide_profiles.id", ondelete="CASCADE"), nullable=False)
    blocked_date = Column(Date, nullable=False)
    reason      = Column(String(200), nullable=True)
    created_at  = Column(DateTime, default=func.now())

    guide = relationship("GuideProfile", foreign_keys=[guide_id])

class GuidePlaceAssignmentRequest(Base):
    """Guide requesting to be assigned to an existing place."""
    __tablename__ = "guide_place_assignment_requests"

    id = Column(Integer, primary_key=True, autoincrement=True)
    guide_id = Column(Integer, ForeignKey("guide_profiles.id", ondelete="CASCADE"), nullable=False)
    place_id = Column(Integer, ForeignKey("tourist_places.id", ondelete="CASCADE"), nullable=False)
    status = Column(Enum(ApprovalStatus), default=ApprovalStatus.pending)
    admin_note = Column(Text, nullable=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    guide = relationship("GuideProfile", foreign_keys=[guide_id])
    place = relationship("TouristPlace", foreign_keys=[place_id])
