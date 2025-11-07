from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from database import get_db
from models import User, Call, Chat, CallStatus
from schemas import CallCreate, CallResponse, WebRTCSignal
from auth import get_current_active_user
from websocket_manager import manager

router = APIRouter(prefix="/api/calls", tags=["calls"])

@router.post("/", response_model=CallResponse, status_code=status.HTTP_201_CREATED)
async def create_call(
    call_data: CallCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Проверить доступ к чату
    chat = db.query(Chat).filter(
        Chat.id == call_data.chat_id,
        Chat.participants.any(User.id == current_user.id)
    ).first()
    
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    # Создать звонок
    new_call = Call(
        chat_id=call_data.chat_id,
        initiator_id=current_user.id,
        call_type=call_data.call_type,
        status=CallStatus.RINGING
    )
    
    db.add(new_call)
    db.commit()
    db.refresh(new_call)
    
    # Уведомить участников чата через WebSocket
    participant_ids = [p.id for p in chat.participants if p.id != current_user.id]
    await manager.send_to_chat(
        {
            "type": "incoming_call",
            "data": {
                "call_id": new_call.id,
                "chat_id": call_data.chat_id,
                "initiator_id": current_user.id,
                "call_type": call_data.call_type,
                "initiator": {
                    "id": current_user.id,
                    "username": current_user.username,
                    "avatar": current_user.avatar
                }
            }
        },
        participant_ids
    )
    
    return new_call

@router.put("/{call_id}/accept")
async def accept_call(
    call_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    call = db.query(Call).filter(Call.id == call_id).first()
    
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")
    
    # Проверить доступ к чату
    chat = db.query(Chat).filter(
        Chat.id == call.chat_id,
        Chat.participants.any(User.id == current_user.id)
    ).first()
    
    if not chat:
        raise HTTPException(status_code=403, detail="Access denied")
    
    call.status = CallStatus.ACTIVE
    db.commit()
    
    # Уведомить инициатора
    await manager.send_personal_message(
        {
            "type": "call_accepted",
            "data": {
                "call_id": call_id,
                "user_id": current_user.id,
                "username": current_user.username
            }
        },
        call.initiator_id
    )
    
    return {"message": "Call accepted"}

@router.put("/{call_id}/reject")
async def reject_call(
    call_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    call = db.query(Call).filter(Call.id == call_id).first()
    
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")
    
    call.status = CallStatus.REJECTED
    call.ended_at = datetime.utcnow()
    db.commit()
    
    # Уведомить инициатора
    await manager.send_personal_message(
        {
            "type": "call_rejected",
            "data": {
                "call_id": call_id,
                "user_id": current_user.id
            }
        },
        call.initiator_id
    )
    
    return {"message": "Call rejected"}

@router.put("/{call_id}/end")
async def end_call(
    call_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    call = db.query(Call).filter(Call.id == call_id).first()
    
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")
    
    call.status = CallStatus.ENDED
    call.ended_at = datetime.utcnow()
    db.commit()
    
    # Уведомить всех участников
    chat = db.query(Chat).filter(Chat.id == call.chat_id).first()
    participant_ids = [p.id for p in chat.participants]
    
    await manager.send_to_chat(
        {
            "type": "call_ended",
            "data": {
                "call_id": call_id,
                "ended_by": current_user.id
            }
        },
        participant_ids
    )
    
    return {"message": "Call ended"}

@router.get("/history", response_model=List[CallResponse])
async def get_call_history(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Получить все чаты пользователя
    user_chat_ids = db.query(Chat.id).filter(
        Chat.participants.any(User.id == current_user.id)
    ).all()
    chat_ids = [chat_id[0] for chat_id in user_chat_ids]
    
    # Получить историю звонков
    calls = db.query(Call).filter(
        Call.chat_id.in_(chat_ids)
    ).order_by(Call.started_at.desc()).offset(skip).limit(limit).all()
    
    return calls

