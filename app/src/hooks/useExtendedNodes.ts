import {useMemo} from 'react';

import {useReactFlow} from '@xyflow/react';

import {useGraphStore} from '../store/useGraphStore';

/**
 * Хук для получения расширенных данных узлов, объединяющий данные из ReactFlow
 * с полными данными из GraphStore (включая startingNodes и endingNodes для слоев)
 *
 * @returns Record<string, any> - объект с расширенными данными узлов, где ключ - id узла
 */
export function useExtendedNodes() {
  const reactFlowInstance = useReactFlow();
  const {currentGraphId, layers} = useGraphStore();

  const enhancedNodes = useMemo(() => {
    const reactFlowNodes = reactFlowInstance.getNodes();
    const fullNodes = layers[currentGraphId]?.nodes || {};

    return reactFlowNodes.reduce(
      (acc, node) => {
        const fullNode = fullNodes[node.id];
        if (fullNode) {
          acc[node.id] = {
            ...node,
            ...fullNode,
            // Сохраняем специфичные для ReactFlow свойства
            position: node.position,
            selected: node.selected,
            dragging: node.dragging,
            // Сохраняем важные свойства из нашего формата
            type: fullNode.type,
            ...(fullNode.type === 'layer' && {
              startingNodes: fullNode.startingNodes,
              endingNodes: fullNode.endingNodes
            })
          };
        } else {
          acc[node.id] = node;
        }
        return acc;
      },
      {} as Record<string, any>
    );
  }, [reactFlowInstance, layers, currentGraphId]);

  return enhancedNodes;
}
