import {useCallback, useState} from 'react';

import {Node, getOutgoers, useNodeConnections, useOnSelectionChange, useReactFlow} from '@xyflow/react';

import {useCanvasStore} from '@store/useCanvasStore';

/**
 * Хук определяет, можно ли показывать `NewObjDialog` для конкретной ноды:
 * - Нода должна быть выделена (единственная)
 * - Не должна перемещаться
 * - Не должна быть частью множественного выделения
 * - Не должно быть исходящих связей
 */
export const useShouldShowNodeDialog = (nodeId: string): boolean => {
  const draggingNodeId = useCanvasStore((s) => s.draggingNodeId);
  const isDragging = draggingNodeId === nodeId;

  const [isSelected, setIsSelected] = useState(false); // Выделена ли именно эта нода
  const [isInGroupSelection, setIsInGroupSelection] = useState(false); // Выделено ли несколько нод

  const onChange = useCallback(({nodes}: {nodes: Node[]}) => {
    const selectedNodes = nodes;
    const onlyThisNodeSelected = selectedNodes.length === 1 && selectedNodes[0]?.id === nodeId;
    const multipleSelected = selectedNodes.length > 1;

    setIsSelected(onlyThisNodeSelected);
    setIsInGroupSelection(multipleSelected);
  }, []);

  // Следим за изменением выделения
  useOnSelectionChange({
    onChange
  });

  const connections = useNodeConnections({id: nodeId, handleType: 'source'});
  const hasOutgoingConnections = connections.length > 0;

  // Финальное условие показа диалога:
  const shouldShowDialog = isSelected && !isDragging && !isInGroupSelection && !hasOutgoingConnections;

  return shouldShowDialog;
};
