# AI Pipeline Storage System

Система хранения результатов выполнения AI пайплайнов. Собирает детальную информацию о каждом шаге выполнения и сохраняет её в БД в конце выполнения пайплайна.

## Архитектура

### Основные компоненты

1. **PipelineExecutionCollector** - Собирает данные о выполнении пайплайна в памяти
2. **PipelineStorageAdapter** - Адаптер для интеграции с PipelineEngine
3. **PipelineStorageService** - Сервис для работы с БД
4. **StorageContext** - Контекст для передачи storage adapter в AI операции

### Поток данных

```
PipelineEngine → PipelineStorageAdapter → PipelineExecutionCollector → (в памяти)
                                    ↓
                         (в конце выполнения)
                                    ↓
PipelineStorageService → База данных
```

## Что хранится

### Данные пайплайна
- Идентификаторы пайплайна и контекста
- Входные данные
- Временные метрики (старт, завершение, общее время)
- Агрегированные метрики (токены, стоимость, кредиты)
- Статус выполнения и ошибки
- Финальный результат

### Данные шагов
- Идентификаторы операции и её версия
- Входные данные для шага
- Промпты (system и user)
- Конфигурация модели (провайдер, модель, параметры)
- Результаты валидации
- Детали вызова AI провайдера
- Сырой ответ от AI
- Обработанный результат
- Информация об ошибках и подозрительном контенте

## Использование

### Инициализация в PipelineEngine

```typescript
const engine = new StreamingPipelineEngine(true); // enableStorage = true
```

### Ручное использование

```typescript
import { PipelineStorageAdapter, getPipelineStorageService } from '../storage';

const storageService = getPipelineStorageService(prisma);
const adapter = new PipelineStorageAdapter(storageService);

// Инициализация сбора данных
adapter.initializePipelineExecution(pipeline, input, context);

// Сбор данных во время выполнения
adapter.onStepStart(stepId, prompts, modelConfig);
adapter.onStepValidation(stepId, duration, errors);
adapter.onProviderCall(stepId, duration, tokens, cost, response);
adapter.onStepComplete(stepId, output, error);

// Сохранение в БД в конце
const executionId = await adapter.finalizePipelineExecution(results, error);
```

## База данных

### Таблицы

- `ai_pipeline_executions` - Основная информация о выполнении пайплайна
- `ai_pipeline_step_executions` - Детальная информация о каждом шаге

### Схема

См. `backend/prisma/schema/ai-pipeline.prisma`

## Аналитика

Система предоставляет методы для получения аналитики:

```typescript
// Аналитика по пайплайнам
const analytics = await storageService.getPipelineAnalytics(filter);

// Аналитика по операциям
const stepAnalytics = await storageService.getStepAnalytics(operationId);

// Экспорт данных
const exportData = await storageService.exportPipelineExecution(executionId);
```

## Особенности

1. **Без промежуточных записей в БД** - Все данные собираются в памяти и сохраняются только в конце
2. **Детальное отслеживание** - Записывается каждый этап выполнения операции
3. **Обработка ошибок** - Система продолжает работать даже при сбоях в сборе данных
4. **Аналитика** - Богатые возможности для анализа производительности и затрат
5. **Очистка данных** - Автоматическая очистка старых записей

## Конфигурация

- По умолчанию система включена в PipelineEngine
- Можно отключить передав `enableStorage: false` в конструктор
- Требует инициализации PrismaClient для работы с БД
