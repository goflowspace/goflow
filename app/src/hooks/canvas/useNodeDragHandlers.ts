import React, {useCallback, useMemo, useState} from 'react';

import {Node} from '@xyflow/react';
import {getCommandManager} from 'src/commands/CommandManager';
import {createNodesMap, getNodeById} from 'src/utils/nodeUtils';

import {useCanvasStore} from '@store/useCanvasStore';
import {useGraphStore} from '@store/useGraphStore';

import {usePresence} from '../usePresence';

interface UseNodeDragHandlersProps {
  autoConnectNodeDrag: (event: React.MouseEvent | React.TouchEvent, node: Node) => void;
  autoConnectNodeDragStop: (event: React.MouseEvent | React.TouchEvent, node: Node) => void;
  saveCurrentViewport: () => void;
}

export function useNodeDragHandlers({autoConnectNodeDrag, autoConnectNodeDragStop, saveCurrentViewport}: UseNodeDragHandlersProps) {
  const commandManager = getCommandManager();
  const setDraggingNodeId = useCanvasStore((s) => s.setDraggingNodeId);
  const nodes = useCanvasStore((s) => s.nodes);

  // Хуки для отправки позиции курсора и превью узлов
  const {sendCursorPosition, sendNodeDragPreview} = usePresence();

  // Создаем Map для быстрого доступа к узлам по ID - O(1) сложность вместо O(n)
  const nodesMap = useMemo(() => createNodesMap(nodes), [nodes]);

  // Состояние для начальных позиций узлов
  const [initialPositions, setInitialPositions] = useState<Record<string, {x: number; y: number}>>({});

  // Обработчик начала перетаскивания узла
  const handleNodeDragStart = useCallback(
    (_: any, node: Node) => {
      setDraggingNodeId(node.id);

      // Проверяем, является ли перетаскиваемый узел частью выделения
      const selectedNodes = nodes.filter((n) => n.selected);
      const isDragNodeSelected = selectedNodes.some((n) => n.id === node.id);

      // Если да, сохраняем позиции всех выделенных узлов
      if (isDragNodeSelected) {
        const newInitialPositions: Record<string, {x: number; y: number}> = {};
        selectedNodes.forEach((n) => {
          if (n.position) {
            newInitialPositions[n.id] = {...n.position};
          }
        });
        setInitialPositions((prev) => ({...prev, ...newInitialPositions}));
      } else {
        // Иначе, сохраняем позицию только перетаскиваемого узла
        if (node.position) {
          setInitialPositions((prev) => ({
            ...prev,
            [node.id]: {...node.position}
          }));
        }
      }
    },
    [setDraggingNodeId, nodes]
  );

  // Обработчик перетаскивания узла
  const handleNodeDrag = useCallback(
    (event: React.MouseEvent | React.TouchEvent, node: Node) => {
      // Используем обработчик авто-подключения
      autoConnectNodeDrag(event, node);

      // Отправляем обновленную позицию курсора и превью узла во время перетаскивания
      if (node.position) {
        sendCursorPosition({
          x: node.position.x,
          y: node.position.y
        });

        // Отправляем превью перемещения узла для наблюдателей
        sendNodeDragPreview(node.id, {
          x: node.position.x,
          y: node.position.y
        });
      }
    },
    [autoConnectNodeDrag, sendCursorPosition, sendNodeDragPreview]
  );

  // Обработчик окончания перетаскивания узла - оптимизирован
  const handleNodeDragStop = useCallback(
    (event: React.MouseEvent | React.TouchEvent, node: Node) => {
      try {
        // Сначала обрабатываем авто-подключение
        autoConnectNodeDragStop(event, node);

        // Затем обрабатываем команду перемещения узла
        setDraggingNodeId(null);

        // Проверка наличия узла и его позиции
        if (!node || !node.id || !node.position) {
          console.warn('[DRAG] Invalid node data on drag stop:', {node});
          return;
        }

        // Берем начальную позицию из состояния компонента
        const initialPosition = initialPositions[node.id];
        if (!initialPosition) {
          console.warn('[DRAG] No initial position found for node:', node.id);
          return;
        }

        // Вычисляем смещение
        const dx = node.position.x - initialPosition.x;
        const dy = node.position.y - initialPosition.y;

        // Если смещения нет, ничего не делаем
        if (dx === 0 && dy === 0) {
          return;
        }

        // Получаем все выделенные узлы
        const selectedNodes = nodes.filter((n) => n.selected);
        const isDragNodeSelected = selectedNodes.some((n) => n.id === node.id);

        // Определяем узлы для перемещения
        let nodesToMove: Node[];
        if (isDragNodeSelected && selectedNodes.length > 0) {
          // Если перетаскиваемый узел выделен, перемещаем все выделенные узлы
          nodesToMove = selectedNodes;
        } else {
          // Если узел не выделен, перемещаем только его
          nodesToMove = [node];
        }

        // Формируем изменения для узлов которые нужно переместить
        const changes = nodesToMove.map((nodeToMove) => {
          // Для основного перетаскиваемого узла используем его конечную позицию
          if (nodeToMove.id === node.id) {
            return {
              id: nodeToMove.id,
              type: 'position' as const,
              position: node.position
            };
          }

          // Для остальных выделенных узлов применяем смещение
          const initialPos = initialPositions[nodeToMove.id] || nodeToMove.position;
          return {
            id: nodeToMove.id,
            type: 'position' as const,
            position: {
              x: initialPos.x + dx,
              y: initialPos.y + dy
            }
          };
        });

        if (changes.length > 0) {
          try {
            // Используем единую команду для всех изменений
            commandManager.moveNodes(changes);

            // Очищаем начальные позиции для всех обработанных узлов
            setInitialPositions((prev) => {
              const newState = {...prev};
              nodesToMove.forEach((n) => delete newState[n.id]);
              return newState;
            });
          } catch (error) {
            console.error('[DRAG] Failed to handle node changes:', error);
          }
        } else {
          console.warn('[DRAG] No changes generated, skipping command execution');
        }

        // Сохраняем состояние вьюпорта после перетаскивания узла
        saveCurrentViewport();
      } catch (mainError) {
        console.error('[DRAG] Error in handleNodeDragStop:', mainError);
      }
    },
    [autoConnectNodeDragStop, commandManager, saveCurrentViewport, nodes, initialPositions, setDraggingNodeId]
  );

  return {
    handleNodeDragStart,
    handleNodeDrag,
    handleNodeDragStop,
    initialPositions,
    setInitialPositions,
    // Экспортируем Map узлов для возможного использования другими компонентами
    nodesMap
  };
}
