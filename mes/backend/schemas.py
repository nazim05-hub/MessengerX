from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime

# User schemas
class UserBase(BaseModel):
    email: EmailStr
    username: str

class UserCreate(UserBase):
    password: str
    full_name: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone_number: Optional[str] = None
    status: Optional[str] = None
    avatar: Optional[str] = None

class UserResponse(BaseModel):
    id: int
    email: str
    username: str
    full_name: Optional[str]
    phone_number: Optional[str]
    avatar: Optional[str]
    status: Optional[str]
    user_status: str
    is_active: bool
    is_email_verified: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

# Token schemas
class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class TokenData(BaseModel):
    user_id: Optional[int] = None

# Chat schemas
class ChatCreate(BaseModel):
    name: Optional[str] = None
    is_group: bool = False
    participant_ids: List[int]

class ChatResponse(BaseModel):
    id: int
    name: Optional[str]
    is_group: bool
    avatar: Optional[str]
    created_at: datetime
    participants: List[UserResponse]
    
    class Config:
        from_attributes = True

# Message schemas
class MessageCreate(BaseModel):
    chat_id: int
    content: Optional[str] = None
    message_type: str = "text"
    reply_to: Optional[int] = None

class MessageUpdate(BaseModel):
    content: str

class MessageReactionCreate(BaseModel):
    emoji: str

class MessageResponse(BaseModel):
    id: int
    chat_id: int
    sender_id: int
    content: Optional[str]
    message_type: str
    file_url: Optional[str]
    reply_to: Optional[int]
    is_edited: bool
    is_deleted: bool
    created_at: datetime
    sender: UserResponse
    
    class Config:
        from_attributes = True

# WebSocket schemas
class WSMessage(BaseModel):
    type: str
    data: dict

# Call schemas
class CallCreate(BaseModel):
    chat_id: int
    call_type: str = "audio"

class CallResponse(BaseModel):
    id: int
    chat_id: int
    initiator_id: int
    call_type: str
    status: str
    started_at: datetime
    ended_at: Optional[datetime]
    
    class Config:
        from_attributes = True

# WebRTC signaling
class WebRTCSignal(BaseModel):
    type: str  # offer, answer, ice-candidate
    call_id: int
    target_user_id: int
    data: dict

