from app.db.mysql_session import SessionLocal
from app.models.mysql import TouristPlace

db = SessionLocal()
try:
    places = db.query(TouristPlace).all()
    wiki = 0
    unsplash = 0
    empty = 0
    other = 0
    for p in places:
        url = p.photo_url
        if not url:
            empty += 1
        elif "wikimedia" in url or "wikipedia" in url:
            wiki += 1
        elif "unsplash.com" in url:
            unsplash += 1
        else:
            other += 1
            
    print(f"Total Places: {len(places)}")
    print(f"Wikipedia Images: {wiki}")
    print(f"Unsplash Images: {unsplash}")
    print(f"Empty/None: {empty}")
    print(f"Other: {other}")
finally:
    db.close()
