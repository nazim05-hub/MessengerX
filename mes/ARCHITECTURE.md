# 🏗 Архитектура проекта

## Общая архитектура

```
┌─────────────────────────────────────────────────────────┐
│                    Client (Browser)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   React UI   │  │  Service     │  │   IndexedDB  │  │
│  │   (Mantine)  │  │   Worker     │  │   (Dexie)    │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
│         │                  │                  │          │
└─────────┼──────────────────┼──────────────────┼──────────┘
          │                  │                  │
          │ HTTP/WS          │ Cache            │ Offline
          │                  │                  │
┌─────────▼──────────────────▼──────────────────▼──────────┐
│                      Caddy (Reverse Proxy)               │
│                         SSL/TLS                          │
└───────────────────┬──────────────────┬───────────────────┘
                    │                  │
        ┌───────────▼─────┐   ┌────────▼──────────┐
        │   Frontend       │   │    Backend        │
        │   (Nginx)        │   │    (FastAPI)      │
        │   Port 3000      │   │    Port 8000      │
        └──────────────────┘   └────────┬──────────┘
                                        │
                    ┌───────────────────┼───────────────────┐
                    │                   │                   │
            ┌───────▼──────┐   ┌────────▼────────┐  ┌──────▼──────┐
            │  PostgreSQL  │   │     Redis       │  │   Coturn    │
            │   Port 5432  │   │   Port 6379     │  │  Port 3478  │
            └──────────────┘   └─────────────────┘  └─────────────┘
```

## Frontend архитектура

### Структура компонентов

```
src/
├── components/          # React компоненты
│   ├── Auth/           # Компоненты аутентификации
│   ├── Chat/           # Компоненты чата
│   └── Call/           # Компоненты звонков
├── pages/              # Страницы приложения
├── stores/             # Zustand stores (состояние)
├── services/           # Бизнес-логика
│   ├── api.ts         # REST API клиент
│   ├── websocket.ts   # WebSocket менеджер
│   ├── webrtc.ts      # WebRTC менеджер
│   └── indexeddb.ts   # Офлайн хранилище
├── types/              # TypeScript типы
├── config/             # Конфигурация
├── App.tsx            # Главный компонент
└── main.tsx           # Точка входа
```

### Поток данных

```
User Action
    ↓
Component
    ↓
Store Action (Zustand)
    ↓
Service (API/WebSocket/WebRTC)
    ↓
Backend
    ↓
Database/Redis
    ↓
WebSocket Push
    ↓
Store Update
    ↓
Component Re-render
```

### State Management (Zustand)

- **authStore**: Аутентификация и пользователь
- **chatStore**: Чаты и сообщения
- **callStore**: Звонки и WebRTC состояние
- **wsStore**: WebSocket подключение

## Backend архитектура

### Структура

```
backend/
├── routers/            # API endpoints
│   ├── auth.py        # Аутентификация
│   ├── users.py       # Пользователи
│   ├── chats.py       # Чаты и сообщения
│   └── calls.py       # Звонки
├── models.py          # SQLAlchemy модели
├── schemas.py         # Pydantic схемы
├── database.py        # Database setup
├── auth.py            # JWT логика
├── websocket_manager.py  # WebSocket менеджер
├── config.py          # Конфигурация
└── main.py            # FastAPI app
```

### API Endpoints

#### Auth
- `POST /api/auth/register` - Регистрация
- `POST /api/auth/login` - Вход
- `POST /api/auth/verify-email` - Подтверждение email
- `POST /api/auth/refresh` - Обновление токена
- `GET /api/auth/me` - Получить текущего пользователя
- `POST /api/auth/logout` - Выход

#### Users
- `GET /api/users/` - Список пользователей
- `GET /api/users/{id}` - Получить пользователя
- `PUT /api/users/me` - Обновить профиль
- `POST /api/users/me/avatar` - Загрузить аватар

#### Chats
- `GET /api/chats/` - Список чатов
- `POST /api/chats/` - Создать чат
- `GET /api/chats/{id}` - Получить чат
- `GET /api/chats/{id}/messages` - Сообщения чата
- `POST /api/chats/{id}/messages` - Отправить сообщение
- `PUT /api/chats/messages/{id}` - Редактировать сообщение
- `DELETE /api/chats/messages/{id}` - Удалить сообщение

#### Calls
- `POST /api/calls/` - Создать звонок
- `PUT /api/calls/{id}/accept` - Принять звонок
- `PUT /api/calls/{id}/reject` - Отклонить звонок
- `PUT /api/calls/{id}/end` - Завершить звонок
- `GET /api/calls/history` - История звонков

#### WebSocket
- `WS /ws/{token}` - WebSocket подключение

### База данных

#### Таблицы

**users**
- id, email, username, hashed_password
- full_name, phone_number, avatar, status
- user_status, is_active, is_email_verified
- created_at, updated_at

**chats**
- id, name, is_group, avatar
- created_by, created_at, updated_at

**messages**
- id, chat_id, sender_id, content
- message_type, file_url, reply_to
- is_edited, is_deleted
- created_at, updated_at

**calls**
- id, chat_id, initiator_id
- call_type, status
- started_at, ended_at

**message_reactions**
- id, message_id, user_id, emoji

**message_reads**
- id, message_id, user_id, read_at

**chat_participants** (many-to-many)
- chat_id, user_id

### Redis использование

- **Онлайн статусы**: `user_status:{user_id}`
- **Набор текста**: `typing:{chat_id}:{user_id}`
- **Кэширование**: Частые запросы

## WebSocket протокол

### Client → Server

```json
// Набор текста
{
  "type": "typing",
  "chat_id": 1,
  "is_typing": true
}

// Прочтение сообщения
{
  "type": "message_read",
  "message_id": 123
}

// WebRTC сигналинг
{
  "type": "webrtc_signal",
  "target_user_id": 2,
  "data": {
    "type": "offer",
    "offer": {...}
  }
}

// Heartbeat
{
  "type": "ping"
}
```

### Server → Client

```json
// Новое сообщение
{
  "type": "new_message",
  "data": {
    "id": 123,
    "chat_id": 1,
    "sender_id": 2,
    "content": "Hello!",
    "created_at": "2024-01-01T12:00:00Z",
    "sender": {...}
  }
}

// Пользователь печатает
{
  "type": "user_typing",
  "data": {
    "chat_id": 1,
    "user_id": 2,
    "is_typing": true,
    "username": "alice"
  }
}

// Входящий звонок
{
  "type": "incoming_call",
  "data": {
    "call_id": 1,
    "chat_id": 1,
    "initiator_id": 2,
    "call_type": "video",
    "initiator": {...}
  }
}

// Статус звонка
{
  "type": "call_accepted",
  "data": {
    "call_id": 1,
    "user_id": 3
  }
}

// WebRTC сигнал
{
  "type": "webrtc_signal",
  "data": {
    "from_user_id": 2,
    "signal_type": "answer",
    "signal": {...}
  }
}
```

## WebRTC архитектура

### Поток звонка

```
Alice                    Server                     Bob
  │                        │                         │
  ├─ Create Call ─────────>│                         │
  │                        ├─ Incoming Call ────────>│
  │                        │                         │
  ├─ getUserMedia() ──────>│                         │
  │                        │                         │
  ├─ Create Offer ────────>│                         │
  │                        ├─ Offer ────────────────>│
  │                        │                         │
  │                        │<──── Accept Call ───────┤
  │                        │                         │
  │                        │<──── Create Answer ─────┤
  │<─────── Answer ────────┤                         │
  │                        │                         │
  ├─ ICE Candidate ───────>│                         │
  │                        ├─ ICE Candidate ────────>│
  │                        │                         │
  │<─── ICE Candidate ─────┤                         │
  │                        │<──── ICE Candidate ─────┤
  │                        │                         │
  │<════ P2P Media Stream ═══════════════════════════>│
```

### ICE Servers

1. **STUN**: Обнаружение публичного IP
2. **TURN**: Ретрансляция трафика через сервер (когда P2P невозможен)

## PWA архитектура

### Service Worker

```
Browser
    ↓
Service Worker (Interceptor)
    ↓
    ├─ Cache Hit? ──> Return from Cache
    │
    └─ Cache Miss ──> Fetch from Network
                          ↓
                     Update Cache
                          ↓
                     Return Response
```

### Offline Strategy

1. **Network First**: API запросы
2. **Cache First**: Статические файлы
3. **Cache Only**: Офлайн fallback

### IndexedDB Schema

```
MessengerDB
├── chats (id, created_at)
├── messages (id, chat_id, created_at)
└── users (id, username, email)
```

## Безопасность

### Аутентификация

1. Пользователь отправляет email + password
2. Backend проверяет данные
3. Backend генерирует JWT access + refresh токены
4. Access токен живёт 30 минут
5. Refresh токен живёт 7 дней
6. Frontend хранит токены в localStorage
7. Access токен отправляется в заголовке Authorization
8. При 401 - обновление через refresh токен

### WebSocket

- Токен передаётся в URL при подключении
- Проверка токена перед accept
- Автоматическое отключение при invalid token

### CORS

- Настроен на backend для фронтенда
- В продакшене - конкретные домены

## Масштабирование

### Горизонтальное

1. **Backend**: Несколько воркеров Uvicorn
2. **Frontend**: Nginx load balancer
3. **PostgreSQL**: Read replicas
4. **Redis**: Redis Cluster

### Вертикальное

1. Увеличение ресурсов контейнеров
2. Оптимизация запросов к БД
3. Кэширование в Redis

## Мониторинг

### Метрики для отслеживания

- **Backend**: Response time, Error rate, Active connections
- **Database**: Query time, Connection pool
- **Redis**: Memory usage, Hit rate
- **WebSocket**: Active connections, Message rate
- **WebRTC**: Connection success rate, Quality metrics

### Логирование

- **Backend**: Uvicorn logs
- **Frontend**: Console errors
- **Database**: Query logs
- **WebSocket**: Connection/disconnection events

## Производительность

### Оптимизации

1. **Frontend**:
   - Code splitting
   - Lazy loading компонентов
   - Мemoization (React.memo, useMemo)
   - Виртуализация списков

2. **Backend**:
   - Database connection pooling
   - Query optimization (indexes)
   - Redis caching
   - Async operations

3. **Network**:
   - Gzip compression
   - CDN для статики
   - WebSocket для real-time

4. **Database**:
   - Indexes на часто используемые поля
   - Pagination для списков
   - Eager loading для relationships

