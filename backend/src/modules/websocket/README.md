# WebSocket Коллаборация

## Архитектура

Система построена по принципам **SOLID**, **DRY**, и **KISS**:

- **Single Responsibility**: Каждый компонент отвечает за одну задачу
- **Open/Closed**: Легко добавлять новые типы событий
- **Liskov Substitution**: Все обработчики взаимозаменяемы
- **Interface Segregation**: Маленькие специализированные интерфейсы  
- **Dependency Inversion**: Зависимости от абстракций

## Компоненты

### 1. WebSocketManager
Отвечает только за управление подключениями:
- Регистрация/удаление соединений
- Отправка событий
- Управление комнатами

### 2. CollaborationService  
Управляет сессиями коллаборации:
- Создание/завершение сессий
- Обновление awareness
- Индексация по пользователям/проектам

### 3. Event Handlers
Обрабатывают конкретные типы событий:
- `AwarenessEventHandler`: курсор, выделение
- `OperationEventHandler`: операции синхронизации

### 4. WebSocketController
Координирует работу всех компонентов:
- Аутентификация
- Маршрутизация событий
- Управление жизненным циклом

## API

### WebSocket События

#### Подключение к проекту
```javascript
socket.emit('join_project', { projectId: 'project-123' });
```

#### Awareness события
```javascript
// Движение курсора
socket.emit('CURSOR_MOVE', {
  type: 'CURSOR_MOVE',
  payload: {
    cursor: { x: 100, y: 200, timelineId: 'timeline-1', layerId: 'layer-1' }
  },
  userId: 'user-123',
  projectId: 'project-123',
  timestamp: Date.now()
});

// Изменение выделения
socket.emit('SELECTION_CHANGE', {
  type: 'SELECTION_CHANGE', 
  payload: {
    selection: { nodeIds: ['node-1', 'node-2'], timelineId: 'timeline-1', layerId: 'layer-1' }
  },
  userId: 'user-123',
  projectId: 'project-123',
  timestamp: Date.now()
});
```

#### Операции синхронизации
```javascript
socket.emit('OPERATION_BROADCAST', {
  type: 'OPERATION_BROADCAST',
  payload: {
    operation: {
      id: 'op-123',
      type: 'CREATE_NODE',
      timelineId: 'timeline-1',
      layerId: 'layer-1',
      payload: { /* данные операции */ },
      deviceId: 'device-123',
      timestamp: Date.now()
    }
  },
  userId: 'user-123',
  projectId: 'project-123',
  timestamp: Date.now()
});
```

### REST API

#### Получение участников проекта
```http
GET /ws/projects/:projectId/participants
Authorization: Bearer <jwt-token>
```

Ответ:
```json
{
  "success": true,
  "data": {
    "participants": [
      {
        "userId": "user-123",
        "userName": "John Doe",
        "cursor": { "x": 100, "y": 200, "timelineId": "timeline-1", "layerId": "layer-1" },
        "selection": { "nodeIds": ["node-1"], "timelineId": "timeline-1", "layerId": "layer-1" },
        "joinedAt": 1635724800000,
        "lastActivity": 1635724900000
      }
    ],
    "count": 1
  }
}
```

#### Статистика WebSocket
```http
GET /ws/stats
Authorization: Bearer <jwt-token>
```

## Интеграция с фронтендом

### Подключение
```javascript
import io from 'socket.io-client';

const socket = io('ws://localhost:3000', {
  auth: {
    token: 'jwt-token'
  }
});
```

### Обработка событий
```javascript
// Подключение к проекту
socket.emit('join_project', { projectId: 'project-123' });

// Получение списка участников
socket.on('project_users', (data) => {
  console.log('Участники проекта:', data.users);
});

// Получение awareness обновлений
socket.on('AWARENESS_UPDATE', (event) => {
  console.log('Пользователь обновил awareness:', event.payload.awareness);
});

// Получение операций от других пользователей
socket.on('OPERATION_BROADCAST', (event) => {
  console.log('Получена операция:', event.payload.operation);
  // Применить операцию к локальному состоянию
});
```

## Расширение функциональности

### Добавление нового типа события

1. **Добавить тип в enum**:
```typescript
export enum CollaborationEventType {
  // ... существующие типы
  NEW_EVENT_TYPE = 'NEW_EVENT_TYPE'
}
```

2. **Создать обработчик**:
```typescript
export class NewEventHandler extends BaseEventHandler {
  async handle(socket: Socket, event: CollaborationEvent): Promise<void> {
    // Логика обработки
  }
}
```

3. **Зарегистрировать в контроллере**:
```typescript
private initializeEventHandlers(): void {
  // ... существующие обработчики
  const newHandler = new NewEventHandler();
  this.eventHandlers.set(CollaborationEventType.NEW_EVENT_TYPE, newHandler);
}
```

## Мониторинг и отладка

Все события логируются через Winston logger. Для отладки можно использовать:

```javascript
// Включить debug логи
localStorage.debug = 'socket.io-client:socket';

// Слушать ошибки
socket.on('error', (error) => {
  console.error('WebSocket error:', error);
});
```

## Производительность

- Автоматическая очистка неактивных сессий каждую минуту
- Индексация сессий по пользователям и проектам
- Эффективная маршрутизация событий через Map структуры
- Graceful shutdown обработка 