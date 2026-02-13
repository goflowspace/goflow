import {useReactFlow} from '@xyflow/react';

import {useExtendedNodes} from '../hooks/useExtendedNodes';
import {validateGraph} from './conditionValidator';

/**
 * Функция для валидации графа с использованием расширенных данных узлов,
 * включая информацию о начальных и конечных узлах слоев.
 *
 * @returns Результат валидации с информацией об ошибках
 */
export function useEnhancedGraphValidator() {
  const reactFlowInstance = useReactFlow();
  const enhancedNodes = useExtendedNodes();

  return () => {
    const edges = reactFlowInstance.getEdges();
    return validateGraph(enhancedNodes, edges);
  };
}
