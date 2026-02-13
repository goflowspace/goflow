import {NodeChange} from '@xyflow/react';
import {nanoid} from 'nanoid';

import {useCanvasStore} from '../store/useCanvasStore';
import {useGraphStore} from '../store/useGraphStore';
import {Link, NoteNode} from '../types/nodes';
import {Command} from './CommandInterface';
import {generateAndSaveOperation} from './operationUtils';

/**
 * Команда для создания заметки
 */
export class CreateNoteCommand implements Command {
  private noteId: string;
  private noteData: NoteNode;
  private graphStore: ReturnType<typeof useGraphStore.getState>;
  private canvasStore: ReturnType<typeof useCanvasStore.getState>;
  private projectId?: string;
  private timelineId: string;

  /**
   * @param position Позиция новой заметки
   * @param text Текст заметки (опционально)
   * @param color Цвет заметки (опционально)
   * @param projectId ID проекта (опционально)
   */
  constructor(position: {x: number; y: number}, text: string = '', color?: string, projectId?: string) {
    this.noteId = nanoid();
    this.graphStore = useGraphStore.getState();
    this.canvasStore = useCanvasStore.getState();
    this.projectId = projectId;
    this.timelineId = this.graphStore.currentTimelineId;

    this.noteData = {
      id: this.noteId,
      type: 'note',
      coordinates: position,
      data: {
        text: text,
        color: color || '#fffad1' // Желтый по умолчанию
      }
    };
  }

  execute(): void {
    // Добавляем заметку в граф
    this.graphStore.addNode(this.noteData);

    // Выбираем созданную заметку
    this.canvasStore.selectNode(this.noteId);

    // Генерируем и сохраняем операцию в фоне
    if (this.projectId) {
      generateAndSaveOperation(
        'node.added',
        {
          layerId: this.graphStore.currentGraphId,
          node: this.noteData,
          nodeType: 'note'
        },
        this.projectId,
        this.timelineId,
        this.graphStore.currentGraphId
      );
    }
  }

  undo(): void {
    // Удаляем созданную заметку
    this.graphStore.removeNode(this.noteId);

    // Обновляем Canvas
    const updatedNodes = this.canvasStore.nodes.filter((node) => node.id !== this.noteId);
    this.canvasStore.setNodes(updatedNodes);

    // Генерируем операцию для undo
    if (this.projectId) {
      generateAndSaveOperation(
        'node.added.undo',
        {
          nodeId: this.noteId,
          layerId: this.graphStore.currentGraphId,
          nodeType: 'note'
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

  getType(): string {
    return 'CreateNote';
  }
}

/**
 * Команда для редактирования текста заметки
 */
export class EditNoteCommand implements Command {
  private noteId: string;
  private oldText: string;
  private newText: string;
  private graphStore: ReturnType<typeof useGraphStore.getState>;
  private projectId?: string;
  private timelineId: string;

  /**
   * @param noteId ID заметки для редактирования
   * @param newText Новый текст заметки
   * @param projectId ID проекта
   */
  constructor(noteId: string, newText: string, projectId?: string) {
    this.noteId = noteId;
    this.newText = newText;
    this.graphStore = useGraphStore.getState();
    this.projectId = projectId;
    this.timelineId = this.graphStore.currentTimelineId;

    // Сохраняем старый текст для возможности отмены
    const currentGraph = this.graphStore.layers[this.graphStore.currentGraphId];
    const noteNode = currentGraph.nodes[noteId] as NoteNode;
    this.oldText = noteNode.data.text;
  }

  execute(): void {
    this.graphStore.updateNodeData(this.noteId, {text: this.newText});

    // Генерируем и сохраняем операцию в фоне
    if (this.projectId) {
      generateAndSaveOperation(
        'node.updated',
        {
          nodeId: this.noteId,
          layerId: this.graphStore.currentGraphId,
          oldData: {text: this.oldText},
          newData: {text: this.newText},
          nodeType: 'note',
          updateType: 'text'
        },
        this.projectId,
        this.timelineId,
        this.graphStore.currentGraphId
      );
    }
  }

  undo(): void {
    this.graphStore.updateNodeData(this.noteId, {text: this.oldText});

    // Генерируем операцию для undo
    if (this.projectId) {
      generateAndSaveOperation(
        'node.updated.undo',
        {
          nodeId: this.noteId,
          layerId: this.graphStore.currentGraphId,
          oldData: {text: this.newText},
          newData: {text: this.oldText},
          nodeType: 'note',
          updateType: 'text'
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

  getType(): string {
    return 'EditNote';
  }
}

/**
 * Команда для изменения цвета заметки
 */
export class ChangeNoteColorCommand implements Command {
  private noteId: string;
  private oldColor: string;
  private newColor: string;
  private graphStore: ReturnType<typeof useGraphStore.getState>;
  private projectId?: string;
  private timelineId: string;

  /**
   * @param noteId ID заметки
   * @param newColor Новый цвет
   * @param projectId ID проекта
   */
  constructor(noteId: string, newColor: string, projectId?: string) {
    this.noteId = noteId;
    this.newColor = newColor;
    this.graphStore = useGraphStore.getState();
    this.projectId = projectId;
    this.timelineId = this.graphStore.currentTimelineId;

    // Сохраняем старый цвет для возможности отмены
    const currentGraph = this.graphStore.layers[this.graphStore.currentGraphId];
    const noteNode = currentGraph.nodes[noteId] as NoteNode;
    this.oldColor = noteNode.data.color || '#fffad1';
  }

  execute(): void {
    // Получаем текущий текст заметки
    const currentNoteData = this.graphStore.layers[this.graphStore.currentGraphId].nodes[this.noteId] as NoteNode;
    const currentText = currentNoteData.data.text;

    // Обновляем данные с сохранением текста и установкой нового цвета
    this.graphStore.updateNodeData(this.noteId, {
      text: currentText,
      color: this.newColor
    } as any); // Используем as any, поскольку интерфейс updateNodeData поддерживает только text и title

    // Генерируем и сохраняем операцию в фоне
    if (this.projectId) {
      generateAndSaveOperation(
        'node.updated',
        {
          nodeId: this.noteId,
          layerId: this.graphStore.currentGraphId,
          oldData: {color: this.oldColor},
          newData: {color: this.newColor},
          nodeType: 'note',
          updateType: 'color'
        },
        this.projectId,
        this.timelineId,
        this.graphStore.currentGraphId
      );
    }
  }

  undo(): void {
    // Получаем текущий текст заметки
    const currentNoteData = this.graphStore.layers[this.graphStore.currentGraphId].nodes[this.noteId] as NoteNode;
    const currentText = currentNoteData.data.text;

    // Восстанавливаем старый цвет, сохраняя текущий текст
    this.graphStore.updateNodeData(this.noteId, {
      text: currentText,
      color: this.oldColor
    } as any); // Используем as any, поскольку интерфейс updateNodeData поддерживает только text и title

    // Генерируем операцию для undo
    if (this.projectId) {
      generateAndSaveOperation(
        'node.updated.undo',
        {
          nodeId: this.noteId,
          layerId: this.graphStore.currentGraphId,
          oldData: {color: this.newColor},
          newData: {color: this.oldColor},
          nodeType: 'note',
          updateType: 'color'
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

  getType(): string {
    return 'ChangeNoteColor';
  }
}

/**
 * Команда для перемещения заметки
 */
export class MoveNoteCommand implements Command {
  private noteId: string;
  private oldPosition: {x: number; y: number};
  private newPosition: {x: number; y: number};
  private graphStore: ReturnType<typeof useGraphStore.getState>;
  private canvasStore: ReturnType<typeof useCanvasStore.getState>;
  private projectId?: string;
  private timelineId: string;

  /**
   * @param noteId ID заметки для перемещения
   * @param newPosition Новая позиция
   * @param projectId ID проекта
   */
  constructor(noteId: string, newPosition: {x: number; y: number}, projectId?: string) {
    this.noteId = noteId;
    this.newPosition = newPosition;
    this.graphStore = useGraphStore.getState();
    this.canvasStore = useCanvasStore.getState();
    this.projectId = projectId;
    this.timelineId = this.graphStore.currentTimelineId;

    // Сохраняем старую позицию для возможности отмены
    const currentGraph = this.graphStore.layers[this.graphStore.currentGraphId];
    const node = currentGraph.nodes[noteId] as NoteNode;

    if (node) {
      this.oldPosition = {...node.coordinates};
    } else {
      this.oldPosition = {x: 0, y: 0};
    }
  }

  execute(): void {
    // Обновляем данные в графе
    const changes: NodeChange[] = [
      {
        id: this.noteId,
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
          nodeId: this.noteId,
          layerId: this.graphStore.currentGraphId,
          oldPosition: this.oldPosition,
          newPosition: this.newPosition,
          nodeType: 'note'
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
        id: this.noteId,
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
          nodeId: this.noteId,
          layerId: this.graphStore.currentGraphId,
          oldPosition: this.newPosition,
          newPosition: this.oldPosition,
          nodeType: 'note'
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

  getType(): string {
    return 'MoveNote';
  }
}

/**
 * Команда для удаления заметки
 */
export class DeleteNoteCommand implements Command {
  private noteId: string;
  private note: NoteNode | null = null;
  private connectedLinks: Link[] = [];
  private graphStore: ReturnType<typeof useGraphStore.getState>;
  private canvasStore: ReturnType<typeof useCanvasStore.getState>;
  private projectId?: string;
  private timelineId: string;

  /**
   * @param noteId ID заметки для удаления
   * @param projectId ID проекта
   */
  constructor(noteId: string, projectId?: string) {
    this.noteId = noteId;
    this.graphStore = useGraphStore.getState();
    this.canvasStore = useCanvasStore.getState();
    this.projectId = projectId;
    this.timelineId = this.graphStore.currentTimelineId;

    // Сохраняем данные заметки и ее связи для возможности отмены
    const currentGraph = this.graphStore.layers[this.graphStore.currentGraphId];

    if (currentGraph && currentGraph.nodes[noteId]) {
      // Делаем глубокую копию заметки, чтобы сохранить все её свойства для операции undo
      this.note = JSON.parse(JSON.stringify(currentGraph.nodes[noteId])) as NoteNode;

      // Сохраняем связи, связанные с заметкой
      Object.values(currentGraph.edges).forEach((edge) => {
        if (edge.startNodeId === noteId || edge.endNodeId === noteId) {
          // Делаем копию связи
          this.connectedLinks.push(JSON.parse(JSON.stringify(edge)));
        }
      });
    }
  }

  execute(): void {
    if (this.note) {
      // Удаляем заметку из хранилища
      this.graphStore.removeNode(this.noteId);

      // Обновляем Canvas напрямую для немедленного отображения изменений
      const updatedNodes = this.canvasStore.nodes.filter((node) => node.id !== this.noteId);
      this.canvasStore.setNodes(updatedNodes);

      // Удаляем также связанные ребра из канваса
      const updatedEdges = this.canvasStore.edges.filter((edge) => edge.source !== this.noteId && edge.target !== this.noteId);
      this.canvasStore.setEdges(updatedEdges);

      // Генерируем и сохраняем операцию в фоне
      if (this.projectId) {
        generateAndSaveOperation(
          'node.deleted',
          {
            nodeId: this.noteId,
            layerId: this.graphStore.currentGraphId,
            nodeType: 'note'
          },
          this.projectId,
          this.timelineId,
          this.graphStore.currentGraphId
        );
      }
    }
  }

  undo(): void {
    if (!this.note) return;

    // Получаем актуальное состояние хранилища
    this.graphStore = useGraphStore.getState();
    this.canvasStore = useCanvasStore.getState();

    // Восстанавливаем заметку
    this.graphStore.addNode(this.note);

    // Восстанавливаем связи
    this.connectedLinks.forEach((link) => {
      this.graphStore.addEdge(link);
    });

    // Прямое обновление канваса для отображения восстановленной заметки
    const nodeExists = this.canvasStore.nodes.some((node) => node.id === this.noteId);
    if (!nodeExists) {
      // Создаем визуальное представление для канваса
      const canvasNode = {
        id: this.noteId,
        position: this.note.coordinates,
        type: 'note',
        data: this.note.data,
        selected: false
      };
      this.canvasStore.setNodes([...this.canvasStore.nodes, canvasNode]);
    }

    // Восстанавливаем ребра на канвасе
    const edgeIdsToRestore = this.connectedLinks.map((link) => link.id);
    const edgesToRestore = this.connectedLinks.map((link) => ({
      id: link.id,
      source: link.startNodeId,
      target: link.endNodeId,
      sourceHandle: link.sourceHandle,
      targetHandle: link.targetHandle,
      type: 'default'
    }));

    // Фильтруем уже существующие ребра
    const newEdges = edgesToRestore.filter((edge) => !this.canvasStore.edges.some((canvasEdge) => canvasEdge.id === edge.id));

    if (newEdges.length > 0) {
      this.canvasStore.setEdges([...this.canvasStore.edges, ...newEdges]);
    }

    // Генерируем операцию для undo
    if (this.projectId) {
      generateAndSaveOperation(
        'node.deleted.undo',
        {
          node: this.note,
          connectedLinks: this.connectedLinks,
          layerId: this.graphStore.currentGraphId
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

  getType(): string {
    return 'DeleteNote';
  }
}
