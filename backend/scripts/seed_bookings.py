"""
Seed dummy bookings, place-add requests, and ratings.
Usage: cd backend && source venv/bin/activate && python scripts/seed_bookings.py
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import random
from datetime import date, time, timedelta, datetime, timezone
from app.db.mysql_session import SessionLocal
from app.models.mysql import (
    User, UserRole, GuideProfile, TouristPlace, GuidePlaceAssignment,
    GuideTimeSlot, Booking, Rating, PlaceAddRequest,
    SlotStatus, BookingStatus, ApprovalStatus
)

db = SessionLocal()

# Get all regular users, approved guides, and active places
users = db.query(User).filter(User.role == UserRole.user, User.is_active == True).all()
guide_profiles = db.query(GuideProfile).filter(GuideProfile.approval_status == ApprovalStatus.approved).all()
places = db.query(TouristPlace).filter(TouristPlace.is_active == True).all()

if not users:
    print("❌ No users found. Please seed users first.")
    sys.exit(1)
if not guide_profiles:
    print("❌ No approved guides found. Please seed guides first.")
    sys.exit(1)
if not places:
    print("❌ No places found. Please seed places first.")
    sys.exit(1)

print(f"Found {len(users)} users, {len(guide_profiles)} guides, {len(places)} places")

# ── Create guide-place assignments if missing
for gp in guide_profiles:
    existing = db.query(GuidePlaceAssignment).filter(GuidePlaceAssignment.guide_id == gp.id).count()
    if existing == 0:
        # Assign each guide to 1-3 random places
        for p in random.sample(places, min(random.randint(1, 3), len(places))):
            try:
                db.add(GuidePlaceAssignment(guide_id=gp.id, place_id=p.id, assigned_by=1))
                db.flush()
            except Exception:
                db.rollback()

db.commit()
print("✅ Guide-place assignments ensured")

# ── Create dummy time slots + bookings
USER_MESSAGES = [
    "Hi, I'd love a detailed heritage tour!",
    "Can we focus on photography spots?",
    "I have a family of 4, including kids.",
    "Is this suitable for elderly travelers?",
    "Looking forward to learning the history!",
    "We are a group of college friends.",
    "First time in this city, excited!",
    None,
]

GUIDE_RESPONSES = [
    "Welcome! I'll prepare a great route for you.",
    "Sure, I know the best photo spots!",
    "Absolutely, this place is family-friendly.",
    "Looking forward to showing you around!",
    None,
]

today = date.today()
bookings_created = 0
slots_created = 0

for i in range(40):
    gp = random.choice(guide_profiles)
    
    # Find places this guide is assigned to
    assignments = db.query(GuidePlaceAssignment).filter(GuidePlaceAssignment.guide_id == gp.id).all()
    if not assignments:
        continue

    assignment = random.choice(assignments)
    place = db.query(TouristPlace).filter(TouristPlace.id == assignment.place_id).first()
    if not place:
        continue
    
    user = random.choice(users)
    
    # Random date in the last 10 days or next 5 days
    offset = random.randint(-10, 5)
    slot_date = today + timedelta(days=offset)
    
    # Random time slot
    start_hour = random.choice([8, 9, 10, 11, 14, 15, 16])
    end_hour = start_hour + random.choice([2, 3])
    
    # Check if slot already exists
    existing_slot = db.query(GuideTimeSlot).filter(
        GuideTimeSlot.guide_id == gp.id,
        GuideTimeSlot.slot_date == slot_date,
        GuideTimeSlot.start_time == time(start_hour, 0),
    ).first()
    
    if existing_slot:
        continue
    
    # Decide booking status
    if offset < -3:
        status = random.choice([BookingStatus.completed, BookingStatus.completed, BookingStatus.rejected])
    elif offset < 0:
        status = random.choice([BookingStatus.accepted, BookingStatus.completed, BookingStatus.cancelled])
    else:
        status = random.choice([BookingStatus.pending, BookingStatus.accepted, BookingStatus.pending])
    
    slot_status = SlotStatus.booked if status in (BookingStatus.accepted, BookingStatus.completed) else SlotStatus.available
    
    slot = GuideTimeSlot(
        guide_id=gp.id,
        place_id=place.id,
        slot_date=slot_date,
        start_time=time(start_hour, 0),
        end_time=time(end_hour, 0),
        status=slot_status,
    )
    db.add(slot)
    db.flush()
    slots_created += 1
    
    # Create booking with a realistic created_at timestamp
    created_at = datetime.now(timezone.utc) - timedelta(days=max(0, -offset + random.randint(0, 2)))
    booking = Booking(
        user_id=user.id,
        guide_id=gp.id,
        slot_id=slot.id,
        place_id=place.id,
        status=status,
        user_message=random.choice(USER_MESSAGES),
        guide_response=random.choice(GUIDE_RESPONSES) if status != BookingStatus.pending else None,
        booking_date=slot_date,
        created_at=created_at,
    )
    db.add(booking)
    db.flush()
    bookings_created += 1
    
    # Add rating for completed bookings (70% chance)
    if status == BookingStatus.completed and random.random() < 0.7:
        rating_val = random.choices([5, 4, 3, 4, 5], weights=[30, 30, 10, 20, 10])[0]
        review_texts = [
            "Amazing tour! Learned so much about the history.",
            "Great guide, very knowledgeable and friendly.",
            "The tour was good but a bit rushed.",
            "Excellent experience, highly recommended!",
            "Very informative and well-organized tour.",
            "Wonderful guide, made the experience memorable!",
            None,
        ]
        rating = Rating(
            booking_id=booking.id,
            user_id=user.id,
            guide_id=gp.id,
            rating=rating_val,
            review_text=random.choice(review_texts),
        )
        db.add(rating)

db.commit()
print(f"✅ Created {slots_created} time slots and {bookings_created} bookings")

# ── Update guide average ratings
for gp in guide_profiles:
    ratings = db.query(Rating).filter(Rating.guide_id == gp.id).all()
    if ratings:
        gp.average_rating = sum(r.rating for r in ratings) / len(ratings)
        completed = db.query(Booking).filter(
            Booking.guide_id == gp.id,
            Booking.status == BookingStatus.completed,
        ).count()
        gp.total_tours_completed = completed

db.commit()
print("✅ Updated guide average ratings")

# ── Seed dummy place-add requests from guides
PLACE_REQUESTS = [
    {"place_name": "Charminar Night Market", "city": "Hyderabad", "state": "Telangana", "zone": "South", "type": "Market", "description": "A vibrant night market near the iconic Charminar."},
    {"place_name": "Rishikesh Adventure Camp", "city": "Rishikesh", "state": "Uttarakhand", "zone": "North", "type": "Adventure", "description": "Camping and rafting adventure experience."},
    {"place_name": "Sundarbans Boat Safari", "city": "Sundarbans", "state": "West Bengal", "zone": "East", "type": "Wildlife", "description": "Boat safari through the mangrove forests."},
    {"place_name": "Hampi Ruins Heritage Walk", "city": "Hampi", "state": "Karnataka", "zone": "South", "type": "Heritage", "description": "Guided walk through the ancient Vijayanagara Empire ruins."},
    {"place_name": "Jaisalmer Desert Festival", "city": "Jaisalmer", "state": "Rajasthan", "zone": "West", "type": "Cultural", "description": "Experience the annual desert festival with camel rides."},
]

requests_created = 0
for req_data in PLACE_REQUESTS:
    gp = random.choice(guide_profiles)
    exists = db.query(PlaceAddRequest).filter(PlaceAddRequest.place_name == req_data["place_name"]).first()
    if not exists:
        pr = PlaceAddRequest(
            guide_id=gp.id,
            significance="Cultural",
            entrance_fee_inr=random.choice([0, 50, 100, 200, 500]),
            **req_data,
        )
        db.add(pr)
        requests_created += 1

db.commit()
print(f"✅ Created {requests_created} place-add requests")

db.close()
print("\n🎉 Seeding complete!")
