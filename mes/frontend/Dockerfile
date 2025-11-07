FROM node:20-alpine

WORKDIR /app

# Копирование package.json
COPY package.json package-lock.json* ./

# Установка зависимостей
RUN npm install

# Копирование остального кода
COPY . .

# Expose порт
EXPOSE 3000

# Запуск dev сервера
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "3000"]

