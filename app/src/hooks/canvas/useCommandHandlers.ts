import React, {useCallback, useMemo, useRef, useState} from 'react';

import {Connection, EdgeChange, NodeChange, OnConnectEnd, OnConnectStart} from '@xyflow/react';
import {getCommandManager} from 'src/commands/CommandManager';
import {createNodesMap} from 'src/utils/nodeUtils';

import {useCanvasStore} from '@store/useCanvasStore';

import {getNotificationManager} from '@components/Notifications';

export function useCommandHandlers() {
  const {nodes, onNodesChange: onCanvasNodesChange, onEdgesChange: onCanvasEdgesChange} = useCanvasStore();
  const commandManager = getCommandManager();

  // Создаем Map для быстрого доступа к узлам - O(1) вместо O(n)
  const nodesMap = useMemo(() => createNodesMap(nodes), [nodes]);

  // Refs для отслеживания состояния создания связи
  const connectingFromRef = useRef<{nodeId: string | null; handleId: string | null; handleType: 'source' | 'target' | null} | null>(null);
  const [hoveredNodeWhileConnecting, setHoveredNodeWhileConnecting] = useState<string | null>(null);

  // Обработчик изменений узлов
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      // Разделение на изменения позиций и другие изменения
      const positionChanges = changes.filter((change) => change.type === 'position' && change.position);
      const nonPositionChanges = changes.filter((change) => !(change.type === 'position' && change.position));

      if (nonPositionChanges.length > 0) {
        onCanvasNodesChange(nonPositionChanges);
      }

      // Для позиционных изменений во время перетаскивания
      if (positionChanges.length > 0) {
        const draggingId = useCanvasStore.getState().draggingNodeId;

        if (draggingId) {
          // Используем структуру Map для обновления узлов более эффективно
          const updatedNodesMap = new Map(nodes.map((node) => [node.id, node]));

          // Обновляем узлы в Map - сложность O(m), где m - число изменений
          for (const change of positionChanges) {
            if (change.type === 'position' && change.position) {
              const node = updatedNodesMap.get(change.id);
              if (node) {
                updatedNodesMap.set(change.id, {
                  ...node,
                  position: change.position
                });
              }
            }
          }

          // Преобразуем Map обратно в массив - сложность O(n)
          const updatedNodes = Array.from(updatedNodesMap.values());
          useCanvasStore.setState({nodes: updatedNodes});
        }
      }
    },
    [onCanvasNodesChange, nodes, nodesMap]
  );

  // Обработчик изменений ребер
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      const deleteChanges = changes.filter((change) => change.type === 'remove');
      const otherChanges = changes.filter((change) => change.type !== 'remove');

      if (deleteChanges.length > 0) {
        deleteChanges.forEach((change) => {
          commandManager.deleteEdge(change.id);
        });
      }

      if (otherChanges.length > 0) {
        onCanvasEdgesChange(otherChanges);
      }
    },
    [onCanvasEdgesChange, commandManager]
  );

  // Обработчик начала создания связи
  const onConnectStart: OnConnectStart = useCallback((event, {nodeId, handleId, handleType}) => {
    connectingFromRef.current = {nodeId: nodeId || null, handleId: handleId || null, handleType: handleType || null};
    setHoveredNodeWhileConnecting(null); // Сбрасываем состояние hover
  }, []);

  // Функция для определения подходящего handle узла в зависимости от направления связи
  const getTargetHandle = useCallback(
    (sourceNodeId: string, targetNodeId: string, sourceHandleType: 'source' | 'target'): string | null => {
      const sourceNode = nodes.find((n) => n.id === sourceNodeId);
      const targetNode = nodes.find((n) => n.id === targetNodeId);

      // Для слоев (layer) используем специальную логику
      if (sourceNode?.type === 'layer' || targetNode?.type === 'layer') {
        // Если источник - слой, а цель - обычный узел
        if (sourceNode?.type === 'layer' && targetNode?.type !== 'layer') {
          // Для исходящих пинов слоя подключаемся к входящему пину целевого узла
          return sourceHandleType === 'source' ? null : null;
        }
        // Если цель - слой, а источник - обычный узел
        if (targetNode?.type === 'layer' && sourceNode?.type !== 'layer') {
          // Нужно будет определить подходящий мини-пин слоя
          // Пока возвращаем null, чтобы использовать стандартную логику
          return null;
        }
      }

      // Для обычных узлов: если источник source, то цель должна быть target
      return sourceHandleType === 'source' ? null : null;
    },
    [nodes]
  );

  // Обработчик завершения создания связи
  const onConnectEnd: OnConnectEnd = useCallback(
    (event) => {
      const connectingFrom = connectingFromRef.current;
      if (!connectingFrom || !connectingFrom.nodeId || !connectingFrom.handleType) return;

      // Получаем элемент под курсором
      const elementUnderCursor = document.elementFromPoint((event as MouseEvent).clientX, (event as MouseEvent).clientY);

      if (!elementUnderCursor) {
        connectingFromRef.current = null;
        return;
      }

      // Ищем ближайший узел
      const nodeElement = elementUnderCursor.closest('[data-id]');
      if (!nodeElement) {
        connectingFromRef.current = null;
        return;
      }

      const targetNodeId = nodeElement.getAttribute('data-id');
      if (!targetNodeId || targetNodeId === connectingFrom.nodeId) {
        connectingFromRef.current = null;
        return;
      }

      // Проверяем, что целевой узел существует
      const foundTargetNode = nodes.find((n) => n.id === targetNodeId);
      if (!foundTargetNode) {
        connectingFromRef.current = null;
        return;
      }

      // Определяем правильные source и target в зависимости от типа исходного handle
      let source: string;
      let target: string;
      let sourceHandle: string | undefined | null = connectingFrom.handleId;
      let targetHandle: string | undefined | null;

      if (connectingFrom.handleType === 'source') {
        // Перетаскиваем от исходящего пина к входящему
        source = connectingFrom.nodeId;
        target = targetNodeId;
        targetHandle = getTargetHandle(connectingFrom.nodeId, targetNodeId, 'source');
      } else {
        // Перетаскиваем от входящего пина к исходящему
        source = targetNodeId;
        target = connectingFrom.nodeId;
        sourceHandle = undefined; // Исходящий пин целевого узла
        targetHandle = connectingFrom.handleId;
      }

      // Создаем соединение
      const connection: Connection = {
        source,
        target,
        sourceHandle: sourceHandle || null,
        targetHandle: targetHandle || null
      };

      // Проверяем типы узлов
      const sourceNode = nodes.find((n) => n.id === connection.source);
      const targetNode = nodes.find((n) => n.id === connection.target);

      // Запрещаем соединение двух узлов выбора (choice) последовательно
      if (sourceNode?.type === 'choice' && targetNode?.type === 'choice') {
        getNotificationManager().showError('Невозможно соединить два узла выбора последовательно');
        connectingFromRef.current = null;
        return;
      }

      // Создаем соединение
      commandManager.connectNarrativeNode(connection);

      // Сбрасываем состояние
      connectingFromRef.current = null;
      setHoveredNodeWhileConnecting(null);
    },
    [nodes, getTargetHandle, commandManager]
  );

  // Обработчик соединения узлов
  const onConnect = useCallback(
    (connection: Connection) => {
      // Проверяем типы узлов
      const sourceNode = nodes.find((n) => n.id === connection.source);
      const targetNode = nodes.find((n) => n.id === connection.target);

      // Запрещаем соединение двух узлов выбора (choice) последовательно
      if (sourceNode?.type === 'choice' && targetNode?.type === 'choice') {
        getNotificationManager().showError('Невозможно соединить два узла выбора последовательно');
        return;
      }

      commandManager.connectNarrativeNode(connection);
    },
    [commandManager, nodes]
  );

  // Обработчик наведения мыши на узел во время создания связи
  const onNodeMouseEnter = useCallback((event: React.MouseEvent, node: any) => {
    if (connectingFromRef.current) {
      setHoveredNodeWhileConnecting(node.id);
    }
  }, []);

  // Обработчик ухода мыши с узла во время создания связи
  const onNodeMouseLeave = useCallback((event: React.MouseEvent, node: any) => {
    if (connectingFromRef.current) {
      setHoveredNodeWhileConnecting(null);
    }
  }, []);

  return {
    onNodesChange,
    onEdgesChange,
    onConnect,
    onConnectStart,
    onConnectEnd,
    onNodeMouseEnter,
    onNodeMouseLeave,
    hoveredNodeWhileConnecting,
    // Экспортируем Map узлов для возможного использования
    nodesMap
  };
}
