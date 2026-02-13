FROM node:21-alpine AS builder
WORKDIR /app

# Build args для edition
ARG NEXT_PUBLIC_EDITION=cloud
ARG NEXT_PUBLIC_API_URL=http://localhost:3001
ENV NEXT_PUBLIC_EDITION=${NEXT_PUBLIC_EDITION}
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

# Установка зависимостей
COPY package.json package-lock.json ./
RUN npm install --legacy-peer-deps

# Копируем остальной проект
COPY . .

# Сборка проекта
RUN npm run build

# -----------------------------

FROM node:21-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Копируем Next standalone-сборку
COPY --from=builder /app/.next/standalone ./

# Копируем static-файлы
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# 👇 Обязательно: твой src-код (нужен, если используется в runtime, особенно для aliased путей)
COPY --from=builder /app/src ./src

# Конфигурационные файлы, если нужны
COPY --from=builder /app/package.json ./
COPY --from=builder /app/next.config.ts ./

EXPOSE 3000
CMD ["node", "server.js"]
