# 🚀 Руководство по развёртыванию

## Развёртывание на продакшен сервере

### Подготовка сервера

#### Требования
- Ubuntu 20.04+ / Debian 11+
- Docker 20.10+
- Docker Compose 2.0+
- Минимум 2GB RAM
- Минимум 20GB дискового пространства
- Доменное имя с настроенными DNS записями

#### 1. Установка Docker

```bash
# Обновление системы
sudo apt update && sudo apt upgrade -y

# Установка зависимостей
sudo apt install -y apt-transport-https ca-certificates curl software-properties-common

# Добавление Docker GPG ключа
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Добавление Docker репозитория
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Установка Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Добавление пользователя в группу docker
sudo usermod -aG docker $USER
newgrp docker
```

#### 2. Клонирование репозитория

```bash
cd /opt
sudo git clone <repository-url> messenger
sudo chown -R $USER:$USER messenger
cd messenger
```

#### 3. Настройка DNS

Создайте A записи для ваших доменов:
```
yourdomain.com        -> IP_вашего_сервера
api.yourdomain.com    -> IP_вашего_сервера
```

#### 4. Настройка переменных окружения

```bash
# Копирование примера
cp .env.example .env

# Редактирование файла
nano .env
```

Заполните все необходимые переменные:

```env
# Генерация безопасных паролей
POSTGRES_PASSWORD=$(openssl rand -base64 32)
REDIS_PASSWORD=$(openssl rand -base64 32)
SECRET_KEY=$(openssl rand -base64 48)

# SMTP настройки (Gmail example)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# URLs
FRONTEND_URL=https://yourdomain.com
API_URL=https://api.yourdomain.com
WS_URL=wss://api.yourdomain.com
```

#### 5. Настройка Coturn

```bash
# Получите ваш публичный IP
curl ifconfig.me

# Отредактируйте конфигурацию
nano coturn/turnserver.conf
```

Замените `YOUR_PUBLIC_IP` на ваш публичный IP:
```
external-ip=YOUR_PUBLIC_IP
```

#### 6. Настройка Caddy

Отредактируйте `Caddyfile`:
```bash
nano Caddyfile
```

Раскомментируйте и настройте секцию для продакшена:
```
yourdomain.com {
    reverse_proxy frontend:3000
}

api.yourdomain.com {
    reverse_proxy backend:8000
}
```

#### 7. Запуск приложения

```bash
# Сборка и запуск контейнеров
docker compose -f docker-compose.prod.yml up -d --build

# Проверка логов
docker compose -f docker-compose.prod.yml logs -f

# Проверка статуса
docker compose -f docker-compose.prod.yml ps
```

#### 8. Настройка firewall

```bash
# Установка UFW
sudo apt install -y ufw

# Разрешить SSH
sudo ufw allow 22/tcp

# Разрешить HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Разрешить TURN/STUN
sudo ufw allow 3478/tcp
sudo ufw allow 3478/udp
sudo ufw allow 5349/tcp
sudo ufw allow 5349/udp

# Включить firewall
sudo ufw enable
```

#### 9. Проверка работы

Откройте в браузере:
```
https://yourdomain.com
```

Caddy автоматически получит SSL сертификаты от Let's Encrypt.

### Обслуживание

#### Просмотр логов
```bash
# Все сервисы
docker compose -f docker-compose.prod.yml logs -f

# Конкретный сервис
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f frontend
```

#### Перезапуск сервисов
```bash
# Все сервисы
docker compose -f docker-compose.prod.yml restart

# Конкретный сервис
docker compose -f docker-compose.prod.yml restart backend
```

#### Обновление приложения
```bash
# Получить последние изменения
git pull

# Пересобрать и перезапустить
docker compose -f docker-compose.prod.yml up -d --build
```

#### Бэкапы

##### База данных
```bash
# Создать бэкап
docker exec mes_postgres pg_dump -U messenger messenger > backup_$(date +%Y%m%d_%H%M%S).sql

# Восстановить из бэкапа
docker exec -i mes_postgres psql -U messenger messenger < backup_20240101_120000.sql
```

##### Медиа файлы
```bash
# Создать бэкап
docker run --rm -v mes_media_data:/data -v $(pwd):/backup ubuntu tar czf /backup/media_backup_$(date +%Y%m%d_%H%M%S).tar.gz -C /data .

# Восстановить из бэкапа
docker run --rm -v mes_media_data:/data -v $(pwd):/backup ubuntu tar xzf /backup/media_backup_20240101_120000.tar.gz -C /data
```

#### Мониторинг

##### Использование ресурсов
```bash
docker stats
```

##### Проверка здоровья сервисов
```bash
# Backend health check
curl https://api.yourdomain.com/health

# Проверка подключения к WebSocket
wscat -c wss://api.yourdomain.com/ws/test
```

### Масштабирование

#### Увеличение количества воркеров backend

Отредактируйте `backend/Dockerfile.prod`:
```dockerfile
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "8"]
```

#### Использование отдельного Redis для кэша и очередей

Добавьте второй Redis сервис в `docker-compose.prod.yml`

#### Использование внешней PostgreSQL

Измените `DATABASE_URL` в переменных окружения

### Безопасность

#### Регулярные обновления
```bash
# Обновление системы
sudo apt update && sudo apt upgrade -y

# Обновление Docker образов
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

#### Мониторинг логов на подозрительную активность
```bash
# Мониторинг неудачных попыток входа
docker compose -f docker-compose.prod.yml logs backend | grep "401"
```

#### Настройка rate limiting

Добавьте в Caddyfile:
```
api.yourdomain.com {
    rate_limit {
        zone api_limit {
            key {remote_host}
            events 100
            window 1m
        }
    }
    reverse_proxy backend:8000
}
```

### Устранение неполадок

#### Контейнер не запускается
```bash
# Проверьте логи
docker compose -f docker-compose.prod.yml logs [service_name]

# Проверьте конфигурацию
docker compose -f docker-compose.prod.yml config
```

#### База данных недоступна
```bash
# Проверьте, что PostgreSQL запущен
docker compose -f docker-compose.prod.yml ps postgres

# Проверьте логи
docker compose -f docker-compose.prod.yml logs postgres

# Подключитесь к базе данных
docker exec -it mes_postgres psql -U messenger
```

#### SSL сертификаты не выдаются
```bash
# Проверьте логи Caddy
docker compose -f docker-compose.prod.yml logs caddy

# Убедитесь, что домены правильно настроены
nslookup yourdomain.com

# Проверьте, что порты 80 и 443 открыты
sudo netstat -tulpn | grep -E ':(80|443)'
```

#### WebRTC не работает
```bash
# Проверьте логи Coturn
docker logs mes_coturn

# Проверьте, что порты открыты
sudo netstat -tulpn | grep -E ':(3478|5349)'

# Проверьте external-ip в конфигурации
cat coturn/turnserver.conf | grep external-ip
```

### Производительность

#### Рекомендуемые настройки для высоких нагрузок

- **CPU**: 4+ ядер
- **RAM**: 8GB+
- **SSD**: 50GB+
- **Backend workers**: 4-8
- **PostgreSQL**: настройте connection pooling
- **Redis**: используйте Redis Cluster для масштабирования
- **Caddy**: включите кэширование статических файлов

### Мониторинг и алерты

Рекомендуется установить:
- **Prometheus** + **Grafana** для метрик
- **Loki** для логов
- **Alertmanager** для уведомлений

Пример docker-compose для мониторинга можно найти в документации.

