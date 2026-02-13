# Пайплайн генерации изображений сущностей

## Описание

`EntityImageGenerationPipeline` - специализированный пайплайн для генерации изображений сущностей проекта с учетом контекста библии проекта. Пайплайн следует принципам SOLID и использует трехэтапный подход для создания качественных изображений.

## Архитектура

### Схема работы

```
Входные данные сущности + Библия проекта
          ↓
1. Анализ контекста (EntityContextAnalysisOperation)
          ↓
2. Генерация промпта (PromptGenerationOperation) 
          ↓
3. Генерация изображения (ImageGenerationOperation)
          ↓
    Результат: Base64 изображение
```

### Операции

1. **EntityContextAnalysisOperation** - Анализирует данные сущности и библии проекта, создает структурированный контекст
2. **PromptGenerationOperation** - Создает оптимизированный промпт для генерации изображения
3. **ImageGenerationOperation** - Генерирует изображение с помощью Imagen3

## Использование

### Базовое использование

```typescript
import { EntityImageGenerationPipeline } from './pipelines/entity-image-generation-pipeline';

const pipeline = new EntityImageGenerationPipeline();

// Данные сущности
const entityData = {
  name: 'Элара Звездный Страж',
  description: 'Молодая эльфийская воительница',
  entityType: {
    id: 'char_001',
    name: 'Персонаж', 
    type: 'character'
  },
  values: {
    'внешность': 'Высокая эльфийка с серебристыми волосами',
    'снаряжение': 'Эльфийский лук и кожаная броня'
  }
};

// Контекст библии проекта
const projectBible = {
  genres: ['фэнтези', 'приключения'],
  setting: 'Магический мир Алдерия',
  atmosphere: 'Эпическая, мистическая'
};

// Генерация изображения
const result = await pipeline.generateEntityImage(
  'entity_001',
  'project_001', 
  'user_001',
  entityData,
  projectBible
);

console.log('Generated image:', result.finalImage?.imageBase64);
```

### Продвинутое использование

```typescript
// С кастомными настройками
const result = await pipeline.generateEntityImage(
  entityId,
  projectId,
  userId,
  entityData,
  projectBible,
  {
    userSettings: {
      preferredProvider: 'openai',
      creativityLevel: 0.8
    },
    customPromptRequirements: [
      'Подчеркнуть героическую позу',
      'Добавить магические эффекты'
    ]
  }
);
```

### Статическое использование

```typescript
// Быстрая генерация
const result = await EntityImageGenerationPipeline.quickGenerate(
  entityData,
  projectBible
);
```

## Входные данные

### EntityData

```typescript
interface EntityData {
  name: string;                    // Имя сущности
  description?: string;            // Описание сущности
  entityType: {
    id: string;                    // ID типа сущности
    name: string;                  // Название типа
    type: string;                  // character|location|faction|event|rule
  };
  values: Record<string, any>;     // Параметры сущности
}
```

### ProjectBible

```typescript
interface ProjectBible {
  synopsis?: string;               // Синопсис проекта
  logline?: string;               // Логлайн
  genres?: string[];              // Жанры
  setting?: string;               // Сеттинг мира
  atmosphere?: string;            // Атмосфера
  mainThemes?: string;            // Основные темы
  targetAudience?: string;        // Целевая аудитория
  references?: string;            // Референсы
  uniqueFeatures?: string;        // Уникальные особенности
  constraints?: string;           // Ограничения
}
```

## Выходные данные

### Основной результат

```typescript
interface Result {
  success: boolean;
  data: {
    finalImage: {
      imageBase64: string;         // Base64 изображения
      imageUrl?: string;           // URL изображения (если есть)
      prompt: string;              // Использованный промпт
      revisedPrompt?: string;      // Пересмотренный промпт
      metadata: {
        model: string;             // Модель ИИ
        width: number;             // Ширина изображения
        height: number;            // Высота изображения
        aspectRatio: string;       // Соотношение сторон
        generatedAt: string;       // Время генерации
        optimizedPrompt: string;   // Оптимизированный промпт
        promptConfidence: number;  // Уверенность в промпте
        contextConfidence: number; // Уверенность в контексте
        entityInfo: any;           // Информация о сущности
      }
    };
    stepResults: {
      contextAnalysis: any;        // Результаты анализа контекста
      promptGeneration: any;       // Результаты генерации промпта
      imageGeneration: any;        // Результаты генерации изображения
    };
    metadata: {
      totalCost: number;           // Общая стоимость
      stepsCompleted: number;      // Количество выполненных шагов
      executionTime: number;       // Время выполнения
      operationsUsed: string[];    // Использованные операции
    };
  };
  error?: string;                  // Ошибка (если есть)
}
```

## Типы сущностей

Пайплайн поддерживает следующие типы сущностей:

- **character** - Персонажи (фокус на внешность, одежду, позу)
- **location** - Локации (фокус на архитектуру, ландшафт, атмосферу)  
- **faction** - Фракции (фокус на символику, стиль, идентичность)
- **event** - События (фокус на действие, динамику, участников)
- **rule** - Правила (фокус на концептуальное представление)

## Параметры генерации

### Настройки изображения

- **Соотношение сторон**: 1:1 (квадратное)
- **Уровень безопасности**: standard
- **Генерация персон**: разрешена (allow_all)
- **Модель**: Imagen3 (imagen-3.0-generate-002)

### Настройки ИИ

- **Провайдер по умолчанию**: Anthropic Claude 3.5 Sonnet
- **Температура**: 0.7 (для генерации промпта)
- **Максимальные токены**: 2000
- **Тайм-аут**: 60 секунд

## Обработка ошибок

Пайплайн включает комплексную обработку ошибок:

- Валидация входных данных
- Graceful fallback при ошибках ИИ
- Детальные сообщения об ошибках
- Логирование всех этапов

## Производительность

### Время выполнения

- Анализ контекста: ~5-10 секунд
- Генерация промпта: ~10-15 секунд  
- Генерация изображения: ~30-60 секунд
- **Общее время**: 45-85 секунд

### Стоимость

- Анализ контекста: ~0.01$
- Генерация промпта: ~0.02$
- Генерация изображения: ~0.03$
- **Общая стоимость**: ~0.06$ за изображение

## Примеры

См. файл `examples/entity-image-generation-example.ts` для подробных примеров использования:

- Генерация изображения персонажа
- Генерация изображения локации
- Массовая генерация изображений
- Генерация с кастомными требованиями

## Зависимости

- `BaseAIOperation` - базовая операция ИИ
- `PromptGenerationOperation` - генерация промптов
- `ImageGenerationOperation` - генерация изображений
- `OperationRegistry` - реестр операций
- `SimplePipelineEngine` - движок выполнения пайплайнов

## Расширение

Пайплайн легко расширяется:

1. Добавление новых типов анализа в `EntityContextAnalysisOperation`
2. Добавление постобработки изображений
3. Интеграция с другими моделями генерации изображений
4. Добавление валидации сгенерированных изображений

## Конфигурация

Все настройки можно переопределить через `userSettings`:

```typescript
const userSettings = {
  preferredProvider: 'openai',       // Провайдер ИИ
  preferredModel: 'gpt-4',          // Модель ИИ
  creativityLevel: 0.8,             // Уровень креативности
  maxTokens: 3000,                  // Максимум токенов
  timeout: 90000                    // Тайм-аут в мс
};
```

## Мониторинг

Пайплайн предоставляет детальную метрику:

- Время выполнения каждого шага
- Использованные токены
- Стоимость операций
- Уверенность в результатах
- Логи выполнения