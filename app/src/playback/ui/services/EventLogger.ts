import {
  ChoiceSelectedEvent,
  ConditionEvaluatedEvent,
  ConditionGroupEvaluatedEvent,
  EngineEventEmitter,
  NavigationBackEvent,
  NodeVisitedEvent,
  OperationExecutedEvent,
  PlaybackEngineEvent
} from '../../engine/events/EngineEvents';
import {ConditionGroupResult, IPlaybackLogPanel, OperationResult, PlaybackLogEntry, PlaybackLogType} from '../types/logging';

/**
 * Сервис для преобразования событий движка в логи
 * Слушает события от движка и создает соответствующие записи в логе
 */
export class EventLogger {
  private eventEmitter: EngineEventEmitter | null = null;
  private logPanel: IPlaybackLogPanel | null = null;
  private boundListener: ((event: PlaybackEngineEvent) => void) | null = null;

  /**
   * Подключает логгер к движку и панели логов
   */
  connect(eventEmitter: EngineEventEmitter, logPanel: IPlaybackLogPanel): void {
    // Отключаемся от предыдущих источников
    this.disconnect();

    this.eventEmitter = eventEmitter;
    this.logPanel = logPanel;

    // Создаем связанный listener для возможности отписки
    this.boundListener = this.handleEngineEvent.bind(this);
    this.eventEmitter.on(this.boundListener);
  }

  /**
   * Отключает логгер
   */
  disconnect(): void {
    if (this.eventEmitter && this.boundListener) {
      this.eventEmitter.off(this.boundListener);
    }
    this.eventEmitter = null;
    this.logPanel = null;
    this.boundListener = null;
  }

  /**
   * Обработчик событий движка
   */
  private handleEngineEvent(event: PlaybackEngineEvent): void {
    if (!this.logPanel) return;

    switch (event.type) {
      case 'node.visited':
        this.handleNodeVisited(event as NodeVisitedEvent);
        break;

      case 'choice.selected':
        this.handleChoiceSelected(event as ChoiceSelectedEvent);
        break;

      case 'operation.executed':
        this.handleOperationExecuted(event as OperationExecutedEvent);
        break;

      case 'condition.evaluated':
        // Игнорируем отдельные условия, логируем только группы
        break;

      case 'condition.group.evaluated':
        this.handleConditionGroupEvaluated(event as ConditionGroupEvaluatedEvent);
        break;

      case 'navigation.back':
        this.handleNavigationBack(event as NavigationBackEvent);
        break;

      case 'story.restarted':
        this.logPanel.clearLog();
        break;
    }
  }

  /**
   * Обработка события посещения узла
   */
  private handleNodeVisited(event: NodeVisitedEvent): void {
    if (event.nodeType !== 'narrative') return;

    const logEntry: PlaybackLogEntry = {
      nodeId: event.nodeId,
      nodeName: event.nodeName,
      timestamp: event.timestamp,
      type: PlaybackLogType.VisitNode,
      entry: null
    };

    this.logPanel!.addLog(logEntry);
  }

  /**
   * Обработка события выбора
   */
  private handleChoiceSelected(event: ChoiceSelectedEvent): void {
    const logEntry: PlaybackLogEntry = {
      nodeId: event.nodeId,
      nodeName: event.choice.text,
      timestamp: event.timestamp,
      type: PlaybackLogType.ChooseChoice,
      entry: event.choice.text
    };

    this.logPanel!.addLog(logEntry);
  }

  /**
   * Обработка события выполнения операции
   */
  private handleOperationExecuted(event: OperationExecutedEvent): void {
    const operationResult: OperationResult = {
      operation: {
        id: event.operation.id,
        type: event.operation.operationType || 'unknown',
        parameters: {
          variableId: event.operation.variableId,
          value: event.operation.target?.value,
          targetType: event.operation.target?.type,
          targetVariableId: event.operation.target?.variableId
        }
      },
      result: event.operation.resultValue ?? null,
      isSuccess: true,
      error: undefined
    };

    const logEntry: PlaybackLogEntry = {
      nodeId: event.nodeId,
      timestamp: event.timestamp,
      type: PlaybackLogType.OperationExecute,
      entry: operationResult
    };

    this.logPanel!.addLog(logEntry);
  }

  /**
   * Обработка события оценки группы условий
   */
  private handleConditionGroupEvaluated(event: ConditionGroupEvaluatedEvent): void {
    // Логируем все события условий, независимо от результата
    if (!event.nodeId) {
      return;
    }

    const conditionGroup: ConditionGroupResult = {
      conditions: event.conditions.map((c) => ({
        condition: c.condition,
        result: c.result,
        explanation: undefined
      })),
      result: event.groupResult,
      explanation: `Группа условий (${event.groupOperator})`
    };

    const logEntry: PlaybackLogEntry = {
      nodeId: event.nodeId,
      timestamp: event.timestamp,
      type: PlaybackLogType.ConditionEvaluate,
      entry: {
        conditionGroups: [conditionGroup],
        result: event.groupResult
      }
    };

    this.logPanel!.addLog(logEntry);
  }

  /**
   * Обработка события навигации назад
   */
  private handleNavigationBack(event: NavigationBackEvent): void {
    // Откатываем логи до целевого узла
    this.logPanel!.rollbackLog(event.toNodeId);
  }
}
