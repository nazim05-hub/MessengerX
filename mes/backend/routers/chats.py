from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models import User, Chat, Message, chat_participants
from schemas import ChatCreate, ChatResponse, MessageCreate, MessageResponse, MessageUpdate, UserResponse
from auth import get_current_active_user
from websocket_manager import manager

router = APIRouter(prefix="/api/chats", tags=["chats"])

@router.post("/", response_model=ChatResponse, status_code=status.HTTP_201_CREATED)
async def create_chat(
    chat_data: ChatCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Проверка существования пользователей
    participants = db.query(User).filter(User.id.in_(chat_data.participant_ids)).all()
    
    if len(participants) != len(chat_data.participant_ids):
        raise HTTPException(status_code=404, detail="Some users not found")
    
    # Добавить текущего пользователя к участникам
    if current_user not in participants:
        participants.append(current_user)
    
    # Для личного чата проверить существование
    if not chat_data.is_group and len(participants) == 2:
        # Проверить, есть ли уже чат между этими пользователями
        existing_chat = db.query(Chat).filter(
            Chat.is_group == False,
            Chat.participants.any(User.id == participants[0].id),
            Chat.participants.any(User.id == participants[1].id)
        ).first()
        
        if existing_chat:
            return existing_chat
    
    # Создать новый чат
    new_chat = Chat(
        name=chat_data.name,
        is_group=chat_data.is_group,
        created_by=current_user.id,
        participants=participants
    )
    
    db.add(new_chat)
    db.commit()
    db.refresh(new_chat)
    
    return new_chat

@router.get("/", response_model=List[ChatResponse])
async def get_my_chats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    chats = db.query(Chat).filter(Chat.participants.any(User.id == current_user.id)).all()
    return chats

@router.get("/{chat_id}", response_model=ChatResponse)
async def get_chat(
    chat_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    chat = db.query(Chat).filter(
        Chat.id == chat_id,
        Chat.participants.any(User.id == current_user.id)
    ).first()
    
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    return chat

@router.get("/{chat_id}/messages", response_model=List[MessageResponse])
async def get_chat_messages(
    chat_id: int,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Проверить доступ к чату
    chat = db.query(Chat).filter(
        Chat.id == chat_id,
        Chat.participants.any(User.id == current_user.id)
    ).first()
    
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    messages = db.query(Message).filter(
        Message.chat_id == chat_id,
        Message.is_deleted == False
    ).order_by(Message.created_at.desc()).offset(skip).limit(limit).all()
    
    messages.reverse()  # Вернуть в хронологическом порядке
    return messages

@router.post("/{chat_id}/messages", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def create_message(
    chat_id: int,
    message_data: MessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Проверить доступ к чату
    chat = db.query(Chat).filter(
        Chat.id == chat_id,
        Chat.participants.any(User.id == current_user.id)
    ).first()
    
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    # Создать сообщение
    new_message = Message(
        chat_id=chat_id,
        sender_id=current_user.id,
        content=message_data.content,
        message_type=message_data.message_type,
        reply_to=message_data.reply_to
    )
    
    db.add(new_message)
    db.commit()
    db.refresh(new_message)
    
    # Отправить через WebSocket
    participant_ids = [p.id for p in chat.participants if p.id != current_user.id]
    await manager.send_to_chat(
        {
            "type": "new_message",
            "data": {
                "id": new_message.id,
                "chat_id": chat_id,
                "sender_id": current_user.id,
                "content": new_message.content,
                "message_type": new_message.message_type,
                "created_at": new_message.created_at.isoformat(),
                "sender": {
                    "id": current_user.id,
                    "username": current_user.username,
                    "avatar": current_user.avatar
                }
            }
        },
        participant_ids
    )
    
    return new_message

@router.put("/messages/{message_id}", response_model=MessageResponse)
async def update_message(
    message_id: int,
    message_update: MessageUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    message = db.query(Message).filter(
        Message.id == message_id,
        Message.sender_id == current_user.id
    ).first()
    
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    message.content = message_update.content
    message.is_edited = True
    db.commit()
    db.refresh(message)
    
    return message

@router.delete("/messages/{message_id}")
async def delete_message(
    message_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    message = db.query(Message).filter(
        Message.id == message_id,
        Message.sender_id == current_user.id
    ).first()
    
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    message.is_deleted = True
    message.content = None
    db.commit()
    
    return {"message": "Message deleted"}

