import {ProjectDataService} from '@services/projectDataService';
import {Entity, EntityType} from '@types-folder/entities';
import type {ChoiceNode, Layer, LayerNode, Link, NarrativeNode, NoteNode, SkeletonNode} from '@types-folder/nodes';
import {Connection, EdgeChange, NodeChange, Viewport} from '@xyflow/react';
import {produce} from 'immer';
import {nanoid} from 'nanoid';
import {EnterMethodType, trackLayerEnter} from 'src/services/analytics';
import {api} from 'src/services/api';
import {clearOperations, loadProject, saveProject} from 'src/services/dbService';
import {createEmptyProjectState} from 'src/utils/projectStateHelpers';
import {create} from 'zustand';
import {devtools, subscribeWithSelector} from 'zustand/middleware';

import {useTimelinesStore} from '@store/useTimelinesStore';

import {copyNodes, cutNodes, pasteNodes} from '../clipboard/clipboardOperations';
import {getCommandManager} from '../commands/CommandManager';
import {generateAndSaveOperation} from '../commands/operationUtils';
import {updateParentEndingAndStartingNodes} from '../utils/updateParentEndingAndStartingNodes';
import {useCanvasStore} from './useCanvasStore';
import {useProjectStore} from './useProjectStore';
import {useUIStore} from './useUIStore';
import {useVariablesStore} from './useVariablesStore';

// Интерфейс для хранения состояния панелей слоя
interface LayerPanelState {
  startPanelOpen: boolean;
  endPanelOpen: boolean;
}

// Интерфейс для хранения viewport слоя
interface ViewportState {
  x: number;
  y: number;
  zoom: number;
}

// Интерфейс для метаданных слоя, хранимых в localStorage
interface LayerMetadata {
  panelState: LayerPanelState;
  viewport: ViewportState;
}

export interface GraphStore {
  cursor: {
    x: number;
    y: number;
  };
  layers: Record<string, Layer>;
  currentGraphId: string;
  currentTimelineId: string;
  hasLoadedFromStorage: boolean;

  // Сущности проекта
  entities: Entity[];
  entityTypes: EntityType[];
  entitiesLoading: boolean;
  entitiesError: string | null;
  entitiesLoaded: boolean;

  copiedNode: (ChoiceNode | NarrativeNode | NoteNode | LayerNode | SkeletonNode) | null;
  copiedNodes: (ChoiceNode | NarrativeNode | NoteNode | LayerNode | SkeletonNode)[];
  copiedEdges: Link[];
  layerMetadata: Record<string, LayerMetadata>;
  layerPanelsState: Record<string, LayerPanelState>;
  lastLayerNumber: number;
  lastLayerEnterMethod: EnterMethodType | null;

  // Метаданные для операций вырезания и вставки
  _layerContentsForPaste: Record<string, any> | null;
  _originalCoordinates: Record<string, {x: number; y: number}> | null;
  _cutNodes: boolean;

  // Таймер для debounced сохранения при изменении данных узлов
  _updateNodeDataTimeout: number | null;

  updateLayerName: (layerId: string, name: string) => void;
  updateLayerDescription: (layerId: string, description: string) => void;
  updateNodeData: (id: string, data: {text?: string; title?: string; attachedEntities?: string[]}) => void;
  addNode: (node: ChoiceNode | NarrativeNode | NoteNode) => void;
  addLayer: (node: LayerNode) => void;
  removeNode: (nodeId: string, skipOperationGeneration?: boolean) => void;
  copyNode: () => void;
  cutNode: () => void;
  pasteNode: () => void;
  setCopiedNodes: (nodes: (ChoiceNode | NarrativeNode | NoteNode | LayerNode | SkeletonNode)[], edges: Link[]) => void;

  // Новые функции для работы с состоянием панелей слоев
  setLayerPanelState: (layerId: string, panelType: 'start' | 'end', isOpen: boolean) => void;
  getLayerPanelState: (layerId: string) => LayerPanelState;

  // Функции для работы с позицией вьюпорта слоев
  setLayerViewport: (layerId: string, viewport: Viewport) => void;
  getLayerViewport: (layerId: string) => ViewportState | null;

  addEdge: (edge: Link) => void;

  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  updateNodePositions: (layerId: string, changes: NodeChange[]) => void;

  enterGraph: (graphId: string) => void;

  saveToDb: () => Promise<void>;
  loadFromDb: () => Promise<void>;

  updateEdge: (edgeId: string, updates: Partial<Link>) => void;

  // Функция для удаления условий, использующих определенную переменную
  deleteConditionsWithVariable: (variableId: string) => void;

  // Функция для обновления узла с операциями
  updateNodeWithOperations: (nodeId: string, updatedNode: NarrativeNode) => void;

  // Функция для обновления целого слоя (используется при обновлении операций)
  updateLayerWithOperations: (layerId: string, updatedLayer: Layer) => void;

  // Добавляем новые методы
  setLayerEnterMethod: (method: EnterMethodType) => void;
  clearLayerEnterMethod: () => void;

  // Методы для работы с метаданными буфера обмена
  setCutMetadata: (layerContents: Record<string, any>, originalCoordinates: Record<string, {x: number; y: number}>) => void;
  clearCutMetadata: () => void;

  // Новые методы для работы с бекендом
  loadFromServer: (projectId: string) => Promise<void>;
  saveToServer: (projectId: string) => Promise<void>;
  forceSaveToServer: (projectId: string) => Promise<boolean>;

  // Методы для работы с сущностями
  loadEntities: (projectId: string, includeOriginalImages?: boolean) => Promise<void>;
  loadEntityTypes: (projectId: string) => Promise<void>;

  // Инициализация или сброс состояния
  initialize: (initialState: Partial<GraphStore>) => void;

  // Функция для обновления концовок с синхронизацией
  updateParentEndingAndStartingNodesWithSync: (graphId: string, layers: Record<string, Layer>) => Record<string, Layer>;

  // Функции для работы с таймлайнами
  switchToTimeline: (timelineId: string) => void;
  getCurrentTimelineData: () => {layers: Record<string, Layer>; metadata: Record<string, LayerMetadata>; lastLayerNumber: number} | null;
}

// Добавляем константу для ID базового таймлайна после существующих констант DEFAULT_PANEL_STATE и DEFAULT_LAYER_METADATA
const DEFAULT_VIEWPORT: ViewportState = {x: 0, y: 0, zoom: 1};
const DEFAULT_PANEL_STATE: LayerPanelState = {startPanelOpen: true, endPanelOpen: true};
const DEFAULT_LAYER_METADATA: LayerMetadata = {
  panelState: DEFAULT_PANEL_STATE,
  viewport: DEFAULT_VIEWPORT
};

// Вспомогательная функция для получения или создания слоя
const getOrCreateLayer = (layers: Record<string, Layer>, layerId: string, updateLayers?: (newLayers: Record<string, Layer>) => void): Layer => {
  const existingLayer = layers[layerId];
  if (existingLayer) {
    return existingLayer;
  }

  console.warn(`GraphStore: Layer with ID ${layerId} not found, creating empty layer`);
  const newLayer: Layer = {
    type: 'layer',
    id: layerId,
    name: layerId,
    depth: 0,
    nodeIds: [],
    nodes: {},
    edges: {}
  };

  // Если передана функция обновления, используем её для сохранения нового слоя
  if (updateLayers) {
    const updatedLayers = {...layers, [layerId]: newLayer};
    updateLayers(updatedLayers);
  }

  return newLayer;
};

export const useGraphStore = create<GraphStore>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      cursor: {
        x: 0,
        y: 0
      },
      ...createEmptyProjectState(),
      currentGraphId: 'root',
      currentTimelineId: '', // Будет установлен при загрузке таймлайнов
      hasLoadedFromStorage: false,

      // Инициализация сущностей
      entities: [],
      entityTypes: [],
      entitiesLoading: false,
      entitiesError: null,
      entitiesLoaded: false,

      copiedNode: null,
      copiedNodes: [],
      copiedEdges: [],
      layerPanelsState: {},
      lastLayerNumber: 0,
      lastLayerEnterMethod: null,

      // Метаданные для операций вырезания и вставки
      _layerContentsForPaste: null,
      _originalCoordinates: null,
      _cutNodes: false,

      // Таймер для debounced сохранения
      _updateNodeDataTimeout: null,

      updateNodeData: (id, data) => {
        const {currentGraphId, layers} = get();
        const graph = layers[currentGraphId];

        // Если граф не существует, ничего не делаем
        if (!graph) {
          console.warn(`GraphStore: Graph with ID ${currentGraphId} not found in updateNodeData`);
          return;
        }

        const node = graph.nodes[id];
        if (!node) return;

        let updatedNode: NarrativeNode | ChoiceNode | NoteNode;

        if (node.type === 'narrative') {
          updatedNode = {
            ...node,
            data: {
              ...(node.data || {title: '', text: ''}),
              ...data
            }
          };
        } else if (node.type === 'choice') {
          updatedNode = {
            ...node,
            data: {
              ...(node.data || {text: ''}),
              ...data
            }
          };
        } else if (node.type === 'note') {
          updatedNode = {
            ...node,
            data: {
              ...(node.data || {text: ''}),
              ...data
            }
          };
        } else {
          return;
        }

        const updatedGraph = {
          ...graph,
          nodes: {
            ...graph.nodes,
            [id]: updatedNode
          }
        };

        let updatedLayers = {
          ...layers,
          [currentGraphId]: updatedGraph
        };

        const parentLayerId = layers[currentGraphId]?.parentLayerId;

        // Обновление для родительского слоя
        if (parentLayerId && layers[parentLayerId]) {
          // Сначала обновляем структуру (start/end ноды), если это необходимо
          const layersWithUpdatedParentStructure = get().updateParentEndingAndStartingNodesWithSync(currentGraphId, updatedLayers);

          // Теперь работаем с обновленными данными
          const parentLayer = layersWithUpdatedParentStructure[parentLayerId];
          const layerNode = parentLayer.nodes[currentGraphId] as LayerNode | undefined;

          if (layerNode) {
            let updatedLayerNode: LayerNode = {...layerNode};

            // Обрабатываем startingNodes
            if (updatedLayerNode.startingNodes && updatedLayerNode.startingNodes.length > 0) {
              const updatedStartingNodes = updatedLayerNode.startingNodes.map((startNode) => {
                if (startNode.id === id) {
                  const nodeType = startNode.type;

                  if (nodeType === 'narrative') {
                    return {
                      ...startNode,
                      data: {
                        title: 'title' in updatedNode.data ? updatedNode.data.title : '',
                        text: updatedNode.data.text
                      }
                    };
                  } else if (nodeType === 'choice') {
                    return {
                      ...startNode,
                      data: {
                        text: updatedNode.data.text
                      }
                    };
                  }
                }
                return startNode;
              });
              updatedLayerNode = {...updatedLayerNode, startingNodes: updatedStartingNodes};
            }

            // Обрабатываем endingNodes
            if (updatedLayerNode.endingNodes && updatedLayerNode.endingNodes.length > 0) {
              const updatedEndingNodes = updatedLayerNode.endingNodes.map((endNode) => {
                if (endNode.id === id) {
                  const nodeType = endNode.type;

                  if (nodeType === 'narrative') {
                    return {
                      ...endNode,
                      data: {
                        title: 'title' in updatedNode.data ? updatedNode.data.title : '',
                        text: updatedNode.data.text
                      }
                    };
                  } else if (nodeType === 'choice') {
                    return {
                      ...endNode,
                      data: {
                        text: updatedNode.data.text
                      }
                    };
                  }
                }
                return endNode;
              });
              updatedLayerNode = {...updatedLayerNode, endingNodes: updatedEndingNodes};
            }

            updatedLayers = {
              ...layersWithUpdatedParentStructure,
              [parentLayerId]: {
                ...parentLayer,
                nodes: {
                  ...parentLayer.nodes,
                  [currentGraphId]: updatedLayerNode
                }
              }
            };
          } else {
            // Если layerNode не найден, все равно используем результат updateParentEndingAndStartingNodes
            updatedLayers = layersWithUpdatedParentStructure;
          }
        } else if (parentLayerId) {
          // Если parentLayerId есть, но самого слоя нет, просто обновляем структуру
          updatedLayers = get().updateParentEndingAndStartingNodesWithSync(currentGraphId, updatedLayers);
        }

        set({layers: updatedLayers});

        // Сохраняем изменения, если были обновления концовок в родительском слое
        if (parentLayerId) {
          // Используем debounced сохранение для частых изменений данных узлов
          const store = get();
          if (store._updateNodeDataTimeout) {
            window.clearTimeout(store._updateNodeDataTimeout);
          }

          const newTimeout = window.setTimeout(() => {
            get().saveToDb();
            set({_updateNodeDataTimeout: null});
          }, 1000); // Сохраняем изменения через 1 секунду после последнего изменения

          set({_updateNodeDataTimeout: newTimeout});
        }
      },

      updateLayerName: (layerId, name) => {
        const {layers} = get();

        if (!layers[layerId]) return;

        // Обновляем сам слой
        const updatedLayers = {
          ...layers,
          [layerId]: {
            ...layers[layerId],
            name
          }
        };

        // Обновляем узел слоя в родительском слое, если такой есть
        const parentLayerId = layers[layerId].parentLayerId;
        if (parentLayerId && updatedLayers[parentLayerId]?.nodes[layerId]) {
          const layerNodeInParent = updatedLayers[parentLayerId].nodes[layerId] as LayerNode;
          updatedLayers[parentLayerId] = {
            ...updatedLayers[parentLayerId],
            nodes: {
              ...updatedLayers[parentLayerId].nodes,
              [layerId]: {
                ...layerNodeInParent,
                name
              }
            }
          };
        }

        set({layers: updatedLayers});
      },

      updateLayerDescription: (layerId, description) => {
        const {layers} = get();

        if (!layers[layerId]) return;

        // Обновляем сам слой
        const updatedLayers = {
          ...layers,
          [layerId]: {
            ...layers[layerId],
            description
          }
        };

        // Обновляем узел слоя в родительском слое, если такой есть
        const parentLayerId = layers[layerId].parentLayerId;
        if (parentLayerId && updatedLayers[parentLayerId]?.nodes[layerId]) {
          const layerNodeInParent = updatedLayers[parentLayerId].nodes[layerId] as LayerNode;
          updatedLayers[parentLayerId] = {
            ...updatedLayers[parentLayerId],
            nodes: {
              ...updatedLayers[parentLayerId].nodes,
              [layerId]: {
                ...layerNodeInParent,
                description
              }
            }
          };
        }

        set({layers: updatedLayers});
      },

      addNode: (node) => {
        const {currentGraphId, layers} = get();
        const graph = getOrCreateLayer(layers, currentGraphId, (newLayers) => {
          set({layers: newLayers});
        });

        console.log('GraphStore: Adding node:', node);
        console.log('GraphStore: Current graph ID:', currentGraphId);
        console.log('GraphStore: Current graph before adding node:', graph);

        const updatedGraph = {
          ...graph,
          nodes: {...graph.nodes, [node.id]: node},
          nodeIds: [...graph.nodeIds, node.id]
        };

        const updatedLayers = {
          ...layers,
          [currentGraphId]: updatedGraph
        };

        const hasParent = layers[currentGraphId]?.parentLayerId;

        const finalLayers = hasParent ? get().updateParentEndingAndStartingNodesWithSync(currentGraphId, updatedLayers) : updatedLayers;

        console.log('GraphStore: Final layers after adding node:', finalLayers);

        set({
          layers: finalLayers
        });

        // Сохраняем снапшот при добавлении узла (для восстановления)
        get().saveToDb();
      },

      addLayer: (node) => {
        const {currentGraphId, layers, lastLayerNumber} = get();

        // Generate a new layer number and name if no name is provided
        const newLayerNumber = lastLayerNumber + 1;
        const generatedName = `Layer ${newLayerNumber}`;

        // Определяем глубину вложенности нового слоя
        // Используем parentLayerId из node, если он есть, или currentGraphId
        const parentId = node.parentLayerId || currentGraphId;

        // Используем getOrCreateLayer для получения или создания родительского слоя
        const parentLayer = getOrCreateLayer(layers, parentId, (newLayers) => {
          set({layers: newLayers});
        });

        const parentDepth = parentLayer.depth ?? 0;
        const newLayerDepth = parentDepth + 1;

        const newLayerNode = {
          ...node,
          name: node.name || generatedName
        };

        const updatedParentLayer = {
          ...parentLayer,
          nodes: {...parentLayer.nodes, [newLayerNode.id]: newLayerNode},
          nodeIds: [...parentLayer.nodeIds, newLayerNode.id]
        };

        const newGraph: Layer = {
          type: 'layer',
          id: node.id,
          parentLayerId: parentId, // Используем parentId, а не currentGraphId
          name: node.name || generatedName,
          depth: newLayerDepth,
          nodeIds: [],
          nodes: {},
          edges: {}
        };

        const updatedLayers = {
          ...get().layers, // Получаем актуальные layers из состояния
          [parentId]: updatedParentLayer,
          [node.id]: newGraph
        };

        set({
          layers: updatedLayers,
          lastLayerNumber: newLayerNumber
        });

        // Сохраняем снапшот при добавлении слоя (для восстановления)
        get().saveToDb();
      },

      addEdge: (edge) => {
        const {currentGraphId, layers} = get();
        const graph = getOrCreateLayer(layers, currentGraphId, (newLayers) => {
          set({layers: newLayers});
        });

        // Используем прямой доступ к canvasStore вместо динамического импорта
        const canvasStore = useCanvasStore.getState();
        const canvasEdges = canvasStore.edges;

        // Проверяем, существует ли уже ребро с такими же source и target
        // Используем any для edge и e из-за несоответствия типов Link и Edge от XYFlow
        const existingEdgeInCanvas = canvasEdges.find((e: any) => {
          return e.source === (edge as any).source && e.target === (edge as any).target;
        });

        if (existingEdgeInCanvas) {
          return; // Если ребро уже существует, не добавляем его снова
        }

        // Добавляем ребро
        const updatedGraph = {
          ...graph,
          edges: {
            ...graph.edges,
            [edge.id]: edge
          }
        };

        set((state) => ({
          layers: {
            ...state.layers,
            [currentGraphId]: updatedGraph
          }
        }));

        // Обновляем родительский слой
        if (graph.parentLayerId) {
          const updatedLayersWithParent = get().updateParentEndingAndStartingNodesWithSync(currentGraphId, get().layers);
          set({layers: updatedLayersWithParent});
        }
      },

      removeNode: (nodeId, skipOperationGeneration = false) => {
        const {currentGraphId, currentTimelineId, layers} = get();
        const currentLayer = layers[currentGraphId];

        // Если слой не существует, ничего не делаем
        if (!currentLayer) {
          console.warn(`GraphStore: Layer with ID ${currentGraphId} not found in removeNode`);
          return;
        }

        const nodeToRemove = currentLayer.nodes[nodeId];

        if (!nodeToRemove) {
          return;
        }

        const isLayerNode = nodeToRemove.type === 'layer';
        const idsToRemove: string[] = [nodeId];

        // Удаляем слой из хранилища слоев, если это был LayerNode
        if (isLayerNode) {
          delete layers[nodeToRemove.id];
        }

        // Находим все ребра, связанные с удаляемым узлом (как входящие, так и исходящие)
        const connectedEdges = Object.entries(currentLayer.edges).filter(([_, edge]) => edge.startNodeId === nodeId || edge.endNodeId === nodeId);
        const updatedEdges = Object.fromEntries(Object.entries(currentLayer.edges).filter(([_, edge]) => edge.startNodeId !== nodeId && edge.endNodeId !== nodeId));

        // Генерируем операции удаления связей для бэкенда (только если не пропускаем генерацию)
        if (connectedEdges.length > 0 && !skipOperationGeneration) {
          const autoSaveStatus = ProjectDataService.getStatus();
          const currentProjectId = autoSaveStatus.currentProjectId;

          if (currentProjectId) {
            for (const [edgeId, edge] of connectedEdges) {
              generateAndSaveOperation(
                'edge.deleted',
                {
                  edgeId: edgeId,
                  edge: edge,
                  layerId: currentGraphId
                },
                currentProjectId,
                currentTimelineId,
                currentGraphId
              );
            }
          }
        }

        // Обновляем текущий слой без удаленных узлов и связанных ребер
        const updatedCurrentLayer: Layer = {
          ...currentLayer,
          nodes: Object.fromEntries(Object.entries(currentLayer.nodes).filter(([id]) => !idsToRemove.includes(id))),
          nodeIds: currentLayer.nodeIds.filter((id) => !idsToRemove.includes(id)),
          edges: updatedEdges
        };

        let updatedLayers = {
          ...layers,
          [currentGraphId]: updatedCurrentLayer
        };

        // Обновляем родительский слой через синхронизированную функцию
        const hasParent = currentLayer.parentLayerId;
        if (hasParent) {
          // Используем синхронизированную функцию вместо ручного обновления
          updatedLayers = get().updateParentEndingAndStartingNodesWithSync(currentGraphId, updatedLayers);

          // Дополнительно удаляем связи в родительском слое, которые ссылались на удаленные узлы
          const parentId = currentLayer.parentLayerId!;
          const parentLayer = updatedLayers[parentId];

          const filteredEdges = Object.fromEntries(
            Object.entries(parentLayer.edges).filter(([, edge]) => !idsToRemove.includes(edge.sourceHandle ?? '') && !idsToRemove.includes(edge.targetHandle ?? ''))
          );

          // Находим удаленные связи для генерации операций
          const removedEdges = Object.entries(parentLayer.edges).filter(([edgeId]) => !filteredEdges[edgeId]);
          const edgesRemoved = removedEdges.length > 0;

          updatedLayers[parentId] = {
            ...parentLayer,
            edges: filteredEdges
          };

          // Генерируем операции удаления связей для бэкенда (только если не пропускаем генерацию)
          if (edgesRemoved && !skipOperationGeneration) {
            const autoSaveStatus = ProjectDataService.getStatus();
            const currentProjectId = autoSaveStatus.currentProjectId;

            if (currentProjectId) {
              for (const [edgeId, edge] of removedEdges) {
                generateAndSaveOperation(
                  'edge.deleted',
                  {
                    edgeId: edgeId,
                    edge: edge,
                    layerId: parentId
                  },
                  currentProjectId,
                  currentTimelineId,
                  parentId
                );
              }
            }
          }

          // Если связи были удалены, нужно обновить isConnected у других слоев в родительском слое
          if (edgesRemoved) {
            // Синхронизируем концовки всех затронутых слоев в родительском слое
            const layersToSyncInParent = new Set<string>();

            // Находим все слои в родительском слое, которые могли быть затронуты
            Object.values(parentLayer.nodes).forEach((node) => {
              if (node.type === 'layer' && node.id !== currentGraphId) {
                // Проверяем, были ли у этого слоя связи с удаленными узлами
                const hadConnections = Object.values(parentLayer.edges).some(
                  (edge) => (edge.startNodeId === node.id && idsToRemove.includes(edge.sourceHandle ?? '')) || (edge.endNodeId === node.id && idsToRemove.includes(edge.targetHandle ?? ''))
                );

                if (hadConnections) {
                  layersToSyncInParent.add(node.id);
                }
              }
            });

            // Генерируем операции синхронизации для затронутых слоев (только если не пропускаем генерацию)
            if (!skipOperationGeneration) {
              for (const layerNodeId of layersToSyncInParent) {
                const layerNode = updatedLayers[parentId].nodes[layerNodeId] as LayerNode;
                if (layerNode && layerNode.type === 'layer') {
                  const autoSaveStatus = ProjectDataService.getStatus();
                  const currentProjectId = autoSaveStatus.currentProjectId;

                  if (currentProjectId) {
                    generateAndSaveOperation(
                      'layer.endings.updated',
                      {
                        layerId: layerNodeId,
                        parentLayerId: parentId,
                        startingNodes: layerNode.startingNodes || [],
                        endingNodes: layerNode.endingNodes || []
                      },
                      currentProjectId,
                      currentTimelineId
                    );
                  }
                }
              }
            }
          }
        }

        // Применяем обновления слоев
        set({layers: updatedLayers});

        // Сохраняем снапшот при удалении узла (для восстановления)
        get().saveToDb();

        // Также обновляем связанные состояния в CanvasStore для синхронизации
        const canvasStore = useCanvasStore.getState();
        const updatedCanvasEdges = canvasStore.edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId);
        canvasStore.setEdges(updatedCanvasEdges);
      },

      onNodesChange: (changes: NodeChange[]) => {
        // Оптимизация: если все изменения касаются только выделения, ничего не делаем.
        // Состояние выделения управляется CanvasStore и не требует обновления всего графа.
        if (changes.every((change) => change.type === 'select')) {
          return;
        }

        // Оптимизация: если изменения касаются только позиции (во время перетаскивания),
        // мы не обновляем GraphStore. CanvasStore обновит UI, а финальная позиция
        // будет сохранена через onNodeDragStop. Это предотвращает запуск цикла обновлений.
        if (changes.every((change) => change.type === 'position')) {
          return;
        }

        const {currentGraphId, layers, removeNode} = get();
        const currentLayer = getOrCreateLayer(layers, currentGraphId, (newLayers) => {
          set({layers: newLayers});
        });

        const updatedNodes = {...currentLayer.nodes};
        const commandManager = getCommandManager();

        // Определяем, какие узлы уже были обработаны
        const processedNodeIds = new Set<string>();
        let hasRemovals = false;

        // Сначала обрабатываем стеки, чтобы избежать двойного удаления узлов выбора
        // Находим все изменения для стеков и обрабатываем их первыми
        // Больше не обрабатываем стеки отдельно, т.к. теперь узлы выбора самостоятельные

        // Теперь обрабатываем остальные изменения
        for (const change of changes) {
          // Для изменений позиции и удаления нужно id
          if (!('id' in change)) continue;

          const nodeId = change.id;

          // Пропускаем узлы, которые уже были обработаны
          if (processedNodeIds.has(nodeId)) continue;

          // Обработка изменений позиций
          if (change.type === 'position' && 'position' in change && change.position && updatedNodes[nodeId]) {
            updatedNodes[nodeId] = {
              ...updatedNodes[nodeId],
              coordinates: change.position
            };
          }
          // Обработка удалений через CommandManager
          else if (change.type === 'remove' && updatedNodes[nodeId]) {
            const node = updatedNodes[nodeId];

            switch (node.type) {
              case 'narrative': {
                if (!processedNodeIds.has(nodeId)) {
                  commandManager.deleteNarrativeNode(nodeId);
                  processedNodeIds.add(nodeId);
                  hasRemovals = true;
                }
                break;
              }
              case 'choice': {
                if (!processedNodeIds.has(nodeId)) {
                  // Удаляем узел выбора с помощью командного менеджера
                  commandManager.deleteChoiceNode(nodeId);
                  processedNodeIds.add(nodeId);
                  hasRemovals = true;
                }
                break;
              }
              case 'note': {
                if (!processedNodeIds.has(nodeId)) {
                  commandManager.deleteNote(nodeId);
                  processedNodeIds.add(nodeId);
                  hasRemovals = true;
                }
                break;
              }
              // Обработка Layer nodes
              case 'layer': {
                if (!processedNodeIds.has(nodeId)) {
                  // Удаляем слой напрямую, так как для него нет специальной команды
                  removeNode(nodeId);
                  processedNodeIds.add(nodeId);
                  hasRemovals = true;
                }
                break;
              }
              default:
                break;
            }
          }
        }

        // Если были удаления, раннее возвращение не нужно
        if (hasRemovals) {
          return;
        }

        // Обновляем текущий слой с новыми позициями узлов
        const updated: Layer = {
          ...currentLayer,
          nodes: updatedNodes
        };

        set({layers: {...layers, [currentGraphId]: updated}});
      },

      onEdgesChange: (changes) => {
        const {currentGraphId, currentTimelineId, layers} = get();
        const currentLayer = getOrCreateLayer(layers, currentGraphId, (newLayers) => {
          set({layers: newLayers});
        });

        const updatedEdges = {...currentLayer.edges};

        for (const change of changes) {
          if (change.type === 'remove') {
            delete updatedEdges[change.id];
          }

          if (change.type === 'select') {
            return;
          }
        }

        const updatedLayer: Layer = {
          ...currentLayer,
          edges: updatedEdges
        };

        let updatedLayers = {
          ...layers,
          [currentGraphId]: updatedLayer
        };

        // Обновляем endingNodes в родительском слое, если он есть
        if (currentLayer.parentLayerId) {
          updatedLayers = get().updateParentEndingAndStartingNodesWithSync(currentGraphId, updatedLayers);
        }

        // Обновляем endingNodes у внутренних Layer-нод (если они есть)
        Object.values(updatedLayer.nodes).forEach((node) => {
          if (node.type === 'layer') {
            const currEndings = node.endingNodes ?? [];
            const currStartings = node.startingNodes ?? [];

            // Check edges where this node is the source (provides handles)
            const isConnectedEndingsMap = new Set(
              Object.values(updatedEdges)
                .filter((e) => e.startNodeId === node.id && e.sourceHandle)
                .map((e) => e.sourceHandle ?? '')
            );

            // Check edges where this node is the target (receives handles)
            const isConnectedStartingsMap = new Set(
              Object.values(updatedEdges)
                .filter((e) => e.endNodeId === node.id && e.targetHandle)
                .map((e) => e.targetHandle ?? '')
            );

            // Additional check for layer-to-layer connections where a layer ending
            // could be connected to another layer ending
            Object.values(updatedEdges).forEach((edge) => {
              // If both nodes are layers and both have handles, update both sides
              if (edge.sourceHandle && edge.targetHandle) {
                // Check if this node is source in a layer-to-layer connection
                if (edge.startNodeId === node.id && edge.sourceHandle) {
                  isConnectedEndingsMap.add(edge.sourceHandle);
                }

                // Check if this node is target in a layer-to-layer connection
                if (edge.endNodeId === node.id && edge.targetHandle) {
                  isConnectedStartingsMap.add(edge.targetHandle);
                }
              }
            });

            const updatedEndings = currEndings.map((n) => ({
              ...n,
              isConnected: isConnectedEndingsMap.has(n.id)
            }));

            const updatedStartings = currStartings.map((n) => ({
              ...n,
              isConnected: isConnectedStartingsMap.has(n.id)
            }));

            updatedLayers[currentGraphId] = {
              ...updatedLayers[currentGraphId],
              nodes: {
                ...updatedLayers[currentGraphId].nodes,
                [node.id]: {
                  ...node,
                  endingNodes: updatedEndings,
                  startingNodes: updatedStartings
                }
              }
            };
          }
        });

        set({layers: updatedLayers});

        // Синхронизируем концовки слоев, если были изменения в связях с handle'ами
        const layersToSyncOnEdgeChange = new Set<string>();

        for (const change of changes) {
          if (change.type === 'remove') {
            // Находим удаленное ребро в исходном состоянии
            const removedEdge = currentLayer.edges[change.id];
            if (removedEdge) {
              // Если ребро имело sourceHandle, значит источник - это слой
              if (removedEdge.sourceHandle) {
                layersToSyncOnEdgeChange.add(removedEdge.startNodeId);
              }

              // Если ребро имело targetHandle, значит получатель - это слой
              if (removedEdge.targetHandle) {
                layersToSyncOnEdgeChange.add(removedEdge.endNodeId);
              }
            }
          }
        }

        // Генерируем операции синхронизации для затронутых слоев
        for (const layerNodeId of layersToSyncOnEdgeChange) {
          const layerNode = updatedLayers[currentGraphId].nodes[layerNodeId] as LayerNode;
          if (layerNode && layerNode.type === 'layer') {
            const autoSaveStatus = ProjectDataService.getStatus();
            const currentProjectId = autoSaveStatus.currentProjectId;

            if (currentProjectId) {
              generateAndSaveOperation(
                'layer.endings.updated',
                {
                  layerId: layerNodeId,
                  parentLayerId: currentGraphId,
                  startingNodes: layerNode.startingNodes || [],
                  endingNodes: layerNode.endingNodes || []
                },
                currentProjectId,
                currentTimelineId
              );
            }
          }
        }

        // Сохраняем изменения при изменении связей
        get().saveToDb();
      },

      onConnect: (connection) => {
        const {currentGraphId, currentTimelineId, layers} = get();
        const currentLayer = getOrCreateLayer(layers, currentGraphId, (newLayers) => {
          set({layers: newLayers});
        });

        // Проверяем типы узлов
        const sourceNode = currentLayer.nodes[connection.source!];
        const targetNode = currentLayer.nodes[connection.target!];

        // Запрещаем соединение двух узлов выбора (choice) последовательно
        if (sourceNode?.type === 'choice' && targetNode?.type === 'choice') {
          console.warn('Попытка соединить два узла выбора последовательно заблокирована');
          return;
        }

        // Проверка на существующую связь между теми же узлами с теми же handles
        if (connection.sourceHandle && connection.targetHandle) {
          // Проверка для связей между слоями (когда есть и sourceHandle, и targetHandle)
          const existingEdge = Object.values(currentLayer.edges).find(
            (edge) => edge.startNodeId === connection.source && edge.endNodeId === connection.target && edge.sourceHandle === connection.sourceHandle && edge.targetHandle === connection.targetHandle
          );

          if (existingEdge) {
            return;
          }
        } else if (connection.sourceHandle) {
          // Проверка для связей из конечного узла слоя (есть только sourceHandle)
          const existingEdge = Object.values(currentLayer.edges).find(
            (edge) => edge.startNodeId === connection.source && edge.endNodeId === connection.target && edge.sourceHandle === connection.sourceHandle
          );

          if (existingEdge) {
            return;
          }
        } else if (connection.targetHandle) {
          // Проверка для связей в начальный узел слоя (есть только targetHandle)
          const existingEdge = Object.values(currentLayer.edges).find(
            (edge) => edge.startNodeId === connection.source && edge.endNodeId === connection.target && edge.targetHandle === connection.targetHandle
          );

          if (existingEdge) {
            return;
          }
        } else {
          // Проверка для обычных связей (нет ни sourceHandle, ни targetHandle)
          const existingEdge = Object.values(currentLayer.edges).find((edge) => edge.startNodeId === connection.source && edge.endNodeId === connection.target);

          if (existingEdge) {
            return;
          }
        }

        // Создаем уникальный идентификатор для связи, поддерживающий множественные соединения между одними и теми же узлами
        const edge: Link = {
          type: 'link',
          id: nanoid(),
          startNodeId: connection.source!,
          endNodeId: connection.target!,
          ...(connection.sourceHandle ? {sourceHandle: connection.sourceHandle} : {}),
          ...(connection.targetHandle ? {targetHandle: connection.targetHandle} : {}),
          conditions: []
        };

        // Обновляем текущий слой
        const updatedLayer: Layer = {
          ...currentLayer,
          edges: {
            ...currentLayer.edges,
            [edge.id]: edge
          }
        };

        let updatedLayers = {
          ...layers,
          [currentGraphId]: updatedLayer
        };

        // Обновляем родительский слой (концы и начала)
        if (currentLayer.id !== 'root') {
          const oldParentLayerId = currentLayer.parentLayerId!;
          const oldParentLayer = layers[oldParentLayerId];
          const oldParentNode = oldParentLayer.nodes[currentGraphId] as LayerNode;

          // Сохраняем старые handle-ноды до обновления
          const oldEndingNodes = oldParentNode.endingNodes ?? [];
          const oldStartingNodes = oldParentNode.startingNodes ?? [];

          updatedLayers = get().updateParentEndingAndStartingNodesWithSync(currentGraphId, updatedLayers);

          const parentLayerId = currentLayer.parentLayerId!;
          const parentLayer = updatedLayers[parentLayerId];

          const oldStartHandleIdsToRemove = oldStartingNodes.filter((n) => n.id === connection.target).map((n) => n.id);
          const oldEndHandleIdsToRemove = oldEndingNodes.filter((n) => n.id === connection.source).map((n) => n.id);

          // Удаляем внешние связи из родительского слоя
          const filteredEdges = Object.fromEntries(
            Object.entries(parentLayer.edges).filter(([_, e]) => {
              return !(
                (e.sourceHandle && oldEndHandleIdsToRemove.includes(e.sourceHandle) && e.startNodeId === currentGraphId) ||
                (e.targetHandle && oldStartHandleIdsToRemove.includes(e.targetHandle) && e.endNodeId === currentGraphId)
              );
            })
          );

          updatedLayers[parentLayerId] = {
            ...parentLayer,
            edges: filteredEdges
          };
        }

        // Special case for layer-to-layer connections (both source and target have handles)
        if (connection.sourceHandle && connection.targetHandle) {
          // Get source node with its ending nodes
          const sourceNode = updatedLayer.nodes[connection.source!] as LayerNode;
          const currEndings = sourceNode.endingNodes ?? [];
          const updatedEndings = currEndings.map((n) => ({
            ...n,
            isConnected: n.isConnected || n.id === connection.sourceHandle,
            // Добавляем массив для хранения ID связей
            connectionIds: n.id === connection.sourceHandle ? [...(n.connectionIds || []), edge.id] : n.connectionIds || []
          }));

          // Get target node with its starting nodes
          const targetNode = updatedLayer.nodes[connection.target!] as LayerNode;
          const currStartings = targetNode.startingNodes ?? [];
          const updatedStartings = currStartings.map((n) => ({
            ...n,
            isConnected: n.isConnected || n.id === connection.targetHandle,
            // Добавляем массив для хранения ID связей
            connectionIds: n.id === connection.targetHandle ? [...(n.connectionIds || []), edge.id] : n.connectionIds || []
          }));

          // Update both nodes in a single operation
          updatedLayers[currentGraphId] = {
            ...updatedLayer,
            nodes: {
              ...updatedLayer.nodes,
              [connection.source!]: {
                ...sourceNode,
                endingNodes: updatedEndings
              },
              [connection.target!]: {
                ...targetNode,
                startingNodes: updatedStartings
              }
            }
          };
        } else {
          // Handle regular connections
          if (connection.sourceHandle) {
            const sourceNode = updatedLayer.nodes[connection.source!] as LayerNode;
            const currEndings = sourceNode.endingNodes ?? [];
            const updatedEndings = currEndings.map((n) => ({
              ...n,
              isConnected: n.isConnected || n.id === connection.sourceHandle,
              // Добавляем массив для хранения ID связей
              connectionIds: n.id === connection.sourceHandle ? [...(n.connectionIds || []), edge.id] : n.connectionIds || []
            }));

            updatedLayers[currentGraphId] = {
              ...updatedLayer,
              nodes: {
                ...updatedLayer.nodes,
                [connection.source!]: {
                  ...sourceNode,
                  endingNodes: updatedEndings
                }
              }
            };
          }

          if (connection.targetHandle) {
            const targetNode = updatedLayer.nodes[connection.target!] as LayerNode;
            const currStartings = targetNode.startingNodes ?? [];
            const updatedStartings = currStartings.map((n) => ({
              ...n,
              isConnected: n.isConnected || n.id === connection.targetHandle,
              // Добавляем массив для хранения ID связей
              connectionIds: n.id === connection.targetHandle ? [...(n.connectionIds || []), edge.id] : n.connectionIds || []
            }));

            updatedLayers[currentGraphId] = {
              ...updatedLayer,
              nodes: {
                ...updatedLayer.nodes,
                [connection.target!]: {
                  ...targetNode,
                  startingNodes: updatedStartings
                }
              }
            };
          }
        }

        set({layers: updatedLayers});

        // Синхронизируем концовки слоев, если были обновления isConnected
        const layersToSync = [];

        // Если sourceHandle есть, значит source - это слой, нужно синхронизировать его концовки
        if (connection.sourceHandle) {
          layersToSync.push(connection.source!);
        }

        // Если targetHandle есть, значит target - это слой, нужно синхронизировать его концовки
        if (connection.targetHandle) {
          layersToSync.push(connection.target!);
        }

        // Генерируем операции синхронизации для затронутых слоев
        for (const layerNodeId of layersToSync) {
          const layerNode = updatedLayers[currentGraphId].nodes[layerNodeId] as LayerNode;
          if (layerNode && layerNode.type === 'layer') {
            const autoSaveStatus = ProjectDataService.getStatus();
            const currentProjectId = autoSaveStatus.currentProjectId;

            if (currentProjectId) {
              generateAndSaveOperation(
                'layer.endings.updated',
                {
                  layerId: layerNodeId,
                  parentLayerId: currentGraphId,
                  startingNodes: layerNode.startingNodes || [],
                  endingNodes: layerNode.endingNodes || []
                },
                currentProjectId,
                currentTimelineId
              );
            }
          }
        }

        // Сохраняем изменения при создании новых связей
        get().saveToDb();
      },

      enterGraph: (graphId: string) => {
        // Трекинг открытия слоя
        if (graphId !== get().currentGraphId) {
          const enterMethod = get().lastLayerEnterMethod;
          const layers = get().layers;
          const currentProjectId = ProjectDataService.getStatus().currentProjectId || 'undefined';
          const currentTimelineId = get().currentTimelineId;

          // Отправляем событие аналитики
          const isSidebarOpened = useUIStore.getState().isSidebarOpen;
          if (enterMethod) {
            // Если метод уже установлен, используем его
            trackLayerEnter(graphId, layers, enterMethod, isSidebarOpened, currentProjectId, currentTimelineId);
          } else {
            // Если метод не установлен, используем Sidebar по умолчанию
            trackLayerEnter(graphId, layers, EnterMethodType.Sidebar, isSidebarOpened, currentProjectId, currentTimelineId);
          }

          // Сбрасываем метод перехода
          get().clearLayerEnterMethod();
        }

        set({
          currentGraphId: graphId
        });
      },

      saveToDb: async () => {
        // Очищаем таймер debounced сохранения, если он есть
        const store = get();
        if (store._updateNodeDataTimeout) {
          window.clearTimeout(store._updateNodeDataTimeout);
          set({_updateNodeDataTimeout: null});
        }

        const {layers, layerMetadata, lastLayerNumber, currentTimelineId} = get();
        const variables = useVariablesStore.getState().variables;
        const projectName = useProjectStore.getState().projectName;

        // Получаем текущий projectId из состояния автосохранения
        const autoSaveStatus = ProjectDataService.getStatus();
        const currentProjectId = autoSaveStatus.currentProjectId;

        // Если нет projectId, не сохраняем данные графа - они должны быть только в IndexedDB
        if (!currentProjectId) {
          console.log('GraphStore: No projectId, skipping save to IndexedDB');
          return;
        }

        // Сначала загружаем существующие данные проекта
        let existingProjectData: any = {};
        try {
          const existing = await loadProject(currentProjectId);
          if (existing) {
            existingProjectData = existing;
          }
        } catch (error) {
          console.log('GraphStore: No existing project data found, creating new');
        }

        // Получаем список таймлайнов из TimelinesStore
        const timelinesMetadata = useTimelinesStore.getState().getTimelinesData();
        console.log('💾 GraphStore: Saving data for timeline:', currentTimelineId);
        console.log('📋 TimelinesMetadata to save:', timelinesMetadata);

        // Получаем список активных таймлайнов из TimelinesStore
        const activeTimelineIds = timelinesMetadata.map((t) => t.id);
        console.log('💾 Active timeline IDs from store:', activeTimelineIds);

        // Фильтруем существующие таймлайны, оставляя только активные
        const filteredTimelines: Record<string, any> = {};
        const existingTimelineIds = existingProjectData.timelines ? Object.keys(existingProjectData.timelines) : [];
        console.log('💾 Existing timeline IDs in IndexedDB:', existingTimelineIds);

        if (existingProjectData.timelines) {
          for (const [timelineId, timelineData] of Object.entries(existingProjectData.timelines)) {
            if (activeTimelineIds.includes(timelineId)) {
              filteredTimelines[timelineId] = timelineData;
              console.log(`💾 Keeping timeline ${timelineId}`);
            } else {
              console.log(`💾 Filtering out timeline ${timelineId} (not in active list)`);
            }
          }
        }

        console.log('💾 Filtered timelines count:', Object.keys(filteredTimelines).length);

        // Обновляем данные только для текущего таймлайна
        const dataToSave = {
          ...existingProjectData,
          projectId: currentProjectId,
          timelines: {
            ...filteredTimelines, // Используем отфильтрованные таймлайны
            [currentTimelineId]: {
              layers,
              metadata: layerMetadata,
              variables,
              lastLayerNumber
            }
          },
          timelinesMetadata, // Сохраняем метаданные всех таймлайнов
          projectName,
          _lastModified: Date.now()
        };

        console.log('💾 Final data to save:', {
          projectId: currentProjectId,
          timelinesKeys: Object.keys(dataToSave.timelines),
          timelinesMetadataCount: timelinesMetadata.length,
          currentTimelineId
        });

        try {
          console.log('GraphStore: Saving to IndexedDB:', currentProjectId);
          await saveProject(dataToSave);

          // Уведомляем ProjectDataService об изменениях для автосохранения на сервер
          // ВАЖНО: используем метод, который НЕ дублирует сохранение в IndexedDB
          console.log('GraphStore: Notifying ProjectDataService about changes');
          ProjectDataService.markAsChanged(currentProjectId, dataToSave);
        } catch (error) {
          console.error('GraphStore: Failed to save to IndexedDB:', error);
          throw error; // Пробрасываем ошибку вместо fallback к localStorage
        }
      },

      loadFromDb: async () => {
        const hasLoaded = get().hasLoadedFromStorage;
        if (hasLoaded) return;

        // Получаем текущий projectId из состояния автосохранения
        const autoSaveStatus = ProjectDataService.getStatus();
        const projectId = autoSaveStatus.currentProjectId;

        if (!projectId) {
          console.log('GraphStore: No projectId, initializing empty project');
          // Если нет projectId, инициализируем пустой проект
          set({...createEmptyProjectState(), hasLoadedFromStorage: true});
          return;
        }

        try {
          console.log('GraphStore: Loading from IndexedDB:', projectId);
          const projectData = await loadProject(projectId);

          if (projectData) {
            // Инициализируем таймлайны из IndexedDB данных только при первой загрузке
            // Не во время переключения между таймлайнами, чтобы избежать циклов
            if (projectData.timelines && !get().currentTimelineId.startsWith('timeline-')) {
              const timelinesStore = useTimelinesStore.getState();
              // Только если таймлайны еще не загружены через API
              if (timelinesStore.timelines.length === 0) {
                timelinesStore.initializeTimelines(projectData);
                console.log('GraphStore: Initialized timelines from IndexedDB data');
              }
            }

            // Получаем данные текущего таймлайна
            const {currentTimelineId} = get();
            let timelineData = projectData.timelines[currentTimelineId];

            // Если текущий таймлайн не найден, попробуем взять первый доступный
            if (!timelineData) {
              const timelineKeys = Object.keys(projectData.timelines);
              if (timelineKeys.length > 0) {
                const firstTimelineId = timelineKeys[0];
                timelineData = projectData.timelines[firstTimelineId];
                console.log('📦 GraphStore: Using first available timeline:', firstTimelineId);

                // Обновляем currentTimelineId на найденный
                set({currentTimelineId: firstTimelineId});
              }
            }

            if (timelineData) {
              set({
                layers: timelineData.layers,
                layerMetadata: timelineData.metadata || {},
                lastLayerNumber: timelineData.lastLayerNumber || 0,
                hasLoadedFromStorage: true
              });

              // Устанавливаем переменные, если они есть
              if (timelineData.variables) {
                useVariablesStore.getState().setVariables(timelineData.variables);
              }

              // УДАЛЕНО: больше не устанавливаем название проекта из IndexedDB кэша
              // Название проекта управляется через ProjectManager из актуальной метаинформации

              console.log('GraphStore: Successfully loaded from IndexedDB for timeline:', currentTimelineId);
              return;
            }
          }

          // Если данных нет в IndexedDB, инициализируем пустой проект
          console.log('GraphStore: No data in IndexedDB, initializing empty project');
          set({...createEmptyProjectState(), hasLoadedFromStorage: true});
        } catch (error) {
          console.error('GraphStore: Failed to load from IndexedDB:', error);

          // В случае ошибки инициализируем пустой проект
          set({...createEmptyProjectState(), hasLoadedFromStorage: true});
        }
      },

      copyNode: () => {
        // Используем функцию из отдельного модуля clipboardOperations
        copyNodes();
      },

      cutNode: () => {
        // Используем функцию из отдельного модуля clipboardOperations
        cutNodes();
      },

      pasteNode: () => {
        // Используем функцию из отдельного модуля clipboardOperations
        pasteNodes();
      },

      // Новые функции для работы с состоянием панелей слоев
      setLayerPanelState: (layerId, panelType, isOpen) => {
        const {layerMetadata} = get();

        // Получаем текущие метаданные для слоя или создаем новые с дефолтными значениями
        const currentMetadata = layerMetadata[layerId] || {...DEFAULT_LAYER_METADATA};

        // Обновляем нужное поле
        const updatedPanelState = {
          ...currentMetadata.panelState,
          [panelType === 'start' ? 'startPanelOpen' : 'endPanelOpen']: isOpen
        };

        // Обновляем состояние в сторе
        const updatedMetadata = {
          ...layerMetadata,
          [layerId]: {
            ...currentMetadata,
            panelState: updatedPanelState
          }
        };

        set({layerMetadata: updatedMetadata});
      },

      getLayerPanelState: (layerId) => {
        const {layerMetadata} = get();
        // Возвращаем состояние для слоя или дефолтное
        return layerMetadata[layerId]?.panelState || DEFAULT_PANEL_STATE;
      },

      // Новые функции для работы с позицией вьюпорта
      setLayerViewport: (layerId, viewportState) => {
        const {layerMetadata} = get();
        const currentMetadata = layerMetadata[layerId] || {
          panelState: {startPanelOpen: true, endPanelOpen: true},
          viewport: DEFAULT_VIEWPORT
        };

        // Проверяем, действительно ли изменился вьюпорт
        const currentViewport = currentMetadata.viewport;
        if (currentViewport.x === viewportState.x && currentViewport.y === viewportState.y && currentViewport.zoom === viewportState.zoom) {
          // Если вьюпорт не изменился, не обновляем состояние
          return;
        }

        // Обновляем состояние в сторе
        const updatedMetadata = {
          ...layerMetadata,
          [layerId]: {
            ...currentMetadata,
            viewport: viewportState
          }
        };

        set({layerMetadata: updatedMetadata});
      },

      getLayerViewport: (layerId) => {
        const {layerMetadata} = get();
        // Возвращаем вьюпорт для слоя или null
        return layerMetadata[layerId]?.viewport || DEFAULT_VIEWPORT;
      },

      updateEdge: (edgeId, updates) => {
        const {currentGraphId, layers} = get();
        const graph = layers[currentGraphId];

        // Если граф не существует, ничего не делаем
        if (!graph) {
          console.warn(`GraphStore: Graph with ID ${currentGraphId} not found in updateEdge`);
          return;
        }

        const edge = graph.edges[edgeId];

        if (!edge) {
          return;
        }

        // Получаем все ребра из Canvas без динамического импорта
        const canvasStore = useCanvasStore.getState();
        const currentCanvasEdges = canvasStore.edges;

        // Обновляем ребро в хранилище графа
        const updatedEdge = {
          ...edge,
          ...updates
        };

        const updatedGraph = {
          ...graph,
          edges: {
            ...graph.edges,
            [edgeId]: updatedEdge
          }
        };

        // Обновляем ребро в Canvas состоянии
        const updatedCanvasEdges = currentCanvasEdges.map((e: any) => {
          if (e.id === edgeId) {
            // Правильно обновляем структуру Canvas edge
            // В Canvas условия хранятся в data.conditions, а не в conditions напрямую
            const updated = {
              ...e,
              data: {
                ...e.data,
                // Обновляем все поля, которые должны быть в data
                ...(updates.conditions !== undefined && {conditions: updates.conditions})
              }
            };
            return updated;
          }
          return e;
        });

        canvasStore.setEdges(updatedCanvasEdges);

        set((state) => ({
          layers: {
            ...state.layers,
            [currentGraphId]: updatedGraph
          }
        }));

        // Сохраняем изменения при обновлении связей (это может повлиять на концовки слоев)
        get().saveToDb();
      },

      // Удаление условий, использующих переменную
      deleteConditionsWithVariable: (variableId: string) => {
        const {layers} = get();
        let hasUpdates = false;

        // Проходим по всем слоям
        const updatedLayers = Object.entries(layers).reduce<Record<string, Layer>>((result, [layerId, layer]) => {
          // Проходим по всем ребрам слоя
          const updatedEdges = Object.entries(layer.edges).reduce<Record<string, Link>>((edgesResult, [edgeId, edge]) => {
            // Проверяем, имеет ли ребро условия
            if (edge.conditions && edge.conditions.length > 0) {
              let hasChangesInConditions = false;

              // Обрабатываем каждую группу условий
              const updatedConditionGroups = edge.conditions.map((group) => {
                // Фильтруем условия, чтобы удалить те, которые используют указанную переменную
                const filteredConditions = group.conditions.filter((condition) => {
                  // Проверяем все возможные поля, содержащие ID переменной
                  if (condition.varId === variableId || condition.comparisonVarId === variableId) {
                    hasChangesInConditions = true;
                    return false; // Удаляем условие
                  }
                  return true; // Оставляем условие
                });

                // Возвращаем обновленную группу с отфильтрованными условиями
                return {
                  ...group,
                  conditions: filteredConditions
                };
              });

              // Фильтруем пустые группы условий
              const nonEmptyGroups = updatedConditionGroups.filter((group) => group.conditions.length > 0);

              // Если были изменения в условиях, обновляем ребро
              if (hasChangesInConditions) {
                hasUpdates = true;
                return {
                  ...edgesResult,
                  [edgeId]: {
                    ...edge,
                    conditions: nonEmptyGroups
                  }
                };
              }
            }

            // Если условия не изменились, возвращаем ребро как есть
            return {
              ...edgesResult,
              [edgeId]: edge
            };
          }, {});

          // Обновляем слой только если были изменения в ребрах
          if (JSON.stringify(updatedEdges) !== JSON.stringify(layer.edges)) {
            return {
              ...result,
              [layerId]: {
                ...layer,
                edges: updatedEdges
              }
            };
          }

          // Если изменений не было, возвращаем слой как есть
          return {
            ...result,
            [layerId]: layer
          };
        }, {});

        // Если были изменения, обновляем хранилище
        if (hasUpdates) {
          set({layers: updatedLayers});

          // Обновление canvas хранилища напрямую без динамического импорта
          if (typeof window !== 'undefined') {
            const canvasStore = useCanvasStore.getState();

            // Обновление рёбер в Canvas хранилище
            const updatedCanvasEdges = canvasStore.edges.map((edge: any) => {
              // Найдем ребро в обновленных слоях
              const layerId = get().currentGraphId;
              const layer = updatedLayers[layerId];
              if (!layer) return edge;

              const graphEdge = layer.edges[edge.id];
              if (!graphEdge) return edge;

              // Обновляем условия ребра
              return {
                ...edge,
                data: {
                  ...(edge.data || {}),
                  conditions: graphEdge.conditions
                }
              };
            });

            canvasStore.setEdges(updatedCanvasEdges);
          }

          // Сохраняем изменения при удалении условий с переменными
          get().saveToDb();
        }
      },

      // Функция для обновления узла с операциями
      updateNodeWithOperations: (nodeId: string, updatedNode: NarrativeNode) => {
        const {currentGraphId, layers} = get();
        const graph = layers[currentGraphId];

        if (!graph) {
          console.warn(`GraphStore: Graph with ID ${currentGraphId} not found in updateNodeWithOperations`);
          return;
        }

        const updatedGraph = {
          ...graph,
          nodes: {
            ...graph.nodes,
            [nodeId]: updatedNode
          }
        };

        set({layers: {...layers, [currentGraphId]: updatedGraph}});

        // Сохраняем изменения при обновлении узла с операциями
        get().saveToDb();
      },

      // Функция для обновления целого слоя (используется при обновлении операций)
      updateLayerWithOperations: (layerId: string, updatedLayer: Layer) => {
        const {layers} = get();

        // Проверка существования слоя перед обновлением
        if (!layers[layerId]) {
          return;
        }

        // Убедимся, что все необходимые поля слоя сохранены
        const completeUpdatedLayer: Layer = {
          ...layers[layerId],
          ...updatedLayer,
          // Гарантируем, что все необходимые поля присутствуют
          type: 'layer',
          id: layerId,
          name: updatedLayer.name || layers[layerId].name,
          depth: updatedLayer.depth || layers[layerId].depth,
          // Используем nodeIds из обновления или сгенерируем новые из узлов
          nodeIds: updatedLayer.nodeIds || Object.keys(updatedLayer.nodes || {}),
          // Объединяем узлы и связи
          nodes: {...(updatedLayer.nodes || {})},
          edges: {...(updatedLayer.edges || {})}
        };

        // Обновляем слой в хранилище
        const updatedLayers = {...layers, [layerId]: completeUpdatedLayer};
        set({layers: updatedLayers});

        // Сохраняем изменения при обновлении слоя с операциями
        get().saveToDb();
      },

      // Добавляем новые методы
      setLayerEnterMethod: (method: EnterMethodType) => {
        set({lastLayerEnterMethod: method});
      },
      clearLayerEnterMethod: () => {
        set({lastLayerEnterMethod: null});
      },

      // Реализация методов для работы с сущностями
      loadEntities: async (projectId: string, includeOriginalImages = false) => {
        const {entitiesLoaded, entitiesLoading} = get();
        if (entitiesLoaded || entitiesLoading) {
          return;
        }

        set({entitiesLoading: true, entitiesError: null});
        try {
          const {entities} = await api.getEntities(projectId, {includeOriginalImages});
          set({entities, entitiesLoading: false, entitiesLoaded: true});
        } catch (error) {
          console.error('Failed to load entities:', error);
          set({entitiesError: error instanceof Error ? error.message : 'Failed to load entities', entitiesLoading: false});
        }
      },

      loadEntityTypes: async (projectId: string) => {
        const {entitiesLoaded, entitiesLoading} = get();
        if (entitiesLoaded || entitiesLoading) {
          return;
        }
        try {
          const entityTypes = await api.getEntityTypes(projectId);
          set({entityTypes});
        } catch (error) {
          console.error('Failed to load entity types:', error);
          set({entitiesError: error instanceof Error ? error.message : 'Failed to load entity types'});
        }
      },

      setCopiedNodes: (nodes: (ChoiceNode | NarrativeNode | NoteNode | LayerNode | SkeletonNode)[], edges: Link[]) => {
        set({
          copiedNode: nodes.length === 1 ? (nodes[0] as any) : null,
          copiedNodes: nodes.length > 1 ? (nodes as any) : [],
          copiedEdges: edges,
          // Очищаем старые данные слоев при новом копировании
          _layerContentsForPaste: null,
          _cutNodes: false
        });
      },

      // Методы для работы с метаданными буфера обмена
      setCutMetadata: (layerContents: Record<string, any>, originalCoordinates: Record<string, {x: number; y: number}>) => {
        set({
          _layerContentsForPaste: layerContents,
          _originalCoordinates: originalCoordinates,
          _cutNodes: true
        });
      },
      clearCutMetadata: () => {
        const store = get();
        if (store._updateNodeDataTimeout) {
          window.clearTimeout(store._updateNodeDataTimeout);
        }
        set({
          _originalCoordinates: null,
          _cutNodes: false,
          _updateNodeDataTimeout: null
        });
      },

      // Новые методы для работы с бекендом
      loadFromServer: async (projectId: string) => {
        set({hasLoadedFromStorage: false});
        try {
          // Очищаем ожидающие операции для этого проекта перед загрузкой новых данных
          await clearOperations(projectId);
          console.log('Cleared pending operations for project:', projectId);

          // Используем новый метод с проверкой версий
          const projectData = await ProjectDataService.loadProjectDataWithVersionCheck(projectId);

          if (projectData && projectData.timelines) {
            // Инициализируем таймлайны из загруженных с сервера данных
            const timelinesStore = useTimelinesStore.getState();
            timelinesStore.initializeTimelines(projectData);
            console.log('Initialized timelines from server data');

            // Получаем данные текущего таймлайна
            const {currentTimelineId} = get();
            let timelineData = projectData.timelines[currentTimelineId];

            // Если текущий таймлайн не найден, попробуем взять первый доступный
            if (!timelineData) {
              const timelineKeys = Object.keys(projectData.timelines);
              if (timelineKeys.length > 0) {
                const firstTimelineId = timelineKeys[0];
                timelineData = projectData.timelines[firstTimelineId];
                console.log('📦 GraphStore: Using first available timeline from server:', firstTimelineId);

                // Обновляем currentTimelineId на найденный
                set({currentTimelineId: firstTimelineId});
              }
            }

            if (timelineData) {
              set({
                layers: timelineData.layers,
                layerMetadata: timelineData.metadata || {},
                lastLayerNumber: timelineData.lastLayerNumber || 0,
                hasLoadedFromStorage: true
              });

              // Устанавливаем переменные, если они есть
              if (timelineData.variables) {
                useVariablesStore.getState().setVariables(timelineData.variables);
              }

              console.log('Project data loaded from server for timeline:', currentTimelineId);
            } else {
              // Если данных для этого таймлайна нет, инициализируем пустой проект
              console.log('No data for timeline', currentTimelineId, 'initializing empty project');
              set({...createEmptyProjectState(), hasLoadedFromStorage: true});
            }
          } else {
            // Если данных нет, инициализируем пустой проект
            set({...createEmptyProjectState(), hasLoadedFromStorage: true});
          }

          // Загружаем сущности и их типы
          await get().loadEntities(projectId);
          await get().loadEntityTypes(projectId);

          // Инициализируем автосохранение после загрузки данных
          ProjectDataService.initializeAutoSave(projectId);
        } catch (error) {
          console.error('Failed to load project data from server:', error);
          // В случае ошибки загружаем из IndexedDB/localStorage
          await get().loadFromDb();
        }
      },

      saveToServer: async (projectId: string) => {
        const {layers, layerMetadata, lastLayerNumber, currentTimelineId} = get();
        const variables = useVariablesStore.getState().variables;
        const projectName = useProjectStore.getState().projectName;

        // Получаем список таймлайнов из TimelinesStore
        const timelinesMetadata = useTimelinesStore.getState().getTimelinesData();

        // Загружаем существующие данные и обновляем только текущий таймлайн
        const existingData = (await ProjectDataService.loadProjectDataWithVersionCheck(projectId)) || {};
        const projectData = {
          ...existingData,
          projectId,
          timelines: {
            ...(existingData as any).timelines,
            [currentTimelineId]: {
              layers,
              metadata: layerMetadata,
              variables,
              lastLayerNumber
            }
          },
          timelinesMetadata, // Сохраняем метаданные всех таймлайнов
          projectName,
          _lastModified: Date.now()
        };

        // Сохраняем только на сервер, без дублирования в IndexedDB
        await ProjectDataService.forceSaveToServer(projectId, projectData);
      },

      forceSaveToServer: async (projectId: string) => {
        const {layers, layerMetadata, lastLayerNumber, currentTimelineId} = get();
        const variables = useVariablesStore.getState().variables;
        const projectName = useProjectStore.getState().projectName;

        // Получаем список таймлайнов из TimelinesStore
        const timelinesMetadata = useTimelinesStore.getState().getTimelinesData();

        // Загружаем существующие данные и обновляем только текущий таймлайн
        const existingData = (await ProjectDataService.loadProjectDataWithVersionCheck(projectId)) || {};
        const projectData = {
          ...existingData,
          projectId,
          timelines: {
            ...(existingData as any).timelines,
            [currentTimelineId]: {
              layers,
              metadata: layerMetadata,
              variables,
              lastLayerNumber
            }
          },
          timelinesMetadata, // Сохраняем метаданные всех таймлайнов
          projectName,
          _lastModified: Date.now()
        };

        return await ProjectDataService.forceSaveToServer(projectId, projectData);
      },

      updateNodePositions: (layerId: string, changes: NodeChange[]) => {
        set(
          produce((draft: GraphStore) => {
            const layer = draft.layers[layerId];
            if (layer) {
              changes.forEach((change) => {
                if (change.type === 'position' && change.position) {
                  const node = layer.nodes[change.id];
                  if (node) {
                    node.coordinates = change.position;
                  }
                }
              });
            }
          })
        );
      },

      // Инициализация или сброс состояния
      initialize: (initialState: Partial<GraphStore>) => {
        const store = get();
        if (store._updateNodeDataTimeout) {
          window.clearTimeout(store._updateNodeDataTimeout);
        }
        set({...initialState, _updateNodeDataTimeout: null, entitiesLoaded: false});
      },

      // Функция для обновления концовок с синхронизацией
      updateParentEndingAndStartingNodesWithSync: (graphId: string, layers: Record<string, Layer>) => {
        const updatedLayers = updateParentEndingAndStartingNodes(graphId, layers);

        // Проверяем, есть ли изменения в концовках
        const graph = layers[graphId];
        if (graph && graph.parentLayerId) {
          const parentId = graph.parentLayerId;
          const originalParentLayer = layers[parentId];
          const updatedParentLayer = updatedLayers[parentId];

          // Сравниваем концовки до и после обновления
          const originalLayerNode = originalParentLayer?.nodes[graphId] as LayerNode;
          const updatedLayerNode = updatedParentLayer?.nodes[graphId] as LayerNode;

          if (originalLayerNode && updatedLayerNode) {
            const originalEndingsJson = JSON.stringify(originalLayerNode.endingNodes || []);
            const updatedEndingsJson = JSON.stringify(updatedLayerNode.endingNodes || []);
            const originalStartingsJson = JSON.stringify(originalLayerNode.startingNodes || []);
            const updatedStartingsJson = JSON.stringify(updatedLayerNode.startingNodes || []);

            // Если есть изменения, генерируем операцию
            if (originalEndingsJson !== updatedEndingsJson || originalStartingsJson !== updatedStartingsJson) {
              const autoSaveStatus = ProjectDataService.getStatus();
              const currentProjectId = autoSaveStatus.currentProjectId;

              if (currentProjectId) {
                const {currentTimelineId} = get();
                generateAndSaveOperation(
                  'layer.endings.updated',
                  {
                    layerId: graphId,
                    parentLayerId: parentId,
                    startingNodes: updatedLayerNode.startingNodes || [],
                    endingNodes: updatedLayerNode.endingNodes || [],
                    timestamp: Date.now()
                  },
                  currentProjectId,
                  currentTimelineId
                );
              }
            }
          }
        }

        return updatedLayers;
      },

      // Функции для работы с таймлайнами
      switchToTimeline: (timelineId: string) => {
        const {currentTimelineId, layers, layerMetadata, lastLayerNumber} = get();

        // Если переключаемся на тот же таймлайн, ничего не делаем
        if (currentTimelineId === timelineId) {
          return;
        }

        console.log('🔄 GraphStore: Switching to timeline:', timelineId);

        // 🚀 КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Очищаем кэш коллаборативных операций при переключении
        try {
          const collaborativeService = (window as any).flowCollaborativeOpsService;
          if (collaborativeService) {
            collaborativeService.clearProcessedOperations();
          }
        } catch (error) {
          // Игнорируем ошибки очистки кэша
        }

        // Сохраняем текущие данные перед переключением, только если текущий таймлайн еще существует
        const timelinesStore = useTimelinesStore.getState();
        const currentTimelineExists = timelinesStore.timelines.some((t) => t.id === currentTimelineId);

        if (currentTimelineExists) {
          console.log('🔄 GraphStore: Saving current timeline data before switch:', currentTimelineId);
          get().saveToDb();
        } else {
          console.log('🔄 GraphStore: Skipping save for deleted timeline:', currentTimelineId);
        }

        // Сбрасываем состояние для нового таймлайна
        set({
          ...createEmptyProjectState(),
          currentTimelineId: timelineId,
          currentGraphId: 'root',
          hasLoadedFromStorage: false,
          // Сохраняем сущности, они общие для всех таймлайнов
          entities: get().entities,
          entityTypes: get().entityTypes,
          entitiesLoaded: get().entitiesLoaded,
          entitiesLoading: get().entitiesLoading,
          entitiesError: get().entitiesError
        });

        // Загружаем данные нового таймлайна
        // Но только если таймлайн не является новосозданным
        const timeline = timelinesStore.getTimelineById(timelineId);
        const timelineAge = timeline ? Date.now() - timeline.createdAt : 0;
        const isNewTimeline = timelineAge < 5000; // Если таймлайн создан менее 5 секунд назад

        // 🚀 КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Загружаем с сервера для получения коллаборативных изменений
        const autoSaveStatus = ProjectDataService.getStatus();
        const projectId = autoSaveStatus.currentProjectId;

        if (isNewTimeline) {
          console.log('🔄 GraphStore: New timeline detected, using empty state without loading:', timelineId);
          set({hasLoadedFromStorage: true});
        } else if (projectId) {
          console.log('🔄 GraphStore: Loading timeline data from SERVER to get collaborative changes:', {
            newTimelineId: timelineId,
            previousTimelineId: currentTimelineId,
            projectId
          });
          // Загружаем с сервера чтобы получить все изменения от других пользователей
          get()
            .loadFromServer(projectId)
            .then(() => {
              console.log('✅ GraphStore: Successfully loaded timeline data from server:', timelineId);
            })
            .catch((error) => {
              console.error('❌ GraphStore: Failed to load from server, falling back to IndexedDB:', error);
              // В случае ошибки загружаем из локального кэша
              get().loadFromDb();
            });
        } else {
          console.log('🔄 GraphStore: No projectId, loading from IndexedDB:', timelineId);
          get().loadFromDb();
        }
      },

      getCurrentTimelineData: () => {
        const {layers, layerMetadata, lastLayerNumber} = get();
        return {
          layers,
          metadata: layerMetadata,
          lastLayerNumber
        };
      }
    })),

    {name: 'graphStore'}
  )
);
