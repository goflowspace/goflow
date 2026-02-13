// Существующие типы Canvas (дополнение)
import {ThreadContextData, ThreadContextType} from './comments';

// Настройки ввода для канваса
export interface CanvasInputSettings {
  zoomOnScroll: boolean;
  zoomOnPinch: boolean;
  panOnScroll: boolean;
  panOnDrag: number[] | false;
}

// Расширение существующих типов Canvas для поддержки комментариев

// Позиция комментария на канвасе
export interface CanvasCommentPosition {
  x: number;
  y: number;
  zoom: number;
}

// Состояние комментариев на канвасе
export interface CanvasCommentsState {
  visible: boolean;
  selectedThreadId?: string;
  creatingComment?: {
    position: CanvasCommentPosition;
    contextType: ThreadContextType;
    contextData: ThreadContextData;
  };
  draggedThread?: {
    id: string;
    startPosition: CanvasCommentPosition;
    currentPosition: CanvasCommentPosition;
  };
}

// Пропсы для компонента комментария на канвасе
export interface CanvasCommentProps {
  threadId: string;
  position: CanvasCommentPosition;
  contextType: ThreadContextType;
  contextData: ThreadContextData;
  isSelected?: boolean;
  isResolved?: boolean;
  commentsCount?: number;
  unreadCount?: number;
  lastActivity?: Date;
  onSelect?: (threadId: string) => void;
  onMove?: (threadId: string, newPosition: CanvasCommentPosition) => void;
  onResolve?: (threadId: string) => void;
}

// События для интеграции с системой операций
export interface CommentCanvasEvents {
  'comment:position-changed': {
    threadId: string;
    oldPosition: CanvasCommentPosition;
    newPosition: CanvasCommentPosition;
  };
  'comment:visibility-changed': {
    visible: boolean;
  };
  'comment:filter-changed': {
    showResolved: boolean;
    contextTypes: ThreadContextType[];
  };
}

// Утилиты для работы с позициями комментариев
export const CanvasCommentUtils = {
  // Конвертация экранных координат в координаты канваса
  screenToCanvas: (screenX: number, screenY: number, canvasTransform: {x: number; y: number; zoom: number}): CanvasCommentPosition => ({
    x: (screenX - canvasTransform.x) / canvasTransform.zoom,
    y: (screenY - canvasTransform.y) / canvasTransform.zoom,
    zoom: canvasTransform.zoom
  }),

  // Конвертация координат канваса в экранные координаты
  canvasToScreen: (canvasPosition: CanvasCommentPosition, canvasTransform: {x: number; y: number; zoom: number}): {x: number; y: number} => ({
    x: canvasPosition.x * canvasTransform.zoom + canvasTransform.x,
    y: canvasPosition.y * canvasTransform.zoom + canvasTransform.y
  }),

  // Проверка видимости комментария на экране
  isVisible: (position: CanvasCommentPosition, canvasTransform: {x: number; y: number; zoom: number}, viewportSize: {width: number; height: number}): boolean => {
    const screenPos = CanvasCommentUtils.canvasToScreen(position, canvasTransform);
    return screenPos.x >= -50 && screenPos.x <= viewportSize.width + 50 && screenPos.y >= -50 && screenPos.y <= viewportSize.height + 50;
  },

  // Создание контекстных данных для комментария на канвасе
  createCanvasContext: (position: CanvasCommentPosition): ThreadContextData => ({
    x: position.x,
    y: position.y,
    zoom: position.zoom
  }),

  // Создание контекстных данных для комментария к узлу
  createNodeContext: (nodeId: string, nodeType?: string, nodeTitle?: string): ThreadContextData => ({
    nodeId,
    nodeType,
    nodeTitle
  })
};
