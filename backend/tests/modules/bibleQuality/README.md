# Тесты модуля BibleQuality

Этот каталог содержит комплексные тесты для модуля оценки качества библии проекта.

## Структура тестов

### Unit тесты
- **`unit/bibleQuality.service.test.ts`** - Тесты бизнес-логики сервиса
- **`unit/bibleQuality.controller.test.ts`** - Тесты контроллеров API

### Integration тесты
- **`integration/bibleQuality.api.test.ts`** - Полные сценарии API endpoints

### Тестовые данные
- **`fixtures/testData.ts`** - Общие тестовые данные и утилиты

## Покрытие тестов

### Основные функции сервиса
- ✅ Получение существующей оценки качества
- ✅ Создание новой оценки качества
- ✅ Принудительный пересчет оценки
- ✅ Проверка доступа пользователя к проекту
- ✅ Расчет заполненности полей (completeness)
- ✅ Расчет качества контента (quality)
- ✅ Расчет согласованности (consistency)
- ✅ Генерация рекомендаций

### Сценарии качества
- ✅ Высокое качество (все поля заполнены оптимально)
- ✅ Среднее качество (основные поля заполнены)
- ✅ Низкое качество (минимум данных)
- ✅ Проблемы с длиной полей (слишком короткие/длинные)
- ✅ Пустой проект

### API Endpoints
- ✅ `GET /api/projects/:id/bible-quality`
- ✅ `POST /api/projects/:id/bible-quality/recalculate`

### Обработка ошибок
- ✅ Отсутствие проекта
- ✅ Отсутствие доступа
- ✅ Ошибки базы данных
- ✅ Некорректные параметры
- ✅ Проблемы аутентификации

### Edge Cases
- ✅ Очень длинные поля
- ✅ Специальные символы в данных
- ✅ Отсутствующие поля в projectInfo
- ✅ Недействительные JWT токены

## Алгоритм оценки качества

### Весовые коэффициенты (по умолчанию)
- **Заполненность (40%)**: Проверка наличия и заполнения полей
- **Качество (40%)**: Оценка длины и содержания полей
- **Согласованность (20%)**: Проверка логической связности

### Критерии заполненности
**Критичные поля (15 баллов каждое):**
- logline
- synopsis  
- genres

**Важные поля (5 баллов каждое):**
- setting
- targetAudience
- mainThemes
- atmosphere

**Дополнительные поля (2.5 балла каждое):**
- message
- references
- uniqueFeatures
- constraints

### Рекомендуемые длины полей
- **logline**: 20-120 символов (оптимально: 80)
- **synopsis**: 300-1500 символов (оптимально: 800)
- **setting**: 50-500 символов (оптимально: 200)
- **targetAudience**: 20-200 символов (оптимально: 100)
- **mainThemes**: 30-300 символов (оптимально: 150)
- **atmosphere**: 20-200 символов (оптимально: 100)
- **message**: 20-300 символов (оптимально: 150)
- **references**: 30-500 символов (оптимально: 200)
- **uniqueFeatures**: 30-400 символов (оптимально: 200)
- **constraints**: 20-300 символов (оптимально: 150)

## Запуск тестов

### Все тесты модуля
```bash
npm test -- tests/modules/bibleQuality
```

### Только unit тесты
```bash
npm test -- tests/modules/bibleQuality/unit
```

### Только integration тесты
```bash
npm test -- tests/modules/bibleQuality/integration
```

### Конкретный файл
```bash
npm test -- tests/modules/bibleQuality/unit/bibleQuality.service.test.ts
```

### С покрытием кода
```bash
npm run test:coverage -- tests/modules/bibleQuality
```

### В watch режиме (для разработки)
```bash
npm test -- --watch tests/modules/bibleQuality
```

## Примеры использования тестовых данных

```typescript
import { 
  qualityScenarios, 
  expectedResults,
  createBibleQualityScore,
  expectValidBibleQualityStructure 
} from './fixtures/testData';

// Использование готовых сценариев
const highQualityProject = qualityScenarios.highQuality;
const expectedScores = expectedResults.highQuality;

// Создание кастомной оценки
const customQuality = createBibleQualityScore({
  totalScore: 95,
  recommendations: []
});

// Проверка структуры ответа
expectValidBibleQualityStructure(result);
```

## Моки и фикстуры

### Стандартные моки Prisma
```typescript
import { createPrismaMocks, setupSuccessfulMocks } from './fixtures/testData';

const prismaMocks = createPrismaMocks();
setupSuccessfulMocks(prismaMocks, project, quality);
```

### Готовые тестовые проекты
- `qualityScenarios.highQuality` - Высокое качество
- `qualityScenarios.mediumQuality` - Среднее качество  
- `qualityScenarios.lowQuality` - Низкое качество
- `qualityScenarios.lengthIssues` - Проблемы с длиной
- `qualityScenarios.empty` - Пустой проект

## Отладка тестов

### Включение логов
```bash
DEBUG=test npm test -- tests/modules/bibleQuality
```

### Подробный вывод
```bash
npm test -- --verbose tests/modules/bibleQuality
```

### Только упавшие тесты
```bash
npm test -- --onlyFailures tests/modules/bibleQuality
```

## Добавление новых тестов

1. **Unit тесты**: Добавьте в соответствующий файл в `unit/`
2. **Integration тесты**: Добавьте в `integration/bibleQuality.api.test.ts`
3. **Тестовые данные**: Расширьте `fixtures/testData.ts`

### Пример нового теста
```typescript
it('должен обрабатывать новый сценарий', async () => {
  const testProject = createTestProject({
    // кастомные данные проекта
  });
  
  setupSuccessfulMocks(prismaMocks, testProject);
  
  const result = await createOrUpdateBibleQualityService(testProject.id);
  
  expectValidBibleQualityStructure(result);
  expect(result.totalScore).toBeGreaterThan(50);
});
```

## CI/CD интеграция

Тесты автоматически запускаются при:
- Push в main/develop ветки
- Создании Pull Request
- Релизе новой версии

Минимальное покрытие кода: **85%** 