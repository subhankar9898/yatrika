"""
Run once to seed all 325 tourist places from Top.csv into MySQL.
Usage: python -m scripts.seed_places
"""
import sys, os
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

import pandas as pd
from app.db.mysql_session import SessionLocal, Base, engine
from app.models.mysql import TouristPlace, ApprovalStatus
from dotenv import load_dotenv
load_dotenv()

# Unsplash photo map — type → a relevant royalty-free photo URL
PHOTO_MAP = {
    "Temple":           "https://images.unsplash.com/photo-1621415814107-079d01d42e28?w=800",
    "Fort":             "https://images.unsplash.com/photo-1587474260584-136574528ed5?w=800",
    "Monument":         "https://images.unsplash.com/photo-1548013146-72479768bada?w=800",
    "Museum":           "https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=800",
    "Beach":            "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800",
    "National Park":    "https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=800",
    "Palace":           "https://images.unsplash.com/photo-1564507592333-c60657eea523?w=800",
    "Park":             "https://images.unsplash.com/photo-1519331379826-f10be5486c6f?w=800",
    "Lake":             "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=800",
    "Waterfall":        "https://images.unsplash.com/photo-1426604966848-d7adac402bff?w=800",
    "Cave":             "https://images.unsplash.com/photo-1504701954957-2010ec3bcec1?w=800",
    "Botanical Garden": "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800",
    "Zoo":              "https://images.unsplash.com/photo-1564349683136-77e08dba1ef7?w=800",
    "Amusement Park":   "https://images.unsplash.com/photo-1543877087-ebf71fde2be1?w=800",
    "Church":           "https://images.unsplash.com/photo-1508669232496-137b159c1cdb?w=800",
    "Mosque":           "https://images.unsplash.com/photo-1564769625673-87c7ae2e5b5f?w=800",
    "Gurudwara":        "https://images.unsplash.com/photo-1566438480900-0609be27a4be?w=800",
    "Science":          "https://images.unsplash.com/photo-1532094349884-543559196c2b?w=800",
    "Promenade":        "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800",
    "Hill":             "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800",
    "Valley":           "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=800",
    "Island":           "https://images.unsplash.com/photo-1559128010-7c1ad6e1b6a5?w=800",
    "Monastery":        "https://images.unsplash.com/photo-1558618047-3c8c76ca5327?w=800",
    "Tomb":             "https://images.unsplash.com/photo-1564507592333-c60657eea523?w=800",
    "Stepwell":         "https://images.unsplash.com/photo-1548013146-72479768bada?w=800",
    "Bridge":           "https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=800",
    "Market":           "https://images.unsplash.com/photo-1555952517-2e8e729e0b44?w=800",
    "Mall":             "https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=800",
    "Theme Park":       "https://images.unsplash.com/photo-1543877087-ebf71fde2be1?w=800",
    "Wildlife Sanctuary":"https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=800",
    "Bird Sanctuary":   "https://images.unsplash.com/photo-1444464666168-49d633b86797?w=800",
    "Observatory":      "https://images.unsplash.com/photo-1532094349884-543559196c2b?w=800",
    "Film Studio":      "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=800",
    "Historical":       "https://images.unsplash.com/photo-1548013146-72479768bada?w=800",
    "Township":         "https://images.unsplash.com/photo-1519331379826-f10be5486c6f?w=800",
    "Landmark":         "https://images.unsplash.com/photo-1548013146-72479768bada?w=800",
    "Religious Shrine": "https://images.unsplash.com/photo-1566438480900-0609be27a4be?w=800",
    "Rock Carvings":    "https://images.unsplash.com/photo-1548013146-72479768bada?w=800",
    "Natural Feature":  "https://images.unsplash.com/photo-1426604966848-d7adac402bff?w=800",
    "Site":             "https://images.unsplash.com/photo-1548013146-72479768bada?w=800",
    "Entertainment":    "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=800",
    "Aquarium":         "https://images.unsplash.com/photo-1534567153574-2b12153a87f0?w=800",
    "Cricket Ground":   "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=800",
    "Race Track":       "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800",
    "Government Building":"https://images.unsplash.com/photo-1587474260584-136574528ed5?w=800",
    "Spiritual Center": "https://images.unsplash.com/photo-1566438480900-0609be27a4be?w=800",
}

DEFAULT_PHOTO = "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=800"


def get_photo(place_type: str) -> str:
    return PHOTO_MAP.get(place_type, DEFAULT_PHOTO)


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        existing = db.query(TouristPlace).count()
        if existing > 0:
            print(f"⚠️  Database already has {existing} places. Skipping seed.")
            print("    To re-seed: DELETE FROM tourist_places; then run again.")
            return

        csv_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "Top.csv")
        if not os.path.exists(csv_path):
            print(f"❌ CSV not found at {csv_path}")
            return

        df = pd.read_csv(csv_path)
        print(f"📂 Loading {len(df)} places from CSV...")

        places = []
        for _, row in df.iterrows():
            def safe(val, cast=str):
                try:
                    if pd.isna(val): return None
                    return cast(val) if cast != str else str(val).strip()
                except Exception:
                    return None

            def safe_bool(val):
                if pd.isna(val): return False
                return str(val).strip().lower() in ("yes", "true", "1")

            place_type = safe(row.get("Type")) or "Site"

            place = TouristPlace(
                name=safe(row.get("Name")) or "Unknown",
                city=safe(row.get("City")),
                state=safe(row.get("State")),
                zone=safe(row.get("Zone")),
                type=place_type,
                significance=safe(row.get("Significance")),
                establishment_year=safe(row.get("Establishment Year")),
                time_needed_hrs=safe(row.get("time needed to visit in hrs"), float),
                google_rating=safe(row.get("Google review rating"), float),
                entrance_fee_inr=int(safe(row.get("Entrance Fee in INR"), float) or 0),
                has_airport_50km=safe_bool(row.get("Airport with 50km Radius")),
                weekly_off=safe(row.get("Weekly Off")),
                dslr_allowed=safe_bool(row.get("DSLR Allowed")),
                google_reviews_lakhs=safe(row.get("Number of google review in lakhs"), float),
                best_time_to_visit=safe(row.get("Best Time to visit")),
                photo_url=get_photo(place_type),
                is_active=True,
                approval_status=ApprovalStatus.approved,
            )
            places.append(place)

        db.bulk_save_objects(places)
        db.commit()
        print(f"✅ Seeded {len(places)} tourist places successfully!")

    except Exception as e:
        db.rollback()
        print(f"❌ Seeding failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
