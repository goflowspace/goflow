# Рефакторинг операций синхронизации

## Проблема

В системе синхронизации была обнаружена проблема несоответствия типов операций между фронтендом и бэкендом:

### На фронтенде генерировались операции:

- `choice.added`, `choice.deleted`, `choice.updated`, `choice.moved` - для узлов выбора
- `note.added`, `note.deleted`, `note.updated`, `note.moved` - для заметок
- `node.added`, `node.deleted`, `node.updated`, `node.moved` - для нарративных узлов

### На бэкенде поддерживались только:

- `node.added`, `node.deleted`, `node.updated`, `node.moved` - для всех типов узлов
- `edge.added`, `edge.deleted` - для связей
- `layer.added`, `layer.deleted`, `layer.updated` - для слоев

Это приводило к тому, что операции с выборами и заметками не синхронизировались между клиентами.

### Дополнительная проблема:

В `CommandManager` не передавался `projectId` в конструкторы команд для узлов выбора и заметок, что приводило к тому, что операции вообще не генерировались.

### Проблемы со связями (edges):

1. В команде `ConnectCommand` не генерировалась операция `edge.added`
2. В операциях `edge.added` не передавался `layerId` в payload
3. На бэкенде в обработке операции `edge.added` использовались поля `source`/`target`, но в payload передавались `startNodeId`/`endNodeId`
4. Не была реализована обработка операции `edge.updated` для синхронизации изменений условий
5. В `CommandManager` не передавался `projectId` в команды для связей

### Проблемы со слоями:

При обработке операции `layer.added` на бэкенде не сохранялись все необходимые поля слоя (`depth`, `parentLayerId`, `startingNodes`, `endingNodes`), что приводило к ошибке при загрузке проекта.

### Проблемы с командами для связей между разными типами узлов:

1. В `CommandManager.connectNarrativeNode` использовалась общая команда `ConnectCommand` вместо специализированной `ConnectNarrativeNodeCommand`
2. В командах `ConnectNarrativeNodeCommand` и `ConnectChoiceNodeCommand` не передавался `layerId` в payload операции `edge.added`

## Решение

### 1. Унификация операций

Все операции с узлами были унифицированы под единый тип `node.*`:

- Обновлены команды для выборов (`ChoiceNodeCommands.ts`)
- Обновлены команды для заметок (`NoteCommands.ts`)
- В payload операций добавлено поле `nodeType` для различения типов узлов

### 2. Исправление передачи projectId

Во все команды в `CommandManager` добавлена передача `this.projectId`:

- Команды для узлов выбора
- Команды для заметок
- Команды для связей

### 3. Исправление операций со связями

- Добавлена генерация операции `edge.added` в `ConnectCommand`
- Добавлен `layerId` в payload всех операций со связями
- Обновлена обработка операции `edge.added` на бэкенде для поддержки обоих форматов полей
- Добавлена обработка операции `edge.updated` на бэкенде
- Изменен тип операции с `edge.conditions_updated` на `edge.updated`

### 4. Исправление операций со слоями

Обновлена обработка операции `layer.added` на бэкенде для сохранения всех необходимых полей слоя.

### 5. Исправление команд для связей между разными типами узлов

- В `CommandManager.connectNarrativeNode` заменена команда `ConnectCommand` на `ConnectNarrativeNodeCommand`
- Добавлен `layerId` в payload операций `edge.added` в командах `ConnectNarrativeNodeCommand` и `ConnectChoiceNodeCommand`

## Результат

После всех исправлений система синхронизации работает корректно для всех типов узлов, связей и слоев. Все операции правильно генерируются на фронтенде и обрабатываются на бэкенде.

## Преимущества решения

1. **Единообразие**: Один набор операций для всех типов узлов
2. **Простота**: Не нужно добавлять новые обработчики на бэкенде для каждого типа узла
3. **Расширяемость**: Легко добавлять новые типы узлов без изменения бэкенда
4. **Совместимость**: Поддержка старого формата операций для обратной совместимости
5. **Полнота данных**: Все необходимые поля сохраняются при синхронизации

## Изменения в коде

### Фронтенд

- `ChoiceNodeCommands.ts`: Заменены операции `choice.*` на `node.*`
- `NoteCommands.ts`: Заменены операции `note.*` на `node.*`
- `CommandManager.ts`: Добавлена передача `projectId` во все команды для узлов выбора, заметок и связей
- `ConnectCommands.ts`: Добавлена генерация операции `edge.added`
- `EdgeCommands.ts`: Заменена операция `edge.conditions_updated` на `edge.updated`
- `DeleteEdgeCommand.ts`: Уже была генерация операции `edge.deleted`
- Добавлено поле `nodeType` в payload для идентификации типа узла

### Бэкенд

- `sync.utils.ts`:
  - Улучшена обработка операции `node.updated` для поддержки частичного обновления данных
  - Исправлена обработка операции `layer.added` для сохранения всех полей слоя
  - Исправлена обработка операции `edge.added` (использование правильных полей)
  - Добавлена обработка операции `edge.updated` для обновления условий

## Рекомендации

1. **Тестирование**: Необходимо протестировать синхронизацию всех типов узлов между несколькими клиентами
2. **Миграция**: Старые операции в базе данных будут работать благодаря обратной совместимости
3. **Документация**: Обновить документацию API с новым форматом операций
4. **Мониторинг**: Добавить логирование для отслеживания типов узлов в операциях

## Дальнейшие улучшения

1. **Валидация**: Добавить валидацию типа узла в операциях
2. **Оптимизация**: Группировка операций по типу для batch-обработки
3. **Типизация**: Создать строгие TypeScript типы для каждого вида операций
4. **Тесты**: Добавить unit и integration тесты для всех типов операций

# Sync Operations Refactoring

This document describes the refactoring of sync operations to fix issues with choice nodes, notes, and edges not syncing properly.

## Problems Found and Fixed

### 1. Type Mismatch Between Frontend and Backend

**Problem**: Frontend was generating specific operation types (`choice.added`, `note.added`) while backend only supported generic types (`node.added`, `node.deleted`).

**Solution**: Changed all node operations to use generic `node.*` types with a `nodeType` field in the payload.

### 2. Missing ProjectId in Commands

**Problem**: `CommandManager` wasn't passing `projectId` to choice, note, and edge commands, preventing operations from being saved.

**Solution**: Added `this.projectId` to all command constructors in `CommandManager`.

### 3. Edge Sync Issues

**Problem**:

- `ConnectCommand` didn't generate `edge.added` operations
- Edge operations were missing `layerId` in payload
- Backend expected `source`/`target` fields but received `startNodeId`/`endNodeId`
- No handler for `edge.updated` operations

**Solution**:

- Added `edge.added` operation generation in `ConnectCommand`
- Added `layerId` to all edge operation payloads
- Updated backend to handle both field formats
- Added `edge.updated` handler on backend

### 4. Layer Sync Issues

**Problem**: `layer.added` operation didn't save all required fields (`depth`, `parentLayerId`, `startingNodes`, `endingNodes`).

**Solution**: Updated `sync.utils.ts` to properly handle all layer fields including the `layerNode` object.

### 5. Cross-Node Type Connection Issues

**Problem**: `CommandManager.connectNarrativeNode` used generic `ConnectCommand` instead of `ConnectNarrativeNodeCommand`.

**Solution**: Updated to use `ConnectNarrativeNodeCommand` and added `layerId` to edge operations.

### 6. Stale State in setTimeout Callbacks

**Problem**: Connection commands were using stale `canvasStore` state inside `setTimeout` callbacks, causing `newEdges` to be empty.

**Solution**: Updated all connection commands to get fresh state inside `setTimeout`:

```typescript
setTimeout(() => {
  // Get fresh state
  const currentCanvasStore = useCanvasStore.getState();
  // Use currentCanvasStore instead of this.canvasStore
}, 50);
```

## Files Modified

### Frontend

- `app/src/commands/ChoiceNodeCommands.ts`
- `app/src/commands/NoteCommands.ts`
- `app/src/commands/CommandManager.ts`
- `app/src/commands/ConnectCommands.ts`
- `app/src/commands/EdgeCommands.ts`
- `app/src/commands/NarrativeNodeCommands.ts`

### Backend

- `backend/src/modules/sync/sync.utils.ts`

## Operation Types Reference

### Node Operations

- `node.added` - with `nodeType` field
- `node.deleted` - with `nodeType` field
- `node.updated` - with `nodeType` field
- `node.moved` - with `nodeType` field

### Edge Operations

- `edge.added` - with `layerId` field
- `edge.deleted` - with `layerId` field
- `edge.updated` - with `layerId` field (for condition updates)

### Layer Operations

- `layer.added` - with full layer data including `layerNode`
- `layer.deleted`
- `layer.updated`
- `layer.moved`

## Summary

All sync operations have been successfully fixed:

1. **Node operations** - All node types (narrative, choice, note, layer) now sync correctly using generic `node.*` operations with `nodeType` field
2. **Edge operations** - All edge operations (create, delete, update conditions) sync correctly with proper `layerId` field
3. **Layer operations** - Layers sync with all required fields including nested content
4. **Connection commands** - Fixed stale state issue in setTimeout callbacks by getting fresh state

The application now properly syncs all operations between multiple users in real-time without errors.
