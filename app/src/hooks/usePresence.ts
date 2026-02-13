import {useCallback, useEffect, useRef, useState} from 'react';

import {Node, NodeChange} from '@xyflow/react';

import {useWebSocket} from '../contexts/WebSocketContext';
import {userCacheService} from '../services/userCacheService';
import {useCanvasStore} from '../store/useCanvasStore';
import {useGraphStore} from '../store/useGraphStore';
import {useTimelinesStore} from '../store/useTimelinesStore';
import useUserStore from '../store/useUserStore';
import {CursorPosition, LayerCursorEvent, LayerPresence, PresenceEventType} from '../types/websocket.types';
import {getCurrentCursorPosition} from '../utils/cursorTracking';
import {useCurrentProject} from './useCurrentProject';

// Простая throttle функция
const throttle = <T extends (...args: any[]) => any>(func: T, delay: number): ((...args: Parameters<T>) => void) => {
  let timeoutId: number | null = null;
  let lastExecTime = 0;

  return (...args: Parameters<T>) => {
    const currentTime = Date.now();

    if (currentTime - lastExecTime > delay) {
      func(...args);
      lastExecTime = currentTime;
    } else {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }

      timeoutId = window.setTimeout(
        () => {
          func(...args);
          lastExecTime = Date.now();
          timeoutId = null;
        },
        delay - (currentTime - lastExecTime)
      );
    }
  };
};

/**
 * Хук для управления presence системой (курсоры других пользователей)
 */
export const usePresence = () => {
  const {socket, isConnected} = useWebSocket();
  const {projectId} = useCurrentProject();
  const {user} = useUserStore();
  const {currentTimelineId} = useTimelinesStore();
  const {currentGraphId} = useGraphStore(); // currentGraphId - это и есть layerId
  const nodes = useCanvasStore((s) => s.nodes);
  const setNodes = useCanvasStore((s) => s.setNodes);

  // Состояние курсоров других пользователей
  const [otherCursors, setOtherCursors] = useState<Map<string, LayerPresence>>(new Map());

  // Инициализируем текущего пользователя в кеше
  useEffect(() => {
    if (user?.id) {
      userCacheService.setUser(user.id, {
        name: user.name,
        picture: user.picture
      });
    }
  }, [user]);

  // Ref для отслеживания последней отправленной позиции
  const lastSentPosition = useRef<{x: number; y: number; timestamp: number} | null>(null);

  // Ref для хранения актуальных узлов без циклических зависимостей
  const nodesRef = useRef<Node[]>(nodes);
  nodesRef.current = nodes;

  // Stable функция для обновления узлов - используем ref для избежания циклических зависимостей
  const updateNodePosition = useCallback(
    (nodeId: string, newPosition: {x: number; y: number}) => {
      const updatedNodes = nodesRef.current.map((node: Node): Node => {
        if (node.id === nodeId) {
          return {
            ...node,
            position: {
              x: newPosition.x,
              y: newPosition.y
            }
          };
        }
        return node;
      });

      setNodes(updatedNodes);
    },
    [setNodes]
  );

  // Throttled функция для отправки позиции курсора (максимум 30 раз в секунду)
  const sendCursorPosition = useCallback(
    throttle((position: {x: number; y: number}) => {
      // Более мягкая проверка - socket может быть временно отключен во время переподключений
      if (!socket || !projectId || !currentTimelineId || !currentGraphId || !user?.id) {
        return;
      }

      const now = Date.now();

      // Проверяем, изменилась ли позиция значительно (минимум 5 пикселей или 100мс)
      if (lastSentPosition.current) {
        const deltaX = Math.abs(position.x - lastSentPosition.current.x);
        const deltaY = Math.abs(position.y - lastSentPosition.current.y);
        const deltaTime = now - lastSentPosition.current.timestamp;

        if (deltaX < 5 && deltaY < 5 && deltaTime < 100) {
          return; // Слишком маленькое изменение
        }
      }

      const cursor: CursorPosition = {
        x: position.x,
        y: position.y,
        timelineId: currentTimelineId,
        layerId: currentGraphId,
        timestamp: now
      };

      // Отправляем через WebSocket - используем layer-aware API
      const eventData = {
        type: 'LAYER_CURSOR_UPDATE',
        payload: {
          timelineId: currentTimelineId,
          layerId: currentGraphId,
          cursor
        },
        projectId: projectId,
        userId: user.id,
        timestamp: now
      };

      socket.emit('collaboration_event', eventData);

      lastSentPosition.current = {
        x: position.x,
        y: position.y,
        timestamp: now
      };
    }, 33), // 30 FPS
    [socket, isConnected, projectId, currentTimelineId, currentGraphId, user?.id]
  );

  // Обработчик движения мыши
  const handleMouseMove = useCallback(() => {
    const position = getCurrentCursorPosition();
    if (position) {
      sendCursorPosition(position);
    }
  }, [sendCursorPosition]);

  // Подписываемся на события WebSocket presence
  useEffect(() => {
    if (!socket || !isConnected) {
      return;
    }

    const handleCursorEnter = (event: any) => {
      const layerEvent = event.payload as LayerCursorEvent;

      // Фильтруем только курсоры в текущем таймлайне и слое, ИСКЛЮЧАЯ свой курсор
      if (layerEvent.timelineId === currentTimelineId && layerEvent.layerId === currentGraphId && layerEvent.presence.userId !== user?.id) {
        // Получаем информацию о пользователе из кеша или создаем новую запись
        let cachedUser = userCacheService.getUser(layerEvent.presence.userId);
        if (!cachedUser) {
          userCacheService.setUser(layerEvent.presence.userId, {
            name: layerEvent.presence.userName || 'Unknown User'
          });
          cachedUser = userCacheService.getUser(layerEvent.presence.userId);
        } else {
          userCacheService.updateLastSeen(layerEvent.presence.userId);
        }

        // Обновляем presence с данными из кеша
        const enhancedPresence: LayerPresence = {
          ...layerEvent.presence,
          userName: cachedUser?.name || layerEvent.presence.userName || 'Unknown User',
          userColor: cachedUser?.color || layerEvent.presence.userColor || '#4F46E5',
          userPicture: layerEvent.presence.userPicture || cachedUser?.picture
        };

        setOtherCursors((prev) => {
          const newMap = new Map(prev);
          newMap.set(layerEvent.presence.userId, enhancedPresence);
          return newMap;
        });
      }
    };

    const handleCursorUpdate = (event: any) => {
      const layerEvent = event.payload as LayerCursorEvent;

      // Фильтруем только курсоры в текущем таймлайне и слое, ИСКЛЮЧАЯ свой курсор
      if (layerEvent.timelineId === currentTimelineId && layerEvent.layerId === currentGraphId && layerEvent.presence.userId !== user?.id) {
        // Получаем информацию о пользователе из кеша
        let cachedUser = userCacheService.getUser(layerEvent.presence.userId);
        if (!cachedUser) {
          userCacheService.setUser(layerEvent.presence.userId, {
            name: layerEvent.presence.userName || 'Unknown User'
          });
          cachedUser = userCacheService.getUser(layerEvent.presence.userId);
        } else {
          userCacheService.updateLastSeen(layerEvent.presence.userId);
        }

        // Обновляем presence с данными из кеша
        const enhancedPresence: LayerPresence = {
          ...layerEvent.presence,
          userName: cachedUser?.name || layerEvent.presence.userName || 'Unknown User',
          userColor: cachedUser?.color || layerEvent.presence.userColor || '#4F46E5',
          userPicture: layerEvent.presence.userPicture || cachedUser?.picture
        };

        setOtherCursors((prev) => {
          const newMap = new Map(prev);
          newMap.set(layerEvent.presence.userId, enhancedPresence);
          return newMap;
        });
      }
    };

    const handleCursorLeave = (event: any) => {
      const layerEvent = event.payload as LayerCursorEvent;

      setOtherCursors((prev) => {
        const newMap = new Map(prev);
        newMap.delete(layerEvent.presence.userId);
        return newMap;
      });
    };

    const handleNodeDragPreview = (event: any) => {
      const {nodeId, position, timelineId, layerId, userId} = event.payload;

      // Игнорируем события от текущего пользователя и события не из текущего слоя
      if (userId === user?.id || timelineId !== currentTimelineId || layerId !== currentGraphId) {
        return;
      }

      // Обновляем позицию узла временно для превью
      updateNodePosition(nodeId, {x: position.x, y: position.y});
    };

    // Подписываемся на события
    socket.on('LAYER_CURSOR_ENTER', handleCursorEnter);
    socket.on('LAYER_CURSOR_UPDATE', handleCursorUpdate);
    socket.on('LAYER_CURSOR_LEAVE', handleCursorLeave);
    socket.on('NODE_DRAG_PREVIEW', handleNodeDragPreview);

    return () => {
      socket.off('LAYER_CURSOR_ENTER', handleCursorEnter);
      socket.off('LAYER_CURSOR_UPDATE', handleCursorUpdate);
      socket.off('LAYER_CURSOR_LEAVE', handleCursorLeave);
      socket.off('NODE_DRAG_PREVIEW', handleNodeDragPreview);
    };
  }, [socket, isConnected, currentTimelineId, currentGraphId, user?.id, updateNodePosition]);

  // Очищаем курсоры при смене слоя или таймлайна
  useEffect(() => {
    setOtherCursors(new Map());
  }, [currentTimelineId, currentGraphId]);

  // Отправляем событие выхода при размонтировании или смене слоя
  useEffect(() => {
    return () => {
      if (socket && isConnected && projectId && currentTimelineId && currentGraphId && user?.id) {
        socket.emit('collaboration_event', {
          type: 'LAYER_CURSOR_LEAVE',
          payload: {
            projectId: projectId,
            timelineId: currentTimelineId,
            layerId: currentGraphId
          },
          projectId: projectId,
          userId: user.id,
          timestamp: Date.now()
        });
      }
    };
  }, [socket, isConnected, projectId, currentTimelineId, currentGraphId, user?.id]);

  // Подписываемся на движение мыши
  useEffect(() => {
    if (!isConnected) {
      return;
    }

    const throttledMouseMove = throttle(handleMouseMove, 33); // 30 FPS

    document.addEventListener('mousemove', throttledMouseMove, {passive: true});

    return () => {
      document.removeEventListener('mousemove', throttledMouseMove);
    };
  }, [isConnected, handleMouseMove]);

  // Функция для получения отфильтрованных курсоров для текущего слоя
  const getActiveCursors = useCallback((): LayerPresence[] => {
    const now = Date.now();
    const CURSOR_TIMEOUT = 30000; // 30 секунд

    return Array.from(otherCursors.values()).filter((cursor) => cursor.cursor.timelineId === currentTimelineId && cursor.cursor.layerId === currentGraphId && now - cursor.lastSeen < CURSOR_TIMEOUT);
  }, [otherCursors, currentTimelineId, currentGraphId]);

  // Throttled функция для отправки превью перемещения узла (максимум 30 раз в секунду)
  const sendNodeDragPreview = useCallback(
    throttle((nodeId: string, position: {x: number; y: number}) => {
      if (!socket || !projectId || !currentTimelineId || !currentGraphId || !user?.id) {
        return;
      }

      const eventData = {
        type: 'NODE_DRAG_PREVIEW',
        payload: {
          nodeId,
          position: {
            x: position.x,
            y: position.y
          },
          timelineId: currentTimelineId,
          layerId: currentGraphId
        },
        projectId: projectId,
        userId: user.id,
        timestamp: Date.now()
      };

      socket.emit('collaboration_event', eventData);
    }, 33), // 30 FPS
    [socket, projectId, currentTimelineId, currentGraphId, user?.id]
  );

  return {
    // Состояние
    otherCursors: getActiveCursors(),
    isPresenceEnabled: isConnected && !!projectId && !!currentTimelineId && !!currentGraphId && !!user?.id,

    // Методы
    sendCursorPosition,
    sendNodeDragPreview,

    // Статистика для отладки
    totalCursors: otherCursors.size,
    currentLayer: currentGraphId,
    currentTimeline: currentTimelineId
  };
};
