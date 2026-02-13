# AI v2 Structured Logging System

Минималистичная и эффективная система структурированного логирования для AI операций в архитектуре v2.

## 🎯 Основные возможности

- **Структурированные логи** в JSON формате для продакшена
- **Красивый вывод** для разработки
- **Контекстуальное логирование** с автоматическим наследованием
- **AI-специфичные методы** для операций, провайдеров и пайплайнов
- **Отслеживание производительности** с checkpoint'ами
- **Автоматическая санитизация** чувствительных данных
- **Декораторы для методов** с автоматическим трекингом

## 📁 Структура

```
logging/
├── types.ts                    # Типы и интерфейсы
├── StructuredLogger.ts         # Основной логгер
├── ContextualLogger.ts         # Контекстуальный логгер
├── AILogger.ts                 # AI-специфичный логгер
├── PerformanceTracker.ts       # Отслеживание производительности
├── index.ts                    # Публичный API
├── examples/                   # Примеры использования
│   └── LoggingExample.ts
├── __tests__/                  # Тесты
│   ├── StructuredLogger.test.ts
│   └── AILogger.test.ts
└── README.md                   # Документация
```

## 🚀 Быстрый старт

### Основные импорты

```typescript
import { 
  logger,           // Singleton логгер
  aiLogger,         // AI-специфичный логгер  
  createLogger,     // Создание нового логгера
  createContextLogger, // Контекстуальный логгер
  PerformanceTracker,  // Трекинг производительности
  trackPerformance,    // Декоратор для методов
  LogLevel 
} from '../logging';
```

### Базовое использование

```typescript
// Простые сообщения
logger.info('Операция завершена');
logger.warn('Потенциальная проблема');
logger.error('Критическая ошибка');

// С контекстом
logger.info('Пользователь выполнил действие', {
  userId: 'user123',
  projectId: 'proj456'
});

// С метаданными
logger.info('AI операция', { userId: 'user123' }, {
  duration: 1500,
  tokensUsed: 250,
  cost: 0.05
});
```

## 🤖 AI-специфичное логирование

### Операции

```typescript
const context: ExecutionContext = {
  userId: 'user123',
  projectId: 'proj456', 
  requestId: 'req789',
  qualityLevel: QualityLevel.EXPERT
};

// Начало операции
aiLogger.operationStart('synopsis-gen-v2', 'Synopsis Generation', context, {
  version: '2.0.0'
});

// Успешное завершение
aiLogger.operationSuccess('synopsis-gen-v2', 'Synopsis Generation', context, 2500, {
  inputTokens: 150,
  outputTokens: 300,
  realCostUSD: 0.075
});

// Ошибка
aiLogger.operationError('synopsis-gen-v2', 'Synopsis Generation', context, error, 1200);
```

### Провайдеры

```typescript
// Вызов провайдера
aiLogger.providerCall('openai', 'gpt-4', context, {
  temperature: 0.7,
  maxTokens: 2000
});

// Ответ провайдера
aiLogger.providerResponse('openai', 'gpt-4', context, 2000, 150, 300, 0.05);

// Ошибка провайдера
aiLogger.providerError('openai', 'gpt-4', context, error, 5000);
```

### Валидация и безопасность

```typescript
// Валидация
aiLogger.validation('input-validator', context, false, ['Field required']);

// Подозрительный контент
aiLogger.suspiciousContent('content-scanner', context, ['Script tags detected']);
```

### Пайплайны

```typescript
// Прогресс пайплайна
aiLogger.pipelineProgress('bible-gen-v2', context, 50, 'step2', 4);

// Завершение пайплайна
aiLogger.pipelineComplete('bible-gen-v2', context, 5000, 3, 1, 0);
```

## ⚡ Отслеживание производительности

### Ручное отслеживание

```typescript
const tracker = new PerformanceTracker('Data Processing', context);

// Промежуточные точки
await loadData();
tracker.checkpoint('data-loaded');

await processData();
tracker.checkpoint('processing-complete');

// Завершение
const duration = tracker.finish({
  recordsProcessed: 100,
  success: true
});
```

### Измерение функций

```typescript
const { result, duration } = await measureTime(
  async () => {
    return await expensiveOperation();
  },
  'Expensive Operation',
  context,
  { inputSize: 1024 }
);
```

### Декоратор методов

```typescript
class MyService {
  @trackPerformance('MyService.processData')
  async processData(data: string, context: ExecutionContext) {
    // Автоматическое отслеживание времени выполнения
    return processedData;
  }
}
```

## 🎨 Контекстуальное логирование

```typescript
// Базовый контекст
const userLogger = createContextLogger({
  userId: 'user123',
  sessionId: 'session456'
});

userLogger.info('Пользователь вошел');

// Расширенный контекст
const projectLogger = userLogger.child({ projectId: 'proj789' });
projectLogger.info('Проект создан');

// Все логи будут содержать userId, sessionId и projectId
```

## 🏭 Конфигурация для разных сред

### Разработка

```typescript
const devLogger = createLogger({
  level: LogLevel.DEBUG,
  pretty: true,           // Красивый вывод с цветами
  includeStack: true,     // Включать stack trace
  maxMessageLength: 1000
});
```

### Продакшен

```typescript
const prodLogger = createLogger({
  level: LogLevel.INFO,
  pretty: false,          // JSON формат
  includeStack: false,    // Без stack trace
  maxMessageLength: 500
});
```

## 🔒 Безопасность

### Автоматическая санитизация

Система автоматически скрывает чувствительные данные:

```typescript
logger.info('User authenticated', {}, {
  password: 'secret123',    // → '[REDACTED]'
  apiKey: 'key456',        // → '[REDACTED]'
  token: 'jwt789',         // → '[REDACTED]'
  normalField: 'value'     // → 'value'
});
```

### Ограничение длины

```typescript
const longMessage = 'Very long message...';
// Автоматически обрезается до maxMessageLength + '...'
```

## 📊 Форматы вывода

### Разработка (Pretty)

```
[2024-01-15T10:30:45.123Z] INFO [userId=user123 projectId=proj456]: Operation completed
  {
    "duration": 1500,
    "tokensUsed": 250,
    "cost": 0.05
  }
```

### Продакшен (JSON)

```json
{
  "level": "info",
  "message": "Operation completed", 
  "timestamp": "2024-01-15T10:30:45.123Z",
  "context": {
    "userId": "user123",
    "projectId": "proj456"
  },
  "metadata": {
    "duration": 1500,
    "tokensUsed": 250,
    "cost": 0.05
  }
}
```

## 🔧 Интеграция с мониторингом

### ELK Stack

```bash
# Логи уже в JSON формате для Elasticsearch
# Добавьте Filebeat для сбора логов
```

### Grafana

```sql
-- Пример запроса для метрик производительности
SELECT 
  avg(metadata.duration) as avg_duration,
  context.operationId
FROM logs 
WHERE level = 'info' 
  AND message LIKE '%operation completed%'
GROUP BY context.operationId
```

### Алерты

```typescript
// Настройка алертов на основе логов
if (metadata.duration > 5000) {
  logger.warn('Slow operation detected', context, {
    duration: metadata.duration,
    threshold: 5000,
    alert: true
  });
}
```

## 📈 Производительность

- **Overhead**: ~0.1-0.5ms на лог в зависимости от размера
- **Memory**: Минимальное потребление благодаря lazy initialization
- **Throughput**: >10,000 логов/сек в JSON режиме
- **Storage**: Структурированные логи хорошо сжимаются

## 🧪 Тестирование

```typescript
// Мокирование для тестов
jest.mock('../logging', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  },
  aiLogger: {
    operationStart: jest.fn(),
    operationSuccess: jest.fn(),
    operationError: jest.fn()
  }
}));
```

## 🔄 Миграция с console.log

```typescript
// Старый подход
console.log(`Operation completed in ${duration}ms`);
console.error('Error:', error.message);

// Новый подход
logger.info('Operation completed', { operationId }, { duration });
logger.error('Operation failed', { operationId }, { 
  error: { name: error.name, message: error.message }
});
```

## 🚨 Best Practices

1. **Используйте правильные уровни**:
   - `DEBUG`: Отладочная информация
   - `INFO`: Важные события
   - `WARN`: Потенциальные проблемы
   - `ERROR`: Критические ошибки

2. **Структурируйте контекст**:
   ```typescript
   // ✅ Хорошо
   logger.info('User action', { userId, action }, { duration });
   
   // ❌ Плохо
   logger.info(`User ${userId} performed ${action} in ${duration}ms`);
   ```

3. **Используйте AI логгер для AI операций**:
   ```typescript
   // ✅ Специализированный метод
   aiLogger.operationSuccess(id, name, context, duration, metadata);
   
   // ❌ Общий логгер
   logger.info('AI operation completed', context, metadata);
   ```

4. **Минимизируйте метаданные в DEBUG**:
   ```typescript
   if (logger.shouldLog(LogLevel.DEBUG)) {
     logger.debug('Detailed info', context, expensiveMetadata);
   }
   ```

## 🔮 Roadmap

- [ ] Интеграция с OpenTelemetry для трейсинга
- [ ] Автоматические алерты на основе паттернов
- [ ] Сэмплирование логов для высоконагруженных систем
- [ ] Интеграция с внешними сервисами мониторинга
- [ ] Дашборд для real-time просмотра логов
