# Архитектура системы комментариев

## Обзор

Система комментариев разработана для редактора Flow и позволяет пользователям оставлять комментарии на различных элементах проекта. Архитектура основана на концепции **threads** из Liveblocks, где каждый первый комментарий создает thread (тред).

## Основные концепции

### Thread (Тред)
- Основная единица для группировки комментариев
- Создается автоматически при добавлении первого комментария
- Может быть привязан к различным элементам системы
- Имеет статус (resolved/unresolved)
- Поддерживает метаданные для расширения функциональности

### Comment (Комментарий)
- Отдельное сообщение внутри треда
- Создается пользователем
- Поддерживает упоминания (@user, @team)
- Может быть отредактирован и удален (soft delete)

### Context (Контекст)
Система поддерживает различные типы контекста для привязки комментариев:

- **CANVAS_POSITION** - комментарий на пустом месте канваса
- **NODE** - комментарий привязан к узлу графа
- **ENTITY** - комментарий к сущности (для будущего развития)
- **BIBLE_SECTION** - комментарий к разделу библии (для будущего развития)
- **GENERAL** - общий комментарий к проекту

## Модель данных

### Thread (Тред)
```typescript
interface Thread {
  id: string
  projectId: string
  createdAt: Date
  updatedAt: Date
  resolved: boolean
  creatorId: string
  contextType: ThreadContextType
  contextData: ThreadContextData
  metadata: Record<string, any>
}
```

### Comment (Комментарий)
```typescript
interface Comment {
  id: string
  threadId: string
  authorId: string
  content: string
  createdAt: Date
  updatedAt: Date
  editedAt?: Date
  deletedAt?: Date
}
```

### Упоминания
- **ThreadMention** - упоминания на уровне треда
- **CommentMention** - упоминания на уровне комментария

### Уведомления
```typescript
interface Notification {
  id: string
  userId: string
  type: NotificationType
  threadId?: string
  commentId?: string
  title: string
  message: string
  data: Record<string, any>
  read: boolean
  readAt?: Date
  createdAt: Date
}
```

## API Endpoints

### Threads
- `POST /api/projects/:projectId/comments/threads` - Создание треда
- `GET /api/projects/:projectId/comments/threads` - Получение тредов с фильтрацией
- `GET /api/projects/:projectId/comments/threads/:threadId` - Получение треда по ID
- `PATCH /api/projects/:projectId/comments/threads/:threadId` - Обновление треда

### Comments
- `POST /api/projects/:projectId/comments/threads/:threadId/comments` - Добавление комментария
- `PATCH /api/projects/:projectId/comments/:commentId` - Обновление комментария
- `DELETE /api/projects/:projectId/comments/:commentId` - Удаление комментария

### Notifications
- `GET /api/comments/notifications` - Получение уведомлений
- `PATCH /api/comments/notifications/read` - Отметка уведомлений как прочитанные

## Типы контекстных данных

### Canvas Position
```typescript
interface CanvasPositionContext {
  x: number
  y: number
  zoom?: number
}
```

### Node Context
```typescript
interface NodeContext {
  nodeId: string
  nodeType?: string
  nodeTitle?: string
}
```

### Entity Context (для будущего)
```typescript
interface EntityContext {
  entityId: string
  entityType?: string
  entityName?: string
}
```

## UI Компоненты

### Основные требования
- **Позиционирование на канвасе** - комментарии отображаются как точки на канвасе
- **Привязка к узлам** - комментарии могут быть прикреплены к узлам графа
- **Упоминания команды** - поддержка @team упоминаний
- **Список уведомлений** - отображение непрочитанных уведомлений

### Интеграция с Canvas
Комментарии интегрируются с системой канваса через:
- Координаты позиционирования (x, y, zoom)
- События перемещения и изменения масштаба
- Система слоев для отображения

## WebSocket интеграция

Система поддерживает real-time обновления через WebSocket:

```typescript
interface CommentWebSocketEvents {
  'thread:created': Thread
  'thread:updated': Thread
  'thread:resolved': { threadId: string; resolved: boolean; userId: string }
  'comment:created': Comment
  'comment:updated': Comment
  'comment:deleted': { commentId: string; threadId: string; userId: string }
  'notification:created': Notification
  'user:typing': { threadId: string; userId: string; userName: string }
}
```

## Система уведомлений

### Типы уведомлений
- **NEW_COMMENT** - новый комментарий в треде
- **COMMENT_MENTION** - упоминание в комментарии
- **THREAD_MENTION** - упоминание в треде
- **THREAD_RESOLVED** - тред закрыт
- **THREAD_REOPENED** - тред переоткрыт

### Логика создания уведомлений
1. **Новый комментарий** - уведомляются все участники треда (кроме автора)
2. **Упоминания пользователей** - уведомляется конкретный пользователь
3. **Упоминания команды** - уведомляются все участники команды
4. **Изменение статуса треда** - уведомляются все участники треда

## Безопасность и авторизация

### Права доступа
- Просмотр комментариев: участники проекта
- Создание комментариев: участники проекта с правами редактирования
- Редактирование комментариев: только автор комментария
- Удаление комментариев: только автор комментария
- Управление статусом треда: участники проекта с правами редактирования

### Валидация
- Длина комментария: 1-5000 символов
- Обязательные поля при создании треда
- Валидация контекстных данных в зависимости от типа

## Масштабируемость и производительность

### Индексы базы данных
```sql
-- Threads
CREATE INDEX threads_project_context ON threads (projectId, contextType)
CREATE INDEX threads_project_resolved ON threads (projectId, resolved)
CREATE INDEX threads_project_created ON threads (projectId, createdAt)

-- Comments
CREATE INDEX comments_thread_created ON comments (threadId, createdAt)
CREATE INDEX comments_author ON comments (authorId)

-- Notifications
CREATE INDEX notifications_user_read ON notifications (userId, read)
CREATE INDEX notifications_user_created ON notifications (userId, createdAt)
```

### Пагинация
- Все списковые эндпоинты поддерживают пагинацию
- Размер страницы по умолчанию: 20 элементов
- Максимальный размер страницы: 100 элементов

### Кэширование
- Использование Redis для кэширования часто запрашиваемых данных
- Инвалидация кэша при изменении данных
- Кэширование количества непрочитанных уведомлений

## Будущие расширения

### Запланированные фичи
1. **Комментарии к сущностям** - поддержка ENTITY контекста
2. **Комментарии к библии** - поддержка BIBLE_SECTION контекста
3. **Rich text комментарии** - поддержка форматированного текста
4. **Файловые вложения** - прикрепление файлов к комментариям
5. **Реакции на комментарии** - эмодзи реакции
6. **Приватные комментарии** - комментарии видимые только автору и упомянутым

### Техническое развитие
1. **Email уведомления** - отправка уведомлений на email
2. **Мобильные push уведомления** - через Firebase
3. **Интеграция с внешними системами** - Slack, Discord
4. **API для внешних интеграций** - webhook'и для внешних систем

## Локализация

Система поддерживает мультиязычность:
- Английский (en) - базовый язык
- Русский (ru)
- Французский (fr)
- Португальский (pt)
- Испанский (es)

Локализуются:
- Типы уведомлений
- Системные сообщения
- UI элементы

## Мониторинг и логирование

### Метрики
- Количество созданных тредов/комментариев
- Время отклика API
- Количество активных пользователей
- Количество упоминаний команд

### Логирование
- Действия пользователей (создание, редактирование, удаление)
- Ошибки API
- WebSocket события
- Производительность запросов к базе данных
