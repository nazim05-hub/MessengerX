from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from contextlib import asynccontextmanager
import json
from pathlib import Path

from database import engine, Base, get_db
from models import User
from websocket_manager import manager
from auth import get_current_user
from jose import jwt, JWTError
from config import settings

# Импорт роутеров
from routers import auth, users, chats, calls

# Создание таблиц
Base.metadata.create_all(bind=engine)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await manager.init_redis()
    yield
    # Shutdown
    if manager.redis_client:
        await manager.redis_client.close()

app = FastAPI(title="Messenger API", version="1.0.0", lifespan=lifespan)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # В продакшене указать конкретные домены
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Подключение роутеров
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(chats.router)
app.include_router(calls.router)

# Статические файлы
media_path = Path("media")
media_path.mkdir(exist_ok=True)
app.mount("/media", StaticFiles(directory="media"), name="media")

@app.get("/")
async def root():
    return {"message": "Messenger API is running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

# WebSocket для чатов и уведомлений
@app.websocket("/ws/{token}")
async def websocket_endpoint(websocket: WebSocket, token: str, db: Session = Depends(get_db)):
    # Валидация токена
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: int = int(payload.get("sub"))
        if user_id is None:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
    except JWTError:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
    
    # Проверка существования пользователя
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
    
    await manager.connect(websocket, user_id)
    
    try:
        while True:
            data = await websocket.receive_text()
            message_data = json.loads(data)
            
            message_type = message_data.get("type")
            
            # Обработка различных типов сообщений
            if message_type == "typing":
                chat_id = message_data.get("chat_id")
                is_typing = message_data.get("is_typing", True)
                
                await manager.set_typing(chat_id, user_id, is_typing)
                
                # Уведомить других участников чата
                from models import Chat
                chat = db.query(Chat).filter(Chat.id == chat_id).first()
                if chat:
                    participant_ids = [p.id for p in chat.participants if p.id != user_id]
                    await manager.send_to_chat(
                        {
                            "type": "user_typing",
                            "data": {
                                "chat_id": chat_id,
                                "user_id": user_id,
                                "is_typing": is_typing,
                                "username": user.username
                            }
                        },
                        participant_ids
                    )
            
            elif message_type == "webrtc_signal":
                # WebRTC сигналинг
                target_user_id = message_data.get("target_user_id")
                signal_data = message_data.get("data")
                
                await manager.send_personal_message(
                    {
                        "type": "webrtc_signal",
                        "data": {
                            "from_user_id": user_id,
                            "signal_type": signal_data.get("type"),
                            "signal": signal_data
                        }
                    },
                    target_user_id
                )
            
            elif message_type == "message_read":
                # Отметка сообщения как прочитанного
                from models import Message, MessageRead
                message_id = message_data.get("message_id")
                
                message = db.query(Message).filter(Message.id == message_id).first()
                if message:
                    # Проверить, не прочитано ли уже
                    existing_read = db.query(MessageRead).filter(
                        MessageRead.message_id == message_id,
                        MessageRead.user_id == user_id
                    ).first()
                    
                    if not existing_read:
                        message_read = MessageRead(
                            message_id=message_id,
                            user_id=user_id
                        )
                        db.add(message_read)
                        db.commit()
                        
                        # Уведомить отправителя
                        await manager.send_personal_message(
                            {
                                "type": "message_read",
                                "data": {
                                    "message_id": message_id,
                                    "user_id": user_id,
                                    "chat_id": message.chat_id
                                }
                            },
                            message.sender_id
                        )
            
            elif message_type == "ping":
                await websocket.send_json({"type": "pong"})
    
    except WebSocketDisconnect:
        await manager.disconnect(websocket, user_id)
    except Exception as e:
        print(f"WebSocket error: {e}")
        await manager.disconnect(websocket, user_id)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

