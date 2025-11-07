# 📋 Справочник команд

## Docker команды

### Запуск и остановка

```bash
# Запустить все сервисы
docker-compose up -d

# Запустить конкретный сервис
docker-compose up -d backend

# Остановить все сервисы
docker-compose down

# Остановить и удалить volumes
docker-compose down -v

# Перезапустить сервис
docker-compose restart backend
```

### Логи

```bash
# Все сервисы
docker-compose logs -f

# Конкретный сервис
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres

# Последние 100 строк
docker-compose logs --tail=100 backend
```

### Статус и информация

```bash
# Статус всех сервисов
docker-compose ps

# Использование ресурсов
docker stats

# Информация о контейнере
docker inspect mes_backend
```

### Выполнение команд в контейнере

```bash
# Bash в backend
docker exec -it mes_backend bash

# Bash в frontend
docker exec -it mes_frontend sh

# PostgreSQL CLI
docker exec -it mes_postgres psql -U messenger

# Redis CLI
docker exec -it mes_redis redis-cli
```

## Backend команды

### Разработка

```bash
cd backend

# Создание виртуального окружения
python -m venv venv

# Активация (Linux/Mac)
source venv/bin/activate

# Активация (Windows)
venv\Scripts\activate

# Установка зависимостей
pip install -r requirements.txt

# Запуск dev сервера
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### База данных

```bash
# Создание миграции
alembic revision --autogenerate -m "Description"

# Применение миграций
alembic upgrade head

# Откат миграции
alembic downgrade -1

# История миграций
alembic history

# Текущая версия
alembic current
```

### Тестирование

```bash
# Запуск всех тестов
pytest

# Конкретный файл
pytest tests/test_auth.py

# С покрытием
pytest --cov=.

# Verbose
pytest -v
```

## Frontend команды

### Разработка

```bash
cd frontend

# Установка зависимостей
npm install

# Запуск dev сервера
npm run dev

# Сборка для продакшена
npm run build

# Preview сборки
npm run preview
```

### Линтинг и форматирование

```bash
# Проверка TypeScript
npm run type-check

# ESLint
npm run lint

# Исправить автоматически
npm run lint:fix
```

### Тестирование

```bash
# Запуск тестов
npm test

# Watch mode
npm run test:watch

# С покрытием
npm run test:coverage
```

## PostgreSQL команды

### Подключение

```bash
# Через Docker
docker exec -it mes_postgres psql -U messenger

# Прямое подключение
psql -h localhost -U messenger -d messenger
```

### Внутри psql

```sql
-- Список баз данных
\l

-- Подключиться к БД
\c messenger

-- Список таблиц
\dt

-- Описание таблицы
\d users

-- Выполнить SQL
SELECT * FROM users LIMIT 10;

-- Выход
\q
```

### Бэкап и восстановление

```bash
# Создать бэкап
docker exec mes_postgres pg_dump -U messenger messenger > backup.sql

# Восстановить из бэкапа
docker exec -i mes_postgres psql -U messenger messenger < backup.sql

# Бэкап с сжатием
docker exec mes_postgres pg_dump -U messenger messenger | gzip > backup.sql.gz

# Восстановить из сжатого
gunzip -c backup.sql.gz | docker exec -i mes_postgres psql -U messenger messenger
```

## Redis команды

### Подключение

```bash
# Через Docker
docker exec -it mes_redis redis-cli

# Если есть пароль
docker exec -it mes_redis redis-cli -a your_password
```

### Внутри redis-cli

```bash
# Проверка подключения
PING

# Список всех ключей
KEYS *

# Получить значение
GET user_status:1

# Установить значение
SET test_key "test_value"

# Удалить ключ
DEL test_key

# TTL ключа
TTL user_status:1

# Очистить все
FLUSHALL

# Информация
INFO

# Статистика
INFO stats

# Выход
EXIT
```

## Git команды

### Основные

```bash
# Статус
git status

# Добавить файлы
git add .

# Commit
git commit -m "feat: добавить новую функцию"

# Push
git push origin main

# Pull
git pull origin main
```

### Ветки

```bash
# Создать ветку
git checkout -b feature/new-feature

# Переключиться на ветку
git checkout main

# Список веток
git branch

# Удалить ветку
git branch -d feature/old-feature

# Merge ветки
git merge feature/new-feature
```

### История

```bash
# История коммитов
git log

# Краткая история
git log --oneline

# График веток
git log --graph --oneline --all

# Изменения в файле
git log -p filename
```

## Скрипты проекта

```bash
# Первоначальная настройка
./scripts/setup.sh

# Запуск разработки
./scripts/dev.sh

# Просмотр логов
./scripts/logs.sh
./scripts/logs.sh backend

# Создание бэкапа
./scripts/backup.sh

# Восстановление из бэкапа
./scripts/restore.sh backups/db_backup.sql backups/media_backup.tar.gz

# Развёртывание на продакшен
./scripts/deploy.sh
```

## Полезные команды

### Очистка Docker

```bash
# Удалить остановленные контейнеры
docker container prune

# Удалить неиспользуемые образы
docker image prune

# Удалить неиспользуемые volumes
docker volume prune

# Полная очистка
docker system prune -a --volumes
```

### Проверка портов

```bash
# Linux/Mac
lsof -i :3000
lsof -i :8000

# Windows
netstat -ano | findstr :3000
netstat -ano | findstr :8000

# Убить процесс (Linux/Mac)
kill -9 <PID>

# Убить процесс (Windows)
taskkill /PID <PID> /F
```

### Сеть и диагностика

```bash
# Проверить доступность API
curl http://localhost:8000/health

# Проверить WebSocket
wscat -c ws://localhost:8000/ws/test

# Проверить открытые порты
nmap localhost -p 3000,8000,5432,6379

# DNS lookup
nslookup yourdomain.com

# Ping
ping yourdomain.com
```

## Производственные команды

### Мониторинг

```bash
# Использование ресурсов
docker stats

# Logs в реальном времени
docker-compose -f docker-compose.prod.yml logs -f

# Проверка здоровья
curl https://api.yourdomain.com/health
```

### Обновление

```bash
# Получить последние изменения
git pull

# Пересобрать и перезапустить
docker-compose -f docker-compose.prod.yml up -d --build

# Применить миграции
docker exec mes_backend alembic upgrade head
```

### SSL/Certificates

```bash
# Проверить SSL сертификат
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com

# Дата истечения сертификата
echo | openssl s_client -connect yourdomain.com:443 2>/dev/null | openssl x509 -noout -dates
```

## Отладка

### Backend

```bash
# Включить debug логирование
export LOG_LEVEL=DEBUG

# Запуск с отладчиком
python -m pdb main.py

# Профилирование
python -m cProfile main.py
```

### Frontend

```bash
# Проверка типов
npm run type-check

# Анализ бандла
npm run build -- --analyze

# Source maps
npm run build -- --sourcemap
```

### Общая отладка

```bash
# Проверить конфигурацию Docker Compose
docker-compose config

# Проверить Dockerfile
docker build --no-cache -t test .

# Интерактивный режим
docker run -it mes_backend bash
```

