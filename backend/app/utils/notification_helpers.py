"""In-app notification helpers for the navbar bell."""

from app.models.extra import Notification, NotificationType
from app.models.mysql import User, UserRole


def create_notification(
    db,
    user_id: int,
    ntype: NotificationType,
    title: str,
    message: str,
    link: str | None = None,
) -> None:
    db.add(
        Notification(
            user_id=user_id,
            type=ntype,
            title=title,
            message=message,
            link=link,
        )
    )


def notify_admins(
    db,
    ntype: NotificationType,
    title: str,
    message: str,
    link: str | None = None,
) -> None:
    admins = (
        db.query(User)
        .filter(User.role == UserRole.admin, User.is_active == True)
        .all()
    )
    for admin in admins:
        create_notification(db, admin.id, ntype, title, message, link)
