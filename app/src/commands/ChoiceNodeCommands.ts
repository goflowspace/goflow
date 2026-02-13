// Команды для работы с узлами выбора
import {Connection, Edge, NodeChange} from '@xyflow/react';
import {nanoid} from 'nanoid';
import {CHOICE_NODE_HEIGHT_CONSTANTS} from 'src/utils/constants';

import {useCanvasStore} from '../store/useCanvasStore';
import {useGraphStore} from '../store/useGraphStore';
import {ChoiceNode, LayerNode, Link} from '../types/nodes';
import {Command} from './CommandInterface';
import {generateAndSaveOperation} from './operationUtils';

// Экспортируем классы команд
export class CreateChoiceNodeCommand implements Command {
  // Реализация будет добавлена
  public readonly choiceId: string;
  private choiceNode: ChoiceNode;
  private graphStore: ReturnType<typeof useGraphStore.getState>;
  private canvasStore: ReturnType<typeof useCanvasStore.getState>;
  private projectId?: string;
  private timelineId: string;

  constructor(position: {x: number; y: number}, choiceText: string = '', projectId?: string) {
    this.choiceId = nanoid();
    this.graphStore = useGraphStore.getState();
    this.canvasStore = useCanvasStore.getState();
    this.projectId = projectId;
    this.timelineId = this.graphStore.currentTimelineId;

    this.choiceNode = {
      id: this.choiceId,
      type: 'choice',
      coordinates: position,
      data: {
        text: choiceText,
        height: CHOICE_NODE_HEIGHT_CONSTANTS.BASE_HEIGHT
      }
    };
  }

  execute(): void {
    this.graphStore.addNode(this.choiceNode);
    this.canvasStore.selectNode(this.choiceId);

    // Генерируем и сохраняем операцию в фоне
    if (this.projectId) {
      generateAndSaveOperation(
        'node.added',
        {
          layerId: this.graphStore.currentGraphId,
          node: this.choiceNode,
          nodeType: 'choice'
        },
        this.projectId,
        this.timelineId,
        this.graphStore.currentGraphId
      );
    }
  }

  undo(): void {
    // Получаем актуальное состояние
    this.graphStore = useGraphStore.getState();
    const currentGraphId = this.graphStore.currentGraphId;
    const currentLayer = this.graphStore.layers[currentGraphId];

    if (!currentLayer) return;

    // Создаем обновленный слой без созданного узла
    const {[this.choiceId]: _, ...updatedNodes} = currentLayer.nodes;
    const updatedNodeIds = currentLayer.nodeIds.filter((id) => id !== this.choiceId);

    // Обновляем состояние графа
    const updatedLayer = {
      ...currentLayer,
      nodes: updatedNodes,
      nodeIds: updatedNodeIds
    };

    // Обновляем слои
    this.graphStore.layers = {
      ...this.graphStore.layers,
      [currentGraphId]: updatedLayer
    };

    // Обновляем состояние канваса: убираем узел
    const canvasNodes = this.canvasStore.nodes.filter((node) => node.id !== this.choiceId);
    this.canvasStore.setNodes(canvasNodes);

    // Сохраняем изменения в localStorage
    this.graphStore.saveToDb();

    // Генерируем операцию для undo
    if (this.projectId) {
      generateAndSaveOperation(
        'node.added.undo',
        {
          nodeId: this.choiceId,
          layerId: currentGraphId,
          nodeType: 'choice'
        },
        this.projectId,
        this.timelineId,
        currentGraphId
      );
    }
  }

  redo(): void {
    this.execute();
  }
}

export class DeleteChoiceNodeCommand implements Command {
  private choiceId: string;
  private node: ChoiceNode | null = null;
  private connectedLinks: Link[] = [];
  private graphStore: ReturnType<typeof useGraphStore.getState>;
  private projectId?: string;
  private timelineId: string;

  constructor(choiceId: string, projectId?: string) {
    this.choiceId = choiceId;
    this.graphStore = useGraphStore.getState();
    this.projectId = projectId;
    this.timelineId = this.graphStore.currentTimelineId;

    // Сохраняем данные узла и его связи для возможности отмены
    const currentGraph = this.graphStore.layers[this.graphStore.currentGraphId];

    if (currentGraph && currentGraph.nodes[choiceId]) {
      this.node = {...currentGraph.nodes[choiceId]} as ChoiceNode;

      // Сохраняем связи узла
      Object.values(currentGraph.edges).forEach((edge) => {
        if (edge.startNodeId === choiceId || edge.endNodeId === choiceId) {
          this.connectedLinks.push({...edge});
        }
      });
    }
  }

  execute(): void {
    if (this.node) {
      this.graphStore.removeNode(this.choiceId);

      // Генерируем и сохраняем операцию в фоне
      if (this.projectId) {
        generateAndSaveOperation(
          'node.deleted',
          {
            nodeId: this.choiceId,
            layerId: this.graphStore.currentGraphId,
            nodeType: 'choice'
          },
          this.projectId,
          this.timelineId,
          this.graphStore.currentGraphId
        );
      }
    }
  }

  undo(): void {
    if (!this.node) return;

    // Восстанавливаем узел
    this.graphStore.addNode(this.node);

    // Восстанавливаем связи
    this.connectedLinks.forEach((link) => {
      this.graphStore.addEdge(link);
    });

    // Генерируем операцию для undo
    if (this.projectId) {
      generateAndSaveOperation(
        'node.deleted.undo',
        {
          nodeId: this.choiceId,
          layerId: this.graphStore.currentGraphId,
          node: this.node,
          connectedLinks: this.connectedLinks
        },
        this.projectId,
        this.timelineId,
        this.graphStore.currentGraphId
      );
    }
  }

  redo(): void {
    this.execute();
  }
}

export class EditChoiceNodeTextCommand implements Command {
  private nodeId: string;
  private oldText: string;
  private newText: string;
  private graphStore: ReturnType<typeof useGraphStore.getState>;
  private projectId?: string;
  private timelineId: string;

  constructor(nodeId: string, newText: string, projectId?: string) {
    this.nodeId = nodeId;
    this.newText = newText;
    this.graphStore = useGraphStore.getState();
    this.projectId = projectId;
    this.timelineId = this.graphStore.currentTimelineId;

    // Сохраняем старый текст для возможности отмены
    const currentGraph = this.graphStore.layers[this.graphStore.currentGraphId];
    const node = currentGraph.nodes[nodeId] as ChoiceNode;
    this.oldText = node.data.text;
  }

  execute(): void {
    this.graphStore.updateNodeData(this.nodeId, {text: this.newText});

    // Генерируем и сохраняем операцию в фоне
    if (this.projectId) {
      generateAndSaveOperation(
        'node.updated',
        {
          nodeId: this.nodeId,
          layerId: this.graphStore.currentGraphId,
          oldData: {text: this.oldText},
          newData: {text: this.newText},
          nodeType: 'choice'
        },
        this.projectId,
        this.timelineId,
        this.graphStore.currentGraphId
      );
    }
  }

  undo(): void {
    this.graphStore.updateNodeData(this.nodeId, {text: this.oldText});

    // Генерируем операцию для undo
    if (this.projectId) {
      generateAndSaveOperation(
        'node.updated.undo',
        {
          nodeId: this.nodeId,
          layerId: this.graphStore.currentGraphId,
          oldData: {text: this.newText},
          newData: {text: this.oldText},
          nodeType: 'choice'
        },
        this.projectId,
        this.timelineId,
        this.graphStore.currentGraphId
      );
    }
  }

  redo(): void {
    this.execute();
  }
}

export class MoveChoiceNodeCommand implements Command {
  private nodeId: string;
  private oldPosition: {x: number; y: number};
  private newPosition: {x: number; y: number};
  private graphStore: ReturnType<typeof useGraphStore.getState>;
  private projectId?: string;
  private timelineId: string;

  constructor(nodeId: string, newPosition: {x: number; y: number}, projectId?: string) {
    this.nodeId = nodeId;
    this.newPosition = newPosition;
    this.graphStore = useGraphStore.getState();
    this.projectId = projectId;
    this.timelineId = this.graphStore.currentTimelineId;

    // Сохраняем старую позицию для возможности отмены
    const currentGraph = this.graphStore.layers[this.graphStore.currentGraphId];
    const node = currentGraph.nodes[nodeId] as ChoiceNode;
    this.oldPosition = {...node.coordinates};
  }

  execute(): void {
    const changes: NodeChange[] = [
      {
        id: this.nodeId,
        type: 'position',
        position: this.newPosition
      }
    ];
    this.graphStore.onNodesChange(changes);

    // Генерируем и сохраняем операцию в фоне
    if (this.projectId) {
      generateAndSaveOperation(
        'node.moved',
        {
          nodeId: this.nodeId,
          layerId: this.graphStore.currentGraphId,
          oldPosition: this.oldPosition,
          newPosition: this.newPosition,
          nodeType: 'choice'
        },
        this.projectId,
        this.timelineId,
        this.graphStore.currentGraphId
      );
    }
  }

  undo(): void {
    const changes: NodeChange[] = [
      {
        id: this.nodeId,
        type: 'position',
        position: this.oldPosition
      }
    ];
    this.graphStore.onNodesChange(changes);

    // Генерируем операцию для undo
    if (this.projectId) {
      generateAndSaveOperation(
        'node.moved.undo',
        {
          nodeId: this.nodeId,
          layerId: this.graphStore.currentGraphId,
          oldPosition: this.newPosition,
          newPosition: this.oldPosition,
          nodeType: 'choice'
        },
        this.projectId,
        this.timelineId,
        this.graphStore.currentGraphId
      );
    }
  }

  redo(): void {
    this.execute();
  }
}

export class ConnectChoiceNodeCommand implements Command {
  private connection: Connection;
  private edgeId: string | null = null;
  private graphStore: ReturnType<typeof useGraphStore.getState>;
  private canvasStore: ReturnType<typeof useCanvasStore.getState>;
  private projectId?: string;
  private timelineId: string;
  private beforeEdges: Edge[] = []; // Добавляем для отслеживания состояния до создания связи

  constructor(connection: Connection, projectId?: string) {
    this.connection = connection;
    this.graphStore = useGraphStore.getState();
    this.canvasStore = useCanvasStore.getState();
    this.projectId = projectId;
    this.timelineId = this.graphStore.currentTimelineId;
    // Сохраняем текущий список ребер до выполнения команды
    this.beforeEdges = [...this.canvasStore.edges];
  }

  execute(): void {
    // Выполняем соединение через GraphStore
    this.graphStore.onConnect(this.connection);

    // Ждем небольшую задержку, чтобы синхронизация успела сработать
    setTimeout(() => {
      // Получаем актуальное состояние canvasStore
      const currentCanvasStore = useCanvasStore.getState();

      // Ищем новое созданное ребро в CanvasStore
      const newEdges = currentCanvasStore.edges.filter((edge) => !this.beforeEdges.some((prevEdge) => prevEdge.id === edge.id));

      if (newEdges.length > 0) {
        // Ищем ребро соответствующее нашему соединению
        const matchingEdge = newEdges.find((edge) => edge.source === this.connection.source && edge.target === this.connection.target);

        if (matchingEdge) {
          // Сохраняем информацию о ребре для будущих операций
          this.edgeId = matchingEdge.id;
        } else if (newEdges.length === 1) {
          // Если точное соответствие не найдено, но добавлено только одно ребро, используем его
          this.edgeId = newEdges[0].id;
        }
      }

      // Генерируем и сохраняем операцию в фоне
      if (this.edgeId && this.projectId) {
        const currentGraphStore = useGraphStore.getState();
        const currentLayer = currentGraphStore.layers[currentGraphStore.currentGraphId];
        const edge = currentLayer?.edges[this.edgeId];

        if (edge) {
          generateAndSaveOperation(
            'edge.added',
            {
              edge: {
                id: this.edgeId,
                startNodeId: this.connection.source!,
                endNodeId: this.connection.target!,
                sourceHandle: this.connection.sourceHandle,
                targetHandle: this.connection.targetHandle,
                conditions: []
              },
              layerId: currentGraphStore.currentGraphId
            },
            this.projectId,
            this.timelineId,
            currentGraphStore.currentGraphId
          );
        }
      }
    }, 50);
  }

  undo(): void {
    if (this.edgeId) {
      // Удаляем связь
      const edgeChanges = [
        {
          id: this.edgeId,
          type: 'remove' as const
        }
      ];
      this.graphStore.onEdgesChange(edgeChanges);

      // Генерируем операцию для undo
      if (this.projectId) {
        generateAndSaveOperation(
          'edge.added.undo',
          {
            edgeId: this.edgeId,
            layerId: this.graphStore.currentGraphId
          },
          this.projectId,
          this.timelineId,
          this.graphStore.currentGraphId
        );
      }
    }
  }

  redo(): void {
    this.execute();
  }
}
