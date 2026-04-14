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
from app.utils.email_service import (
    send_otp, send_welcome, send_guide_registration_pending
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


# ─── User Registration ────────────────────────────────────────────────────────

@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register_user(
    payload: UserRegisterRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    # Check if email already exists
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        if existing.is_verified:
            raise HTTPException(status_code=400, detail="Email already registered")
        # Allow re-registration if not yet verified — just resend OTP
    else:
        user = User(
            full_name=payload.full_name,
            email=payload.email,
            password_hash=hash_password(payload.password),
            phone=payload.phone,
            role=UserRole.user,
            is_verified=False,
        )
        db.add(user)
        db.commit()

    # OTP rate limit
    allowed = await check_otp_rate_limit(payload.email)
    if not allowed:
        raise HTTPException(status_code=429, detail="Too many OTP requests. Try again in 15 minutes.")

    # Generate and store OTP
    otp_code = generate_otp()
    otp = OTPToken(
        email=payload.email,
        otp_code=otp_code,
        purpose=OTPPurpose.signup,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=10),
    )
    db.add(otp)
    db.commit()

    background_tasks.add_task(send_otp, payload.email, otp_code, "signup")

    return {"message": "OTP sent to your email. Please verify to complete registration."}


# ─── OTP Verification ─────────────────────────────────────────────────────────

@router.post("/verify-otp")
async def verify_otp(
    payload: OTPVerifyRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    now = datetime.now(timezone.utc)

    # Find valid OTP
    otp = db.query(OTPToken).filter(
        OTPToken.email == payload.email,
        OTPToken.otp_code == payload.otp_code,
        OTPToken.purpose == payload.purpose,
        OTPToken.is_used == False,
        OTPToken.expires_at > now,
    ).first()

    if not otp:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")

    # Mark OTP as used
    otp.is_used = True

    # Activate user account
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_verified = True
    user.is_active = True
    db.commit()

    if payload.purpose == "signup":
        background_tasks.add_task(send_welcome, user.email, user.full_name)

    return {"message": "Email verified successfully. You can now log in."}


# ─── Resend OTP ───────────────────────────────────────────────────────────────

@router.post("/resend-otp")
async def resend_otp(
    payload: OTPResendRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Email not found")

    allowed = await check_otp_rate_limit(payload.email)
    if not allowed:
        raise HTTPException(status_code=429, detail="Too many OTP requests. Try again in 15 minutes.")

    otp_code = generate_otp()
    otp = OTPToken(
        email=payload.email,
        otp_code=otp_code,
        purpose=payload.purpose,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=10),
    )
    db.add(otp)
    db.commit()

    background_tasks.add_task(send_otp, payload.email, otp_code, payload.purpose)

    return {"message": "New OTP sent to your email."}


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

    otp_code = generate_otp()
    otp = OTPToken(
        email=payload.email,
        otp_code=otp_code,
        purpose=OTPPurpose.profile_change, # Reusing profile_change for general verification
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=15),
    )
    db.add(otp)
    db.commit()

    background_tasks.add_task(send_otp, payload.email, otp_code, "profile_change")
    return {"message": "If that email is registered, we have sent a password reset OTP."}

@router.post("/reset-password")
async def reset_password(
    payload: __import__("app.schemas.auth", fromlist=["ResetPasswordRequest"]).ResetPasswordRequest,
    db: Session = Depends(get_db),
):
    now = datetime.now(timezone.utc)

    otp = db.query(OTPToken).filter(
        OTPToken.email == payload.email,
        OTPToken.otp_code == payload.otp_code,
        OTPToken.purpose == OTPPurpose.profile_change,
        OTPToken.is_used == False,
        OTPToken.expires_at > now,
    ).first()

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
    db: Session = Depends(get_db),
):
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
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        full_name=payload.full_name,
        email=payload.email,
        password_hash=hash_password(payload.password),
        phone=payload.phone,
        role=UserRole.guide,
        is_verified=True,   # Guide doesn't need OTP for signup; admin approval serves as verification
        is_active=False,    # Will be activated only after admin approval
    )
    db.add(user)
    db.flush()  # Get user.id without committing

    guide_profile = GuideProfile(
        user_id=user.id,
        bio=payload.bio,
        languages=payload.languages,
        experience_years=payload.experience_years,
        approval_status=ApprovalStatus.pending,
    )
    db.add(guide_profile)
    db.commit()

    background_tasks.add_task(send_guide_registration_pending, user.email, user.full_name)

    return {
        "message": "Registration submitted. Your account is under review by our admin team. You will receive an email once approved."
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

