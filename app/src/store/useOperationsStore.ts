import {nanoid} from 'nanoid';
import {create} from 'zustand';
import {devtools, subscribeWithSelector} from 'zustand/middleware';

// Импортируем CommandManager
import {getCommandManager} from '../commands/CommandManager';
import {OperationTarget, OperationTargetType, OperationType, Variable, VariableOperation} from '../types/variables';
import {formatVariableValue} from '../utils/variableFormatters';
// Импортируем useGraphStore после создания useOperationsStore
// для избежания циклических зависимостей
import {useGraphStore as importedGraphStore} from './useGraphStore';
import {useVariablesStore} from './useVariablesStore';

interface OperationsStore {
  // Функции для работы с операциями
  addOperation: (nodeId: string, variableId: string, operationType: OperationType, target?: OperationTarget, enabled?: boolean) => string; // Возвращает ID созданной операции

  updateOperation: (operationId: string, updates: Partial<Omit<VariableOperation, 'id' | 'nodeId'>>) => void;

  deleteOperation: (operationId: string) => void;

  // Функции для управления порядком операций
  reorderOperations: (nodeId: string, startIndex: number, endIndex: number) => void;

  // Функции для включения/выключения операций
  toggleOperation: (operationId: string) => void;
  toggleAllNodeOperations: (nodeId: string, enabled: boolean) => void;

  // Получение операций узла
  getNodeOperations: (nodeId: string) => VariableOperation[];

  // Функция для удаления всех операций, связанных с переменной
  deleteOperationsByVariableId: (variableId: string) => void;

  // Функция для получения переменной по ID
  getVariableById: (variableId: string) => Variable | undefined;

  // Функция для получения текстового представления операции
  getOperationPreviewText: (operationId: string) => string;

  // Функция для получения составных частей операции (переменная, оператор, значение)
  getOperationParts: (operationId: string) => {
    variableName: string;
    operator: string;
    value: string;
  } | null;
}

// Объявление для предотвращения циклических импортов
let useGraphStore: any;

export const useOperationsStore = create<OperationsStore>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      // Добавление новой операции
      addOperation: (nodeId, variableId, operationType, target, enabled = true) => {
        const commandManager = getCommandManager();
        // Определяем текущий максимальный порядок для операций данного узла
        const nodeOperations = get().getNodeOperations(nodeId);
        const maxOrder = nodeOperations.length > 0 ? Math.max(...nodeOperations.map((op) => op.order)) : -1;

        const newOperation: VariableOperation = {
          id: nanoid(),
          nodeId,
          variableId,
          operationType,
          target,
          enabled,
          order: maxOrder + 1 // Добавляем в конец списка
        };

        commandManager.createOperation(nodeId, newOperation);

        return newOperation.id;
      },

      // Обновление существующей операции
      updateOperation: (operationId, updates) => {
        const commandManager = getCommandManager();
        // Находим узел, содержащий операцию
        const graphStore = importedGraphStore.getState();
        const {currentGraphId, layers} = graphStore;
        const layer = layers[currentGraphId];

        for (const nodeId in layer.nodes) {
          const node = layer.nodes[nodeId];
          if (node.type === 'narrative' && node.operations) {
            const operationExists = node.operations.some((op) => op.id === operationId);
            if (operationExists) {
              commandManager.updateOperation(nodeId, operationId, updates);
              return;
            }
          }
        }
      },

      // Удаление операции
      deleteOperation: (operationId) => {
        // Получаем GraphStore для работы с узлами
        const graphStore = importedGraphStore.getState();
        const {currentGraphId, layers} = graphStore;
        const layer = layers[currentGraphId];

        // Находим узел, содержащий операцию
        for (const nodeId in layer.nodes) {
          const node = layer.nodes[nodeId];
          if (node.type === 'narrative' && node.operations) {
            const operationIndex = node.operations.findIndex((op) => op.id === operationId);

            if (operationIndex !== -1) {
              const operation = node.operations[operationIndex];
              const order = operation.order;

              // Удаляем операцию и обновляем порядок оставшихся
              const updatedOperations = node.operations.filter((op) => op.id !== operationId).map((op) => (op.order > order ? {...op, order: op.order - 1} : op));

              const updatedNode = {
                ...node,
                operations: updatedOperations
              };

              // Обновляем узел в слое
              graphStore.updateNodeWithOperations(nodeId, updatedNode);
              // Сохраняем изменения в локальное хранилище
              graphStore.saveToDb();
              return;
            }
          }
        }
      },

      // Изменение порядка операций
      reorderOperations: (nodeId, startIndex, endIndex) => {
        // Получаем операции данного узла, отсортированные по порядку
        const nodeOperations = get().getNodeOperations(nodeId);

        if (startIndex === endIndex) return;

        // Создаем новый порядок
        const reorderedOperations = [...nodeOperations];
        const [movedOperation] = reorderedOperations.splice(startIndex, 1);
        reorderedOperations.splice(endIndex, 0, movedOperation);

        // Обновляем порядок операций непосредственно в узле
        const graphStore = importedGraphStore.getState();
        const {currentGraphId, layers} = graphStore;
        const layer = layers[currentGraphId];

        if (layer && layer.nodes[nodeId] && layer.nodes[nodeId].type === 'narrative') {
          const narrativeNode = layer.nodes[nodeId];

          if (narrativeNode.operations) {
            // Обновляем порядок операций в узле
            const updatedNode = {
              ...narrativeNode,
              operations: narrativeNode.operations.map((op) => {
                const newIndex = reorderedOperations.findIndex((reorderedOp) => reorderedOp.id === op.id);
                return {...op, order: newIndex};
              })
            };

            graphStore.updateNodeWithOperations(nodeId, updatedNode);
            // Сохраняем изменения в локальное хранилище
            graphStore.saveToDb();
          }
        }
      },

      // Включение/выключение одной операции
      toggleOperation: (operationId) => {
        const commandManager = getCommandManager();
        const graphStore = importedGraphStore.getState();
        const {currentGraphId, layers} = graphStore;
        const layer = layers[currentGraphId];

        for (const nodeId in layer.nodes) {
          const node = layer.nodes[nodeId];
          if (node.type === 'narrative' && node.operations) {
            const operationExists = node.operations.some((op) => op.id === operationId);
            if (operationExists) {
              commandManager.toggleOperation(nodeId, operationId);
              // Вызываем обновление узла, чтобы граф перерисовался
              const updateNodeEvent = new CustomEvent('updateNodeInternals', {
                detail: {nodeId}
              });
              document.dispatchEvent(updateNodeEvent);
              return;
            }
          }
        }
      },

      // Включение/выключение всех операций узла
      toggleAllNodeOperations: (nodeId, enabled) => {
        const commandManager = getCommandManager();
        commandManager.toggleAllNodeOperations(nodeId, enabled);
        // Вызываем обновление узла, чтобы граф перерисовался
        const updateNodeEvent = new CustomEvent('updateNodeInternals', {
          detail: {nodeId}
        });
        document.dispatchEvent(updateNodeEvent);
      },

      // Получение операций узла
      getNodeOperations: (nodeId) => {
        // Получаем GraphStore для работы с узлами
        const graphStore = importedGraphStore.getState();
        const {currentGraphId, layers} = graphStore;
        const layer = layers[currentGraphId];

        if (layer && layer.nodes[nodeId] && layer.nodes[nodeId].type === 'narrative') {
          const narrativeNode = layer.nodes[nodeId];

          // Если у узла есть операции, возвращаем их
          if (narrativeNode.operations && narrativeNode.operations.length > 0) {
            return [...narrativeNode.operations].sort((a, b) => a.order - b.order);
          }
        }

        // Если операций нет, возвращаем пустой массив
        return [];
      },

      // Удаление всех операций, связанных с переменной
      deleteOperationsByVariableId: (variableId) => {
        // Получаем GraphStore для работы с узлами
        const graphStore = importedGraphStore.getState();
        const {layers} = graphStore;
        let operationsRemoved = false;

        // Обрабатываем все слои, так как переменная может использоваться в операциях на разных уровнях
        Object.keys(layers).forEach((layerId) => {
          const layer = layers[layerId];

          // Проходим по всем узлам слоя
          for (const nodeId in layer.nodes) {
            const node = layer.nodes[nodeId];
            if (node.type === 'narrative' && node.operations && node.operations.length > 0) {
              // Находим операции, которые нужно удалить
              const originalCount = node.operations.length;
              const filteredOperations = node.operations.filter((op) => {
                // Фильтруем операции, которые:
                // 1. Используют переменную как основную переменную (variableId)
                if (op.variableId === variableId) {
                  return false; // Удаляем операцию, если переменная в ней основная
                }

                // 2. Используют переменную как цель (target.variableId)
                if (op.target && op.target.type === 'variable' && op.target.variableId === variableId) {
                  return false; // Удаляем операцию, если переменная используется как цель
                }

                return true; // Оставляем остальные операции
              });

              // Проверяем, были ли удалены операции
              if (filteredOperations.length < originalCount) {
                operationsRemoved = true;

                const updatedNode = {
                  ...node,
                  operations: filteredOperations
                };

                // Обновляем узел в соответствующем слое
                const updatedLayer = {
                  ...layer,
                  nodes: {
                    ...layer.nodes,
                    [nodeId]: updatedNode
                  }
                };

                // Обновляем слой в хранилище
                graphStore.updateLayerWithOperations(layerId, updatedLayer);
              }
            }
          }
        });

        // Сохраняем изменения, если были удалены операции
        if (operationsRemoved) {
          graphStore.saveToDb();
        }
      },

      // Получение переменной по ID
      getVariableById: (variableId) => {
        return useVariablesStore.getState().variables.find((v) => v.id === variableId);
      },

      // Получение текстового представления операции
      getOperationPreviewText: (operationId) => {
        // Находим операцию во всех узлах
        const graphStore = importedGraphStore.getState();
        const {currentGraphId, layers} = graphStore;
        const layer = layers[currentGraphId];

        let operation = null;

        // Ищем операцию в нарративных узлах
        for (const nodeId in layer.nodes) {
          const node = layer.nodes[nodeId];
          if (node.type === 'narrative' && node.operations) {
            operation = node.operations.find((op) => op.id === operationId);
            if (operation) break;
          }
        }

        if (!operation) return '';

        const variable = get().getVariableById(operation.variableId);
        if (!variable) return '';

        const variableName = variable.name;

        switch (operation.operationType) {
          case 'override': {
            if (!operation.target) return `${variableName} = unknown`;

            let targetValue = '';
            if (operation.target.type === 'variable') {
              const targetVariable = get().getVariableById(operation.target.variableId!);
              targetValue = targetVariable ? targetVariable.name : 'unknown variable';
            } else {
              // Используем общую функцию форматирования
              targetValue = formatVariableValue(operation.target.value, variable.type);
            }

            return `${variableName} = ${targetValue}`;
          }
          case 'invert': {
            return `${variableName} Invertion`;
          }
          case 'join': {
            if (!operation.target) return `${variableName} + unknown text`;

            let targetValue = '';
            if (operation.target.type === 'variable') {
              const targetVariable = get().getVariableById(operation.target.variableId!);
              targetValue = targetVariable ? targetVariable.name : 'unknown variable';
            } else {
              targetValue = String(operation.target.value);
            }

            return `${variableName} + "${targetValue}"`;
          }
          case 'addition': {
            if (!operation.target) return `${variableName} + unknown`;

            let targetValue = '';
            if (operation.target.type === 'variable') {
              const targetVariable = get().getVariableById(operation.target.variableId!);
              targetValue = targetVariable ? targetVariable.name : 'unknown variable';
            } else {
              // Используем общую функцию форматирования
              targetValue = formatVariableValue(operation.target.value, variable.type);
            }

            return `${variableName} + ${targetValue}`;
          }
          case 'subtract': {
            if (!operation.target) return `${variableName} - unknown`;

            let targetValue = '';
            if (operation.target.type === 'variable') {
              const targetVariable = get().getVariableById(operation.target.variableId!);
              targetValue = targetVariable ? targetVariable.name : 'unknown variable';
            } else {
              // Используем общую функцию форматирования
              targetValue = formatVariableValue(operation.target.value, variable.type);
            }

            return `${variableName} - ${targetValue}`;
          }
          case 'multiply': {
            if (!operation.target) return `${variableName} * unknown`;

            let targetValue = '';
            if (operation.target.type === 'variable') {
              const targetVariable = get().getVariableById(operation.target.variableId!);
              targetValue = targetVariable ? targetVariable.name : 'unknown variable';
            } else {
              // Используем общую функцию форматирования
              targetValue = formatVariableValue(operation.target.value, variable.type);
            }

            return `${variableName} * ${targetValue}`;
          }
          case 'divide': {
            if (!operation.target) return `${variableName} / unknown`;

            let targetValue = '';
            if (operation.target.type === 'variable') {
              const targetVariable = get().getVariableById(operation.target.variableId!);
              targetValue = targetVariable ? targetVariable.name : 'unknown variable';
            } else {
              // Используем общую функцию форматирования
              targetValue = formatVariableValue(operation.target.value, variable.type);
            }

            return `${variableName} / ${targetValue}`;
          }
          default:
            return `${variableName} unknown operation`;
        }
      },

      // Получение составных частей операции
      getOperationParts: (operationId) => {
        // Находим операцию во всех узлах
        const graphStore = importedGraphStore.getState();
        const {currentGraphId, layers} = graphStore;
        const layer = layers[currentGraphId];

        let operation = null;

        // Ищем операцию в нарративных узлах
        for (const nodeId in layer.nodes) {
          const node = layer.nodes[nodeId];
          if (node.type === 'narrative' && node.operations) {
            operation = node.operations.find((op) => op.id === operationId);
            if (operation) break;
          }
        }

        if (!operation) return null;

        const variable = get().getVariableById(operation.variableId);
        if (!variable) return null;

        const variableName = variable.name;
        let operator = '';
        let value = '';

        switch (operation.operationType) {
          case 'override': {
            operator = '=';

            if (!operation.target) {
              value = 'unknown';
            } else if (operation.target.type === 'variable') {
              const targetVariable = get().getVariableById(operation.target.variableId!);
              value = targetVariable ? targetVariable.name : 'unknown variable';
            } else {
              // Используем общую функцию форматирования
              value = formatVariableValue(operation.target.value, variable.type);
            }
            break;
          }
          case 'invert': {
            operator = 'Invertion';
            value = '';
            break;
          }
          case 'join': {
            operator = '+';

            if (!operation.target) {
              value = 'unknown text';
            } else if (operation.target.type === 'variable') {
              const targetVariable = get().getVariableById(operation.target.variableId!);
              value = targetVariable ? targetVariable.name : 'unknown variable';
            } else {
              value = `"${String(operation.target.value)}"`;
            }
            break;
          }
          case 'addition': {
            operator = '+';

            if (!operation.target) {
              value = 'unknown';
            } else if (operation.target.type === 'variable') {
              const targetVariable = get().getVariableById(operation.target.variableId!);
              value = targetVariable ? targetVariable.name : 'unknown variable';
            } else {
              // Используем общую функцию форматирования
              value = formatVariableValue(operation.target.value, variable.type);
            }
            break;
          }
          case 'subtract': {
            operator = '-';

            if (!operation.target) {
              value = 'unknown';
            } else if (operation.target.type === 'variable') {
              const targetVariable = get().getVariableById(operation.target.variableId!);
              value = targetVariable ? targetVariable.name : 'unknown variable';
            } else {
              // Используем общую функцию форматирования
              value = formatVariableValue(operation.target.value, variable.type);
            }
            break;
          }
          case 'multiply': {
            operator = '*';

            if (!operation.target) {
              value = 'unknown';
            } else if (operation.target.type === 'variable') {
              const targetVariable = get().getVariableById(operation.target.variableId!);
              value = targetVariable ? targetVariable.name : 'unknown variable';
            } else {
              // Используем общую функцию форматирования
              value = formatVariableValue(operation.target.value, variable.type);
            }
            break;
          }
          case 'divide': {
            operator = '/';

            if (!operation.target) {
              value = 'unknown';
            } else if (operation.target.type === 'variable') {
              const targetVariable = get().getVariableById(operation.target.variableId!);
              value = targetVariable ? targetVariable.name : 'unknown variable';
            } else {
              // Используем общую функцию форматирования
              value = formatVariableValue(operation.target.value, variable.type);
            }
            break;
          }
          default:
            operator = 'unknown operation';
            value = '';
        }

        return {variableName, operator, value};
      }
    })),
    {name: 'operations-store'}
  )
);
