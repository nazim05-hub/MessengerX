#!/bin/bash

# Скрипт для создания бэкапа

BACKUP_DIR="backups"
DATE=$(date +%Y%m%d_%H%M%S)

echo "💾 Создание бэкапа..."

# Создание директории для бэкапов
mkdir -p $BACKUP_DIR

# Бэкап базы данных
echo "📦 Бэкап базы данных..."
docker exec mes_postgres pg_dump -U messenger messenger > $BACKUP_DIR/db_backup_$DATE.sql

if [ $? -eq 0 ]; then
    echo "✅ Бэкап базы данных создан: $BACKUP_DIR/db_backup_$DATE.sql"
else
    echo "❌ Ошибка при создании бэкапа базы данных"
    exit 1
fi

# Бэкап медиа файлов
echo "📦 Бэкап медиа файлов..."
docker run --rm -v mes_media_data:/data -v $(pwd)/$BACKUP_DIR:/backup ubuntu tar czf /backup/media_backup_$DATE.tar.gz -C /data .

if [ $? -eq 0 ]; then
    echo "✅ Бэкап медиа файлов создан: $BACKUP_DIR/media_backup_$DATE.tar.gz"
else
    echo "❌ Ошибка при создании бэкапа медиа файлов"
    exit 1
fi

echo ""
echo "🎉 Бэкап завершён успешно!"
echo "Файлы сохранены в директории: $BACKUP_DIR"

