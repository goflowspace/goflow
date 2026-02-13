# Реализация панорамирования правой кнопкой мыши

## Описание проблемы (MVP-302)

**Баг**: Если выбран инструмент, перемещение вьюпорта мышью с зажатием ПКМ не работает.

До исправления, панорамирование правой кнопкой мыши работало только в режиме курсора, но не работало при выборе других инструментов (особенно для инструмента "слой").

## Реализованное решение

Было разработано кастомное решение для панорамирования с использованием правой кнопки мыши, которое работает независимо от выбранного инструмента:

1. **Отключение контекстного меню браузера**:
   ```tsx
   onContextMenu={handleContextMenu}
   ```

2. **Настройка параметров ReactFlow**:
   ```tsx
   panOnDrag: [2] // Всегда разрешаем панорамирование правой кнопкой мыши
   ```

3. **Реализация кастомного панорамирования**:
   - Отслеживание состояния правой кнопки мыши
   - Сохранение начальной позиции курсора и текущего viewport
   - Расчет смещения при движении мыши и применение его к viewport

## Технические детали

### Состояния для кастомного панорамирования

```tsx
const [isRightMouseDown, setIsRightMouseDown] = useState<boolean>(false);
const [initialMousePosition, setInitialMousePosition] = useState<{x: number; y: number} | null>(null);
const [lastViewport, setLastViewport] = useState<{x: number; y: number; zoom: number} | null>(null);
```

### Обработчик перетаскивания

```tsx
const handleRightMouseDrag = useCallback(
  (e: MouseEvent) => {
    if (isRightMouseDown && initialMousePosition) {
      const dx = e.clientX - initialMousePosition.x;
      const dy = e.clientY - initialMousePosition.y;
      
      if (lastViewport) {
        reactFlowInstance.setViewport(
          {
            x: lastViewport.x + dx,
            y: lastViewport.y + dy, 
            zoom: lastViewport.zoom
          },
          {duration: 0}
        );
      }
    }
  },
  [isRightMouseDown, initialMousePosition, lastViewport, reactFlowInstance]
);
```

### Обработчики событий мыши

Были добавлены обработчики:
- `onMouseDown` - сохраняет начальную позицию и viewport
- `onMouseUp` - сбрасывает состояния
- `onMouseLeave` - обрабатывает выход мыши за пределы канваса
- `onContextMenu` - предотвращает появление контекстного меню
- `onDragStart` - предотвращает стандартное поведение перетаскивания

### Глобальное отслеживание

```tsx
// Настраиваем глобальный обработчик движения мыши
useEffect(() => {
  const handleGlobalMouseMove = (e: globalThis.MouseEvent) => {
    if (isRightMouseDown) {
      handleRightMouseDrag(e);
    }
  };

  window.addEventListener('mousemove', handleGlobalMouseMove);

  return () => {
    window.removeEventListener('mousemove', handleGlobalMouseMove);
  };
}, [isRightMouseDown, handleRightMouseDrag]);
```

## Преимущества решения

1. **Универсальность** - работает с любым инструментом, включая инструмент "слой"
2. **Стабильность** - не зависит от внутренней логики React Go Flow
3. **Отзывчивость** - обеспечивает плавное панорамирование
4. **Корректная обработка краевых случаев** - обработка отпускания кнопки за пределами окна

## Возможные улучшения в будущем

1. Добавление индикатора режима панорамирования (изменение курсора)
2. Оптимизация производительности (throttling) для обработчика движения мыши
3. Добавление настройки чувствительности панорамирования 