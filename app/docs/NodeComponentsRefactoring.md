# Рефакторинг компонентов узлов

2025-05-15

## Выявленное дублирование кода

В ходе анализа компонентов `NarrativeNode` и `ChoiceNode` было выявлено значительное дублирование кода. Оба компонента использовали:

1. Очень похожие компоненты для отображения подсказок
2. Похожую логику редактирования полей
3. Одинаковые функции обновления соединений узлов
4. Дублирующиеся константы для DOM-событий

## Созданные общие компоненты и утилиты

Для устранения дублирования были созданы следующие общие компоненты:

### 1. Компонент NodeHint

Общий компонент для отображения подсказок над узлами:

```typescript
// src/components/nodes/shared/NodeHint.tsx
export const NodeHint: React.FC<NodeHintProps> = ({isVisible, text, position}) => {
  if (!isVisible) return null;
  return (
    <div style={{...styles}}>
      {text}
    </div>
  );
};
```

### 2. Компоненты EditableText и StaticText

Общие компоненты для редактируемого и статического текста:

```typescript
// src/components/nodes/shared/EditableContent.tsx
export const EditableText = React.forwardRef<HTMLTextAreaElement | HTMLInputElement, EditableTextProps>(...);
export const StaticText = React.forwardRef<HTMLDivElement, StaticTextProps>(...);
```

### 3. Общие константы

Общие константы для DOM-событий и задержек:

```typescript
// src/components/nodes/shared/constants.ts
export const DOM_EVENTS = {
  UPDATE_NODE_INTERNALS: 'updateNodeInternals'
};

export const DELAYS = {
  UPDATE_CONNECTIONS: 20,
  SAVE: 50,
  EDIT_ACTIVATION: 50
};
```

### 4. Общие утилиты

Общие функции для работы с узлами:

```typescript
// src/components/nodes/shared/nodeUtils.ts
export const updateNodeConnections = (nodeId: string, delay = 0): void => {...};
export const hasValueChanged = <T>(currentValue: T, originalValue: T): boolean => {...};
```

### 5. Базовый хук для редактируемых узлов

Базовый хук для инкапсуляции общей логики редактируемых узлов:

```typescript
// src/hooks/useEditableNode.ts
export const useEditableNode = <T extends Record<string, any>>({
  id,
  initialValues,
  fieldsRefs,
  onSave,
  onEditingStateChange
}: EditableNodeHookOptions) => {...};
```

## Преимущества выполненного рефакторинга

1. **Устранение дублирования кода**
   - Снижение объема дублирующегося кода в компонентах узлов
   - Единая точка для изменения общей логики

2. **Улучшение поддерживаемости**
   - Изменения в общей логике будут автоматически применены ко всем типам узлов
   - Меньше шансов для внесения рассинхронизированных изменений

3. **Улучшение тестируемости**
   - Общие компоненты можно тестировать отдельно от конкретных узлов
   - Базовая логика изолирована и легче тестируется

4. **Упрощение создания новых типов узлов**
   - Новые типы узлов могут использовать уже существующие общие компоненты
   - Более быстрая разработка новых типов узлов

## Схема взаимодействия компонентов

```
NarrativeNode.tsx / ChoiceNode.tsx
  |
  ├── shared/NodeHint.tsx
  ├── shared/EditableContent.tsx
  |
  ├── (специфичные хуки)
  |     |
  |     ├── useEditableNode.ts (общая логика редактирования)
  |     ├── shared/nodeUtils.ts (общие утилиты)
  |     └── shared/constants.ts (общие константы)
  |
  └── (специфичные компоненты)
```

## Следующие шаги и возможные улучшения

1. **Полный переход на общие компоненты**
   - Заменить все случаи использования локальных компонентов на общие

2. **Рефакторинг useNarrativeNode и useChoiceNode** 
   - Использовать базовый хук useEditableNode для устранения дублирования логики

3. **Рефакторинг других типов узлов**
   - Применить аналогичный подход к LayerNode и NoteNode

4. **Унификация стилей**
   - Создать общие стилевые константы и классы для всех типов узлов

5. **Создание общей документации**
   - Разработать руководство по созданию новых типов узлов на основе общих компонентов 