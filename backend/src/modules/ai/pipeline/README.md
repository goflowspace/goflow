# AI Pipeline Architecture

Универсальная архитектура для создания и выполнения AI пайплайнов в проекте Go Flow.

## 🎯 Основные принципы

- **SOLID**: Каждый компонент следует принципам SOLID
- **DRY**: Общая логика вынесена в базовые классы
- **KISS**: Простая и понятная архитектура
- **Модульность**: Легко расширяемая система операций

## 📋 Структура

```
pipeline/
├── interfaces/          # Базовые интерфейсы
│   ├── operation.interface.ts
│   └── pipeline.interface.ts
├── base/               # Базовые классы
│   ├── base-operation.ts
│   └── base-pipeline.ts
├── engine/             # Pipeline Engine
│   └── simple-pipeline-engine.ts
├── factory/            # Фабрики
│   └── operation-registry.ts
├── operations/         # Реализации операций
│   └── content-analysis.operation.ts
├── examples/           # Примеры пайплайнов
│   └── simple-content-pipeline.ts
└── index.ts           # Экспорты
```

## 🔧 Основные компоненты

### 1. AIOperation
Базовый интерфейс для всех операций:

```typescript
interface AIOperation {
  readonly id: string;
  readonly name: string;
  readonly category: AIOperationCategory;
  readonly complexity: ComplexityLevel;
  
  validate(input: any, context: ExecutionContext): ValidationResult;
  execute(input: any, context: ExecutionContext): Promise<OperationResult>;
  estimateCost(input: any, context: ExecutionContext): number;
}
```

### 2. AIPipeline
Интерфейс для пайплайнов:

```typescript
interface AIPipeline {
  readonly id: string;
  readonly name: string;
  readonly steps: PipelineStep[];
  
  validate(): ValidationResult;
  estimateCost(input: PipelineInput, context: ExecutionContext): number;
}
```

### 3. PipelineEngine
Движок для выполнения пайплайнов:

```typescript
interface PipelineEngine {
  execute(pipeline: AIPipeline, input: PipelineInput, context: ExecutionContext): Promise<PipelineResult>;
  getStatus(requestId: string): Promise<PipelineExecutionStatus>;
}
```

## 🚀 Быстрый старт

### 1. Создание операции

```typescript
import { BaseOperation } from './base/base-operation';

export class MyCustomOperation extends BaseOperation {
  constructor() {
    super(
      'my_operation',
      'My Custom Operation',
      '1.0.0',
      AIOperationCategory.CONTENT_GENERATION,
      ComplexityLevel.MEDIUM,
      {
        requiredCapabilities: ['text_generation'],
        maxTokens: 2000,
        timeout: 30000
      }
    );
  }

  protected validateInput(input: any, context: ExecutionContext): ValidationResult {
    // Ваша логика валидации
    return { isValid: true, errors: [] };
  }

  protected async executeOperation(input: any, context: ExecutionContext) {
    // Ваша основная логика
    return {
      data: { result: 'success' },
      tokensUsed: 100,
      model: 'gpt-3.5-turbo'
    };
  }
}
```

### 2. Регистрация операции

```typescript
import { OperationRegistry } from './factory/operation-registry';

// Регистрируем операцию
OperationRegistry.register('my_operation', () => new MyCustomOperation());
```

### 3. Создание пайплайна

```typescript
import { BasePipeline } from './base/base-pipeline';

export class MyCustomPipeline extends BasePipeline {
  constructor() {
    const steps: PipelineStep[] = [
      {
        id: 'step1',
        operation: OperationRegistry.create('my_operation'),
        dependencies: []
      },
      {
        id: 'step2', 
        operation: OperationRegistry.create('content_analysis'),
        dependencies: ['step1']
      }
    ];

    super(
      'my_pipeline',
      'My Custom Pipeline',
      'Description of my pipeline',
      '1.0.0',
      steps
    );
  }
}
```

### 4. Выполнение пайплайна

```typescript
import { SimplePipelineEngine } from './engine/simple-pipeline-engine';

const engine = new SimplePipelineEngine();
const pipeline = new MyCustomPipeline();

const context: ExecutionContext = {
  userId: 'user123',
  projectId: 'project456',
  requestId: 'req-789',
  startTime: new Date(),
  sharedData: new Map(),
  previousResults: new Map()
};

const result = await engine.execute(pipeline, { content: 'test' }, context);

if (result.success) {
  console.log('Pipeline completed!', result.steps);
} else {
  console.error('Pipeline failed:', result.error);
}
```

## 📡 API Endpoints

### Demo Content Analysis Pipeline

```bash
POST /api/ai/pipeline/demo
Content-Type: application/json
Authorization: Bearer <token>

{
  "content": "Ваш текст для анализа..."
}
```

Ответ:
```json
{
  "success": true,
  "message": "Pipeline executed successfully",
  "data": {
    "summary": "Краткое описание...",
    "keywords": ["ключевое", "слово"],
    "structure": {
      "characters": ["Персонаж1"],
      "locations": ["Локация1"],
      "themes": ["Тема1"]
    },
    "confidence": 0.85
  },
  "metadata": {
    "pipelineId": "simple_content_analysis",
    "totalCost": 8,
    "totalTime": 2500,
    "stepsExecuted": 3
  }
}
```

## 🔍 Пример демо пайплайна

```typescript
// Уже готовый пример для тестирования
import { analyzeContentQuick } from './examples/simple-content-pipeline';

// Быстрый анализ контента
const result = await analyzeContentQuick("Ваш текст для анализа");
console.log(result);
```

## 🛠️ Интеграция с AI Service

```typescript
// В AI Service уже добавлены методы:
const aiService = new AIService(prisma);

// Выполнение любого пайплайна
const result = await aiService.executePipeline(
  userId,
  projectId, 
  pipeline,
  input,
  'normal'
);

// Получение статуса
const status = await aiService.getPipelineStatus(requestId);
```

## 📊 Метрики и мониторинг

Каждое выполнение пайплайна автоматически собирает метрики:

- **Время выполнения** каждого шага
- **Стоимость** в кредитах
- **Использованные модели**
- **Статус выполнения**
- **Ошибки** и детали

## 🎮 Тестирование

Для быстрого тестирования используйте demo endpoint:

```bash
curl -X POST http://localhost:3000/api/ai/pipeline/demo \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "content": "В далекой галактике жил храбрый рыцарь по имени Люк. Он сражался против темных сил империи на планете Татуин."
  }'
```

## 🔮 Планы развития

### Фаза 2: Расширенные возможности
- ✅ Параллельное выполнение операций
- ✅ Условные переходы в пайплайнах
- ✅ Система retry и fallback
- ✅ Кэширование результатов

### Фаза 3: Продвинутые функции
- ✅ AI-assisted выбор оптимальных моделей
- ✅ Динамическое ценообразование
- ✅ Marketplace готовых пайплайнов
- ✅ Visual Pipeline Builder

## 🤝 Вклад в развитие

1. Создайте новую операцию в `operations/`
2. Зарегистрируйте её в `OperationRegistry`
3. Создайте пример пайплайна в `examples/`
4. Добавьте тесты
5. Обновите документацию

---

**Разработано для проекта Go Flow** | Версия 1.0.0 