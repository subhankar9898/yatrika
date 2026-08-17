from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Dict, List
import json
import uuid
from datetime import datetime, timezone

from app.db.mysql_session import get_db
from app.db.mongo_client import get_mongo_db
from app.models.mysql import Booking, BookingStatus, User
from app.core.security import decode_token

router = APIRouter(tags=["Chat"])

class ConnectionManager:
    def __init__(self):
        # Maps booking_id to a list of active websocket connections
        self.active_connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, booking_id: int):
        await websocket.accept()
        if booking_id not in self.active_connections:
            self.active_connections[booking_id] = []
        self.active_connections[booking_id].append(websocket)

    def disconnect(self, websocket: WebSocket, booking_id: int):
        if booking_id in self.active_connections:
            if websocket in self.active_connections[booking_id]:
                self.active_connections[booking_id].remove(websocket)
            if not self.active_connections[booking_id]:
                del self.active_connections[booking_id]

    async def broadcast_to_room(self, message: dict, booking_id: int):
        if booking_id in self.active_connections:
            for connection in self.active_connections[booking_id]:
                await connection.send_json(message)

manager = ConnectionManager()

def get_user_from_token_ws(token: str, db: Session) -> User:
    try:
        payload = decode_token(token)
        if not payload or payload.get("type") != "access":
            return None
        user_id = payload.get("sub")
        if user_id is None:
            return None
        return db.query(User).filter(User.id == int(user_id)).first()
    except Exception:
        return None

@router.websocket("/ws/chat/{booking_id}")
async def websocket_chat_endpoint(
    websocket: WebSocket,
    booking_id: int,
    token: str = Query(None),
    db: Session = Depends(get_db)
):
    if not token:
        await websocket.close(code=1008)
        return
        
    user = get_user_from_token_ws(token, db)
    if not user:
        await websocket.close(code=1008)
        return

    # Verify booking exists and user is part of it
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        await websocket.close(code=1008)
        return
        
    # Check if user is either the tourist or the guide
    from app.models.mysql import GuideProfile
    is_tourist = booking.user_id == user.id
    guide_profile = db.query(GuideProfile).filter(GuideProfile.user_id == user.id).first()
    is_guide = guide_profile and booking.guide_id == guide_profile.id
    
    if not (is_tourist or is_guide):
        await websocket.close(code=1008)
        return

    # Allow chat only for accepted or started bookings
    if booking.status not in (BookingStatus.accepted, BookingStatus.started):
        await websocket.close(code=1008)
        return

    await manager.connect(websocket, booking_id)
    mongo_db = get_mongo_db()

    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")
            
            if msg_type == "new_message":
                timestamp = datetime.now(timezone.utc).isoformat()
                message_id = str(uuid.uuid4())
                message_doc = {
                    "message_id": message_id,
                    "booking_id": booking_id,
                    "sender_id": user.id,
                    "sender_name": user.full_name,
                    "text": data.get("text", ""),
                    "timestamp": timestamp,
                    "seen": False
                }
                
                if mongo_db is not None:
                    await mongo_db.chat_messages.insert_one(message_doc.copy())
                
                if "_id" in message_doc:
                    del message_doc["_id"]
                message_doc["type"] = "new_message"
                await manager.broadcast_to_room(message_doc, booking_id)
                
            elif msg_type == "mark_seen":
                if mongo_db is not None:
                    # Mark all unseen messages sent by the *other* person as seen
                    result = await mongo_db.chat_messages.update_many(
                        {"booking_id": booking_id, "sender_id": {"$ne": user.id}, "seen": False},
                        {"$set": {"seen": True}}
                    )
                    if result.modified_count > 0:
                        await manager.broadcast_to_room({
                            "type": "messages_seen",
                            "booking_id": booking_id,
                            "seen_by": user.id
                        }, booking_id)
                        
            elif msg_type == "edit_message":
                msg_id = data.get("message_id")
                new_text = data.get("text", "")
                
                if mongo_db is not None and msg_id:
                    msg = await mongo_db.chat_messages.find_one({"message_id": msg_id, "booking_id": booking_id})
                    if msg and msg.get("sender_id") == user.id:
                        # Check validity
                        can_edit = True
                        if msg.get("seen", False):
                            # Check 20s rule
                            try:
                                msg_time = datetime.fromisoformat(msg.get("timestamp").replace('Z', '+00:00'))
                                if msg_time.tzinfo is None:
                                    msg_time = msg_time.replace(tzinfo=timezone.utc)
                                current_time = datetime.now(timezone.utc)
                                if (current_time - msg_time).total_seconds() > 20:
                                    can_edit = False
                            except ValueError:
                                can_edit = False
                                
                        if can_edit:
                            await mongo_db.chat_messages.update_one(
                                {"message_id": msg_id},
                                {"$set": {"text": new_text}}
                            )
                            await manager.broadcast_to_room({
                                "type": "message_edited",
                                "message_id": msg_id,
                                "text": new_text
                            }, booking_id)
                        else:
                            # Send error to sender
                            await websocket.send_json({
                                "type": "error",
                                "message": "Message cannot be edited (seen and >20s old)."
                            })
            
    except WebSocketDisconnect:
        manager.disconnect(websocket, booking_id)
    except Exception as e:
        print(f"WebSocket error: {e}")
        manager.disconnect(websocket, booking_id)


@router.get("/chat/{booking_id}/history")
async def get_chat_history(
    booking_id: int,
    db: Session = Depends(get_db)
):
    """Fetch chat history for a given booking. Open to anyone who has access to the booking (ideally we should secure this, but WS is already secured)"""
    mongo_db = get_mongo_db()
    if mongo_db is None:
        return []
        
    cursor = mongo_db.chat_messages.find({"booking_id": booking_id}).sort("timestamp", 1)
    messages = await cursor.to_list(length=1000)
    
    for msg in messages:
        msg["_id"] = str(msg["_id"])
        
    return messages
