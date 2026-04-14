from datetime import datetime
from typing import Optional, List
from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, Date, Time,
    Text, Enum, ForeignKey, DECIMAL, JSON, UniqueConstraint,
    func
)
from sqlalchemy.orm import relationship, Mapped
from app.db.mysql_session import Base
import enum


# ─── Enums ──────────────────────────────────────────────────────────────────

class UserRole(str, enum.Enum):
    admin = "admin"
    user = "user"
    guide = "guide"


class ApprovalStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class SlotStatus(str, enum.Enum):
    available = "available"
    pending = "pending"
    booked = "booked"


class BookingStatus(str, enum.Enum):
    pending = "pending"
    accepted = "accepted"
    started = "started"
    rejected = "rejected"
    completed = "completed"
    cancelled = "cancelled"


class OTPPurpose(str, enum.Enum):
    signup = "signup"
    login = "login"
    profile_change = "profile_change"
    guide_approval = "guide_approval"


# ─── User ────────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    full_name = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=True)  # NULL for GitHub OAuth only
    github_id = Column(String(100), unique=True, nullable=True)
    role = Column(Enum(UserRole), default=UserRole.user, nullable=False)
    is_verified = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    profile_photo_url = Column(String(500), nullable=True)
    phone = Column(String(20), nullable=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    # Relationships
    guide_profile = relationship("GuideProfile", back_populates="user", uselist=False, cascade="all, delete",
                                  foreign_keys="GuideProfile.user_id")
    bookings_as_user = relationship("Booking", foreign_keys="Booking.user_id", back_populates="user")
    ratings_given = relationship("Rating", foreign_keys="Rating.user_id", back_populates="user")
    otp_tokens = relationship("OTPToken", back_populates="user_ref", foreign_keys="OTPToken.email",
                               primaryjoin="User.email == OTPToken.email")

    def __repr__(self):
        return f"<User {self.email} ({self.role})>"


# ─── Guide Profile ───────────────────────────────────────────────────────────

class GuideProfile(Base):
    __tablename__ = "guide_profiles"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    bio = Column(Text, nullable=True)
    languages = Column(JSON, default=list)        # ["Hindi", "English", "Bengali"]
    experience_years = Column(Integer, default=0)
    approval_status = Column(Enum(ApprovalStatus), default=ApprovalStatus.pending)
    admin_note = Column(Text, nullable=True)      # Reason for rejection
    total_tours_completed = Column(Integer, default=0)
    average_rating = Column(DECIMAL(3, 2), default=0.00)
    approved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    approved_at = Column(DateTime, nullable=True)

    # Relationships
    user = relationship("User", back_populates="guide_profile", foreign_keys=[user_id])
    approver = relationship("User", foreign_keys=[approved_by])
    place_assignments = relationship("GuidePlaceAssignment", back_populates="guide")
    time_slots = relationship("GuideTimeSlot", back_populates="guide", cascade="all, delete")
    bookings_as_guide = relationship("Booking", foreign_keys="Booking.guide_id", back_populates="guide")
    ratings_received = relationship("Rating", foreign_keys="Rating.guide_id", back_populates="guide")
    place_requests = relationship("PlaceAddRequest", back_populates="guide")


# ─── Tourist Place ───────────────────────────────────────────────────────────

class TouristPlace(Base):
    __tablename__ = "tourist_places"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(200), nullable=False)
    city = Column(String(100))
    state = Column(String(100))
    zone = Column(String(100))
    type = Column(String(100))           # Temple, Fort, Beach, etc.
    significance = Column(String(100))  # Historical, Religious, etc.
    establishment_year = Column(String(50), nullable=True)
    time_needed_hrs = Column(DECIMAL(4, 1), nullable=True)
    google_rating = Column(DECIMAL(3, 2), nullable=True)
    entrance_fee_inr = Column(Integer, default=0)
    has_airport_50km = Column(Boolean, default=False)
    weekly_off = Column(String(50), nullable=True)
    dslr_allowed = Column(Boolean, default=True)
    google_reviews_lakhs = Column(DECIMAL(6, 3), nullable=True)
    best_time_to_visit = Column(String(50), nullable=True)
    photo_url = Column(String(500), nullable=True)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    approval_status = Column(Enum(ApprovalStatus), default=ApprovalStatus.approved)
    added_by_guide_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    approved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    # Relationships
    guide_assignments = relationship("GuidePlaceAssignment", back_populates="place")
    time_slots = relationship("GuideTimeSlot", back_populates="place")
    bookings = relationship("Booking", back_populates="place")


# ─── Guide-Place Assignment ──────────────────────────────────────────────────

class GuidePlaceAssignment(Base):
    __tablename__ = "guide_place_assignments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    guide_id = Column(Integer, ForeignKey("guide_profiles.id", ondelete="CASCADE"), nullable=False)
    place_id = Column(Integer, ForeignKey("tourist_places.id", ondelete="CASCADE"), nullable=False)
    assigned_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    assigned_at = Column(DateTime, default=func.now())

    __table_args__ = (UniqueConstraint("guide_id", "place_id", name="uq_guide_place"),)

    # Relationships
    guide = relationship("GuideProfile", back_populates="place_assignments")
    place = relationship("TouristPlace", back_populates="guide_assignments")
    assigner = relationship("User", foreign_keys=[assigned_by])


# ─── Guide Time Slot ─────────────────────────────────────────────────────────

class GuideTimeSlot(Base):
    __tablename__ = "guide_time_slots"

    id = Column(Integer, primary_key=True, autoincrement=True)
    guide_id = Column(Integer, ForeignKey("guide_profiles.id", ondelete="CASCADE"), nullable=False)
    place_id = Column(Integer, ForeignKey("tourist_places.id", ondelete="CASCADE"), nullable=False)
    slot_date = Column(Date, nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    status = Column(Enum(SlotStatus), default=SlotStatus.available)
    max_duration_hrs = Column(DECIMAL(3, 1), default=2.5)

    __table_args__ = (UniqueConstraint("guide_id", "slot_date", "start_time", name="uq_guide_slot"),)

    # Relationships
    guide = relationship("GuideProfile", back_populates="time_slots")
    place = relationship("TouristPlace", back_populates="time_slots")
    booking = relationship("Booking", back_populates="slot", uselist=False)


# ─── Booking ─────────────────────────────────────────────────────────────────

class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    guide_id = Column(Integer, ForeignKey("guide_profiles.id"), nullable=False)
    slot_id = Column(Integer, ForeignKey("guide_time_slots.id"), nullable=False)
    place_id = Column(Integer, ForeignKey("tourist_places.id"), nullable=False)
    status = Column(Enum(BookingStatus), default=BookingStatus.pending)
    user_message = Column(Text, nullable=True)
    guide_response = Column(Text, nullable=True)
    start_code = Column(String(10), nullable=True)
    user_completed = Column(Boolean, default=False)
    guide_completed = Column(Boolean, default=False)
    booking_date = Column(Date, nullable=False)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("User", foreign_keys=[user_id], back_populates="bookings_as_user")
    guide = relationship("GuideProfile", foreign_keys=[guide_id], back_populates="bookings_as_guide")
    slot = relationship("GuideTimeSlot", back_populates="booking")
    place = relationship("TouristPlace", back_populates="bookings")
    rating = relationship("Rating", back_populates="booking", uselist=False)


# ─── Rating ──────────────────────────────────────────────────────────────────

class Rating(Base):
    __tablename__ = "ratings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    booking_id = Column(Integer, ForeignKey("bookings.id"), unique=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    guide_id = Column(Integer, ForeignKey("guide_profiles.id"), nullable=False)
    rating = Column(Integer, nullable=False)  # 1-5
    review_text = Column(Text, nullable=True)
    created_at = Column(DateTime, default=func.now())

    # Relationships
    booking = relationship("Booking", back_populates="rating")
    user = relationship("User", foreign_keys=[user_id], back_populates="ratings_given")
    guide = relationship("GuideProfile", foreign_keys=[guide_id], back_populates="ratings_received")


# ─── OTP Token ───────────────────────────────────────────────────────────────

class OTPToken(Base):
    __tablename__ = "otp_tokens"

    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String(150), nullable=False, index=True)
    otp_code = Column(String(10), nullable=False)
    purpose = Column(Enum(OTPPurpose), nullable=False)
    expires_at = Column(DateTime, nullable=False)
    is_used = Column(Boolean, default=False)
    created_at = Column(DateTime, default=func.now())

    user_ref = relationship("User", foreign_keys=[email],
                             primaryjoin="OTPToken.email == User.email")


# ─── Place Add Request ────────────────────────────────────────────────────────

class PlaceAddRequest(Base):
    __tablename__ = "place_add_requests"

    id = Column(Integer, primary_key=True, autoincrement=True)
    guide_id = Column(Integer, ForeignKey("guide_profiles.id"), nullable=False)
    place_name = Column(String(200), nullable=False)
    city = Column(String(100))
    state = Column(String(100))
    zone = Column(String(100))
    type = Column(String(100))
    significance = Column(String(100))
    description = Column(Text, nullable=True)
    photo_url = Column(String(500), nullable=True)
    entrance_fee_inr = Column(Integer, default=0)
    status = Column(Enum(ApprovalStatus), default=ApprovalStatus.pending)
    admin_note = Column(Text, nullable=True)
    reviewed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=func.now())

    # Relationships
    guide = relationship("GuideProfile", back_populates="place_requests")
    reviewer = relationship("User", foreign_keys=[reviewed_by])


# ─── Guide Vacation / Blocked Days ───────────────────────────────────────────

class GuideVacation(Base):
    __tablename__ = "guide_vacations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    guide_id = Column(Integer, ForeignKey("guide_profiles.id", ondelete="CASCADE"), nullable=False)
    blocked_date = Column(Date, nullable=False)
    reason = Column(String(200), nullable=True)
    created_at = Column(DateTime, default=func.now())

    __table_args__ = (UniqueConstraint("guide_id", "blocked_date", name="uq_guide_vacation"),)

    guide = relationship("GuideProfile", foreign_keys=[guide_id])

