import {useCanvasStore} from '../store/useCanvasStore';
import {useGraphStore} from '../store/useGraphStore';
import {Condition, ConditionGroup} from '../types/nodes';
import {Command, CommandMetadata} from './CommandInterface';
import {generateAndSaveOperation} from './operationUtils';

/**
 * Команда для обновления условий связи
 */
export class UpdateEdgeConditionsCommand implements Command {
  private edgeId: string;
  private newConditions: ConditionGroup[];
  private originalConditions: ConditionGroup[];
  private graphStore: ReturnType<typeof useGraphStore.getState>;
  private canvasStore: ReturnType<typeof useCanvasStore.getState>;
  private originalLayerId: string;
  private projectId?: string;
  private timelineId: string;

  /**
   * @param edgeId Идентификатор ребра для обновления
   * @param newConditions Новые условия для ребра
   * @param projectId ID проекта
   */
  constructor(edgeId: string, newConditions: ConditionGroup[], projectId?: string) {
    this.edgeId = edgeId;

    // Фильтруем пустые группы условий, сохраняем только те, где есть хотя бы одно условие
    this.newConditions = newConditions.filter((group) => group.conditions.length > 0);

    this.graphStore = useGraphStore.getState();
    this.canvasStore = useCanvasStore.getState();
    this.originalLayerId = this.graphStore.currentGraphId;
    this.projectId = projectId;
    this.timelineId = this.graphStore.currentTimelineId;

    // Сохраняем оригинальные условия для отмены
    const edge = this.graphStore.layers[this.originalLayerId]?.edges[this.edgeId];

    // Также фильтруем пустые группы в оригинальных условиях
    this.originalConditions = edge?.conditions ? edge.conditions.filter((group) => group.conditions.length > 0) : [];
  }

  /**
   * Выполнение команды - обновление условий связи
   */
  execute(): void {
    this.graphStore = useGraphStore.getState();
    this.graphStore.updateEdge(this.edgeId, {conditions: this.newConditions});

    // Сохраняем изменения в IndexedDB
    this.graphStore.saveToDb();

    // Генерируем и сохраняем операцию в фоне
    if (this.projectId) {
      generateAndSaveOperation(
        'edge.updated',
        {
          edgeId: this.edgeId,
          conditions: this.newConditions,
          layerId: this.originalLayerId
        },
        this.projectId,
        this.timelineId,
        this.originalLayerId
      );
    }
  }

  /**
   * Отмена команды - возврат к оригинальным условиям
   */
  undo(): void {
    this.graphStore = useGraphStore.getState();
    this.graphStore.updateEdge(this.edgeId, {conditions: this.originalConditions});

    // Сохраняем изменения в IndexedDB
    this.graphStore.saveToDb();

    // Генерируем операцию для undo
    if (this.projectId) {
      generateAndSaveOperation(
        'edge.updated.undo',
        {
          edgeId: this.edgeId,
          conditions: this.originalConditions,
          layerId: this.originalLayerId
        },
        this.projectId,
        this.timelineId,
        this.originalLayerId
      );
    }
  }

  /**
   * Повтор команды - применение новых условий
   */
  redo(): void {
    this.execute();
  }

  /**
   * Получение метаданных для отображения в истории
   */
  getMetadata(): CommandMetadata {
    return {
      timestamp: Date.now(),
      description: `Изменение условий связи ${this.edgeId}`,
      details: {
        edgeId: this.edgeId,
        conditionsCount: this.newConditions.length
      }
    };
  }

  /**
   * Получение идентификатора слоя, к которому относится команда
   */
  getLayerId(): string {
    return this.originalLayerId;
  }
}
