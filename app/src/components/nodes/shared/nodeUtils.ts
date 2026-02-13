import {DOM_EVENTS} from './constants';

/**
 * Обновляет соединения для указанного узла
 * Используется для всех типов узлов
 *
 * @param nodeId - ID узла
 * @param delay - Задержка перед отправкой события
 */
export const updateNodeConnections = (nodeId: string, delay = 0): void => {
  setTimeout(() => {
    const updateEvent = new CustomEvent(DOM_EVENTS.UPDATE_NODE_INTERNALS, {
      detail: {nodeId}
    });
    document.dispatchEvent(updateEvent);
  }, delay);
};

/**
 * Определяет, отличается ли текущее значение от исходного
 * Используется для оптимизации сохранения изменений
 *
 * @param currentValue - Текущее значение
 * @param originalValue - Исходное значение
 */
export const hasValueChanged = <T>(currentValue: T, originalValue: T): boolean => {
  if (typeof currentValue === 'string' && typeof originalValue === 'string') {
    return currentValue !== originalValue;
  }

  if (typeof currentValue === 'object' && typeof originalValue === 'object') {
    return JSON.stringify(currentValue) !== JSON.stringify(originalValue);
  }

  return currentValue !== originalValue;
};
