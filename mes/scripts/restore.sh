#!/bin/bash

# Скрипт для восстановления из бэкапа

if [ $# -eq 0 ]; then
    echo "❌ Использование: ./restore.sh <db_backup.sql> <media_backup.tar.gz>"
    echo "Пример: ./restore.sh backups/db_backup_20240101_120000.sql backups/media_backup_20240101_120000.tar.gz"
    exit 1
fi

DB_BACKUP=$1
MEDIA_BACKUP=$2

echo "🔄 Восстановление из бэкапа..."

# Проверка существования файлов
if [ ! -f "$DB_BACKUP" ]; then
    echo "❌ Файл $DB_BACKUP не найден"
    exit 1
fi

if [ ! -f "$MEDIA_BACKUP" ]; then
    echo "⚠️  Файл $MEDIA_BACKUP не найден, пропускаем восстановление медиа"
    MEDIA_BACKUP=""
fi

# Восстановление базы данных
echo "📦 Восстановление базы данных..."
docker exec -i mes_postgres psql -U messenger messenger < $DB_BACKUP

if [ $? -eq 0 ]; then
    echo "✅ База данных восстановлена"
else
    echo "❌ Ошибка при восстановлении базы данных"
    exit 1
fi

# Восстановление медиа файлов
if [ -n "$MEDIA_BACKUP" ]; then
    echo "📦 Восстановление медиа файлов..."
    docker run --rm -v mes_media_data:/data -v $(pwd)/$(dirname $MEDIA_BACKUP):/backup ubuntu tar xzf /backup/$(basename $MEDIA_BACKUP) -C /data
    
    if [ $? -eq 0 ]; then
        echo "✅ Медиа файлы восстановлены"
    else
        echo "❌ Ошибка при восстановлении медиа файлов"
        exit 1
    fi
fi

echo ""
echo "🎉 Восстановление завершено успешно!"

