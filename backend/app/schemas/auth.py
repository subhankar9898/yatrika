from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
from datetime import datetime
from app.models.mysql import UserRole


# ─── Register ────────────────────────────────────────────────────────────────

class UserRegisterRequest(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    phone: Optional[str] = None

    @field_validator("password")
    @classmethod
    def password_strength(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v

    @field_validator("full_name")
    @classmethod
    def name_not_empty(cls, v):
        if not v.strip():
            raise ValueError("Full name cannot be empty")
        return v.strip()


class GuideRegisterRequest(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    phone: Optional[str] = None
    bio: Optional[str] = None
    languages: Optional[list[str]] = ["English"]
    experience_years: Optional[int] = 0


# ─── OTP ─────────────────────────────────────────────────────────────────────

class OTPVerifyRequest(BaseModel):
    email: EmailStr
    otp_code: str
    purpose: str = "signup"


class OTPResendRequest(BaseModel):
    email: EmailStr
    purpose: str = "signup"


# ─── Login ───────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: EmailStr
    password: str


# ─── Token Response ──────────────────────────────────────────────────────────

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserResponse"


class UserResponse(BaseModel):
    id: int
    full_name: str
    email: str
    role: UserRole
    is_verified: bool
    is_active: bool
    profile_photo_url: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── Profile Change OTP ──────────────────────────────────────────────────────

class ProfileChangeOTPRequest(BaseModel):
    """Initiate OTP for profile changes (guide only)."""
    pass  # Just needs auth — email taken from JWT


class ProfileChangeOTPVerify(BaseModel):
    otp_code: str


# ─── Forgot Password ─────────────────────────────────────────────────────────

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    email: EmailStr
    otp_code: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def password_strength(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v
