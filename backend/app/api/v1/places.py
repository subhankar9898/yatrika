from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from typing import Optional, List
import math

from app.db.mysql_session import get_db
from app.models.mysql import TouristPlace, GuidePlaceAssignment, ApprovalStatus
from app.schemas.places import PlaceResponse, PlaceListResponse

router = APIRouter(prefix="/places", tags=["Tourist Places"])


@router.get("", response_model=PlaceListResponse)
def get_places(
    # Pagination
    page: int = Query(1, ge=1),
    per_page: int = Query(12, ge=1, le=50),
    # Search
    search: Optional[str] = Query(None),
    # Filters
    zone: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    type: Optional[str] = Query(None),
    significance: Optional[str] = Query(None),
    best_time: Optional[str] = Query(None),
    min_rating: Optional[float] = Query(None),
    max_fee: Optional[int] = Query(None),
    free_entry: Optional[bool] = Query(None),
    dslr_allowed: Optional[bool] = Query(None),
    has_airport: Optional[bool] = Query(None),
    # Sorting
    sort_by: Optional[str] = Query("google_rating", enum=["google_rating", "name", "entrance_fee_inr", "time_needed_hrs"]),
    sort_order: Optional[str] = Query("desc", enum=["asc", "desc"]),
    db: Session = Depends(get_db),
):
    query = db.query(TouristPlace).filter(
        TouristPlace.is_active == True,
        TouristPlace.approval_status == ApprovalStatus.approved,
    )

    # Search
    if search:
        term = f"%{search}%"
        query = query.filter(or_(
            TouristPlace.name.ilike(term),
            TouristPlace.city.ilike(term),
            TouristPlace.state.ilike(term),
            TouristPlace.type.ilike(term),
            TouristPlace.significance.ilike(term),
        ))

    # Filters
    if zone:       query = query.filter(TouristPlace.zone == zone)
    if state:      query = query.filter(TouristPlace.state == state)
    if city:       query = query.filter(TouristPlace.city == city)
    if type:       query = query.filter(TouristPlace.type == type)
    if significance: query = query.filter(TouristPlace.significance == significance)
    if best_time:  query = query.filter(TouristPlace.best_time_to_visit.ilike(f"%{best_time}%"))
    if min_rating: query = query.filter(TouristPlace.google_rating >= min_rating)
    if max_fee is not None: query = query.filter(TouristPlace.entrance_fee_inr <= max_fee)
    if free_entry: query = query.filter(TouristPlace.entrance_fee_inr == 0)
    if dslr_allowed is not None: query = query.filter(TouristPlace.dslr_allowed == dslr_allowed)
    if has_airport is not None: query = query.filter(TouristPlace.has_airport_50km == has_airport)

    # Sorting
    sort_col = getattr(TouristPlace, sort_by, TouristPlace.google_rating)
    if sort_order == "desc":
        query = query.order_by(sort_col.desc())
    else:
        query = query.order_by(sort_col.asc())

    total = query.count()
    total_pages = math.ceil(total / per_page) if total else 1
    places = query.offset((page - 1) * per_page).limit(per_page).all()

    # Attach guide count per place
    guide_counts = {
        row[0]: row[1] for row in db.query(
            GuidePlaceAssignment.place_id,
            func.count(GuidePlaceAssignment.id)
        ).group_by(GuidePlaceAssignment.place_id).all()
    }

    items = []
    for place in places:
        p = PlaceResponse.model_validate(place)
        p.guide_count = guide_counts.get(place.id, 0)
        items.append(p)

    return PlaceListResponse(
        items=items, total=total, page=page, per_page=per_page, total_pages=total_pages
    )


@router.get("/filters/options")
def get_filter_options(db: Session = Depends(get_db)):
    """Return distinct values for each filterable field — used to populate dropdowns."""
    base = db.query(TouristPlace).filter(
        TouristPlace.is_active == True,
        TouristPlace.approval_status == ApprovalStatus.approved,
    )
    zones       = sorted([r[0] for r in base.with_entities(TouristPlace.zone).distinct().all() if r[0]])
    states      = sorted([r[0] for r in base.with_entities(TouristPlace.state).distinct().all() if r[0]])
    cities      = sorted([r[0] for r in base.with_entities(TouristPlace.city).distinct().all() if r[0]])
    types       = sorted([r[0] for r in base.with_entities(TouristPlace.type).distinct().all() if r[0]])
    signifs     = sorted([r[0] for r in base.with_entities(TouristPlace.significance).distinct().all() if r[0]])
    best_times  = sorted([r[0] for r in base.with_entities(TouristPlace.best_time_to_visit).distinct().all() if r[0]])
    return {
        "zones": zones, "states": states, "cities": cities,
        "types": types, "significance": signifs, "best_times": best_times,
    }


@router.get("/{place_id}", response_model=PlaceResponse)
def get_place(place_id: int, db: Session = Depends(get_db)):
    place = db.query(TouristPlace).filter(
        TouristPlace.id == place_id,
        TouristPlace.is_active == True,
    ).first()
    if not place:
        raise HTTPException(status_code=404, detail="Place not found")
    guide_count = db.query(GuidePlaceAssignment).filter(
        GuidePlaceAssignment.place_id == place_id
    ).count()
    p = PlaceResponse.model_validate(place)
    p.guide_count = guide_count
    return p


@router.get("/{place_id}/guides")
def get_place_guides(place_id: int, db: Session = Depends(get_db)):
    from app.models.mysql import GuideProfile, User
    assignments = (
        db.query(GuideProfile, User)
        .join(User, GuideProfile.user_id == User.id)
        .join(GuidePlaceAssignment, GuidePlaceAssignment.guide_id == GuideProfile.id)
        .filter(GuidePlaceAssignment.place_id == place_id, User.is_active == True)
        .all()
    )
    return [
        {
            "id": gp.id,
            "user_id": u.id,
            "full_name": u.full_name,
            "email": u.email,
            "profile_photo_url": u.profile_photo_url,
            "bio": gp.bio,
            "languages": gp.languages,
            "experience_years": gp.experience_years,
            "average_rating": float(gp.average_rating),
            "total_tours_completed": gp.total_tours_completed,
        }
        for gp, u in assignments
    ]
