import {useCallback, useState} from 'react';

import {AISuggestion, AISuggestionType} from '@types-folder/ai';
import {NarrativeNode, SkeletonNode} from '@types-folder/nodes';
import {nanoid} from 'nanoid';
import {getCommandManager} from 'src/commands/CommandManager';

import {useCanvasStore} from '@store/useCanvasStore';
import {useEditingStore} from '@store/useEditingStore';
import {useGraphStore} from '@store/useGraphStore';

import {api} from '../services/api';
import {PrecedingNodesExtractor} from '../utils/PrecedingNodesExtractor';
import {refreshSpecificLayers} from '../utils/syncGraphToCanvas';
import {useAISuggestions} from './useAI';
import {useCreditsRefresh} from './useCreditsRefresh';
import {useCurrentProject} from './useCurrentProject';
import {useNodeLookup} from './useNodeLookup';

interface UseAINodeActionsProps {
  nodeId: string;
  onComplete?: () => void; // Колбэк для выполнения после успешного создания узлов
}

export const useAINodeActions = ({nodeId, onComplete}: UseAINodeActionsProps) => {
  const {projectId} = useCurrentProject();
  const {generateSuggestions} = useAISuggestions();
  const {findConnectedNodes, findOutgoingNodes} = useNodeLookup();
  const {refreshCreditsAfterOperation} = useCreditsRefresh();
  const deselectAllNodes = useCanvasStore((s) => s.deselectAllNodes);
  const deactivateAllEditingModes = useEditingStore((s) => s.deactivateAllEditingModes);

  const [loadingAction, setLoadingAction] = useState<AISuggestionType | null>(null);

  // Создание одного следующего узла после текущего (для NEXT_NODES)
  const createNextNode = useCallback(
    (suggestion: AISuggestion) => {
      const graphStore = useGraphStore.getState();
      const currLayerId = graphStore.currentGraphId;
      const currentNode = graphStore.layers[currLayerId]?.nodes[nodeId];
      if (!currentNode) return;

      const commandManager = getCommandManager();

      // Вычисляем позицию для следующего узла - справа от текущего с отступом
      const nextPosition = {
        x: currentNode.coordinates.x + 300, // Смещение вправо
        y: currentNode.coordinates.y // Та же высота
      };

      let newNodeId: string;

      // Для NEXT_NODES и REPHRASE_CHOICE создаем узел выбора, для остальных - нарративный
      if (suggestion.type === 'REPHRASE_CHOICE') {
        // Создаем узел выбора
        newNodeId = commandManager.createChoiceNode(nextPosition, suggestion.title || suggestion.description, {isRootLayer: false, interaction: 'mouse'});
      } else {
        // По умолчанию создаем нарративный узел (для NEXT_NODES, REPHRASE_NARRATIVE и STRUCTURE_ONLY)
        newNodeId = commandManager.createNarrativeNode(nextPosition, {
          title: suggestion.title,
          text: suggestion.description,
          attachedEntities: suggestion.entities || [] // Прикрепляем предложенные ИИ сущности
        });
      }

      // Создаем связь от текущего узла к новому
      if (nodeId && newNodeId) {
        const connection = {
          source: nodeId,
          target: newNodeId,
          sourceHandle: null,
          targetHandle: null
        };
        commandManager.connectNarrativeNode(connection);

        // Выделяем новый узел с небольшой задержкой, чтобы React Go Flow успел обработать создание
        setTimeout(() => {
          const canvasStore = useCanvasStore.getState();
          canvasStore.deselectAllNodes();
          canvasStore.selectNode(newNodeId);
        }, 100);
      }
    },
    [nodeId]
  );

  // Создание последовательной цепочки узлов (для STRUCTURE_ONLY и NEXT_NODES)
  const createNodeSequence = useCallback(
    (suggestions: AISuggestion[]) => {
      const graphStore = useGraphStore.getState();
      const currLayerId = graphStore.currentGraphId;
      const currentNode = graphStore.layers[currLayerId]?.nodes[nodeId];
      if (!currentNode || !suggestions.length) return;

      const commandManager = getCommandManager();

      // Сортируем предложения по sequence_order
      const sortedSuggestions = [...suggestions].sort((a, b) => (a.sequence_order || 0) - (b.sequence_order || 0));

      let previousNodeId = nodeId; // Начинаем с текущего узла
      const spacing = 300; // Расстояние между узлами

      sortedSuggestions.forEach((suggestion, index) => {
        const position = {
          x: currentNode.coordinates.x + spacing * (index + 1),
          y: currentNode.coordinates.y
        };

        let newNodeId: string;

        // Создаем узел нужного типа
        if (suggestion.type === 'REPHRASE_CHOICE') {
          newNodeId = commandManager.createChoiceNode(position, suggestion.title || suggestion.description, {isRootLayer: false, interaction: 'mouse'});
        } else {
          // По умолчанию создаем нарративный узел
          newNodeId = commandManager.createNarrativeNode(position, {
            title: suggestion.title,
            text: suggestion.description,
            attachedEntities: suggestion.entities || []
          });
        }

        // Соединяем с предыдущим узлом
        if (previousNodeId && newNodeId) {
          const connection = {
            source: previousNodeId,
            target: newNodeId,
            sourceHandle: null,
            targetHandle: null
          };
          commandManager.connectNarrativeNode(connection);
        }

        // Обновляем previousNodeId для следующей итерации
        previousNodeId = newNodeId;
      });

      // Выделяем последний созданный узел
      if (previousNodeId !== nodeId) {
        setTimeout(() => {
          const canvasStore = useCanvasStore.getState();
          canvasStore.deselectAllNodes();
          canvasStore.selectNode(previousNodeId);
        }, 100);
      }
    },
    [nodeId]
  );

  // Функция для создания скелетон узлов (не синхронизируются с бэкендом)
  const createSkeletonNodes = useCallback(
    (count: number = 3): string[] => {
      const graphStore = useGraphStore.getState();
      const canvasStore = useCanvasStore.getState();
      const currentLayerId = graphStore.currentGraphId;
      const currentNode = graphStore.layers[currentLayerId]?.nodes[nodeId];

      if (!currentNode) {
        return [];
      }

      const skeletonIds: string[] = [];
      const spacing = 300;

      for (let i = 0; i < count; i++) {
        const skeletonId = `skeleton-${Date.now()}-${i}`;
        const position = {
          x: currentNode.coordinates.x + spacing * (i + 1),
          y: currentNode.coordinates.y
        };

        // Создаем скелетон узел напрямую в графе (без синхронизации)
        const skeletonNode: SkeletonNode = {
          id: skeletonId,
          type: 'skeleton',
          coordinates: position,
          data: {}
        };

        // Добавляем в граф используя методы store
        graphStore.addNode(skeletonNode as any);

        // Создаем связь с предыдущим узлом
        if (i === 0) {
          // Первый скелетон связываем с текущим узлом
          const edge = {
            id: `${nodeId}-${skeletonId}`,
            type: 'link' as const,
            startNodeId: nodeId,
            endNodeId: skeletonId,
            sourceHandle: undefined,
            targetHandle: undefined,
            conditions: []
          };
          graphStore.addEdge(edge);
        } else {
          // Остальные связываем с предыдущим скелетоном
          const prevSkeletonId = skeletonIds[i - 1];
          const edge = {
            id: `${prevSkeletonId}-${skeletonId}`,
            type: 'link' as const,
            startNodeId: prevSkeletonId,
            endNodeId: skeletonId,
            sourceHandle: undefined,
            targetHandle: undefined,
            conditions: []
          };
          graphStore.addEdge(edge);
        }

        skeletonIds.push(skeletonId);
      }

      // Синхронизируем с канвасом
      refreshSpecificLayers([currentLayerId], false);

      return skeletonIds;
    },
    [nodeId]
  );

  // Функция для замены скелетон узлов на реальные
  const replaceSkeletonNodes = useCallback(
    (skeletonIds: string[], suggestions: AISuggestion[]) => {
      const graphStore = useGraphStore.getState();
      const commandManager = getCommandManager();
      const currentLayerId = graphStore.currentGraphId;

      // Сначала удаляем скелетон узлы (без генерации операций)
      skeletonIds.forEach((skeletonId) => {
        graphStore.removeNode(skeletonId, true); // skipOperationGeneration = true
      });

      // Теперь создаем реальные узлы через обычную логику
      const sortedSuggestions = [...suggestions].sort((a, b) => (a.sequence_order || 0) - (b.sequence_order || 0));

      let previousNodeId = nodeId; // Начинаем с исходного узла
      const currentNode = graphStore.layers[currentLayerId]?.nodes[nodeId];
      const spacing = 300;

      sortedSuggestions.forEach((suggestion, index) => {
        const position = {
          x: currentNode.coordinates.x + spacing * (index + 1),
          y: currentNode.coordinates.y
        };

        let newNodeId: string;

        // Создаем узел нужного типа (с синхронизацией)
        if (suggestion.type === 'REPHRASE_CHOICE') {
          newNodeId = commandManager.createChoiceNode(position, suggestion.title || suggestion.description, {isRootLayer: false, interaction: 'mouse'});
        } else {
          newNodeId = commandManager.createNarrativeNode(position, {
            title: suggestion.title,
            text: suggestion.description,
            attachedEntities: suggestion.entities || []
          });
        }

        // Соединяем с предыдущим узлом
        if (previousNodeId && newNodeId) {
          const connection = {
            source: previousNodeId,
            target: newNodeId,
            sourceHandle: null,
            targetHandle: null
          };
          commandManager.connectNarrativeNode(connection);
        }

        previousNodeId = newNodeId;
      });

      // Выделяем последний созданный узел
      if (previousNodeId !== nodeId) {
        setTimeout(() => {
          const canvasStore = useCanvasStore.getState();
          canvasStore.deselectAllNodes();
          canvasStore.selectNode(previousNodeId);
        }, 100);
      }
    },
    [nodeId]
  );

  // Новая функция для генерации следующего узла с помощью пайплайна v2
  const handleNextNodeV2 = useCallback(async () => {
    if (loadingAction) return;

    setLoadingAction('NEXT_NODES');

    let skeletonIds: string[] = [];

    try {
      const graphStore = useGraphStore.getState();
      const currentGraph = graphStore.layers[graphStore.currentGraphId];

      if (!currentGraph) {
        console.error('Current graph not found');
        return;
      }

      console.log('🔍 Current graph data:', {
        layerId: graphStore.currentGraphId,
        nodesCount: Object.keys(currentGraph.nodes).length,
        edgesCount: Object.keys(currentGraph.edges).length,
        nodeId: nodeId
      });

      // Создаем skeleton узлы как в старой логике
      skeletonIds = createSkeletonNodes(1); // Создаем 1 skeleton узел для следующего узла
      console.log('🏗️ Created skeleton nodes:', skeletonIds);

      // Извлекаем предыдущие узлы с помощью PrecedingNodesExtractor
      const precedingNodes = PrecedingNodesExtractor.extractPrecedingNodes(
        nodeId,
        {
          nodes: Object.values(currentGraph.nodes).map((node) => ({
            id: node.id,
            type: node.type as 'narrative' | 'choice' | 'layer',
            data: (node as any).data || {},
            position: node.coordinates ? {x: node.coordinates.x, y: node.coordinates.y} : {x: 0, y: 0}
          })),
          edges: Object.values(currentGraph.edges).map((edge) => ({
            id: edge.id,
            source: edge.startNodeId,
            target: edge.endNodeId,
            sourceHandle: edge.sourceHandle,
            targetHandle: edge.targetHandle
          }))
        },
        3, // maxSteps
        10 // maxNodes
      );

      console.log(`🔍 Found ${precedingNodes.length} preceding nodes for node ${nodeId}`);

      const currentNode = currentGraph.nodes[nodeId];

      // Библия проекта и сущности будут получены на бэкенде по projectId

      console.log('🔍 Prepared data:', {
        precedingNodesCount: precedingNodes.length
      });

      // Подготавливаем данные для пайплайна
      const request = {
        nodeData: {
          id: nodeId,
          title: (currentNode as any)?.data?.title || '',
          projectId: projectId
        },
        precedingNodes: precedingNodes,
        generationOptions: {
          nodeCount: 1,
          targetLength: 'auto' as const,
          preferredTone: 'auto' as const,
          includeChoices: false,
          includeEntitySuggestions: true
        },
        projectId: projectId
      };

      console.log('🚀 Calling next node generation pipeline v2...');
      const response = await api.generateNextNodeWithAI(request);

      if (response.success && response.data?.generatedNodes?.length > 0) {
        const generatedNode = response.data.generatedNodes[0];

        // Создаем mock AISuggestion для совместимости с replaceSkeletonNodes
        const mockSuggestion: AISuggestion = {
          id: `generated-${Date.now()}`,
          title: generatedNode.title,
          description: generatedNode.content.text,
          type: 'NEXT_NODES',
          confidence: generatedNode.metadata?.confidence || 75,
          status: 'PENDING',
          nodeId: nodeId,
          projectId: projectId!,
          createdAt: new Date().toISOString(),
          entities: generatedNode.attachedEntities || [],
          sequence_order: 0
        };

        // Заменяем skeleton узлы на реальные
        replaceSkeletonNodes(skeletonIds, [mockSuggestion]);

        // Вызываем колбэк completion
        deactivateAllEditingModes();
        deselectAllNodes();
        if (onComplete) {
          onComplete();
        }

        // Обновляем баланс кредитов после успешной генерации
        refreshCreditsAfterOperation();

        console.log(`✅ Next node generated and skeleton replaced successfully`);
      } else {
        // Если не удалось получить результаты, удаляем skeleton узлы
        console.error('Failed to generate next node:', response);
        if (skeletonIds.length > 0) {
          const graphStore = useGraphStore.getState();
          skeletonIds.forEach((skeletonId) => {
            graphStore.removeNode(skeletonId, true); // skipOperationGeneration = true
          });
          refreshSpecificLayers([graphStore.currentGraphId], false);
        }
      }
    } catch (error) {
      console.error('Next node generation v2 failed:', error);

      // В случае ошибки также удаляем skeleton узлы
      if (skeletonIds.length > 0) {
        const graphStore = useGraphStore.getState();
        skeletonIds.forEach((skeletonId) => {
          graphStore.removeNode(skeletonId, true); // skipOperationGeneration = true
        });
        refreshSpecificLayers([graphStore.currentGraphId], false);
      }
    } finally {
      setLoadingAction(null);
    }
  }, [loadingAction, projectId, nodeId, onComplete, deactivateAllEditingModes, deselectAllNodes, createSkeletonNodes, replaceSkeletonNodes]);

  return {
    loadingAction,
    handleNextNodeV2,
    createNextNode,
    createNodeSequence,
    createSkeletonNodes,
    replaceSkeletonNodes
  };
};
