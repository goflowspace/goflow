# Настройка локальной MongoDB для разработки

## Быстрый старт

1. **Запустите MongoDB через Docker:**
   ```bash
   docker-compose up mongodb -d
   ```

2. **Создайте файл `.env.development` в корне проекта:**
   ```bash
   # Development environment
   NODE_ENV=development
   PORT=3000

   # Local MongoDB with Replica Set
   DATABASE_URL=mongodb://admin:password123@localhost:27017/flow?authSource=admin&replicaSet=rs0&directConnection=true

   # JWT Secret (сгенерируйте: openssl rand -base64 32)
   JWT_SECRET=your_32_character_jwt_secret_key_here_change_this

   # Google OAuth (добавьте ваши реальные значения)
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback

   # Email service (Resend)
   RESEND_API_KEY=your_resend_api_key
   RESEND_FROM_EMAIL=noreply@yourdomain.com

   # Swagger documentation
   SWAGGER_USER=admin
   SWAGGER_PASS=admin123

   # OpenAI API
   OPENAI_API_KEY=your_openai_api_key

   # Frontend URL
   FRONTEND_URL=http://localhost:3000
   ```

3. **Примените миграции Prisma:**
   ```bash
   npx prisma db push
   ```

4. **Запустите приложение:**
   ```bash
   npm run dev
   ```

## Управление MongoDB

- **Запуск только MongoDB:** `docker-compose up mongodb -d`
- **Остановка:** `docker-compose down`
- **Просмотр логов:** `docker-compose logs mongodb`
- **Подключение к MongoDB CLI:** `docker exec -it flow-mongodb mongosh -u admin -p password123 --authenticationDatabase admin`

## Параметры подключения

- **Host:** localhost
- **Port:** 27017  
- **Database:** flow
- **Username:** admin
- **Password:** password123
- **Auth Database:** admin

## Отладка

Если возникают проблемы с подключением:

1. Проверьте, что контейнер запущен: `docker ps`
2. Проверьте логи: `docker-compose logs mongodb`
3. Убедитесь, что порт 27017 не занят другим процессом 