import {useCallback, useMemo} from 'react';

import {Node} from '@xyflow/react';
import {createNodesMap, getNodeById} from 'src/utils/nodeUtils';

import {useCanvasStore} from '@store/useCanvasStore';

/**
 * Хук для оптимизированного поиска узлов в графе
 * Использует Map для O(1) доступа вместо O(n)
 */
export function useNodeLookup() {
  const nodes = useCanvasStore((s) => s.nodes);

  // Создаем Map узлов для быстрого доступа
  const nodesMap = useMemo(() => createNodesMap(nodes), [nodes]);

  // Оптимизированный поиск узла по ID
  const findNodeById = useCallback((id: string) => getNodeById(id, nodes, nodesMap), [nodes, nodesMap]);

  // Функция для поиска всех узлов, подключенных к данному узлу
  const findConnectedNodes = useCallback(
    (nodeId: string): Node[] => {
      const edges = useCanvasStore.getState().edges;

      // Находим все ребра, связанные с этим узлом
      const connectedEdges = edges.filter((edge) => edge.source === nodeId || edge.target === nodeId);

      // Собираем ID всех узлов, связанных с этим узлом
      const connectedNodeIds = new Set<string>();
      connectedEdges.forEach((edge) => {
        if (edge.source === nodeId) {
          connectedNodeIds.add(edge.target);
        } else if (edge.target === nodeId) {
          connectedNodeIds.add(edge.source);
        }
      });

      // Находим узлы по ID, используя оптимизированный поиск
      return Array.from(connectedNodeIds)
        .map((id) => findNodeById(id))
        .filter((node): node is Node => node !== undefined);
    },
    [nodes, nodesMap, findNodeById]
  );

  // Функция для поиска исходящих узлов (следующих узлов)
  const findOutgoingNodes = useCallback(
    (nodeId: string): Node[] => {
      const edges = useCanvasStore.getState().edges;

      // Находим все исходящие ребра от этого узла
      const outgoingEdges = edges.filter((edge) => edge.source === nodeId);

      // Собираем ID всех целевых узлов
      const targetNodeIds = outgoingEdges.map((edge) => edge.target);

      // Находим узлы по ID, используя оптимизированный поиск
      return targetNodeIds.map((id) => findNodeById(id)).filter((node): node is Node => node !== undefined);
    },
    [nodes, nodesMap, findNodeById]
  );

  // Функция для поиска входящих узлов (предыдущих узлов)
  const findIncomingNodes = useCallback(
    (nodeId: string): Node[] => {
      const edges = useCanvasStore.getState().edges;

      // Находим все входящие ребра к этому узлу
      const incomingEdges = edges.filter((edge) => edge.target === nodeId);

      // Собираем ID всех исходных узлов
      const sourceNodeIds = incomingEdges.map((edge) => edge.source);

      // Находим узлы по ID, используя оптимизированный поиск
      return sourceNodeIds.map((id) => findNodeById(id)).filter((node): node is Node => node !== undefined);
    },
    [nodes, nodesMap, findNodeById]
  );

  // Поиск узлов по типу
  const findNodesByType = useCallback(
    (type: string): Node[] => {
      return nodes.filter((node) => node.type === type);
    },
    [nodes]
  );

  // Поиск узлов в определенной области
  const findNodesInArea = useCallback(
    (area: {x1: number; y1: number; x2: number; y2: number}): Node[] => {
      return nodes.filter((node) => {
        if (!node.position) return false;

        const {x, y} = node.position;
        return x >= area.x1 && x <= area.x2 && y >= area.y1 && y <= area.y2;
      });
    },
    [nodes]
  );

  return {
    nodesMap,
    findNodeById,
    findConnectedNodes,
    findOutgoingNodes,
    findIncomingNodes,
    findNodesByType,
    findNodesInArea
  };
}
