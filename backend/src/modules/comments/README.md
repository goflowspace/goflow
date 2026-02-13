# Модуль комментариев

## Быстрый старт

### 1. Подключение модуля

```typescript
import { createCommentsRoutes, CommentsService } from './modules/comments';

// В app.ts
app.use('/api', createCommentsRoutes());
```

### 2. Обновление схемы базы данных

```bash
# Примените миграции Prisma
npx prisma db push

# Или создайте миграцию
npx prisma migrate dev --name add_comments_system
```

### 3. Использование в frontend

```typescript
import CommentsAPI from './services/comments.api';

// Создание треда с комментарием на канвасе
const thread = await CommentsAPI.createThread('project-id', {
  contextType: 'CANVAS_POSITION',
  contextData: { x: 100, y: 200, zoom: 1.0 },
  firstComment: {
    content: 'Этот узел нужно доработать',
    mentions: [
      { type: 'TEAM', targetId: 'team-id' }
    ]
  }
});

// Добавление комментария к треду
const comment = await CommentsAPI.addComment('project-id', thread.id, {
  content: 'Согласен, добавлю исправления',
  mentions: [
    { type: 'USER', targetId: 'user-id' }
  ]
});

// Получение уведомлений
const notifications = await CommentsAPI.getNotifications();
```

## Основные API методы

### Треды
- `createThread(projectId, data)` - создание треда
- `getThreads(projectId, filters)` - получение списка тредов
- `getThread(projectId, threadId)` - получение треда по ID
- `updateThread(projectId, threadId, data)` - обновление треда
- `resolveThread(projectId, threadId)` - закрытие треда
- `reopenThread(projectId, threadId)` - открытие треда

### Комментарии
- `addComment(projectId, threadId, data)` - добавление комментария
- `updateComment(projectId, commentId, data)` - редактирование комментария
- `deleteComment(projectId, commentId)` - удаление комментария

### Уведомления
- `getNotifications(filters)` - получение уведомлений
- `getUnreadNotifications()` - получение непрочитанных уведомлений
- `markNotificationsAsRead(ids?)` - отметка как прочитанные
- `markAllNotificationsAsRead()` - отметка всех как прочитанные

## Типы контекста

### Canvas Position (позиция на канвасе)
```typescript
{
  contextType: 'CANVAS_POSITION',
  contextData: {
    x: 100,        // X координата
    y: 200,        // Y координата  
    zoom: 1.0      // Масштаб (опционально)
  }
}
```

### Node (узел графа)
```typescript
{
  contextType: 'NODE',
  contextData: {
    nodeId: 'node-123',        // ID узла
    nodeType: 'dialogue',      // Тип узла (опционально)
    nodeTitle: 'Диалог 1'      // Название узла (опционально)
  }
}
```

### Entity (сущность - для будущего)
```typescript
{
  contextType: 'ENTITY',
  contextData: {
    entityId: 'entity-123',
    entityType: 'character',
    entityName: 'Главный герой'
  }
}
```

## Упоминания

```typescript
// Упоминание пользователя
{
  type: 'USER',
  targetId: 'user-id'
}

// Упоминание команды
{
  type: 'TEAM', 
  targetId: 'team-id'
}
```

## WebSocket события

```typescript
// Подписка на события комментариев
websocket.on('thread:created', (thread) => {
  // Обработка создания треда
});

websocket.on('comment:created', (comment) => {
  // Обработка нового комментария
});

websocket.on('notification:created', (notification) => {
  // Обработка нового уведомления
});
```

## Фильтрация тредов

```typescript
const filters: ThreadFilters = {
  contextType: 'CANVAS_POSITION',  // Тип контекста
  resolved: false,                 // Статус разрешения
  creatorId: 'user-id',           // Автор треда
  mentionedUserId: 'user-id',     // Упоминание пользователя
  mentionedTeamId: 'team-id',     // Упоминание команды
  dateFrom: new Date('2024-01-01'), // Дата от
  dateTo: new Date('2024-12-31'),   // Дата до
  search: 'поиск текста'          // Поиск по тексту
};

const threads = await CommentsAPI.getThreads('project-id', filters);
```

## Обработка ошибок

```typescript
try {
  const thread = await CommentsAPI.createThread('project-id', data);
} catch (error) {
  if (error.response?.status === 400) {
    // Ошибка валидации
    console.log(error.response.data.errors);
  } else if (error.response?.status === 401) {
    // Не авторизован
  } else if (error.response?.status === 404) {
    // Не найден
  } else {
    // Серверная ошибка
  }
}
```
