# Этап сборки
FROM node:21-alpine AS builder

WORKDIR /usr/src/app

# Устанавливаем зависимости
COPY package.json package-lock.json ./
RUN npm install

# Копируем схему Prisma
COPY prisma ./prisma/

# Генерируем Prisma Client
# На этом этапе DATABASE_URL не требуется
RUN npx prisma generate --no-engine

# Копируем исходный код и компилируем
COPY . .
RUN npm run build

# Этап запуска
FROM node:21-alpine

WORKDIR /usr/src/app

# Устанавливаем переменные окружения
ENV NODE_ENV=production
ENV PORT=8080

# Копируем package.json и package-lock.json для установки только production-зависимостей
COPY package.json package-lock.json ./
RUN npm install --omit=dev

# Копируем скомпилированный код из этапа сборки
COPY --from=builder /usr/src/app/dist ./dist

# Копируем исходный код и конфигурацию TypeScript (может понадобиться для tsx)
COPY --from=builder /usr/src/app/src ./src
COPY --from=builder /usr/src/app/tsconfig.json ./tsconfig.json

# Копируем Prisma-клиент и схему
COPY --from=builder /usr/src/app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /usr/src/app/prisma/schema ./prisma/schema

# Создаем директорию для локального хранилища (OSS edition)
RUN mkdir -p /data/uploads

# Указываем порт для Cloud Run / OSS
EXPOSE 8080

# Запускаем через tsx для поддержки ESM и алиасов
CMD ["npx", "tsx", "src/server.ts"]
