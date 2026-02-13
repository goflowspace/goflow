# Настройка авторизации

## Проблема
В проекте была система авторизации, но отсутствовала проверка авторизации на фронтенде, которая бы перенаправляла неавторизованных пользователей на страницу входа.

## Решение
Добавлен компонент `AuthGuard`, который:
1. Проверяет наличие токена в localStorage
2. Валидирует токен через API `/auth/me`
3. Перенаправляет неавторизованных пользователей на Google OAuth
4. Автоматически обновляет состояние пользователя в приложении

## Изменения

### 1. Создан компонент AuthGuard
- `app/src/components/AuthGuard/AuthGuard.tsx` - основной компонент
- `app/src/components/AuthGuard/index.ts` - экспорт

### 2. Интегрирован в ClientLayout
- Обернул все приложение в `AuthGuard`
- Теперь проверка авторизации происходит на всех страницах

### 3. Упрощен PlayBar
- Убрана дублирующаяся логика проверки авторизации
- Оставлена только кнопка выхода

### 4. Обновлен API сервис
- Добавлена обработка 401 ошибок
- Автоматическое удаление невалидного токена

### 5. Исправлены маршруты авторизации на backend
- Добавлен GET `/auth/google/callback` для обработки OAuth callback
- Обновлена страница callback на фронтенде

## Настройка Google OAuth

### 1. Создайте проект в Google Cloud Console
1. Перейдите в [Google Cloud Console](https://console.cloud.google.com/)
2. Создайте новый проект или выберите существующий
3. Включите Google+ API

### 2. Настройте OAuth 2.0
1. Перейдите в "APIs & Services" > "Credentials"
2. Нажмите "Create Credentials" > "OAuth 2.0 Client IDs"
3. Выберите "Web application"
4. Добавьте authorized redirect URIs:
   - `http://localhost:3001/auth/google/callback`

### 3. Настройте переменные окружения
Создайте файл `backend/.env.development`:

```env
# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-that-is-at-least-32-characters-long

# Database
DATABASE_URL="postgresql://username:password@localhost:5432/flow_db"

# Server Configuration
PORT=3001
NODE_ENV=development
APP_URL=http://localhost:3000

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-google-client-id-from-console
GOOGLE_CLIENT_SECRET=your-google-client-secret-from-console
GOOGLE_CALLBACK_URL=http://localhost:3001/auth/google/callback

# Email Configuration (optional)
RESEND_API_KEY=your-resend-api-key
RESEND_FROM_EMAIL=noreply@yourdomain.com

# Swagger Documentation (optional)
SWAGGER_USER=admin
SWAGGER_PASS=password

# OpenAI API (optional)
OPENAI_API_KEY=your-openai-api-key
```

## Как это работает

1. **Пользователь заходит на любую страницу**
   - `AuthGuard` проверяет наличие токена
   - Если токена нет → редирект на Google OAuth

2. **Google OAuth**
   - Пользователь авторизуется в Google
   - Google перенаправляет на `http://localhost:3001/auth/google/callback`
   - Backend создает JWT токен и перенаправляет на `http://localhost:3000/auth/google/callback?token=...`

3. **Callback на фронтенде**
   - Страница `/auth/google/callback` сохраняет токен в localStorage
   - Перенаправляет на `/projects`

4. **Дальнейшая работа**
   - `AuthGuard` проверяет токен при каждом обновлении страницы
   - API автоматически добавляет токен в заголовки запросов
   - При 401 ошибке токен удаляется и происходит редирект на авторизацию

## Публичные маршруты
Маршруты, которые не требуют авторизации:
- `/auth/google/callback`

Для добавления новых публичных маршрутов отредактируйте массив `publicRoutes` в `AuthGuard.tsx`.

## Тестирование
1. Запустите backend: `npm run dev`
2. Запустите frontend: `npm run dev`
3. Откройте `http://localhost:3000`
4. Вы должны быть перенаправлены на Google OAuth
5. После авторизации вы попадете на страницу проектов 