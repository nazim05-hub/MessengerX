from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from app.models.chat import ChatType


class ChatCreate(BaseModel):
    name: Optional[str] = None
    chat_type: ChatType = ChatType.PRIVATE
    member_ids: List[int]


class ChatUpdate(BaseModel):
    name: Optional[str] = None
    avatar: Optional[str] = None


class ChatMemberResponse(BaseModel):
    id: int
    user_id: int
    username: str
    avatar: Optional[str]
    is_admin: bool
    joined_at: datetime

    class Config:
        from_attributes = True


class ChatResponse(BaseModel):
    id: int
    name: Optional[str]
    chat_type: ChatType
    avatar: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]
    members: List[ChatMemberResponse] = []
    last_message: Optional[dict] = None
    unread_count: int = 0

    class Config:
        from_attributes = True

