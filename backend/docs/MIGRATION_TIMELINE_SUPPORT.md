# Миграция БД для поддержки таймлайнов

## Описание изменений

Добавлена поддержка таймлайнов в систему синхронизации:
- В таблицу `Operation` добавлено поле `timelineId` для отслеживания к какому таймлайну относится операция
- Добавлен индекс по `projectId` и `timelineId` для оптимизации запросов
- Поддерживается обратная совместимость со старым форматом данных

## Шаги миграции

### 1. Обновите схему Prisma

Изменения уже внесены в файл `backend/prisma/schema/operations.prisma`:
- Добавлено поле `timelineId String @default("base-timeline")`
- Добавлен индекс `@@index([projectId, timelineId])`

### 2. Сгенерируйте и примените миграцию

```bash
cd backend

# Сгенерируйте файл миграции
npx prisma migrate dev --name add_timeline_support

# Миграция автоматически применится к локальной БД
```

### 3. Для продакшн окружения

```bash
# Сгенерируйте SQL для миграции
npx prisma migrate deploy

# Или примените миграции вручную из папки prisma/migrations
```

### 4. Проверьте результат

После миграции все новые операции будут сохраняться с `timelineId = "base-timeline"` по умолчанию.
Существующие операции будут работать без изменений.

## SQL миграции (для ручного применения)

```sql
-- Добавить колонку timelineId с дефолтным значением
ALTER TABLE "Operation" 
ADD COLUMN "timelineId" TEXT NOT NULL DEFAULT 'base-timeline';

-- Создать индекс для оптимизации запросов
CREATE INDEX "Operation_projectId_timelineId_idx" 
ON "Operation"("projectId", "timelineId");
```

## Откат миграции (если потребуется)

```sql
-- Удалить индекс
DROP INDEX "Operation_projectId_timelineId_idx";

-- Удалить колонку
ALTER TABLE "Operation" 
DROP COLUMN "timelineId";
``` 