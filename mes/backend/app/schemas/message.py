from pydantic import BaseModel
from typing import Optional, Dict
from datetime import datetime


class MessageCreate(BaseModel):
    chat_id: int
    content: Optional[str] = None
    message_type: str = "text"
    reply_to_id: Optional[int] = None


class MessageUpdate(BaseModel):
    content: str


class MessageReaction(BaseModel):
    emoji: str


class MessageResponse(BaseModel):
    id: int
    chat_id: int
    sender_id: int
    sender_username: str
    sender_avatar: Optional[str]
    content: Optional[str]
    message_type: str
    file_url: Optional[str]
    file_name: Optional[str]
    file_size: Optional[int]
    reply_to_id: Optional[int]
    is_edited: bool
    is_deleted: bool
    reactions: Dict[str, str] = {}
    created_at: datetime
    updated_at: Optional[datetime]
    is_read: bool = False

    class Config:
        from_attributes = True

