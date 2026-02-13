import {Node} from '@types-folder/nodes';
import {OperationTarget, VariableOperation} from '@types-folder/variables';

import {GameState, VariableOperationPlayback} from '../core/GameState';
import {StoryData} from '../core/StoryData';
import {EngineEventEmitter} from '../events/EngineEvents';

export class OperationsService {
  private eventEmitter?: EngineEventEmitter;
  private gameState!: GameState;

  constructor(eventEmitter?: EngineEventEmitter) {
    this.eventEmitter = eventEmitter;
  }

  /**
   * Выполняет операции узла
   */
  executeOperations(node: Node, gameState: GameState, storyData: StoryData): void {
    // Сохраняем ссылку на gameState для использования в getTargetValue
    this.gameState = gameState;

    // Проверяем, что узел не является узлом выбора
    if (node.type === 'choice') {
      console.warn(`[WARNING] Попытка выполнить операции для узла выбора: ${node.id}`);
      return;
    }

    if (!('operations' in node) || !node.operations) {
      return;
    }

    // Инициализируем массив операций, если он не существует
    if (!gameState.executedOperations) {
      gameState.executedOperations = [];
    }

    // Выполняем операции в порядке их определения
    for (const operation of node.operations) {
      // Пропускаем отключенные операции
      if (!operation.enabled) continue;

      // Получаем переменную из gameState
      const variableId = operation.variableId;
      const variable = gameState.variables[variableId];

      if (!variable) continue;

      // Получаем текущее значение переменной
      const currentValue = variable.value;
      // Выполняем операцию и получаем новое значение
      const newValue = this.executeOperation(operation, currentValue, variable.type);

      // Добавляем в запись текущее значение до изменения (для отката)
      newValue.previousValue = currentValue;
      newValue.executedInNodeId = node.id;

      // Обновляем значение переменной
      gameState.variables[variableId] = {
        ...variable,
        value: newValue.resultValue
      };
      gameState.executedOperations.push(newValue);

      // Генерируем событие выполнения операции
      if (this.eventEmitter) {
        this.eventEmitter.emit({
          type: 'operation.executed',
          timestamp: Date.now(),
          nodeId: node.id,
          operation: {
            ...operation,
            previousValue: currentValue,
            resultValue: newValue.resultValue
          }
        });
      }
    }
  }

  /**
   * Получает значение цели операции (переменная или кастомное значение)
   */
  private getTargetValue(target: OperationTarget | undefined, variableType: string, gameState: GameState): any {
    if (!target) return '';

    if (target.type === 'variable') {
      // Если цель - переменная, берем ее значение из состояния игры
      const targetVarId = target.variableId;
      if (!targetVarId) return '';

      const targetVariable = gameState.variables[targetVarId];
      return targetVariable ? targetVariable.value : '';
    } else {
      // Если цель - кастомное значение
      return target.value;
    }
  }

  /**
   * Выполняет одну операцию и возвращает новое значение
   */
  private executeOperation(operation: VariableOperation, currentValue: string | number | boolean, variableType: string): VariableOperationPlayback {
    let resultValue: string | number | boolean;

    // Получаем значение цели операции
    const targetValue = this.getTargetValue(operation.target, variableType, this.gameState);

    switch (operation.operationType) {
      case 'override':
        resultValue = targetValue !== undefined ? targetValue : currentValue;
        break;

      case 'addition': {
        if (variableType === 'integer') {
          resultValue = Math.round(Number(currentValue) + Number(targetValue));
        } else {
          resultValue = Number(currentValue) + Number(targetValue);
        }
        break;
      }

      case 'subtract': {
        if (variableType === 'integer') {
          resultValue = Math.round(Number(currentValue) - Number(targetValue));
        } else {
          resultValue = Number(currentValue) - Number(targetValue);
        }
        break;
      }

      case 'multiply': {
        if (variableType === 'integer') {
          resultValue = Math.round(Number(currentValue) * Number(targetValue));
        } else {
          resultValue = Number(currentValue) * Number(targetValue);
        }
        break;
      }

      case 'divide': {
        if (Number(targetValue) === 0) {
          resultValue = currentValue;
        } else {
          if (variableType === 'integer') {
            resultValue = Math.round(Number(currentValue) / Number(targetValue));
          } else {
            resultValue = Number(currentValue) / Number(targetValue);
          }
        }
        break;
      }

      case 'invert': {
        if (variableType === 'boolean' && typeof currentValue === 'boolean') {
          resultValue = !currentValue;
        } else {
          resultValue = currentValue;
          console.warn(`Operation ${operation.operationType} has no boolean value, ${JSON.stringify(operation)}`);
        }
        break;
      }

      case 'join': {
        if (variableType === 'string') {
          resultValue = String(currentValue) + String(targetValue);
        } else {
          resultValue = currentValue;
          console.warn(`Operation ${operation.operationType} has no string value, ${JSON.stringify(operation)}`);
        }
        break;
      }

      default:
        resultValue = currentValue;
        break;
    }

    return {
      ...operation,
      resultValue: resultValue
    };
  }

  /**
   * Откатывает все операции, выполненные для указанного узла
   * Выполняется в обратном порядке
   * @param nodeId ID узла, операции которого нужно откатить
   * @param gameState Текущее состояние игры
   */
  rollbackNodeOperations(nodeId: string, gameState: GameState): void {
    if (!gameState.executedOperations) {
      return;
    }

    // Получаем операции узла в обратном порядке
    const nodeOperations = gameState.executedOperations.filter((op) => op.executedInNodeId === nodeId).reverse();

    // Откатываем каждую операцию
    for (const operation of nodeOperations) {
      this.rollbackOperation(operation, gameState);
    }

    // Генерируем событие отката операций
    if (this.eventEmitter && nodeOperations.length > 0) {
      this.eventEmitter.emit({
        type: 'operations.rolledback',
        timestamp: Date.now(),
        nodeId: nodeId,
        count: nodeOperations.length
      });
    }

    // Удаляем откаченные операции из истории
    gameState.executedOperations = gameState.executedOperations.filter((op) => op.executedInNodeId !== nodeId);
  }

  /**
   * Откатывает последние операции в количестве count
   * @param count Количество операций для отката
   * @param gameState Текущее состояние игры
   */
  rollbackLastOperations(count: number, gameState: GameState): void {
    if (!gameState.executedOperations || gameState.executedOperations.length === 0) {
      return;
    }

    // Получаем последние операции в обратном порядке
    const lastOperations = gameState.executedOperations.slice(-count).reverse();

    // Откатываем каждую операцию
    for (const operation of lastOperations) {
      this.rollbackOperation(operation, gameState);
    }

    // Удаляем откаченные операции из истории
    gameState.executedOperations = gameState.executedOperations.slice(0, -count);
  }

  /**
   * Откатывает одну операцию
   * @param operation Операция для отката (с сохраненным предыдущим значением)
   * @param gameState Текущее состояние игры
   */
  private rollbackOperation(operation: VariableOperationPlayback, gameState: GameState): void {
    // Получаем переменную
    const variableId = operation.variableId;
    const variable = gameState.variables[variableId];

    if (!variable) {
      console.warn(`Невозможно откатить операцию: переменная ${variableId} не найдена`);
      return;
    }

    // Если есть сохраненное предыдущее значение, используем его
    if (operation.previousValue !== undefined) {
      gameState.variables[variableId] = {
        ...variable,
        value: operation.previousValue
      };
      return;
    }

    // Резервный вариант - вычисляем обратную операцию, если предыдущее значение не сохранено
    let newValue: string | number | boolean = variable.value;
    const targetValue = operation.target?.value;

    switch (operation.operationType) {
      case 'override':
        // Для операции override без сохраненного предыдущего значения невозможно точно откатить
        console.warn(`Невозможно точно откатить операцию override без сохраненного предыдущего значения`);
        break;

      case 'addition':
        // Обратная операция для сложения - вычитание
        newValue = Number(variable.value) - Number(targetValue);
        if (variable.type === 'integer') {
          newValue = Math.round(newValue as number);
        }
        break;

      case 'subtract':
        // Обратная операция для вычитания - сложение
        newValue = Number(variable.value) + Number(targetValue);
        if (variable.type === 'integer') {
          newValue = Math.round(newValue as number);
        }
        break;

      case 'multiply':
        // Обратная операция для умножения - деление
        if (Number(targetValue) !== 0) {
          newValue = Number(variable.value) / Number(targetValue);
          if (variable.type === 'integer') {
            newValue = Math.round(newValue as number);
          }
        }
        break;

      case 'divide':
        // Обратная операция для деления - умножение
        newValue = Number(variable.value) * Number(targetValue);
        if (variable.type === 'integer') {
          newValue = Math.round(newValue as number);
        }
        break;

      case 'invert':
        // Для инверсии просто инвертируем обратно
        if (variable.type === 'boolean' && typeof variable.value === 'boolean') {
          newValue = !variable.value;
        }
        break;

      case 'join':
        // Для строковой конкатенации сложно обратить операцию без сохранения предыдущего состояния
        console.warn(`Невозможно точно откатить операцию join без сохраненного предыдущего значения`);
        break;

      default:
        console.warn(`Неизвестный тип операции для отката: ${operation.operationType}`);
        break;
    }

    gameState.variables[variableId] = {
      ...variable,
      value: newValue
    };
  }

  /**
   * Проверяет корректность отката операций
   * Возвращает список операций с проблемами
   * @param gameState Текущее состояние игры
   */
  verifyRollbackCapability(gameState: GameState): {operation: VariableOperationPlayback; issue: string}[] {
    if (!gameState.executedOperations || gameState.executedOperations.length === 0) {
      return [];
    }

    const issues: {operation: VariableOperationPlayback; issue: string}[] = [];

    for (const operation of gameState.executedOperations) {
      // Проверяем, есть ли предыдущее значение
      if (operation.previousValue === undefined) {
        // Для операций override и join без сохраненного предыдущего значения невозможно точно откатить
        if (operation.operationType === 'override') {
          issues.push({
            operation,
            issue: 'Операция присваивания (override) не может быть точно отменена без сохраненного предыдущего значения'
          });
        }
        if (operation.operationType === 'join') {
          issues.push({
            operation,
            issue: 'Операция соединения строк (join) не может быть точно отменена без сохраненного предыдущего значения'
          });
        }
      }

      // Проверяем, есть ли ID узла
      if (operation.executedInNodeId === undefined) {
        issues.push({
          operation,
          issue: 'Операция не имеет связи с узлом для группировки при откате'
        });
      }

      // Проверяем, существует ли переменная
      if (!gameState.variables[operation.variableId]) {
        issues.push({
          operation,
          issue: `Переменная ${operation.variableId} не найдена в gameState`
        });
      }
    }

    return issues;
  }
}
