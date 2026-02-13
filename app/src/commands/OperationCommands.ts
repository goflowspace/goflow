import {useGraphStore} from '../store/useGraphStore';
import {useOperationsStore} from '../store/useOperationsStore';
import {VariableOperation} from '../types/variables';
import {Command} from './CommandInterface';
import {generateAndSaveOperation} from './operationUtils';

// --- Команды для управления операциями ---

/**
 * Команда для создания новой операции в нарративном узле
 */
export class CreateOperationCommand implements Command {
  private nodeId: string;
  private operation: VariableOperation;
  private projectId: string | undefined;
  private timelineId: string;

  constructor(nodeId: string, operation: VariableOperation, projectId?: string) {
    this.nodeId = nodeId;
    this.operation = operation;
    this.projectId = projectId;
    this.timelineId = useGraphStore.getState().currentTimelineId;
  }

  execute(): void {
    const graphStore = useGraphStore.getState();
    const {currentGraphId, layers} = graphStore;
    const layer = layers[currentGraphId];
    const node = layer?.nodes[this.nodeId];

    if (node?.type === 'narrative') {
      const updatedOperations = [...(node.operations || []), this.operation];
      const updatedNode = {...node, operations: updatedOperations};
      graphStore.updateNodeWithOperations(this.nodeId, updatedNode);

      if (this.projectId) {
        generateAndSaveOperation('operation.created', {nodeId: this.nodeId, operation: this.operation}, this.projectId, this.timelineId, currentGraphId);
      }
    }
  }

  undo(): void {
    const graphStore = useGraphStore.getState();
    const {currentGraphId, layers} = graphStore;
    const layer = layers[currentGraphId];
    const node = layer?.nodes[this.nodeId];

    if (node?.type === 'narrative') {
      const updatedOperations = (node.operations || []).filter((op) => op.id !== this.operation.id);
      const updatedNode = {...node, operations: updatedOperations};
      graphStore.updateNodeWithOperations(this.nodeId, updatedNode);

      if (this.projectId) {
        generateAndSaveOperation('operation.created.undo', {nodeId: this.nodeId, operationId: this.operation.id}, this.projectId, this.timelineId, currentGraphId);
      }
    }
  }

  redo(): void {
    this.execute();
  }
}

/**
 * Команда для обновления существующей операции
 */
export class UpdateOperationCommand implements Command {
  private nodeId: string;
  private operationId: string;
  private updates: Partial<VariableOperation>;
  private originalOperation: VariableOperation | undefined;
  private projectId: string | undefined;
  private timelineId: string;

  constructor(nodeId: string, operationId: string, updates: Partial<VariableOperation>, projectId?: string) {
    this.nodeId = nodeId;
    this.operationId = operationId;
    this.updates = updates;
    this.projectId = projectId;
    this.timelineId = useGraphStore.getState().currentTimelineId;

    const graphStore = useGraphStore.getState();
    const {currentGraphId, layers} = graphStore;
    const layer = layers[currentGraphId];
    const node = layer?.nodes[this.nodeId];
    if (node?.type === 'narrative') {
      this.originalOperation = (node.operations || []).find((op) => op.id === this.operationId);
    }
  }

  execute(): void {
    if (!this.originalOperation) return;

    const graphStore = useGraphStore.getState();
    const {currentGraphId, layers} = graphStore;
    const layer = layers[currentGraphId];
    const node = layer?.nodes[this.nodeId];

    if (node?.type === 'narrative') {
      const updatedOperations = (node.operations || []).map((op) => (op.id === this.operationId ? {...op, ...this.updates} : op));
      const updatedNode = {...node, operations: updatedOperations};
      graphStore.updateNodeWithOperations(this.nodeId, updatedNode);

      if (this.projectId) {
        generateAndSaveOperation('operation.updated', {nodeId: this.nodeId, operationId: this.operationId, updates: this.updates}, this.projectId, this.timelineId, currentGraphId);
      }
    }
  }

  undo(): void {
    if (!this.originalOperation) return;

    const graphStore = useGraphStore.getState();
    const {currentGraphId, layers} = graphStore;
    const layer = layers[currentGraphId];
    const node = layer?.nodes[this.nodeId];

    if (node?.type === 'narrative') {
      const updatedOperations = (node.operations || []).map((op) => (op.id === this.operationId ? this.originalOperation! : op));
      const updatedNode = {...node, operations: updatedOperations};
      graphStore.updateNodeWithOperations(this.nodeId, updatedNode);

      if (this.projectId) {
        const undoUpdates = Object.keys(this.updates).reduce((acc, key) => {
          acc[key] = this.originalOperation![key as keyof VariableOperation];
          return acc;
        }, {} as any);

        generateAndSaveOperation('operation.updated.undo', {nodeId: this.nodeId, operationId: this.operationId, updates: undoUpdates}, this.projectId, this.timelineId, currentGraphId);
      }
    }
  }

  redo(): void {
    this.execute();
  }
}

/**
 * Команда для переключения состояния enabled операции
 */
export class ToggleOperationCommand implements Command {
  private nodeId: string;
  private operationId: string;
  private originalValue: boolean | undefined;
  private projectId: string | undefined;
  private timelineId: string;

  constructor(nodeId: string, operationId: string, projectId?: string) {
    this.nodeId = nodeId;
    this.operationId = operationId;
    this.projectId = projectId;
    this.timelineId = useGraphStore.getState().currentTimelineId;

    const graphStore = useGraphStore.getState();
    const {currentGraphId, layers} = graphStore;
    const layer = layers[currentGraphId];
    const node = layer?.nodes[this.nodeId];
    if (node?.type === 'narrative') {
      const operation = (node.operations || []).find((op) => op.id === this.operationId);
      if (operation) {
        this.originalValue = operation.enabled;
      }
    }
  }

  execute(): void {
    if (this.originalValue === undefined) return;

    const graphStore = useGraphStore.getState();
    const {currentGraphId, layers} = graphStore;
    const layer = layers[currentGraphId];
    const node = layer?.nodes[this.nodeId];

    if (node?.type === 'narrative') {
      // Получаем текущее состояние операции и инвертируем его
      const currentOperation = (node.operations || []).find((op) => op.id === this.operationId);
      if (!currentOperation) return;

      const newValue = !currentOperation.enabled;
      const updatedOperations = (node.operations || []).map((op) => (op.id === this.operationId ? {...op, enabled: newValue} : op));
      const updatedNode = {...node, operations: updatedOperations};
      graphStore.updateNodeWithOperations(this.nodeId, updatedNode);

      if (this.projectId) {
        generateAndSaveOperation('operation.updated', {nodeId: this.nodeId, operationId: this.operationId, updates: {enabled: newValue}}, this.projectId, this.timelineId, currentGraphId);
      }
    }
  }

  undo(): void {
    if (this.originalValue === undefined) return;

    const graphStore = useGraphStore.getState();
    const {currentGraphId, layers} = graphStore;
    const layer = layers[currentGraphId];
    const node = layer?.nodes[this.nodeId];

    if (node?.type === 'narrative') {
      const updatedOperations = (node.operations || []).map((op) => (op.id === this.operationId ? {...op, enabled: this.originalValue ?? false} : op));
      const updatedNode = {...node, operations: updatedOperations};
      graphStore.updateNodeWithOperations(this.nodeId, updatedNode);

      if (this.projectId) {
        generateAndSaveOperation(
          'operation.updated.undo',
          {nodeId: this.nodeId, operationId: this.operationId, updates: {enabled: this.originalValue}},
          this.projectId,
          this.timelineId,
          currentGraphId
        );
      }
    }
  }

  redo(): void {
    // При повторе мы должны инвертировать текущее значение, а не исходное
    if (this.originalValue === undefined) return;

    const graphStore = useGraphStore.getState();
    const {currentGraphId, layers} = graphStore;
    const layer = layers[currentGraphId];
    const node = layer?.nodes[this.nodeId];

    if (node?.type === 'narrative') {
      const currentOperation = (node.operations || []).find((op) => op.id === this.operationId);
      if (currentOperation) {
        const newValue = !currentOperation.enabled;
        const updatedOperations = (node.operations || []).map((op) => (op.id === this.operationId ? {...op, enabled: newValue} : op));
        const updatedNode = {...node, operations: updatedOperations};
        graphStore.updateNodeWithOperations(this.nodeId, updatedNode);

        if (this.projectId) {
          generateAndSaveOperation('operation.updated', {nodeId: this.nodeId, operationId: this.operationId, updates: {enabled: newValue}}, this.projectId, this.timelineId, currentGraphId);
        }
      }
    }
  }
}

/**
 * Команда для переключения состояния enabled всех операций в узле
 */
export class ToggleAllOperationsCommand implements Command {
  private nodeId: string;
  private originalStates: {id: string; enabled: boolean}[] = [];
  private newState: boolean;
  private projectId: string | undefined;
  private timelineId: string;

  constructor(nodeId: string, newState: boolean, projectId?: string) {
    this.nodeId = nodeId;
    this.newState = newState;
    this.projectId = projectId;

    const graphStore = useGraphStore.getState();
    this.timelineId = graphStore.currentTimelineId;
    const {currentGraphId, layers} = graphStore;
    const layer = layers[currentGraphId];
    const node = layer?.nodes[this.nodeId];
    if (node?.type === 'narrative' && node.operations) {
      this.originalStates = node.operations.map((op) => ({id: op.id, enabled: op.enabled}));
    }
  }

  execute(): void {
    const graphStore = useGraphStore.getState();
    const {currentGraphId, layers} = graphStore;
    const layer = layers[currentGraphId];
    const node = layer?.nodes[this.nodeId];

    if (node?.type === 'narrative') {
      const updatedOperations = (node.operations || []).map((op) => ({...op, enabled: this.newState}));
      const updatedNode = {...node, operations: updatedOperations};
      graphStore.updateNodeWithOperations(this.nodeId, updatedNode);

      if (this.projectId) {
        generateAndSaveOperation('operations.toggled', {nodeId: this.nodeId, enabled: this.newState}, this.projectId, this.timelineId, currentGraphId);
      }
    }
  }

  undo(): void {
    const graphStore = useGraphStore.getState();
    const {currentGraphId, layers} = graphStore;
    const layer = layers[currentGraphId];
    const node = layer?.nodes[this.nodeId];

    if (node?.type === 'narrative') {
      const updatedOperations = (node.operations || []).map((op) => {
        const original = this.originalStates.find((s) => s.id === op.id);
        return {...op, enabled: original ? original.enabled : op.enabled};
      });
      const updatedNode = {...node, operations: updatedOperations};
      graphStore.updateNodeWithOperations(this.nodeId, updatedNode);

      if (this.projectId) {
        generateAndSaveOperation('operations.toggled.undo', {nodeId: this.nodeId, originalStates: this.originalStates}, this.projectId, this.timelineId, currentGraphId);
      }
    }
  }

  redo(): void {
    this.execute();
  }
}

/**
 * Команда для удаления операции из нарративного узла
 */
export class DeleteOperationCommand implements Command {
  private operationId: string;
  private nodeId: string | null = null;
  private deletedOperation: any = null; // Сохраняем операцию для undo
  private projectId: string | undefined;
  private timelineId: string;

  constructor(operationId: string, projectId?: string) {
    this.operationId = operationId;
    this.projectId = projectId;
    this.timelineId = useGraphStore.getState().currentTimelineId;
    // Находим узел и операцию при создании команды
    const {layers, currentGraphId} = useGraphStore.getState();
    const graph = layers[currentGraphId];

    for (const nodeId in graph.nodes) {
      const node = graph.nodes[nodeId];
      if (node.type === 'narrative' && node.operations) {
        const op = node.operations.find((o: any) => o.id === this.operationId);
        if (op) {
          this.nodeId = nodeId;
          this.deletedOperation = {...op}; // Сохраняем копию
          break;
        }
      }
    }
  }

  execute(): void {
    if (!this.nodeId) return;

    const {updateNodeData} = useGraphStore.getState();
    const {layers, currentGraphId} = useGraphStore.getState();
    const graph = layers[currentGraphId];
    const node = graph.nodes[this.nodeId];

    if (node.type === 'narrative' && node.operations) {
      const newOperations = node.operations.filter((op: any) => op.id !== this.operationId);
      const updatedNode = {...node, operations: newOperations};
      useGraphStore.getState().updateNodeWithOperations(this.nodeId, updatedNode);

      if (this.projectId) {
        generateAndSaveOperation('operation.deleted', {nodeId: this.nodeId, operationId: this.operationId}, this.projectId, this.timelineId, currentGraphId);
      }
    }
  }

  undo(): void {
    if (!this.nodeId || !this.deletedOperation) return;

    const {updateNodeData} = useGraphStore.getState();
    const {layers, currentGraphId} = useGraphStore.getState();
    const graph = layers[currentGraphId];
    const node = graph.nodes[this.nodeId];

    if (node.type === 'narrative') {
      const newOperations = [...(node.operations || []), this.deletedOperation];
      // Сортируем операции по order, если он есть
      if (this.deletedOperation.order !== undefined) {
        newOperations.sort((a, b) => a.order - b.order);
      }
      const updatedNode = {...node, operations: newOperations};
      useGraphStore.getState().updateNodeWithOperations(this.nodeId, updatedNode);

      if (this.projectId) {
        generateAndSaveOperation('operation.deleted.undo', {nodeId: this.nodeId, operation: this.deletedOperation}, this.projectId, this.timelineId, currentGraphId);
      }
    }
  }

  redo(): void {
    this.execute();
  }
}
