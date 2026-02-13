# Улучшения системы авторизации

## Обзор изменений

Система авторизации была значительно улучшена с применением лучших практик безопасности и современных подходов.

## Основные улучшения

### 1. **Refresh и Access токены**
- **Access токен**: Короткоживущий (15 минут) для доступа к API
- **Refresh токен**: Долгоживущий (30 дней) для обновления access токена
- Refresh токены хранятся в базе данных и могут быть инвалидированы

### 2. **Валидация данных**
- Использование Zod для валидации всех входных данных
- Строгие правила для паролей (минимум 8 символов, заглавные/строчные буквы, цифры, спецсимволы)
- Валидация email адресов

### 3. **Rate Limiting**
- Защита от брутфорса: максимум 5 попыток входа за 15 минут
- Ограничение регистраций: максимум 3 регистрации с одного IP за час
- Общий лимит API: 100 запросов за 15 минут

### 4. **Улучшенная безопасность**
- Использование Helmet для установки безопасных HTTP заголовков
- HttpOnly cookies для refresh токенов
- Увеличенное количество раундов bcrypt (12 вместо 10)
- CORS настроен для работы с credentials

### 5. **Middleware для авторизации**
- `authenticateJWT` - проверка JWT токена
- `optionalAuthenticateJWT` - опциональная проверка
- `requireVerifiedEmail` - требование верифицированного email

### 6. **Новые эндпоинты**

#### POST /auth/refresh
Обновление access токена используя refresh токен
```json
{
  "refreshToken": "string"
}
```

#### POST /auth/logout
Выход из системы и инвалидация refresh токенов

#### POST /auth/change-password
Смена пароля (требует авторизации)
```json
{
  "currentPassword": "string",
  "newPassword": "string"
}
```

#### GET /auth/me
Получение информации о текущем пользователе

### 7. **Улучшенная обработка ошибок**
- Централизованная обработка ошибок через middleware
- Консистентный формат ответов
- Детальные сообщения об ошибках валидации

### 8. **Google OAuth улучшения**
- Поддержка выбора аккаунта при входе
- Автоматическая верификация email для Google аккаунтов
- Генерация refresh токенов для OAuth пользователей

## Миграция базы данных

Для применения изменений необходимо:

1. Добавить модель RefreshToken в схему Prisma:
```prisma
model RefreshToken {
  id        String   @id @default(uuid())
  userId    String
  token     String   @unique
  createdAt DateTime @default(now())
  expiresAt DateTime
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([userId])
  @@index([token])
}
```

2. Выполнить миграцию:
```bash
npm run migrate:dev -- --name add_refresh_tokens
```

## Переменные окружения

Добавьте в `.env`:
```
SESSION_SECRET=your-secure-session-secret
FRONTEND_URL=http://localhost:3000
```

## Примеры использования

### Регистрация
```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!",
    "name": "John Doe"
  }'
```

### Вход
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!"
  }'
```

### Обновление токена
```bash
curl -X POST http://localhost:3000/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "your-refresh-token"
  }'
```

### Использование access токена
```bash
curl -X GET http://localhost:3000/auth/me \
  -H "Authorization: Bearer your-access-token"
```

## Рекомендации для продакшена

1. **Используйте HTTPS** для всех запросов
2. **Настройте CORS** для конкретных доменов
3. **Включите CSP** в Helmet
4. **Используйте Redis** для хранения сессий
5. **Настройте мониторинг** неудачных попыток входа
6. **Регулярно ротируйте** секретные ключи
7. **Логируйте** все действия связанные с безопасностью

## Дальнейшие улучшения

1. **Двухфакторная аутентификация (2FA)**
2. **Восстановление пароля**
3. **Блокировка аккаунтов** после множественных неудачных попыток
4. **Аудит логи** для всех действий пользователей
5. **Токены устройств** для отслеживания сессий
6. **WebAuthn** поддержка для биометрической аутентификации 