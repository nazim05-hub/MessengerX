#!/bin/bash

# Скрипт для первоначальной настройки проекта

echo "🔧 Настройка проекта Messenger..."

# Проверка Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker не установлен."
    echo "Установите Docker: https://docs.docker.com/get-docker/"
    exit 1
fi

echo "✅ Docker установлен"

# Проверка Docker Compose
if ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose не установлен."
    echo "Установите Docker Compose: https://docs.docker.com/compose/install/"
    exit 1
fi

echo "✅ Docker Compose установлен"

# Создание .env файла
if [ ! -f .env ]; then
    echo "📝 Создание .env файла..."
    cat > .env << EOL
# Database
POSTGRES_PASSWORD=$(openssl rand -base64 32)

# Redis
REDIS_PASSWORD=$(openssl rand -base64 32)

# Backend
SECRET_KEY=$(openssl rand -base64 48)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=

# URLs (для разработки)
FRONTEND_URL=http://localhost:3000
API_URL=http://localhost:8000
WS_URL=ws://localhost:8000
EOL
    echo "✅ .env файл создан"
    echo "⚠️  Не забудьте настроить SMTP переменные в .env для email-подтверждения"
else
    echo "⚠️  .env файл уже существует, пропускаем"
fi

# Создание директорий
echo "📁 Создание необходимых директорий..."
mkdir -p backend/media/avatars
mkdir -p backups
mkdir -p logs

echo "✅ Директории созданы"

# Установка прав на скрипты
echo "🔐 Установка прав на скрипты..."
chmod +x scripts/*.sh

echo "✅ Права установлены"

# Создание простых иконок PWA (заглушки)
echo "🎨 Создание заглушек для PWA иконок..."
mkdir -p frontend/public

# Если у вас установлен ImageMagick, можно создать простые заглушки
if command -v convert &> /dev/null; then
    convert -size 192x192 xc:blue -gravity center -pointsize 72 -fill white -annotate +0+0 "M" frontend/public/pwa-192x192.png 2>/dev/null
    convert -size 512x512 xc:blue -gravity center -pointsize 200 -fill white -annotate +0+0 "M" frontend/public/pwa-512x512.png 2>/dev/null
    echo "✅ PWA иконки созданы (заглушки)"
else
    echo "⚠️  ImageMagick не установлен, создайте PWA иконки вручную"
    echo "   См. frontend/public/pwa-192x192.png.README"
fi

echo ""
echo "🎉 Настройка завершена!"
echo ""
echo "Следующие шаги:"
echo "1. Настройте SMTP в .env (опционально)"
echo "2. Запустите приложение: ./scripts/dev.sh"
echo "3. Откройте http://localhost:3000"
echo ""
echo "Для получения помощи: cat QUICKSTART.md"

