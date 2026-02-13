# AI v2 Validation & Sanitization System

Комплексная система валидации и санитизации входных данных для AI операций в архитектуре v2.

## 🎯 Основные возможности

- **Структурированная валидация** с использованием схем
- **Автоматическая санитизация** входных данных
- **Обнаружение подозрительного контента**
- **Специализированные схемы** для Bible Generation операций
- **Поддержка кастомных правил** валидации
- **Полная интеграция** с AI операциями

## 📁 Структура

```
validation/
├── ValidationTypes.ts          # Типы и интерфейсы
├── InputValidator.ts           # Основной валидатор
├── InputSanitizer.ts          # Санитизация данных
├── BibleValidationSchemas.ts  # Схемы для Bible Generation
├── index.ts                   # Публичный API
├── examples/                  # Примеры использования
│   └── ValidationExample.ts
└── __tests__/                 # Тесты
    ├── InputValidator.test.ts
    ├── InputSanitizer.test.ts
    └── ValidationIntegration.test.ts
```

## 🚀 Быстрый старт

### Основные импорты

```typescript
import { 
  InputValidator, 
  InputSanitizer, 
  QuickValidation,
  BibleGenerationInputSchema 
} from '../validation';
```

### Валидация AI промпта

```typescript
const result = QuickValidation.validatePrompt(userInput);
if (!result.isValid) {
  console.error('Validation errors:', result.errors);
  return;
}
const safePrompt = result.sanitizedInput.prompt;
```

### Валидация Bible Generation входа

```typescript
const validation = InputValidator.validate(input, BibleGenerationInputSchema);
if (!validation.isValid) {
  throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
}
const sanitizedInput = validation.sanitizedInput;
```

## 📋 Схемы валидации

### BibleGenerationInputSchema
Базовая схема для всех Bible Generation операций:
- `projectName`: 2-100 символов, без спецсимволов
- `projectContext`: 50-10000 символов, минимум 10 слов
- `additionalContext`: опциональные поля с ограничениями

### Специализированные схемы
- `SynopsisGenerationInputSchema` - усиленные требования к контексту
- `StructuredOutputInputSchema` - для JSON-операций (Genre, Format)
- `AtmosphericGenerationInputSchema` - для атмосферы и визуального стиля
- `AudienceAnalysisInputSchema` - для анализа аудитории

## 🛡️ Система безопасности

### Обнаружение угроз
- Script теги (`<script>`)
- JavaScript протокол (`javascript:`)
- Обработчики событий (`onclick=`)
- Eval функции (`eval()`)
- Шаблонные выражения (`{{}}`, `${}`)
- DOM манипуляции (`document.`, `window.`)

### Санитизация
- Удаление HTML тегов (с поддержкой белого списка)
- Нормализация пробелов
- Ограничение длины
- Экранирование спецсимволов

## 🔧 Интеграция с операциями

### В AbstractAIOperation

```typescript
export abstract class AbstractAIOperation<TInput, TOutput> {
  // Переопределите для специфической валидации
  protected getValidationSchema(): ValidationSchema | null {
    return null;
  }
  
  // Дополнительная валидация
  protected validateAdditional(input: TInput): string[] {
    return [];
  }
}
```

### В конкретной операции

```typescript
export class MyOperation extends AbstractBibleGenerationOperation<Input, Output> {
  // Схема применяется автоматически через OperationValidationSchemas[this.id]
  
  protected validateAdditional(input: Input): string[] {
    const errors: string[] = [];
    // Специфическая валидация для операции
    return errors;
  }
}
```

## 📊 Кастомные правила валидации

```typescript
const customRule: ValidationRule = {
  name: 'myRule',
  validate: (value: string) => {
    if (someCondition(value)) {
      return {
        field: 'fieldName',
        message: 'Custom error message',
        code: 'CUSTOM_ERROR',
        value
      };
    }
    return null;
  }
};

const schema: ValidationSchema = {
  myField: {
    required: true,
    type: 'string',
    customRules: [customRule]
  }
};
```

## 🧪 Тестирование

```bash
# Запуск тестов валидации
npm test src/modules/ai/v2/validation

# Запуск примеров
node src/modules/ai/v2/validation/examples/ValidationExample.ts
```

## 📈 Метрики валидации

Система собирает метрики для мониторинга:
- Количество отклоненных запросов
- Типы обнаруженных угроз
- Время выполнения валидации
- Эффективность санитизации

## ⚡ Производительность

- **Валидация**: ~1-5ms для типичного входа
- **Санитизация**: ~2-10ms в зависимости от размера
- **Кэширование**: схемы компилируются один раз
- **Память**: минимальное потребление благодаря статическим методам

## 🔄 Миграция с v1

```typescript
// Старый подход
validate(input: Input): string[] {
  const errors = [];
  if (!input.name) errors.push('Name required');
  return errors;
}

// Новый подход  
protected getValidationSchema(): ValidationSchema {
  return MyOperationSchema;
}

protected validateAdditional(input: Input): string[] {
  // Только специфическая логика
  return [];
}
```

## 🚨 Обработка ошибок

```typescript
try {
  const result = await operation.execute(input, context);
} catch (error) {
  if (error.message.includes('Validation failed')) {
    // Обработка ошибок валидации
    logger.warn('Validation error:', error.message);
    return { error: 'Invalid input data' };
  }
  if (error.message.includes('Suspicious content')) {
    // Обработка подозрительного контента
    logger.error('Security threat detected:', error.message);
    return { error: 'Content blocked for security reasons' };
  }
  throw error;
}
```

## 🔮 Будущие улучшения

- [ ] Асинхронная валидация для сложных правил
- [ ] Интеграция с внешними сервисами проверки
- [ ] Машинное обучение для обнаружения угроз
- [ ] Кэширование результатов валидации
- [ ] Более детальная аналитика
- [ ] Поддержка локализации ошибок
