from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class PlaceBase(BaseModel):
    name: str
    city: str
    state: str
    zone: str
    type: str
    significance: Optional[str] = None
    establishment_year: Optional[str] = None
    time_needed_hrs: Optional[float] = None
    google_rating: Optional[float] = None
    entrance_fee_inr: int = 0
    has_airport_50km: bool = False
    weekly_off: Optional[str] = None
    dslr_allowed: bool = True
    google_reviews_lakhs: Optional[float] = None
    best_time_to_visit: Optional[str] = None
    description: Optional[str] = None
    photo_url: Optional[str] = None


class PlaceCreate(PlaceBase):
    pass


class PlaceUpdate(PlaceBase):
    name: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zone: Optional[str] = None
    type: Optional[str] = None


class PlaceResponse(PlaceBase):
    id: int
    is_active: bool
    approval_status: str
    created_at: datetime
    guide_count: int = 0

    model_config = {"from_attributes": True}


class PlaceListResponse(BaseModel):
    items: List[PlaceResponse]
    total: int
    page: int
    per_page: int
    total_pages: int
