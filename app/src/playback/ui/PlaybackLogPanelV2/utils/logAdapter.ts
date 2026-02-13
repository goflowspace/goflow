import {Condition, ConditionType, Node} from '../../../../types/nodes';
import {OperationType, Variable} from '../../../../types/variables';
import {ConditionGroupResult, OperationResult, PlaybackLogEntry, PlaybackLogType} from '../../types/logging';
import {ChoiceLogEntry, Condition as ConditionV2, LogEntryType, LogEntry as LogEntryV2, NarrativeLogEntry, Operation} from '../types';

// Функция для получения названия узла
const getNodeName = (nodeId: string, nodes: Node[]): string => {
  const node = nodes.find((n) => n.id === nodeId);
  if (!node) return nodeId;

  if (node.type === 'narrative' && 'data' in node) {
    return node.data.title || node.data.text || nodeId;
  } else if (node.type === 'choice' && 'data' in node) {
    return node.data.text || nodeId;
  }

  return nodeId;
};

// Адаптер для преобразования условий из формата системы в формат V2
const convertConditionToV2 = (condition: Condition, index: number, variableMap: Map<string, Variable>, nodes: Node[], t: (key: string) => string): ConditionV2 | null => {
  switch (condition.type) {
    case ConditionType.VARIABLE_COMPARISON: {
      const variable = condition.varId ? variableMap.get(condition.varId) : null;
      if (condition.valType === 'custom') {
        // Сравнение с пользовательским значением
        return {
          id: condition.id,
          type: ConditionType.VARIABLE_COMPARISON,
          index,
          valType: 'custom' as const,
          variableName: variable?.name || condition.varId || t('playback.log_panel.variable'),
          variableType: variable?.type,
          comparator: convertOperator(condition.operator),
          value: condition.value !== undefined ? condition.value : 0
        };
      } else if (condition.valType === 'variable') {
        // Сравнение двух переменных
        const rightVar = condition.comparisonVarId ? variableMap.get(condition.comparisonVarId) : null;
        return {
          id: condition.id,
          type: ConditionType.VARIABLE_COMPARISON,
          index,
          valType: 'variable' as const,
          variableName: variable?.name || condition.varId || t('playback.log_panel.variable1'),
          variableType: variable?.type,
          comparator: convertOperator(condition.operator),
          comparisonVariableName: rightVar?.name || condition.comparisonVarId || t('playback.log_panel.variable2')
        };
      }
      break;
    }

    case ConditionType.PROBABILITY:
      return {
        id: condition.id,
        type: ConditionType.PROBABILITY,
        index,
        probability: Math.round((condition.probability || 0.5) * 100)
      };

    case ConditionType.NODE_HAPPENED:
      return {
        id: condition.id,
        type: ConditionType.NODE_HAPPENED,
        index,
        nodeName: condition.nodeId ? getNodeName(condition.nodeId, nodes) : t('playback.log_panel.unknown_node')
      };

    case ConditionType.NODE_NOT_HAPPENED:
      return {
        id: condition.id,
        type: ConditionType.NODE_NOT_HAPPENED,
        index,
        nodeName: condition.nodeId ? getNodeName(condition.nodeId, nodes) : t('playback.log_panel.unknown_node')
      };

    default:
      return null;
  }

  return null;
};

// Конвертер операторов сравнения
const convertOperator = (operator?: string): string => {
  switch (operator) {
    case 'eq':
      return '=';
    case 'neq':
      return '≠';
    case 'gt':
      return '>';
    case 'gte':
      return '≥';
    case 'lt':
      return '<';
    case 'lte':
      return '≤';
    default:
      return '=';
  }
};

// Адаптер для преобразования логов в формат V2
export const convertLogsToV2Format = (logs: PlaybackLogEntry[], variables: Variable[], nodes: Node[] = [], t?: (key: string) => string): LogEntryV2[] => {
  // Fallback функция для случаев, когда перевод не передан
  const translate =
    t ||
    ((key: string) => {
      const fallbacks: Record<string, string> = {
        'playback.log_panel.node': 'Node',
        'playback.log_panel.unknown_choice': 'Unknown choice'
      };
      return fallbacks[key] || key;
    });
  const result: LogEntryV2[] = [];
  let index = 1;
  let lastNodeType: LogEntryType | null = null;
  let shouldAddTransition = false; // Флаг для добавления перехода к следующему узлу

  // Создаем карту переменных для быстрого поиска по ID
  const variableMap = new Map<string, Variable>();
  variables.forEach((v) => variableMap.set(v.id, v));

  // Временные структуры для накопления данных
  const nodeOperations = new Map<string, Operation[]>(); // nodeId -> операции
  const nodeConditions = new Map<string, ConditionV2[]>(); // nodeId -> условия для следующего узла
  const visitedNodes: {nodeId: string; nodeName: string; timestamp: string; logIndex: number}[] = [];
  const choices: {choiceName: string; timestamp: string; logIndex: number}[] = [];

  // Первый проход - собираем информацию
  logs.forEach((log, i) => {
    const timestamp = new Date(log.timestamp).toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    switch (log.type) {
      case PlaybackLogType.VisitNode: {
        visitedNodes.push({
          nodeId: log.nodeId,
          nodeName: log.nodeName || `${translate('playback.log_panel.node')} ${log.nodeId}`,
          timestamp,
          logIndex: i
        });
        break;
      }

      case PlaybackLogType.ChooseChoice: {
        choices.push({
          choiceName: String(log.entry || translate('playback.log_panel.unknown_choice')),
          timestamp,
          logIndex: i
        });
        break;
      }

      case PlaybackLogType.OperationExecute: {
        if (log.nodeId && log.entry) {
          const op = log.entry as OperationResult;
          if (!nodeOperations.has(log.nodeId)) {
            nodeOperations.set(log.nodeId, []);
          }
          const variableId = op.operation?.parameters?.variableId;
          const variable = variableId ? variableMap.get(variableId) : null;

          // Получаем тип операции из исходных данных
          const operationType = op.operation?.type as OperationType;

          // Определяем значение в зависимости от типа операции и типа target
          let operationValue: string | number | boolean | undefined;
          let isVariableValue = false;

          // Для операции invert значение не требуется
          if (operationType === 'invert') {
            operationValue = undefined;
          } else if (op.operation?.parameters?.targetType === 'variable') {
            // Если target это переменная, показываем её название
            const targetVariableId = op.operation.parameters.targetVariableId;
            const targetVariable = targetVariableId ? variableMap.get(targetVariableId) : null;
            operationValue = targetVariable?.name || targetVariableId || 'Unknown Variable';
            isVariableValue = true; // Это имя переменной
          } else if (op.operation?.parameters?.value !== undefined) {
            operationValue = op.operation.parameters.value;
            isVariableValue = false; // Это кастомное значение
          } else {
            operationValue = undefined;
          }

          nodeOperations.get(log.nodeId)!.push({
            id: `op-${i}`,
            variableName: variable?.name || variableId || 'Unknown',
            variableType: variable?.type,
            operator: operationType,
            value: operationValue,
            result: op.result !== undefined ? op.result : undefined,
            isVariableValue: isVariableValue
          } as Operation);
        }
        break;
      }

      case PlaybackLogType.ConditionEvaluate: {
        if (log.entry && typeof log.entry === 'object' && 'conditionGroups' in log.entry) {
          const overallResult = 'result' in log.entry ? log.entry.result : null;

          if (overallResult === true && log.nodeId) {
            const conditions: ConditionV2[] = [];
            let condIndex = 1;

            log.entry.conditionGroups.forEach((group: ConditionGroupResult) => {
              if (group.result === true) {
                group.conditions.forEach((cond: any) => {
                  if (!cond.condition || Object.keys(cond.condition).length === 0 || cond.result !== true) {
                    return;
                  }

                  const convertedCondition = convertConditionToV2(cond.condition as Condition, condIndex++, variableMap, nodes, translate);
                  if (convertedCondition) {
                    conditions.push(convertedCondition);
                  }
                });
              }
            });

            if (conditions.length > 0) {
              // Ищем следующий узел после условий - он должен быть ближайшим узлом после текущего лога
              let targetNodeId: string | null = null;

              // Проходим по оставшимся логам, чтобы найти следующий посещенный узел
              for (let j = i + 1; j < logs.length; j++) {
                if (logs[j].type === PlaybackLogType.VisitNode) {
                  targetNodeId = logs[j].nodeId;
                  break;
                }
              }

              if (targetNodeId) {
                // Сохраняем условия для целевого узла
                nodeConditions.set(targetNodeId, conditions);
              } else {
                // Если не найден целевой узел, используем исходную логику
                nodeConditions.set(log.nodeId, conditions);
              }
            }
          }
        }
        break;
      }
    }
  });

  // Второй проход - создаем финальные записи
  let pendingConditions: ConditionV2[] | undefined;
  const allLogEntries: {type: 'node' | 'choice'; data: any; logIndex: number}[] = [];

  // Объединяем узлы и выборы в правильном порядке
  visitedNodes.forEach((node) => {
    allLogEntries.push({type: 'node', data: node, logIndex: node.logIndex});
  });
  choices.forEach((choice) => {
    allLogEntries.push({type: 'choice', data: choice, logIndex: choice.logIndex});
  });
  allLogEntries.sort((a, b) => a.logIndex - b.logIndex);

  // Создаем записи
  allLogEntries.forEach((entry, i) => {
    if (entry.type === 'node') {
      const nodeData = entry.data;

      // Получаем условия для текущего узла
      const nodeConditions_forThisNode = nodeConditions.get(nodeData.nodeId);

      const narrative: NarrativeLogEntry = {
        id: `log-${entry.logIndex}`,
        type: LogEntryType.NARRATIVE,
        index: index++,
        timestamp: nodeData.timestamp,
        nodeName: nodeData.nodeName,
        operations: nodeOperations.get(nodeData.nodeId) || [],
        conditions: nodeConditions_forThisNode || pendingConditions, // Используем условия для текущего узла или отложенные условия
        hasTransition: shouldAddTransition
      };

      result.push(narrative);

      // Если у текущего узла есть условия, очищаем их и не передаем дальше
      if (nodeConditions_forThisNode) {
        pendingConditions = undefined;
      } else {
        // Проверяем, есть ли условия для этого узла (для следующего перехода) - это старая логика
        if (nodeConditions.has(nodeData.nodeId) && !nodeConditions_forThisNode) {
          pendingConditions = nodeConditions.get(nodeData.nodeId);
        } else if (!nodeConditions_forThisNode) {
          pendingConditions = undefined;
        }
      }

      shouldAddTransition = true;
      lastNodeType = LogEntryType.NARRATIVE;
    } else {
      result.push({
        id: `log-${entry.logIndex}`,
        type: LogEntryType.CHOICE,
        index: index++,
        timestamp: entry.data.timestamp,
        choiceName: entry.data.choiceName,
        hasTransition: shouldAddTransition
      } as ChoiceLogEntry);

      shouldAddTransition = true;
      lastNodeType = LogEntryType.CHOICE;
    }
  });

  return result;
};
