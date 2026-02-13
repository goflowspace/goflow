# Рекомендации по дальнейшей оптимизации Canvas

## 1. Оптимизация хранения и доступа к узлам

### 1.1. Использование Map для ускорения поиска узлов
```typescript
// В useNodeDragHandlers.ts
const nodesMap = useMemo(() => 
  nodes.reduce((map, node) => {
    map.set(node.id, node);
    return map;
  }, new Map<string, Node>()),
  [nodes]
);

// Вместо поиска по массиву
const node = nodesMap.get(nodeId); // O(1) вместо O(n)
```

### 1.2. Кэширование часто запрашиваемых узлов
```typescript
// В CanvasStore
const frequentNodesCache = new LRUCache<string, Node>(100);

export const getNodeById = (id: string) => {
  if (frequentNodesCache.has(id)) {
    return frequentNodesCache.get(id);
  }
  
  const node = nodes.find(n => n.id === id);
  if (node) frequentNodesCache.set(id, node);
  return node;
};
```

## 2. Мемоизация компонентов ReactFlow

### 2.1. Оптимизация Background и MiniMap

```typescript
// Выносим в отдельные компоненты
const MemoizedBackground = React.memo(() => (
  <Background 
    variant={BackgroundVariant.Dots} 
    gap={12} 
    size={1} 
    bgColor={'#efefef'} 
  />
));

const MemoizedMiniMap = React.memo(() => {
  const miniMapStyle = {
    right: 12,
    bottom: 70,
    border: '1px solid #ccc',
    borderRadius: 5
  };
  
  return (
    <MiniMap 
      nodeStrokeWidth={3} 
      zoomable 
      pannable 
      nodeColor={getNodeColor} 
      maskColor='rgba(0, 0, 0, 0.1)' 
      style={miniMapStyle} 
    />
  );
});

// В Canvas.tsx используем их
<ReactFlow /* ... */>
  <ZoomControlsWithPercentage />
  <MemoizedBackground />
  <MemoizedMiniMap />
  {/* ... */}
</ReactFlow>
```

## 3. Оптимизация масштабирования и жестов

### 3.1. Дебаунс для частых событий масштабирования

```typescript
// В useViewportControls.ts
import {debounce} from 'lodash';

// Дебаунс для обновления UI после масштабирования
const debouncedViewportChange = useCallback(
  debounce((viewport) => {
    if (onViewportChange) {
      onViewportChange(viewport);
    }
  }, 100),
  [onViewportChange]
);

// Использовать при частых событиях
reactFlowInstance.setViewport(...);
debouncedViewportChange(reactFlowInstance.getViewport());
```

### 3.2. Использование CSS-переменных для масштаба

```typescript
// В Canvas.tsx
useEffect(() => {
  if (wrapperRef.current) {
    wrapperRef.current.style.setProperty('--current-zoom', String(reactFlowInstance.getViewport().zoom));
  }
}, [reactFlowInstance]);

// В CSS
.node-content {
  transform: scale(calc(1 / var(--current-zoom)));
}
```

## 4. Виртуализация для большого количества узлов

### 4.1. Фильтрация узлов за пределами видимой области

```typescript
// В Canvas.tsx или в отдельном хуке
const visibleNodes = useMemo(() => {
  const viewport = reactFlowInstance.getViewport();
  const screenWidth = window.innerWidth / viewport.zoom;
  const screenHeight = window.innerHeight / viewport.zoom;
  
  // Вычисляем границы видимой области с запасом
  const visibleArea = {
    left: -viewport.x / viewport.zoom - screenWidth * 0.5,
    top: -viewport.y / viewport.zoom - screenHeight * 0.5,
    right: -viewport.x / viewport.zoom + screenWidth * 1.5,
    bottom: -viewport.y / viewport.zoom + screenHeight * 1.5
  };
  
  // Фильтруем только видимые узлы с запасом
  return nodes.filter(node => {
    return node.position.x > visibleArea.left && 
           node.position.x < visibleArea.right && 
           node.position.y > visibleArea.top && 
           node.position.y < visibleArea.bottom;
  });
}, [nodes, reactFlowInstance]);

// Используем visibleNodes вместо nodes
<ReactFlow nodes={visibleNodes} /* ... */ />
```

## 5. Объединение состояний условий

### 5.1. Объединение связанных состояний

```typescript
// Вместо двух отдельных состояний
const [conditionsState, setConditionsState] = useState<{
  preview: {
    isVisible: boolean;
    position: {x: number; y: number};
    edgeId: string;
    onOpenConditionModal: (conditionType?: 'AND' | 'OR', existingCondition?: Condition) => void;
  } | null;
  modal: {
    isOpen: boolean;
    edgeId: string;
    position: {x: number; y: number};
    conditionType?: 'AND' | 'OR';
    existingCondition?: Condition;
  } | null;
}>({
  preview: null,
  modal: null
});

// Обновление пример:
setConditionsState(prev => ({
  ...prev,
  preview: { isVisible: true, /* ... */ }
}));
```

## 6. Оптимизация обработки истории действий

### 6.1. Дифференциальное хранение истории

```typescript
// Хранить только разницу между состояниями
const createDiff = (prevState, nextState) => {
  const diff = {};
  
  // Вычисляем только изменившиеся свойства
  Object.keys(nextState).forEach(key => {
    if (JSON.stringify(prevState[key]) !== JSON.stringify(nextState[key])) {
      diff[key] = nextState[key];
    }
  });
  
  return diff;
};

// В CommandManager
addToHistory(action, { 
  diff: createDiff(prevState, nextState),
  apply: (state) => applyDiff(state, diff),
  revert: (state) => applyDiff(state, inverseDiff)
});
```

## 7. Универсальный API для управления вьюпортом

### 7.1. Централизованный сервис вьюпорта

```typescript
// В src/services/viewport.ts
export class ViewportService {
  private listeners: Set<(viewport: Viewport) => void> = new Set();
  private currentViewport: Viewport = { x: 0, y: 0, zoom: 1 };
  private reactFlowInstance: any = null;
  
  setReactFlowInstance(instance: any) {
    this.reactFlowInstance = instance;
    this.currentViewport = instance.getViewport();
  }
  
  getViewport() {
    return this.currentViewport;
  }
  
  setViewport(viewport: Viewport, options?: { duration?: number }) {
    if (!this.reactFlowInstance) return;
    
    this.reactFlowInstance.setViewport(viewport, options);
    this.currentViewport = viewport;
    this.notifyListeners();
  }
  
  zoomTo(level: number, center?: { x: number, y: number }) {
    // Реализация
  }
  
  panTo(position: { x: number, y: number }) {
    // Реализация
  }
  
  subscribe(listener: (viewport: Viewport) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  
  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.currentViewport));
  }
}

export const viewportService = new ViewportService();
```

## 8. Улучшение обработки ошибок

### 8.1. Создание системы логирования

```typescript
// В src/utils/logger.ts
const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

class Logger {
  private level = LOG_LEVELS.INFO;
  private history: Array<{level: string, message: string, data?: any, timestamp: Date}> = [];
  
  setLevel(level: keyof typeof LOG_LEVELS) {
    this.level = LOG_LEVELS[level];
  }
  
  debug(message: string, data?: any) {
    if (this.level <= LOG_LEVELS.DEBUG) {
      console.debug(message, data);
      this.record('DEBUG', message, data);
    }
  }
  
  info(message: string, data?: any) {
    if (this.level <= LOG_LEVELS.INFO) {
      console.info(message, data);
      this.record('INFO', message, data);
    }
  }
  
  warn(message: string, data?: any) {
    if (this.level <= LOG_LEVELS.WARN) {
      console.warn(message, data);
      this.record('WARN', message, data);
    }
  }
  
  error(message: string, data?: any) {
    if (this.level <= LOG_LEVELS.ERROR) {
      console.error(message, data);
      this.record('ERROR', message, data);
    }
  }
  
  getHistory() {
    return [...this.history];
  }
  
  private record(level: string, message: string, data?: any) {
    this.history.push({
      level,
      message,
      data,
      timestamp: new Date()
    });
    
    // Ограничиваем историю
    if (this.history.length > 1000) {
      this.history.shift();
    }
  }
}

export const logger = new Logger();
```

## 9. Оптимизация для React 18+

### 9.1. Использование useDeferredValue для плавности UI

```typescript
// В Canvas.tsx
const deferredNodes = useDeferredValue(nodes);
const deferredEdges = useDeferredValue(edges);

// Используем отложенные значения для фоновых вычислений
useEffect(() => {
  // Тяжелые вычисления с узлами и рёбрами 
  // которые не должны блокировать UI
}, [deferredNodes, deferredEdges]);

// При этом в ReactFlow используем обычные значения для моментальной отзывчивости
<ReactFlow nodes={nodes} edges={edges} /* ... */ />
```

### 9.2. Использование useTransition для плавных переходов

```typescript
// В Canvas.tsx
const [isPending, startTransition] = useTransition();

const handleComplexStateChange = useCallback(() => {
  // Обернуть тяжелые обновления состояния
  startTransition(() => {
    // Сложные обновления состояния
    setComplexState(newValue);
  });
}, []);

// Показать индикатор загрузки
{isPending && <LoadingIndicator />}
```

## 10. Профилирование и метрики производительности

### 10.1. Система метрик для основных операций

```typescript
// В src/utils/metrics.ts
export class PerformanceMetrics {
  private metrics: Record<string, { count: number, totalTime: number, min: number, max: number }> = {};

  startMeasure(operation: string): () => void {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      if (!this.metrics[operation]) {
        this.metrics[operation] = { count: 0, totalTime: 0, min: Infinity, max: 0 };
      }
      
      const metric = this.metrics[operation];
      metric.count++;
      metric.totalTime += duration;
      metric.min = Math.min(metric.min, duration);
      metric.max = Math.max(metric.max, duration);
    };
  }
  
  getMetrics() {
    const result: Record<string, { avg: number, min: number, max: number, count: number }> = {};
    
    Object.entries(this.metrics).forEach(([key, value]) => {
      result[key] = {
        avg: value.totalTime / value.count,
        min: value.min,
        max: value.max,
        count: value.count
      };
    });
    
    return result;
  }
  
  reset() {
    this.metrics = {};
  }
}

export const perfMetrics = new PerformanceMetrics();

// Пример использования
function someExpensiveOperation() {
  const endMeasure = perfMetrics.startMeasure('expensiveOperation');
  
  // Выполнение операции
  
  endMeasure();
}
```

## 11. Внедренные оптимизации

Следующие оптимизации уже были реализованы в проекте:

### 11.1. Оптимизация поиска узлов с O(n) до O(1)

```typescript
// Утилитарные функции в src/utils/nodeUtils.ts
export function createNodesMap(nodes: Node[]): Map<string, Node> {
  return nodes.reduce((map, node) => {
    map.set(node.id, node);
    return map;
  }, new Map<string, Node>());
}

export function getNodeById(id: string, nodes: Node[], nodesMap?: Map<string, Node>): Node | undefined {
  // С использованием кэша и Map для быстрого поиска
}
```

### 11.2. LRU-кэширование узлов

```typescript
// В src/utils/nodeUtils.ts:
class LRUNodeCache {
  // Реализация LRU кэша для хранения часто запрашиваемых узлов
}

// В Canvas.tsx:
useEffect(() => {
  // При изменении узлов очищаем кэш
  clearNodeCache();
}, [nodes]);
```

### 11.3. Хук для оптимизированного поиска узлов

```typescript
// В src/hooks/useNodeLookup.ts:
export function useNodeLookup() {
  // Создаем Map узлов
  const nodesMap = useMemo(() => createNodesMap(nodes), [nodes]);
  
  // Быстрый поиск по ID
  const findNodeById = useCallback(
    (id: string) => getNodeById(id, nodes, nodesMap),
    [nodes, nodesMap]
  );
  
  // Другие оптимизированные функции поиска
}

// Использование в компонентах:
const {findNodeById, findConnectedNodes} = useNodeLookup();
const node = findNodeById('node-123'); // O(1) доступ
```

### 11.4. Оптимизация обработки изменений позиций

```typescript
// В useCommandHandlers.ts:
const onNodesChange = useCallback((changes: NodeChange[]) => {
  // Используем Map вместо поиска в массиве
  const updatedNodesMap = new Map(nodes.map(node => [node.id, node]));
  
  // O(m) сложность вместо O(m*n)
  for (const change of positionChanges) {
    const node = updatedNodesMap.get(change.id);
    if (node) {
      updatedNodesMap.set(change.id, {...node, position: change.position});
    }
  }
  
  // Преобразуем обратно в массив
  const updatedNodes = Array.from(updatedNodesMap.values());
}, [nodes, nodesMap]);
```

### 11.5. Оптимизация сценариев с большим количеством узлов

Внедренные оптимизации существенно ускоряют работу с большим количеством узлов:

1. Поиск узла по ID: O(1) вместо O(n)
2. Обновление позиций узлов: O(m) вместо O(m*n), где m - число изменяемых узлов
3. Кэширование частых запросов: предотвращает повторные поиски
4. Оптимизированные операции массового обновления узлов

Эти изменения значительно улучшают производительность при работе с графами, содержащими сотни и тысячи узлов.

Внедрение этих оптимизаций должно значительно улучшить производительность вашего графового редактора, особенно при работе с большими графами и сложными условиями. 