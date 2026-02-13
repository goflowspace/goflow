/**
 * Интерфейс состояния игры
 * Хранит текущее состояние переменных и посещенных узлов
 */
import {Condition, ConditionGroup, Node} from '@types-folder/nodes';
import {Variable, VariableOperation} from '@types-folder/variables';

export interface VariableOperationPlayback extends VariableOperation {
  /**
   * Результирующее значение после выполнения операции
   */
  resultValue: string | number | boolean;

  /**
   * Предыдущее значение переменной до выполнения операции
   * Необходимо для корректного отката операций
   */
  previousValue?: string | number | boolean;

  /**
   * ID узла, в котором была выполнена операция
   * Используется для группировки операций при откате
   */
  executedInNodeId?: string;
}

export interface TriggeredCondition {
  /**
   * Информация об условии, которое сработало
   */
  condition: Condition;

  /**
   * Оператор группы, в которой находилось условие (AND/OR)
   */
  groupOperator: 'AND' | 'OR';

  /**
   * ID группы условий, к которой принадлежит условие
   */
  groupId?: string;

  /**
   * ID узла/ребра, где было проверено условие
   */
  nodeId?: string;
  edgeId?: string;

  /**
   * Отметка времени, когда сработало условие
   */
  timestamp: number;

  /**
   * Результат проверки условия
   */
  result: boolean;
}

export interface GameState {
  /**
   * Текущие значения переменных как полные объекты Variable
   */
  variables: Record<string, Variable>;

  /**
   * Множество посещенных узлов (ID)
   */
  visitedNodes: Set<string>;

  /**
   * История посещенных узлов для возможности возврата
   */
  history: string[];

  /**
   * История отображаемых узлов (для визуального представления)
   * Содержит полные объекты узлов, а не только идентификаторы
   */
  displayHistory: Node[];

  /**
   * История выполненных операций
   * Содержит операции, которые были выполнены при входе в текущий узел
   */
  executedOperations: VariableOperationPlayback[];

  /**
   * История сработавших условий
   * Содержит информацию о проверенных условиях и их результатах
   */
  triggeredConditions: TriggeredCondition[];
}
