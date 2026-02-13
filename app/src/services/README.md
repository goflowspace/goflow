# SyncService - Сервис фоновой синхронизации операций

## Обзор

`SyncService` - это надежный, продакшн-готовый сервис для фоновой синхронизации операций с бэкендом. Сервис разработан в соответствии с принципами SOLID, DRY и KISS для обеспечения чистой архитектуры
и простоты использования.

## Основные возможности

- ✅ **Фоновая синхронизация**: Автоматическая отправка операций на сервер
- ✅ **Пакетная обработка**: Группировка операций для эффективного использования сети
- ✅ **Retry логика**: Автоматические повторы с экспоненциальной задержкой
- ✅ **Управление жизненным циклом**: start/stop/pause/resume
- ✅ **Обработка ошибок**: Надежная обработка сетевых и серверных ошибок
- ✅ **События и мониторинг**: Подписка на события синхронизации
- ✅ **Статистика**: Подробная статистика работы сервиса
- ✅ **Конфигурируемость**: Гибкая настройка под разные сценарии

## Архитектура

Сервис построен на основе принципов чистой архитектуры:

### Основные компоненты

```
SyncService (основной класс)
├── IStorageService (работа с IndexedDB)
├── INetworkService (сетевые операции)
├── ILogger (логирование)
└── ISyncConfig (конфигурация)
```

### Принципы SOLID

- **Single Responsibility**: Каждый класс имеет одну ответственность
- **Open/Closed**: Расширяемость через интерфейсы и события
- **Liskov Substitution**: Все реализации следуют контрактам интерфейсов
- **Interface Segregation**: Разделенные, сфокусированные интерфейсы
- **Dependency Inversion**: Зависимость от абстракций, а не от реализаций

## Быстрый старт

### 1. Основное использование

```typescript
import {SyncServiceRegistry} from './services/syncServiceFactory';

// Создание и запуск сервиса для проекта
const projectId = 'my-project-123';
const syncService = SyncServiceRegistry.getOrCreate(projectId);

// Подписка на события
syncService.on('syncCompleted', (stats) => {
  console.log('Синхронизация завершена:', stats);
});

syncService.on('syncFailed', (error) => {
  console.error('Ошибка синхронизации:', error);
});

// Запуск синхронизации
syncService.start();

// Остановка при закрытии проекта
syncService.stop();
```

### 2. Использование с кастомной конфигурацией

```typescript
import {SyncServiceFactory} from './services/syncServiceFactory';

// Создание с кастомными настройками
const syncService = SyncServiceFactory.create('project-123', {
  batchSize: 100, // Больше операций в пакете
  syncIntervalMs: 10000, // Синхронизация каждые 10 секунд
  maxRetries: 5, // Больше попыток
  retryDelayMs: 3000, // Длительные задержки
  backoffMultiplier: 2 // Экспоненциальная задержка
});

syncService.start();
```

### 3. React интеграция

```typescript
import { SyncServiceRegistry } from './services/syncServiceFactory';
import { useEffect, useState } from 'react';

function SyncStatusComponent({ projectId }: { projectId: string }) {
  const [status, setStatus] = useState('stopped');
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const syncService = SyncServiceRegistry.getOrCreate(projectId);

    const handleStatusChange = (_, newStatus) => setStatus(newStatus);
    const handleSyncCompleted = (newStats) => setStats(newStats);

    syncService.on('statusChanged', handleStatusChange);
    syncService.on('syncCompleted', handleSyncCompleted);

    // Запуск синхронизации
    syncService.start();

    return () => {
      syncService.off('statusChanged', handleStatusChange);
      syncService.off('syncCompleted', handleSyncCompleted);
    };
  }, [projectId]);

  return (
    <div>
      <div>Статус: {status}</div>
      {stats && (
        <div>
          Обработано операций: {stats.totalOperationsProcessed}
          Последняя синхронизация: {new Date(stats.lastSyncTime).toLocaleString()}
        </div>
      )}
    </div>
  );
}
```

## API Reference

### ISyncService

Основной интерфейс сервиса синхронизации.

#### Методы управления жизненным циклом

- `start(): void` - Запускает сервис синхронизации
- `stop(): void` - Останавливает сервис
- `pause(): void` - Приостанавливает синхронизацию
- `resume(): void` - Возобновляет синхронизацию после паузы

#### Методы получения состояния

- `getStatus(): SyncStatus` - Возвращает текущий статус ('stopped' | 'running' | 'paused' | 'error' | 'syncing')
- `getStats(): ISyncStats` - Возвращает статистику работы

#### Другие методы

- `forceSync(): Promise<boolean>` - Принудительная синхронизация
- `on(event, callback)` - Подписка на события
- `off(event, callback)` - Отписка от событий

### ISyncStats

Статистика работы сервиса:

```typescript
interface ISyncStats {
  totalOperationsProcessed: number; // Всего обработано операций
  successfulSyncs: number; // Успешных синхронизаций
  failedSyncs: number; // Неудачных синхронизаций
  lastSyncTime: number | null; // Время последней синхронизации
  lastErrorTime: number | null; // Время последней ошибки
  lastError: string | null; // Последняя ошибка
  currentRetryCount: number; // Текущее количество повторов
  pendingOperations: number; // Количество ожидающих операций
}
```

### События

- `syncStarted` - Синхронизация запущена
- `syncCompleted(stats)` - Синхронизация завершена успешно
- `syncFailed(error, stats)` - Синхронизация завершилась ошибкой
- `batchProcessed(batch, result)` - Пакет операций обработан
- `statusChanged(oldStatus, newStatus)` - Статус сервиса изменился

## Конфигурация

### ISyncConfig

```typescript
interface ISyncConfig {
  batchSize: number; // Размер пакета операций (по умолчанию: 50)
  syncIntervalMs: number; // Интервал синхронизации в мс (по умолчанию: 5000)
  maxRetries: number; // Максимальное количество повторов (по умолчанию: 3)
  retryDelayMs: number; // Задержка между повторами в мс (по умолчанию: 2000)
  backoffMultiplier: number; // Множитель для экспоненциального увеличения задержки (по умолчанию: 2)
}
```

### Готовые конфигурации

```typescript
// Для разработки - быстрая синхронизация
const devConfig = SyncServiceFactory.createTestConfig();

// Для продакшена - оптимизированная
const prodConfig = SyncServiceFactory.createProductionConfig();
```

## Интеграция в приложение

### 1. Инициализация при запуске приложения

```typescript
// В main.tsx или App.tsx
import {initializeGlobalSync} from './services/examples/syncServiceIntegration';

const cleanup = initializeGlobalSync();

// При размонтировании приложения
window.addEventListener('beforeunload', cleanup);
```

### 2. Управление сервисами для проектов

```typescript
import {SyncServiceRegistry} from './services/syncServiceFactory';

// При открытии проекта
function openProject(projectId: string) {
  const syncService = SyncServiceRegistry.getOrCreate(projectId);
  syncService.start();

  // Настройка UI событий
  syncService.on('syncCompleted', updateSyncIndicator);
  syncService.on('syncFailed', showErrorNotification);
}

// При закрытии проекта
function closeProject(projectId: string) {
  SyncServiceRegistry.remove(projectId);
}
```

### 3. Обработка ошибок

```typescript
syncService.on('syncFailed', (error, stats) => {
  // Логирование ошибки
  console.error('Sync failed:', error);

  // Уведомление пользователя
  showNotification({
    type: 'error',
    message: `Ошибка синхронизации: ${error}`,
    action: {
      label: 'Повторить',
      onClick: () => syncService.forceSync()
    }
  });

  // Аналитика
  analytics.track('sync_failed', {
    error,
    retryCount: stats.currentRetryCount,
    totalOperations: stats.totalOperationsProcessed
  });
});
```

## Тестирование

### Mock зависимости для тестов

```typescript
import {SyncServiceFactory} from './syncServiceFactory';

// Создание с mock зависимостями
const mockStorageService = {
  getPendingOperations: jest.fn(),
  deleteOperations: jest.fn(),
  getOperationsCount: jest.fn()
};

const mockNetworkService = {
  sendOperations: jest.fn(),
  isOnline: jest.fn(() => true)
};

const mockLogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

const syncService = SyncServiceFactory.createWithDependencies({
  storageService: mockStorageService,
  networkService: mockNetworkService,
  logger: mockLogger,
  config: SyncServiceFactory.createTestConfig(),
  projectId: 'test-project',
  deviceId: 'test-device'
});
```

## Мониторинг и отладка

### Получение статистики

```typescript
import {getAllSyncStats} from './services/examples/syncServiceIntegration';

// Статистика всех сервисов
const allStats = getAllSyncStats();
console.log('Активные сервисы:', allStats);

// Отчет о состоянии
const report = createSyncReport();
console.log('Отчет синхронизации:', report);
```

### Принудительная синхронизация

```typescript
// Для всех активных сервисов
import {forceAllSync} from './services/examples/syncServiceIntegration';

// Для одного сервиса
await syncService.forceSync();

const results = await forceAllSync();
```

## Лучшие практики

### 1. Управление памятью

- Всегда вызывайте `stop()` или используйте `SyncServiceRegistry.remove()` при закрытии проекта
- Отписывайтесь от событий в React компонентах через cleanup функции

### 2. Обработка ошибок

- Всегда подписывайтесь на событие `syncFailed` для обработки ошибок
- Показывайте пользователю статус синхронизации в UI
- Предоставляйте возможность принудительной синхронизации при ошибках

### 3. Конфигурация

- Используйте разные конфигурации для development и production
- Настраивайте `batchSize` в зависимости от размера операций
- Учитывайте сетевые условия при настройке `syncIntervalMs`

### 4. Мониторинг

- Отслеживайте статистику синхронизации для диагностики проблем
- Логируйте важные события для отладки
- Используйте аналитику для понимания паттернов использования

## Устранение неполадок

### Проблема: Синхронизация не работает

1. Проверьте статус сервиса: `syncService.getStatus()`
2. Убедитесь, что сервис запущен: `syncService.start()`
3. Проверьте наличие операций в очереди
4. Проверьте подключение к сети: `navigator.onLine`

### Проблема: Операции не удаляются из очереди

1. Проверьте ответ сервера - должен содержать `processedOperations`
2. Убедитесь, что ID операций корректно передаются
3. Проверьте логи ошибок в консоли

### Проблема: Слишком частая синхронизация

1. Увеличьте `syncIntervalMs` в конфигурации
2. Увеличьте `batchSize` для обработки большего количества операций за раз
3. Используйте `pause()` при неактивности пользователя

## Дальнейшее развитие

Возможные улучшения:

- Поддержка офлайн режима с локальным кешированием
- Сжатие данных для экономии трафика
- Приоритизация операций по важности
- Дельта-синхронизация для больших объектов
- WebSocket интеграция для real-time синхронизации
