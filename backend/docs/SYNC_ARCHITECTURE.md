# Архитектура синхронизации данных графа

## Обзор

Система синхронизации построена на принципе Event Sourcing с использованием операций (commands) для оптимизации трафика и поддержки оффлайн работы.

## Иерархия данных

```
Проект
├── Таймлайны (timelines)
│   └── base-timeline (основной таймлайн)
│       ├── Слои (layers)
│       │   ├── root (корневой слой)
│       │   └── layer-1, layer-2, ...
│       │       └── Узлы (nodes)
│       │           ├── narrative
│       │           ├── choice
│       │           ├── note
│       │           └── layer (вложенные слои)
│       ├── Метаданные (metadata)
│       └── Переменные (variables)
└── Метаданные проекта (projectName, _lastModified)
```

## Компоненты

### Frontend

#### 1. **SyncService** (`app/src/services/syncService.ts`)
- Основной сервис управления синхронизацией
- Отслеживает состояние онлайн/оффлайн
- Управляет очередью операций
- Реализует логику синхронизации с весами

#### 2. **OfflineStorageService** (`app/src/services/offlineStorageService.ts`)
- Использует IndexedDB для надежного хранения
- Хранит операции, снимки графа и состояние синхронизации
- Поддерживает работу в оффлайн режиме

#### 3. **CommandToOperationAdapter** (`app/src/services/commandToOperationAdapter.ts`)
- Преобразует команды в операции для синхронизации
- Извлекает payload из команд
- Маппинг типов команд на типы операций

#### 4. **AutoSaveStatus** (`app/src/components/AutoSaveStatus/AutoSaveStatus.tsx`)
- UI компонент отображения статуса синхронизации
- Показывает состояние: сохранено/несохранено/синхронизация

### Backend

#### 1. **SyncService** (`backend/src/modules/sync/sync.service.ts`)
- Обработка операций от клиентов
- Разрешение конфликтов
- Построение графа из операций
- Управление версиями

#### 2. **База данных**
- **Operation** - хранит все операции
- **GraphSnapshot** - снимки графа для быстрой загрузки
- **ProjectVersion** - версионирование проектов

## Принципы работы

### 1. Веса операций
```typescript
OPERATION_WEIGHTS = {
  MOVE_NODE: 1,      // Легкие операции
  CREATE_EDGE: 5,    // Средние операции
  CREATE_NODE: 10,   // Тяжелые операции
  CREATE_LAYER: 15   // Очень тяжелые операции
}
```

При накоплении 20 единиц веса начинается синхронизация.

### 2. Процесс синхронизации

1. **Клиент выполняет команду**
   - Команда конвертируется в операцию
   - Операция включает timelineId (по умолчанию 'base-timeline')
   - Операция сохраняется в IndexedDB
   - Увеличивается общий вес

2. **Триггер синхронизации**
   - При достижении порога веса (20 единиц)
   - С дебаунсом 2 секунды

3. **Отправка на сервер**
   - Batch операций с версией
   - Device ID для идентификации

4. **Обработка на сервере**
   - Проверка версий
   - Разрешение конфликтов
   - Сохранение операций
   - Обновление снимка

5. **Ответ клиенту**
   - Новая версия
   - Операции от других клиентов
   - Информация о конфликтах

### 3. Оффлайн режим

- Все операции сохраняются в IndexedDB
- При восстановлении связи автоматическая синхронизация
- Локальный снимок графа для работы

### 4. Разрешение конфликтов

Текущая стратегия: **Client Wins** (клиент всегда выигрывает)

В будущем можно реализовать:
- Operational Transform (OT)
- CRDT (Conflict-free Replicated Data Types)
- Ручное разрешение конфликтов

## API Endpoints

### Синхронизация операций
```
POST /projects/:id/sync
Body: {
  operations: Operation[]  // Каждая операция включает timelineId
  projectId: string
  lastSyncVersion: number
  deviceId: string
}
```

### Получение снимка графа
```
GET /projects/:id/snapshot
Response: {
  version: number
  timestamp: number
  layers: {}      // Слои из base-timeline
  metadata: {}    // Метаданные из base-timeline
  variables: []   // Переменные из base-timeline
}
```

## Формат данных проекта

### Новый формат (с таймлайнами)
```json
{
  "timelines": {
    "base-timeline": {
      "layers": {...},
      "metadata": {...},
      "variables": [...],
      "lastLayerNumber": 0
    }
  },
  "projectName": "My Project",
  "projectId": "...",
  "_lastModified": 1234567890
}
```

### Старый формат (без таймлайнов) - поддерживается для обратной совместимости
```json
{
  "layers": {...},
  "layerMetadata": {...},
  "variables": [...],
  "lastLayerNumber": 0,
  "projectName": "My Project",
  "_lastModified": 1234567890
}
```

## Интерфейс операции

```typescript
interface Operation {
  id: string;
  type: OperationType;
  timestamp: number;
  timelineId: string;  // ID таймлайна (например, 'base-timeline')
  layerId: string;     // ID слоя внутри таймлайна
  payload: any;
  userId?: string;
  deviceId: string;
}
```

## Интеграция с существующим кодом

### 1. CommandManager
```typescript
// В CommandManager добавить после выполнения команды:
const syncService = SyncService.getInstance();
await syncService.addCommand(command);
```

### 2. ProjectDataService
```typescript
// Заменить прямое сохранение на сервер на использование SyncService
// SyncService будет управлять синхронизацией автоматически
```

### 3. GraphStore
```typescript
// При загрузке проекта:
const syncService = SyncService.getInstance();
await syncService.initialize(projectId);
const snapshot = await syncService.loadGraphSnapshot();
```

## Миграция

### Для запуска системы необходимо:

1. **На бекенде:**
   ```bash
   # Создать миграцию для добавления timelineId в таблицу Operation
   npx prisma migrate dev --name add_timeline_support
   ```

2. **На фронтенде:**
   - Интегрировать SyncService в CommandManager
   - Обновить загрузку проектов
   - Добавить UI индикаторы синхронизации

## Преимущества архитектуры

1. **Оптимизация трафика** - отправляем только операции, не весь граф
2. **Оффлайн работа** - полная функциональность без интернета
3. **Автоматическая синхронизация** - по накоплению веса
4. **Версионирование** - история всех изменений
5. **Масштабируемость** - легко добавлять новые типы операций

## Будущие улучшения

1. **WebSocket** для real-time синхронизации
2. **Collaborative editing** - одновременное редактирование
3. **Более умное разрешение конфликтов**
4. **Сжатие операций** - объединение последовательных операций
5. **Частичная загрузка** - загрузка только нужных слоев
6. **Множественные таймлайны** - поддержка нескольких таймлайнов в проекте