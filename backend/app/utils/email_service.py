import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from jinja2 import Environment, FileSystemLoader, select_autoescape
import os
from app.core.config import settings

# Load Jinja2 templates from templates/email/
template_env = Environment(
    loader=FileSystemLoader(os.path.join(os.path.dirname(__file__), "../../templates/email")),
    autoescape=select_autoescape(["html"])
)


def _render(template_name: str, context: dict) -> str:
    try:
        tmpl = template_env.get_template(template_name)
        return tmpl.render(**context)
    except Exception:
        # Fallback plain text if template missing
        return f"<p>{context}</p>"


def _send(to_email: str, subject: str, html_body: str) -> dict:
    if not settings.GMAIL_ADDRESS or not settings.GMAIL_APP_PASSWORD:
        err = "Gmail not configured. Set GMAIL_ADDRESS and GMAIL_APP_PASSWORD in backend/.env"
        print(f"[EMAIL SKIP] To: {to_email} | Subject: {subject} | {err}")
        return {"sent": False, "error": err}

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"Yatrika <{settings.GMAIL_ADDRESS}>"
    msg["To"] = to_email
    msg.attach(MIMEText(html_body, "html"))

    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(settings.GMAIL_ADDRESS, settings.GMAIL_APP_PASSWORD)
            server.sendmail(settings.GMAIL_ADDRESS, to_email, msg.as_string())
        print(f"[EMAIL SENT] To: {to_email} | Subject: {subject}")
        return {"sent": True}
    except Exception as e:
        print(f"[EMAIL ERROR] {e}")
        return {"sent": False, "error": str(e)}


# ─── Public Methods ──────────────────────────────────────────────────────────

def send_otp(email: str, otp_code: str, purpose: str = "signup") -> dict:
    purpose_labels = {
        "signup": "Sign Up Verification",
        "guide_signup": "Guide Registration Verification",
        "login": "Login Verification",
        "profile_change": "Profile Change Verification",
    }
    html = _render("otp.html", {
        "otp_code": otp_code,
        "purpose_label": purpose_labels.get(purpose, "Verification"),
        "expiry_minutes": 10,
    })
    return _send(email, f"Yatrika — Your OTP for {purpose_labels.get(purpose, 'Verification')}", html)


def send_welcome(email: str, full_name: str):
    html = _render("welcome.html", {"full_name": full_name})
    _send(email, "Welcome to Yatrika! 🌏", html)


def send_guide_registration_pending(email: str, full_name: str):
    html = _render("guide_pending.html", {"full_name": full_name})
    _send(email, "Yatrika — Your Guide Registration is Under Review", html)


def send_verification_meet_scheduled(
    email: str,
    full_name: str,
    meet_title: str,
    scheduled_at_display: str,
    meet_link: str,
) -> dict:
    html = _render("verification_meet_scheduled.html", {
        "full_name": full_name,
        "meet_title": meet_title,
        "scheduled_at_display": scheduled_at_display,
        "meet_link": meet_link,
    })
    return _send(email, f"Yatrika — Verification Call: {meet_title}", html)


def send_guide_approved(email: str, full_name: str):
    html = _render("guide_approved.html", {"full_name": full_name, "login_url": settings.FRONTEND_URL + "/login"})
    _send(email, "Yatrika — Your Guide Account is Approved! 🎉", html)


def send_guide_rejected(email: str, full_name: str, reason: str = ""):
    html = _render("guide_rejected.html", {"full_name": full_name, "reason": reason})
    _send(email, "Yatrika — Guide Registration Update", html)


def send_place_request_approved(email: str, full_name: str, place_name: str):
    html = _render("place_approved.html", {"full_name": full_name, "place_name": place_name})
    _send(email, f"Yatrika — '{place_name}' has been approved! ✅", html)


def send_place_request_rejected(email: str, full_name: str, place_name: str, reason: str = ""):
    html = _render("place_rejected.html", {"full_name": full_name, "place_name": place_name, "reason": reason})
    _send(email, f"Yatrika — Update on your place request: {place_name}", html)


def send_booking_request_to_guide(guide_email: str, guide_name: str, user_name: str,
                                    user_email: str, place_name: str, slot_date: str,
                                    start_time: str, end_time: str, message: str = ""):
    html = _render("booking_to_guide.html", {
        "guide_name": guide_name,
        "user_name": user_name,
        "user_email": user_email,
        "place_name": place_name,
        "slot_date": slot_date,
        "start_time": start_time,
        "end_time": end_time,
        "user_message": message,
    })
    _send(guide_email, f"Yatrika — New Booking Request from {user_name}", html)


def send_booking_accepted_to_user(user_email: str, user_name: str, guide_name: str,
                                    guide_email: str, place_name: str, slot_date: str,
                                    start_time: str, end_time: str):
    html = _render("booking_accepted.html", {
        "user_name": user_name,
        "guide_name": guide_name,
        "guide_email": guide_email,
        "place_name": place_name,
        "slot_date": slot_date,
        "start_time": start_time,
        "end_time": end_time,
    })
    _send(user_email, f"Yatrika — Booking Confirmed with {guide_name}! ✅", html)


def send_booking_rejected_to_user(user_email: str, user_name: str, guide_name: str,
                                    place_name: str, slot_date: str):
    html = _render("booking_rejected.html", {
        "user_name": user_name,
        "guide_name": guide_name,
        "place_name": place_name,
        "slot_date": slot_date,
    })
    _send(user_email, "Yatrika — Booking Request Update", html)


def send_guide_assigned(guide_email: str, guide_name: str, place_name: str, city: str):
    html = _render("guide_assigned.html", {
        "guide_name": guide_name,
        "place_name": place_name,
        "city": city,
        "dashboard_url": settings.FRONTEND_URL + "/guide/dashboard",
    })
    _send(guide_email, f"Yatrika — You've been assigned to {place_name}! 🗺️", html)


def send_default_password(email: str, full_name: str, temp_password: str, role: str = "user"):
    html = _render("default_password.html", {
        "full_name": full_name,
        "email": email,
        "temp_password": temp_password,
        "role": role,
        "login_url": settings.FRONTEND_URL + "/login",
    })
    _send(email, "Yatrika — Your Account Has Been Created", html)


def send_rating_prompt(user_email: str, user_name: str, guide_name: str, place_name: str, booking_id: int):
    html = _render("rating_prompt.html", {
        "user_name": user_name,
        "guide_name": guide_name,
        "place_name": place_name,
        "rating_url": f"{settings.FRONTEND_URL}/user/dashboard?rate={booking_id}",
    })
    _send(user_email, f"Yatrika — How was your tour with {guide_name}? ⭐", html)


def send_low_rating_alert(admin_email: str, guide_name: str, guide_email: str,
                           avg_rating: float, total_tours: int):
    html = _render("low_rating_alert.html", {
        "guide_name": guide_name,
        "guide_email": guide_email,
        "avg_rating": avg_rating,
        "total_tours": total_tours,
        "admin_url": settings.FRONTEND_URL + "/admin/guides",
    })
    _send(admin_email, f"⚠️ Yatrika — Low Rating Alert: {guide_name}", html)


def send_place_deleted_to_guide(guide_email: str, guide_name: str, place_name: str, city: str):
    """Notify a guide that a place they were assigned to has been deleted by admin."""
    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; background: #f9fafb; border-radius: 12px;">
      <h2 style="color: #1f2937;">Hi {guide_name},</h2>
      <p style="color: #6b7280; font-size: 15px;">
        We're writing to let you know that the tourist place <strong>{place_name}</strong>
        {f'in <strong>{city}</strong>' if city else ''} has been <span style="color: #dc2626; font-weight: bold;">removed from the Yatrika platform</span> by the admin team.
      </p>
      <p style="color: #6b7280; font-size: 15px;">
        As a result:
      </p>
      <ul style="color: #6b7280; font-size: 15px; line-height: 1.8;">
        <li>Your assignment to <strong>{place_name}</strong> has been removed.</li>
        <li>Any pending or active bookings for this place have been cancelled.</li>
      </ul>
      <p style="color: #6b7280; font-size: 15px;">
        You can visit your dashboard to request assignment to another place or view your remaining assignments.
      </p>
      <a href="{settings.FRONTEND_URL}/guide/dashboard"
         style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 16px;">
        Go to Dashboard
      </a>
      <p style="color: #9ca3af; font-size: 13px; margin-top: 24px;">
        If you have any questions, please contact the Yatrika admin team.
      </p>
    </div>
    """
    _send(guide_email, f"Yatrika — Important Update: {place_name} has been removed", html)

