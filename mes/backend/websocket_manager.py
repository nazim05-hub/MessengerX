from typing import Dict, List
from fastapi import WebSocket
import json
import redis.asyncio as redis
from config import settings

class ConnectionManager:
    def __init__(self):
        # user_id -> List[WebSocket]
        self.active_connections: Dict[int, List[WebSocket]] = {}
        self.redis_client: redis.Redis = None
    
    async def init_redis(self):
        self.redis_client = await redis.from_url(settings.REDIS_URL, decode_responses=True)
    
    async def connect(self, websocket: WebSocket, user_id: int):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)
        
        # Установить статус онлайн в Redis
        if self.redis_client:
            await self.redis_client.set(f"user_status:{user_id}", "online")
            await self.redis_client.publish("user_status", json.dumps({"user_id": user_id, "status": "online"}))
    
    async def disconnect(self, websocket: WebSocket, user_id: int):
        if user_id in self.active_connections:
            self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
                # Установить статус оффлайн в Redis
                if self.redis_client:
                    await self.redis_client.set(f"user_status:{user_id}", "offline")
                    await self.redis_client.publish("user_status", json.dumps({"user_id": user_id, "status": "offline"}))
    
    async def send_personal_message(self, message: dict, user_id: int):
        if user_id in self.active_connections:
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_json(message)
                except:
                    pass
    
    async def send_to_chat(self, message: dict, user_ids: List[int]):
        for user_id in user_ids:
            await self.send_personal_message(message, user_id)
    
    async def broadcast(self, message: dict):
        for user_connections in self.active_connections.values():
            for connection in user_connections:
                try:
                    await connection.send_json(message)
                except:
                    pass
    
    async def set_typing(self, chat_id: int, user_id: int, is_typing: bool):
        if self.redis_client:
            key = f"typing:{chat_id}:{user_id}"
            if is_typing:
                await self.redis_client.setex(key, 5, "1")  # 5 секунд TTL
            else:
                await self.redis_client.delete(key)
    
    async def get_typing_users(self, chat_id: int) -> List[int]:
        if self.redis_client:
            pattern = f"typing:{chat_id}:*"
            keys = await self.redis_client.keys(pattern)
            user_ids = []
            for key in keys:
                user_id = int(key.split(":")[-1])
                user_ids.append(user_id)
            return user_ids
        return []
    
    async def get_user_status(self, user_id: int) -> str:
        if self.redis_client:
            status = await self.redis_client.get(f"user_status:{user_id}")
            return status or "offline"
        return "offline"

manager = ConnectionManager()

