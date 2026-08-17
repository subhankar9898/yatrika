"""
Run to safely wipe and re-seed dummy users, guides, and realistic 7-day live timeslots.
Usage: python -m scripts.seed_guides
"""
import sys, os, random
from datetime import datetime, timedelta, date, time
from faker import Faker
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from app.db.mysql_session import SessionLocal, Base, engine
from app.models.mysql import User, GuideProfile, TouristPlace, GuidePlaceAssignment, GuideTimeSlot, UserRole, ApprovalStatus, SlotStatus
from app.core.security import hash_password

faker = Faker('en_IN')

LANGUAGES = ["English", "Hindi", "Bengali", "Tamil", "Marathi", "Telugu", "Gujarati", "Kannada"]
PHOTOS = [
    "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=500",
    "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=500",
    "https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?w=500",
    "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=500",
    "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=500",
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500",
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500"
]

def create_users_and_guides(db):
    try:
        # First, safely clear previously created dummy data.
        print("Trashing old dummy data...")
        db.query(GuidePlaceAssignment).delete()
        db.query(GuideTimeSlot).delete()
        db.query(GuideProfile).delete()
        
        # Don't delete admin accounts
        admin_user = db.query(User).filter(User.role == UserRole.admin).first()
        admin_id = admin_user.id if admin_user else 0
        db.query(User).filter(User.role.in_([UserRole.guide, UserRole.user]), User.id != admin_id).delete(synchronize_session=False)
        db.commit()
        
        print("Cleared dummy users and guides successfully.")

        places = db.query(TouristPlace).all()
        if not places:
            print("❌ No tourist places found in database! Please run seed_places.py first.")
            return

        # Explicitly hash this once instead of rehashing it repeatedly 
        common_pwd_hash = hash_password("Yatrika123")
        
        # Create Dummy Regular Users
        print("Creating 50 dummy regular users...")
        for _ in range(50):
            u = User(
                full_name=faker.name(),
                email=faker.unique.email(),
                role=UserRole.user,
                is_verified=True,
                is_active=True,
                password_hash=common_pwd_hash,
                phone=faker.phone_number()
            )
            db.add(u)
        db.commit()

        # Create Guides Pool
        total_guides = int(len(places) * 1.5) 
        print(f"Creating {total_guides} guide profiles with shared password...")
        guides_pool = []
        for _ in range(total_guides):
            user = User(
                full_name=faker.name(),
                email=faker.unique.email(),
                role=UserRole.guide,
                is_verified=True,
                is_active=True,
                profile_photo_url=random.choice(PHOTOS),
                phone=faker.phone_number(),
                password_hash=common_pwd_hash
            )
            db.add(user)
            db.commit()

            num_langs = random.randint(1, 3)
            user_langs = random.sample(LANGUAGES, num_langs)
            if "English" not in user_langs and random.random() > 0.3:
                user_langs.append("English")

            profile = GuideProfile(
                user_id=user.id,
                bio=faker.paragraph(nb_sentences=3),
                languages=user_langs,
                experience_years=random.randint(1, 15),
                approval_status=ApprovalStatus.approved,
                total_tours_completed=random.randint(5, 200),
                average_rating=round(random.uniform(3.5, 5.0), 2)
            )
            db.add(profile)
            db.commit()
            guides_pool.append(profile)

        assigner_id = admin_id if admin_id > 0 else guides_pool[0].user_id
        
        print("Assigning guides and generating live 7-day time slots...")
        today = date.today()
        dates_to_generate = [today + timedelta(days=i) for i in range(7)]
        slots = [
            (time(9, 0), time(12, 0)),
            (time(14, 0), time(17, 0))
        ]

        total_assignments = 0
        total_timeslots = 0
        generated_slots = set()
        
        for place in places:
            num_guides = random.randint(2, 3)
            chosen_guides = random.sample(guides_pool, num_guides)
            
            for cg in chosen_guides:
                # Add assignment, but don't error if it already exists
                try:
                    assignment = GuidePlaceAssignment(
                        guide_id=cg.id,
                        place_id=place.id,
                        assigned_by=assigner_id
                    )
                    db.add(assignment)
                    db.flush()
                    total_assignments += 1
                except Exception:
                    db.rollback()
                    continue
                
                for d in dates_to_generate:
                    # Randomly skip some days so the calendar doesn't look completely artificial
                    if random.random() > 0.8:
                        continue
                    
                    for (start_t, end_t) in slots:
                        slot_key = (cg.id, d, start_t)
                        if slot_key in generated_slots:
                            continue
                        
                        generated_slots.add(slot_key)
                        ts = GuideTimeSlot(
                            guide_id=cg.id,
                            place_id=place.id,
                            slot_date=d,
                            start_time=start_t,
                            end_time=end_t,
                            status=SlotStatus.available,
                            max_duration_hrs=3.0
                        )
                        db.add(ts)
                        total_timeslots += 1

        db.commit()
        print(f"✅ Seeded {len(guides_pool)} guides, 50 regular users, {total_assignments} assignments, and {total_timeslots} live timeslots successfully!")

    except Exception as e:
        db.rollback()
        print(f"❌ Seeding failed: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    create_users_and_guides(db)
