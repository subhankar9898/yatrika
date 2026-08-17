from fastapi import APIRouter, Depends, HTTPException, status, Response, Request, BackgroundTasks
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone
import httpx

from app.core.dependencies import security
from app.db.mysql_session import get_db
from app.db.redis_client import (
    check_otp_rate_limit, check_login_attempts,
    record_failed_login, clear_login_attempts, blacklist_refresh_token
)
from app.core.security import (
    hash_password, verify_password, generate_otp,
    create_access_token, create_refresh_token, decode_token
)
from app.core.config import settings
from app.models.mysql import User, UserRole, OTPToken, OTPPurpose, GuideProfile, ApprovalStatus
from app.schemas.auth import (
    UserRegisterRequest, GuideRegisterRequest, OTPVerifyRequest,
    OTPResendRequest, LoginRequest, TokenResponse, UserResponse
)
from app.utils.notification_helpers import notify_admins
from app.models.extra import NotificationType
from app.utils.email_service import (
    send_otp, send_welcome, send_guide_registration_pending
)
from app.services.logger_service import log_activity_background

router = APIRouter(prefix="/auth", tags=["Authentication"])


def _otp_expires_at() -> datetime:
    """Naive UTC expiry — matches MySQL DATETIME reads."""
    return datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(minutes=10)


def _otp_now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _resolve_otp_purpose(purpose: str) -> OTPPurpose:
    try:
        return OTPPurpose(purpose)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid OTP purpose")


def _find_valid_otp(db: Session, email: str, otp_code: str, purpose: OTPPurpose) -> OTPToken | None:
    return (
        db.query(OTPToken)
        .filter(
            OTPToken.email == email,
            OTPToken.otp_code == otp_code,
            OTPToken.purpose == purpose,
            OTPToken.is_used == False,
            OTPToken.expires_at > _otp_now(),
        )
        .order_by(OTPToken.created_at.desc())
        .first()
    )


async def _issue_otp(db: Session, email: str, purpose: OTPPurpose) -> dict:
    allowed = await check_otp_rate_limit(email)
    if not allowed:
        raise HTTPException(status_code=429, detail="Too many OTP requests. Try again in 15 minutes.")

    otp_code = generate_otp()
    db.add(
        OTPToken(
            email=email,
            otp_code=otp_code,
            purpose=purpose,
            expires_at=_otp_expires_at(),
        )
    )
    db.commit()
    return send_otp(email, otp_code, purpose.value)


# ─── User Registration ────────────────────────────────────────────────────────

@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register_user(
    payload: UserRegisterRequest,
    db: Session = Depends(get_db),
):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        if existing.is_verified:
            raise HTTPException(status_code=400, detail="Email already registered")
        if existing.role != UserRole.user:
            raise HTTPException(status_code=400, detail="Email already registered as a guide. Use guide registration.")
        existing.full_name = payload.full_name
        existing.password_hash = hash_password(payload.password)
        existing.phone = payload.phone
        db.commit()
    else:
        user = User(
            full_name=payload.full_name,
            email=payload.email,
            password_hash=hash_password(payload.password),
            phone=payload.phone,
            role=UserRole.user,
            is_verified=False,
            is_active=True,
        )
        db.add(user)
        db.commit()

    email_result = await _issue_otp(db, payload.email, OTPPurpose.signup)
    if not email_result.get("sent"):
        raise HTTPException(
            status_code=503,
            detail=email_result.get("error") or "Could not send OTP email. Check Gmail settings in backend/.env",
        )

    return {
        "message": "OTP sent to your email. Please verify to complete registration.",
        "email_sent": True,
    }


# ─── OTP Verification ─────────────────────────────────────────────────────────

@router.post("/verify-otp")
async def verify_otp(
    payload: OTPVerifyRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    purpose = _resolve_otp_purpose(payload.purpose)
    otp = _find_valid_otp(db, payload.email, payload.otp_code, purpose)
    if not otp:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")

    otp.is_used = True

    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_verified = True
    user.is_active = True
    db.commit()

    if purpose == OTPPurpose.signup and user.role == UserRole.user:
        background_tasks.add_task(send_welcome, user.email, user.full_name)
    elif purpose == OTPPurpose.guide_signup or (
        purpose == OTPPurpose.signup and user.role == UserRole.guide
    ):
        background_tasks.add_task(send_guide_registration_pending, user.email, user.full_name)
        notify_admins(
            db,
            NotificationType.system,
            "New guide registration",
            f"{user.full_name} ({user.email}) registered as a guide and awaits approval.",
            "/admin/approvals",
        )
        db.commit()

    if user.role == UserRole.guide:
        return {
            "message": "Email verified. Your guide application is awaiting admin approval.",
        }
    return {"message": "Email verified successfully. You can now log in."}


# ─── Resend OTP ───────────────────────────────────────────────────────────────

@router.post("/resend-otp")
async def resend_otp(
    payload: OTPResendRequest,
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Email not found")
    if user.is_verified:
        raise HTTPException(status_code=400, detail="Email is already verified")

    purpose = _resolve_otp_purpose(payload.purpose)
    email_result = await _issue_otp(db, payload.email, purpose)
    if not email_result.get("sent"):
        raise HTTPException(
            status_code=503,
            detail=email_result.get("error") or "Could not send OTP email. Check Gmail settings in backend/.env",
        )

    return {"message": "New OTP sent to your email.", "email_sent": True}


# ─── Forgot Password ─────────────────────────────────────────────────────────

@router.post("/forgot-password")
async def forgot_password(
    payload: __import__("app.schemas.auth", fromlist=["ForgotPasswordRequest"]).ForgotPasswordRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="The email id is not registered")

    allowed = await check_otp_rate_limit(payload.email)
    if not allowed:
        raise HTTPException(status_code=429, detail="Too many requests. Try again in 15 minutes.")

    email_result = await _issue_otp(db, payload.email, OTPPurpose.profile_change)
    if not email_result.get("sent"):
        raise HTTPException(
            status_code=503,
            detail=email_result.get("error") or "Could not send OTP email.",
        )
    return {"message": "If that email is registered, we have sent a password reset OTP.", "email_sent": True}

@router.post("/reset-password")
async def reset_password(
    payload: __import__("app.schemas.auth", fromlist=["ResetPasswordRequest"]).ResetPasswordRequest,
    db: Session = Depends(get_db),
):
    otp = _find_valid_otp(db, payload.email, payload.otp_code, OTPPurpose.profile_change)

    if not otp:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")

    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Update password and invalidate OTP
    user.password_hash = hash_password(payload.new_password)
    otp.is_used = True
    db.commit()

    return {"message": "Password has been reset successfully. You can now log in."}


# ─── Login ────────────────────────────────────────────────────────────────────

@router.post("/login", response_model=TokenResponse)
async def login(
    payload: LoginRequest,
    response: Response,
    request: Request,
    db: Session = Depends(get_db),
):
    ip_address = request.client.host if request.client else "unknown"
    # Check brute-force
    allowed = await check_login_attempts(payload.email)
    if not allowed:
        raise HTTPException(
            status_code=429,
            detail="Too many failed login attempts. Account temporarily locked for 10 minutes."
        )

    user = db.query(User).filter(User.email == payload.email).first()

    if not user or not user.password_hash or not verify_password(payload.password, user.password_hash):
        await record_failed_login(payload.email)
        try:
            log_activity_background("failed_login", user_id=user.id if user else None, ip_address=ip_address, details={"email": payload.email})
        except Exception:
            pass
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not user.is_verified:
        raise HTTPException(status_code=403, detail="Please verify your email before logging in")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Your account has been deactivated")

    # For guide: check approval status
    if user.role == UserRole.guide:
        guide_profile = db.query(GuideProfile).filter(GuideProfile.user_id == user.id).first()
        if guide_profile and guide_profile.approval_status == ApprovalStatus.pending:
            raise HTTPException(status_code=403, detail="Your guide account is pending admin approval")
        if guide_profile and guide_profile.approval_status == ApprovalStatus.rejected:
            raise HTTPException(status_code=403, detail="Your guide registration was rejected")

    await clear_login_attempts(payload.email)

    # Issue tokens
    token_data = {"sub": str(user.id), "email": user.email, "role": user.role.value}
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)

    # Set refresh token as HttpOnly cookie
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=settings.APP_ENV == "production",
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
    )

    try:
        log_activity_background("successful_login", user_id=user.id, ip_address=ip_address, details={"email": payload.email})
    except Exception:
        pass

    return TokenResponse(
        access_token=access_token,
        user=UserResponse.model_validate(user),
    )


# ─── Token Refresh ────────────────────────────────────────────────────────────

@router.post("/refresh")
async def refresh_token(request: Request, response: Response, db: Session = Depends(get_db)):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token found")

    payload = decode_token(token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    user = db.query(User).filter(User.id == int(payload["sub"])).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")

    # Blacklist old refresh token
    old_jti = payload.get("jti")
    if old_jti:
        await blacklist_refresh_token(old_jti, settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400)

    # Issue new pair
    token_data = {"sub": str(user.id), "email": user.email, "role": user.role.value}
    new_access = create_access_token(token_data)
    new_refresh = create_refresh_token(token_data)

    response.set_cookie(
        key="refresh_token",
        value=new_refresh,
        httponly=True,
        secure=settings.APP_ENV == "production",
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
    )

    return {"access_token": new_access, "token_type": "bearer"}


# ─── Logout ───────────────────────────────────────────────────────────────────

@router.post("/logout")
async def logout(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if token:
        payload = decode_token(token)
        if payload:
            jti = payload.get("jti")
            if jti:
                await blacklist_refresh_token(jti, settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400)

    response.delete_cookie("refresh_token")
    return {"message": "Logged out successfully"}


# ─── GitHub OAuth ─────────────────────────────────────────────────────────────

@router.get("/github")
async def github_login():
    github_auth_url = (
        f"https://github.com/login/oauth/authorize"
        f"?client_id={settings.GITHUB_CLIENT_ID}"
        f"&redirect_uri={settings.GITHUB_REDIRECT_URI}"
        f"&scope=user:email"
    )
    return RedirectResponse(url=github_auth_url)


@router.get("/github/callback")
async def github_callback(
    code: str,
    response: Response,
    db: Session = Depends(get_db),
):
    async with httpx.AsyncClient() as client:
        # Exchange code for access token
        token_res = await client.post(
            "https://github.com/login/oauth/access_token",
            data={
                "client_id": settings.GITHUB_CLIENT_ID,
                "client_secret": settings.GITHUB_CLIENT_SECRET,
                "code": code,
                "redirect_uri": settings.GITHUB_REDIRECT_URI,
            },
            headers={"Accept": "application/json"},
        )
        token_data = token_res.json()
        gh_token = token_data.get("access_token")
        if not gh_token:
            raise HTTPException(status_code=400, detail="GitHub OAuth failed")

        # Get user profile
        user_res = await client.get(
            "https://api.github.com/user",
            headers={"Authorization": f"token {gh_token}", "Accept": "application/json"},
        )
        gh_user = user_res.json()

        # Get user emails (primary email)
        email_res = await client.get(
            "https://api.github.com/user/emails",
            headers={"Authorization": f"token {gh_token}", "Accept": "application/json"},
        )
        emails = email_res.json()
        primary_email = next(
            (e["email"] for e in emails if e.get("primary") and e.get("verified")),
            gh_user.get("email"),
        )

    if not primary_email:
        raise HTTPException(status_code=400, detail="Could not retrieve email from GitHub")

    # Find or create user
    user = db.query(User).filter(User.email == primary_email).first()
    if not user:
        user = User(
            full_name=gh_user.get("name") or gh_user.get("login"),
            email=primary_email,
            github_id=str(gh_user["id"]),
            role=UserRole.user,
            is_verified=True,
            is_active=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    elif not user.github_id:
        user.github_id = str(gh_user["id"])
        db.commit()

    # Issue tokens
    token_data = {"sub": str(user.id), "email": user.email, "role": user.role.value}
    access_token = create_access_token(token_data)
    refresh_token_val = create_refresh_token(token_data)

    # Redirect to frontend with access token in query param
    # Frontend should immediately store it in memory and clear from URL
    redirect_url = f"{settings.FRONTEND_URL}/auth/github/success?token={access_token}&role={user.role.value}"
    redirect_res = RedirectResponse(url=redirect_url)
    redirect_res.set_cookie(
        key="refresh_token",
        value=refresh_token_val,
        httponly=True,
        secure=settings.APP_ENV == "production",
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
    )
    return redirect_res


# ─── Guide Registration ───────────────────────────────────────────────────────

@router.post("/register/guide", status_code=status.HTTP_201_CREATED)
async def register_guide(
    payload: GuideRegisterRequest,
    db: Session = Depends(get_db),
):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        if existing.is_verified:
            raise HTTPException(status_code=400, detail="Email already registered")
        if existing.role != UserRole.guide:
            raise HTTPException(status_code=400, detail="Email already registered as a tourist. Please log in.")
        existing.full_name = payload.full_name
        existing.password_hash = hash_password(payload.password)
        existing.phone = payload.phone
        gp = db.query(GuideProfile).filter(GuideProfile.user_id == existing.id).first()
        if gp:
            gp.bio = payload.bio
            gp.languages = payload.languages
            gp.experience_years = payload.experience_years
        else:
            db.add(
                GuideProfile(
                    user_id=existing.id,
                    bio=payload.bio,
                    languages=payload.languages,
                    experience_years=payload.experience_years,
                    approval_status=ApprovalStatus.pending,
                )
            )
        user = existing
        db.commit()
    else:
        user = User(
            full_name=payload.full_name,
            email=payload.email,
            password_hash=hash_password(payload.password),
            phone=payload.phone,
            role=UserRole.guide,
            is_verified=False,
            is_active=True,
        )
        db.add(user)
        db.flush()
        db.add(
            GuideProfile(
                user_id=user.id,
                bio=payload.bio,
                languages=payload.languages,
                experience_years=payload.experience_years,
                approval_status=ApprovalStatus.pending,
            )
        )
        db.commit()

    email_result = await _issue_otp(db, payload.email, OTPPurpose.guide_signup)
    if not email_result.get("sent"):
        raise HTTPException(
            status_code=503,
            detail=email_result.get("error") or "Could not send OTP email. Check Gmail settings in backend/.env",
        )

    return {
        "message": "OTP sent to your email. Verify your email to complete guide registration.",
        "email_sent": True,
    }


# ─── Get Current User (used by frontend on load) ─────────────────────────────

@router.get("/me")
async def get_me(
    credentials = Depends(security),
    db: Session = Depends(get_db),
):
    from app.core.dependencies import get_current_user as _get_user
    from fastapi.security import HTTPAuthorizationCredentials
    token = credentials.credentials
    from app.core.security import decode_token
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = db.query(User).filter(User.id == int(payload["sub"])).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return {
        "id": user.id, "full_name": user.full_name, "email": user.email,
        "role": user.role.value, "is_verified": user.is_verified,
        "is_active": user.is_active, "profile_photo_url": user.profile_photo_url,
        "phone": user.phone,
        "created_at": str(user.created_at),
    }


# ─── Update Own Profile ──────────────────────────────────────────────────────

from pydantic import BaseModel as _BaseModel
from typing import Optional as _Optional

class SelfUpdateRequest(_BaseModel):
    full_name: _Optional[str] = None
    phone: _Optional[str] = None
    # Guide-only fields (ignored for non-guides)
    bio: _Optional[str] = None
    languages: _Optional[list[str]] = None
    experience_years: _Optional[int] = None

@router.put("/me")
async def update_me(
    payload: SelfUpdateRequest,
    credentials = Depends(security),
    db: Session = Depends(get_db),
):
    token = credentials.credentials
    tkn_payload = decode_token(token)
    if not tkn_payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = db.query(User).filter(User.id == int(tkn_payload["sub"])).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    # Update core user fields
    if payload.full_name is not None:
        user.full_name = payload.full_name
    if payload.phone is not None:
        user.phone = payload.phone

    # If user is a guide, also update GuideProfile fields
    if user.role == UserRole.guide:
        gp = db.query(GuideProfile).filter(GuideProfile.user_id == user.id).first()
        if gp:
            if payload.bio is not None:
                gp.bio = payload.bio
            if payload.languages is not None:
                gp.languages = payload.languages
            if payload.experience_years is not None:
                gp.experience_years = payload.experience_years

    db.commit()

    return {
        "message": "Profile updated successfully",
        "user": {
            "id": user.id, "full_name": user.full_name, "email": user.email,
            "role": user.role.value, "is_verified": user.is_verified,
            "is_active": user.is_active, "profile_photo_url": user.profile_photo_url,
            "phone": user.phone,
            "created_at": str(user.created_at),
        }
    }

