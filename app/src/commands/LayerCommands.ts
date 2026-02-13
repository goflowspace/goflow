import {NodeChange} from '@xyflow/react';
import {nanoid} from 'nanoid';

import {getNotificationManager} from '@components/Notifications';

import {useCanvasStore} from '../store/useCanvasStore';
import {useGraphStore} from '../store/useGraphStore';
import {Layer, LayerNode} from '../types/nodes';
import {Command} from './CommandInterface';
import {generateAndSaveOperation} from './operationUtils';

/**
 * Команда для создания слоя
 */
export class CreateLayerCommand implements Command {
  private layerId: string;
  private layerNode: LayerNode;
  private graphStore: ReturnType<typeof useGraphStore.getState>;
  private canvasStore: ReturnType<typeof useCanvasStore.getState>;
  private layerNumberBeforeCreation: number; // Layer number before this layer was created
  private originalLayerId: string;
  private projectId?: string;
  private timelineId: string;

  /**
   * @param position Позиция нового слоя
   * @param name Имя слоя (опционально)
   * @param projectId ID проекта (опционально)
   */
  constructor(position: {x: number; y: number}, name: string = '', projectId?: string) {
    this.layerId = nanoid();
    this.graphStore = useGraphStore.getState();
    this.canvasStore = useCanvasStore.getState();
    this.layerNumberBeforeCreation = this.graphStore.lastLayerNumber;
    this.originalLayerId = this.graphStore.currentGraphId;
    this.projectId = projectId;
    this.timelineId = this.graphStore.currentTimelineId;

    this.layerNode = {
      id: this.layerId,
      type: 'layer',
      coordinates: position,
      name: name,
      startingNodes: [],
      endingNodes: []
    };
  }

  execute(): void {
    // Получаем текущий активный слой
    const currentGraphId = this.graphStore.currentGraphId;

    // Явно указываем, что родительский слой - это текущий активный слой
    this.layerNode.parentLayerId = currentGraphId;

    // Создаем слой
    this.graphStore.addLayer(this.layerNode);
    this.canvasStore.selectNode(this.layerId);

    // Получаем обновленное состояние слоя после addLayer (с сгенерированным именем)
    const updatedGraphStore = useGraphStore.getState();
    const createdLayer = updatedGraphStore.layers[this.layerId];

    // Обновляем layerNode с сгенерированным именем
    if (createdLayer) {
      this.layerNode = {
        ...this.layerNode,
        name: createdLayer.name
      };
    }

    // Генерируем и сохраняем операцию в фоне с обновленными данными
    if (this.projectId) {
      generateAndSaveOperation(
        'layer.added',
        {
          layerId: this.layerId,
          layerNode: this.layerNode,
          parentLayerId: currentGraphId
        },
        this.projectId,
        this.timelineId,
        currentGraphId
      );
    }
  }

  /**
   * Проверяет, безопасно ли выполнить отмену создания слоя
   */
  public canSafelyUndo(): boolean {
    // Получаем актуальное состояние графа
    const graphStore = useGraphStore.getState();
    const currentGraphId = graphStore.currentGraphId;

    // Проверяем, находится ли пользователь в созданном слое
    if (currentGraphId === this.layerId) {
      console.warn(`Невозможно отменить создание слоя, так как вы находитесь в этом слое (${currentGraphId})`);

      // Находим родительский слой для перехода
      const parentLayerId = this.layerNode.parentLayerId || 'root';
      const parentName = this.getLayerName(parentLayerId) || parentLayerId;

      // Формируем путь в зависимости от ID слоя
      const path = parentLayerId === 'root' ? `/${this.projectId}/editor` : `/${this.projectId}/editor/${parentLayerId}`;

      getNotificationManager().showErrorWithNavigation(
        `Can't undo layer creation because you are currently in this layer. Please navigate to the parent layer "${parentName}" and try again.`,
        'Open parent layer',
        path
      );

      return false;
    }

    return true;
  }

  /**
   * Получает название слоя по его ID
   */
  private getLayerName(layerId: string): string | null {
    const graphStore = useGraphStore.getState();

    // Если это корневой слой
    if (layerId === 'root') {
      return 'Main layer';
    }

    // Получаем слой по ID
    const layer = graphStore.layers[layerId];
    if (layer && layer.name) {
      return layer.name;
    }

    // Ищем слой в списке узлов всех слоев
    for (const currentLayerId in graphStore.layers) {
      const currentLayer = graphStore.layers[currentLayerId];
      const layerNode = currentLayer.nodes[layerId];

      if (layerNode && layerNode.type === 'layer' && 'name' in layerNode) {
        return layerNode.name;
      }
    }

    return null;
  }

  undo(): void {
    this.graphStore.removeNode(this.layerId);

    // Удаляем слой из списка слоев
    const updatedLayers = {...this.graphStore.layers};
    delete updatedLayers[this.layerId];

    // Обновляем состояние
    useGraphStore.setState({
      layers: updatedLayers,
      lastLayerNumber: this.layerNumberBeforeCreation
    });

    // Генерируем операцию для undo
    if (this.projectId) {
      generateAndSaveOperation(
        'layer.added.undo',
        {
          layerId: this.layerId,
          parentLayerId: this.originalLayerId
        },
        this.projectId,
        this.timelineId,
        this.originalLayerId
      );
    }
  }

  redo(): void {
    // При повторном создании слоя нужно убедиться, что создаем его в актуальном контексте

    // Запоминаем текущий слой перед выполнением команды
    const currentGraphId = this.graphStore.currentGraphId;

    // Создаем обновленный слой с правильным родителем
    const newLayerNode = {
      ...this.layerNode,
      parentLayerId: currentGraphId // Устанавливаем текущий активный слой как родитель
    };

    // Создаем новый слой
    this.graphStore.addLayer(newLayerNode);
    this.canvasStore.selectNode(this.layerId);
  }

  getType(): string {
    return 'CreateLayer';
  }
}

/**
 * Команда для удаления слоя
 */
export class DeleteLayerCommand implements Command {
  private layerId: string;
  private layerNode: LayerNode | null = null;
  private nestedGraph: Layer | null = null;
  private graphStore: ReturnType<typeof useGraphStore.getState>;
  private projectId?: string;
  private timelineId: string;
  private childLayerIds: string[] = []; // ID всех дочерних слоев
  private layerMetadata: Record<string, any> = {}; // Сохраняем метаданные слоя и его дочерних слоев

  /**
   * @param layerId ID слоя для удаления
   */
  constructor(layerId: string, projectId?: string) {
    this.layerId = layerId;
    this.graphStore = useGraphStore.getState();
    this.projectId = projectId;
    this.timelineId = this.graphStore.currentTimelineId;

    // Сохраняем данные слоя и его содержимое для возможности отмены
    const currentGraph = this.graphStore.layers[this.graphStore.currentGraphId];

    if (currentGraph && currentGraph.nodes[layerId]) {
      this.layerNode = currentGraph.nodes[layerId] as LayerNode;

      // Сохраняем вложенный граф слоя
      this.nestedGraph = this.graphStore.layers[layerId] ? {...this.graphStore.layers[layerId]} : null;

      // Получаем ID всех дочерних слоев
      this.collectChildLayerIds(layerId);

      // Сохраняем метаданные слоя и его дочерних слоев
      this.layerMetadata = {
        [layerId]: this.graphStore.layerMetadata[layerId]
      };

      // Сохраняем метаданные всех дочерних слоев
      for (const childId of this.childLayerIds) {
        if (this.graphStore.layerMetadata[childId]) {
          this.layerMetadata[childId] = this.graphStore.layerMetadata[childId];
        }
      }
    }
  }

  /**
   * Рекурсивно собирает ID всех дочерних слоев
   */
  private collectChildLayerIds(layerId: string) {
    const layer = this.graphStore.layers[layerId];
    if (!layer) return;

    // Найдем все узлы типа layer в этом слое
    Object.values(layer.nodes)
      .filter((node) => node.type === 'layer')
      .forEach((node) => {
        const childLayerId = node.id;
        this.childLayerIds.push(childLayerId);

        // Рекурсивно обрабатываем дочерние слои
        this.collectChildLayerIds(childLayerId);
      });
  }

  execute(): void {
    // Если мы в этом слое, возвращаемся в родительский слой
    if (this.graphStore.currentGraphId === this.layerId) {
      const parentLayerId = this.graphStore.layers[this.layerId]?.parentLayerId || 'root';

      // Проверяем, существует ли родительский слой
      if (parentLayerId !== 'root' && !this.graphStore.layers[parentLayerId]) {
        // Если родительский слой не существует, переходим в root
        this.graphStore.enterGraph('root');
        console.warn(`Родительский слой ${parentLayerId} не существует, переходим в корневой слой.`);
      } else {
        // Если родительский слой существует, переходим в него
        this.graphStore.enterGraph(parentLayerId);
      }
    }

    // Удаляем слой
    if (this.layerNode) {
      // Находим родительский слой
      const parentLayerId = this.layerNode.parentLayerId || 'root';

      // Вызываем removeNode, который частично обновляет родительский слой
      this.graphStore.removeNode(this.layerId);

      // Удаляем слой из списка слоев
      const updatedLayers = {...this.graphStore.layers};
      delete updatedLayers[this.layerId];

      // Удаляем также все дочерние слои
      for (const childId of this.childLayerIds) {
        delete updatedLayers[childId];
      }

      // Удаляем метаданные слоя
      const updatedLayerMetadata = {...this.graphStore.layerMetadata};
      delete updatedLayerMetadata[this.layerId];

      // Удаляем метаданные дочерних слоев
      for (const childId of this.childLayerIds) {
        delete updatedLayerMetadata[childId];
      }

      // Дополнительно: полностью удаляем узел слоя из родительского слоя
      if (parentLayerId !== 'root' && updatedLayers[parentLayerId]) {
        const parentLayer = updatedLayers[parentLayerId];

        // Создаем новую версию nodes без удаляемого узла слоя
        const updatedParentNodes = {...parentLayer.nodes};
        delete updatedParentNodes[this.layerId];

        // Обновляем nodeIds родительского слоя, удаляя ID слоя
        const updatedParentNodeIds = parentLayer.nodeIds.filter((id) => id !== this.layerId);

        // Обновляем родительский слой
        updatedLayers[parentLayerId] = {
          ...parentLayer,
          nodes: updatedParentNodes,
          nodeIds: updatedParentNodeIds
        };
      } else if (parentLayerId === 'root') {
        // Специальный случай для корневого слоя
        const rootLayer = updatedLayers['root'];
        if (rootLayer) {
          // Создаем новую версию nodes без удаляемого узла слоя
          const updatedRootNodes = {...rootLayer.nodes};
          delete updatedRootNodes[this.layerId];

          // Обновляем nodeIds корневого слоя
          const updatedRootNodeIds = rootLayer.nodeIds.filter((id) => id !== this.layerId);

          // Обновляем корневой слой
          updatedLayers['root'] = {
            ...rootLayer,
            nodes: updatedRootNodes,
            nodeIds: updatedRootNodeIds
          };
        }
      }

      // Обновляем состояние
      useGraphStore.setState({
        layers: updatedLayers,
        layerMetadata: updatedLayerMetadata
      });

      // Явно сохраняем изменения в localStorage
      this.graphStore.saveToDb();

      // Генерируем и сохраняем операцию в фоне
      if (this.projectId) {
        generateAndSaveOperation(
          'layer.deleted',
          {
            layerId: this.layerId,
            childLayerIds: this.childLayerIds
          },
          this.projectId,
          this.timelineId,
          this.layerNode.parentLayerId || 'root'
        );
      }
    }
  }

  /**
   * Проверяет, безопасно ли выполнить отмену удаления слоя
   */
  public canSafelyUndo(): boolean {
    // Получаем актуальное состояние графа
    const graphStore = useGraphStore.getState();
    const currentGraphId = graphStore.currentGraphId;

    // Проверяем, находится ли пользователь в одном из удаленных дочерних слоев,
    // независимо от того, был ли слой активным при удалении
    if (this.childLayerIds.includes(currentGraphId)) {
      console.warn(`Невозможно отменить удаление слоя, так как вы находитесь в его дочернем слое ${currentGraphId}, который также был удален`);

      // Формируем путь для корневого слоя
      const rootPath = `/${this.projectId}/editor`;

      getNotificationManager().showErrorWithNavigation(
        `Can't undo layer deletion because you are currently in its child layer, which was also deleted. Please navigate to the main layer or another existing layer and try again.`,
        'Open main layer',
        rootPath
      );

      return false;
    }

    // Проверяем, находится ли пользователь в самом удаленном слое
    if (currentGraphId === this.layerId) {
      console.warn(`Невозможно отменить удаление слоя, так как вы пытаетесь восстановить слой, в котором сейчас находитесь (${currentGraphId})`);

      // Находим родительский слой для перехода
      const parentLayerId = this.layerNode?.parentLayerId || 'root';
      const parentName = this.getLayerName(parentLayerId) || parentLayerId;

      // Формируем путь в зависимости от ID слоя
      const path = parentLayerId === 'root' ? `/${this.projectId}/editor` : `/${this.projectId}/editor/${parentLayerId}`;

      getNotificationManager().showErrorWithNavigation(
        `Can't undo layer deletion because you are trying to restore the layer you are currently in. Please navigate to the parent layer "${parentName}" and try again.`,
        'Open parent layer',
        path
      );

      return false;
    }

    return true;
  }

  /**
   * Получает название слоя по его ID
   */
  private getLayerName(layerId: string): string | null {
    const graphStore = useGraphStore.getState();

    // Если это корневой слой
    if (layerId === 'root') {
      return 'Main layer';
    }

    // Получаем слой по ID
    const layer = graphStore.layers[layerId];
    if (layer && layer.name) {
      return layer.name;
    }

    // Ищем слой в списке узлов всех слоев
    for (const currentLayerId in graphStore.layers) {
      const currentLayer = graphStore.layers[currentLayerId];
      const layerNode = currentLayer.nodes[layerId];

      if (layerNode && layerNode.type === 'layer' && 'name' in layerNode) {
        return layerNode.name;
      }
    }

    return null;
  }

  undo(): void {
    // Проверка безопасности отмены уже выполняется в CommandHistory
    // Метод canSafelyUndo используется там же

    if (!this.layerNode || !this.nestedGraph) return;

    // Восстанавливаем узел слоя в родительском графе
    this.graphStore.addLayer(this.layerNode);

    // Восстанавливаем содержимое слоя (вложенный граф)
    const updatedLayers = {
      ...this.graphStore.layers,
      [this.layerId]: this.nestedGraph
    };

    // Восстанавливаем метаданные слоя и его дочерних слоев
    const updatedMetadata = {
      ...this.graphStore.layerMetadata,
      ...this.layerMetadata // Добавляем сохраненные метаданные
    };

    // Убедимся, что слой правильно восстановлен в родительском слое
    const parentLayerId = this.layerNode.parentLayerId;
    if (parentLayerId && parentLayerId !== 'root' && updatedLayers[parentLayerId]) {
      const parentLayer = updatedLayers[parentLayerId];

      // Проверяем, не добавлен ли уже слой в nodeIds родительского слоя
      if (!parentLayer.nodeIds.includes(this.layerId)) {
        // Восстанавливаем ID слоя в списке nodeIds родителя
        const updatedParentNodeIds = [...parentLayer.nodeIds, this.layerId];

        // Обновляем родительский слой с восстановленным ID
        updatedLayers[parentLayerId] = {
          ...parentLayer,
          nodeIds: updatedParentNodeIds
        };
      }
    }

    // Обновляем состояние
    useGraphStore.setState({
      layers: updatedLayers,
      layerMetadata: updatedMetadata
    });

    // Явно сохраняем изменения в localStorage
    this.graphStore.saveToDb();

    // Генерируем операцию для undo
    if (this.projectId) {
      generateAndSaveOperation(
        'layer.deleted.undo',
        {
          layerId: this.layerId,
          layerNode: this.layerNode,
          nestedGraph: this.nestedGraph,
          childLayerIds: this.childLayerIds,
          layerMetadata: this.layerMetadata
        },
        this.projectId,
        this.timelineId,
        this.layerNode.parentLayerId || 'root'
      );
    }
  }

  redo(): void {
    // Если мы в этом слое, возвращаемся в родительский слой
    if (this.graphStore.currentGraphId === this.layerId) {
      const parentLayerId = this.graphStore.layers[this.layerId]?.parentLayerId || 'root';
      this.graphStore.enterGraph(parentLayerId);
    }

    // Удаляем слой
    if (this.layerNode) {
      // Находим родительский слой
      const parentLayerId = this.layerNode.parentLayerId || 'root';

      // Вызываем removeNode, который частично обновляет родительский слой
      this.graphStore.removeNode(this.layerId);

      // Удаляем слой из списка слоев
      const updatedLayers = {...this.graphStore.layers};
      delete updatedLayers[this.layerId];

      // Удаляем также все дочерние слои
      for (const childId of this.childLayerIds) {
        delete updatedLayers[childId];
      }

      // Удаляем метаданные слоя
      const updatedLayerMetadata = {...this.graphStore.layerMetadata};
      delete updatedLayerMetadata[this.layerId];

      // Удаляем метаданные дочерних слоев
      for (const childId of this.childLayerIds) {
        delete updatedLayerMetadata[childId];
      }

      // Дополнительно: полностью удаляем узел слоя из родительского слоя
      if (parentLayerId !== 'root' && updatedLayers[parentLayerId]) {
        const parentLayer = updatedLayers[parentLayerId];

        // Создаем новую версию nodes без удаляемого узла слоя
        const updatedParentNodes = {...parentLayer.nodes};
        delete updatedParentNodes[this.layerId];

        // Обновляем nodeIds родительского слоя, удаляя ID слоя
        const updatedParentNodeIds = parentLayer.nodeIds.filter((id) => id !== this.layerId);

        // Обновляем родительский слой
        updatedLayers[parentLayerId] = {
          ...parentLayer,
          nodes: updatedParentNodes,
          nodeIds: updatedParentNodeIds
        };
      } else if (parentLayerId === 'root') {
        // Специальный случай для корневого слоя
        const rootLayer = updatedLayers['root'];
        if (rootLayer) {
          // Создаем новую версию nodes без удаляемого узла слоя
          const updatedRootNodes = {...rootLayer.nodes};
          delete updatedRootNodes[this.layerId];

          // Обновляем nodeIds корневого слоя
          const updatedRootNodeIds = rootLayer.nodeIds.filter((id) => id !== this.layerId);

          // Обновляем корневой слой
          updatedLayers['root'] = {
            ...rootLayer,
            nodes: updatedRootNodes,
            nodeIds: updatedRootNodeIds
          };
        }
      }

      // Обновляем состояние
      useGraphStore.setState({
        layers: updatedLayers,
        layerMetadata: updatedLayerMetadata
      });

      // Явно сохраняем изменения в localStorage
      this.graphStore.saveToDb();
    }
  }

  getType(): string {
    return 'DeleteLayer';
  }
}

/**
 * Команда для редактирования полей слоя (имя или описание)
 */
export class EditLayerCommand implements Command {
  private layerId: string;
  private oldName: string;
  private newName: string;
  private oldDescription: string | undefined;
  private newDescription: string | undefined;
  private graphStore: ReturnType<typeof useGraphStore.getState>;
  private projectId?: string;
  private timelineId: string;

  /**
   * @param layerId ID слоя для редактирования
   * @param newName Новое имя слоя
   * @param newDescription Новое описание слоя (опционально)
   */
  constructor(layerId: string, newName: string, newDescription?: string, projectId?: string) {
    this.layerId = layerId;
    this.newName = newName;
    this.newDescription = newDescription;
    this.graphStore = useGraphStore.getState();
    this.projectId = projectId;
    this.timelineId = this.graphStore.currentTimelineId;

    // Сохраняем старые данные для возможности отмены
    const layer = this.graphStore.layers[layerId];
    this.oldName = layer.name;
    this.oldDescription = layer.description;
  }

  execute(): void {
    // Обновляем имя
    this.graphStore.updateLayerName(this.layerId, this.newName);

    // Обновляем описание, если оно было передано
    if (this.newDescription !== undefined) {
      this.graphStore.updateLayerDescription(this.layerId, this.newDescription);
    }

    // Явно сохраняем изменения в localStorage
    this.graphStore.saveToDb();

    // Обновляем состояние реакт-компонентов - создаем новый рендер для React Go Flow
    this._forceReactRerender();

    // Генерируем и сохраняем операцию в фоне
    if (this.projectId) {
      generateAndSaveOperation(
        'layer.updated',
        {
          layerId: this.layerId,
          oldName: this.oldName,
          newName: this.newName,
          oldDescription: this.oldDescription,
          newDescription: this.newDescription
        },
        this.projectId,
        this.timelineId,
        this.graphStore.currentGraphId
      );
    }
  }

  undo(): void {
    // Восстанавливаем имя
    this.graphStore.updateLayerName(this.layerId, this.oldName);

    // Восстанавливаем описание
    if (this.oldDescription !== undefined) {
      this.graphStore.updateLayerDescription(this.layerId, this.oldDescription);
    }

    // Явно сохраняем изменения в localStorage
    this.graphStore.saveToDb();

    // Обновляем состояние реакт-компонентов
    this._forceReactRerender();

    // Генерируем операцию для undo
    if (this.projectId) {
      generateAndSaveOperation(
        'layer.updated.undo',
        {
          layerId: this.layerId,
          oldName: this.newName,
          newName: this.oldName,
          oldDescription: this.newDescription,
          newDescription: this.oldDescription
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
    return 'EditLayer';
  }

  /**
   * Принудительно обновляет React-компоненты через обновление состояния канваса
   */
  private _forceReactRerender(): void {
    // Находим родительский слой, где может отображаться узел
    const parentLayerId = this.graphStore.layers[this.layerId]?.parentLayerId;

    // Смотрим, в каком слое мы находимся
    const currentGraphId = this.graphStore.currentGraphId;

    // Если мы находимся в родительском слое, обновляем ноды канваса
    if (parentLayerId && currentGraphId === parentLayerId) {
      // Получаем текущее состояние канваса
      const canvasStore = useCanvasStore.getState();
      const currentNodes = canvasStore.nodes;

      // Находим узел, который нужно обновить
      const nodeIndex = currentNodes.findIndex((node) => node.id === this.layerId);

      if (nodeIndex !== -1) {
        // Создаем новый массив с обновленной нодой (вызовет перерисовку в React)
        const updatedNodes = [...currentNodes];

        // Обновляем свойство data ноды, чтобы она перерисовалась
        updatedNodes[nodeIndex] = {
          ...updatedNodes[nodeIndex],
          data: {
            ...updatedNodes[nodeIndex].data,
            // Добавляем специальное поле, которое заставит React перерисовать компонент
            _forceUpdate: Date.now()
          }
        };

        // Устанавливаем обновленные ноды в канвас
        canvasStore.setNodes(updatedNodes);
      }
    }
  }
}

/**
 * Команда для перемещения слоя
 */
export class MoveLayerCommand implements Command {
  private layerId: string;
  private oldPosition: {x: number; y: number};
  private newPosition: {x: number; y: number};
  private graphStore: ReturnType<typeof useGraphStore.getState>;
  private projectId?: string;
  private timelineId: string;

  /**
   * @param layerId ID слоя для перемещения
   * @param newPosition Новая позиция слоя
   */
  constructor(layerId: string, newPosition: {x: number; y: number}, projectId?: string) {
    this.layerId = layerId;
    this.newPosition = newPosition;
    this.graphStore = useGraphStore.getState();
    this.projectId = projectId;
    this.timelineId = this.graphStore.currentTimelineId;

    // Сохраняем старую позицию для возможности отмены
    const currentGraph = this.graphStore.layers[this.graphStore.currentGraphId];
    const node = currentGraph.nodes[layerId] as LayerNode;
    this.oldPosition = {...node.coordinates};
  }

  execute(): void {
    const changes: NodeChange[] = [
      {
        id: this.layerId,
        type: 'position',
        position: this.newPosition
      }
    ];
    this.graphStore.onNodesChange(changes);

    // Генерируем и сохраняем операцию в фоне
    if (this.projectId) {
      generateAndSaveOperation(
        'layer.moved',
        {
          layerId: this.layerId,
          oldPosition: this.oldPosition,
          newPosition: this.newPosition
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
        id: this.layerId,
        type: 'position',
        position: this.oldPosition
      }
    ];
    this.graphStore.onNodesChange(changes);

    // Генерируем операцию для undo
    if (this.projectId) {
      generateAndSaveOperation(
        'layer.moved.undo',
        {
          layerId: this.layerId,
          oldPosition: this.newPosition,
          newPosition: this.oldPosition
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
    return 'MoveLayer';
  }
}
