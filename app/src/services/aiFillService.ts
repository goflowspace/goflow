import {getCommandManager} from 'src/commands/CommandManager';

import {useGraphStore} from '@store/useGraphStore';

import {PrecedingNodesExtractor} from '../utils/PrecedingNodesExtractor';
import {api} from './api';

/**
 * Сервис для AI Fill функциональности нарративных узлов
 */
export class AIFillService {
  /**
   * Заполняет нарративный узел с помощью AI
   */
  static async fillNarrativeNode(nodeId: string, projectId: string, onLoadingChange?: (nodeId: string, loading: boolean) => void, onCreditsRefresh?: () => void): Promise<void> {
    // Устанавливаем состояние загрузки
    onLoadingChange?.(nodeId, true);

    try {
      const graphStore = useGraphStore.getState();
      const currentGraph = graphStore.layers[graphStore.currentGraphId];

      if (!currentGraph) {
        throw new Error('Current graph not found');
      }

      const node = currentGraph.nodes[nodeId];
      if (!node) {
        throw new Error(`Node not found: ${nodeId}`);
      }

      // Только для нарративных узлов
      if (node.type !== 'narrative') {
        throw new Error('AI Fill is only available for narrative nodes');
      }

      // Получаем предыдущие узлы
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
        5, // maxSteps
        10 // maxNodes
      );

      const narrativeNode = node as any; // Приводим к типу с data

      const requestData = {
        projectId,
        nodeData: {
          id: nodeId,
          title: narrativeNode.data?.title || '',
          existingText: narrativeNode.data?.text || '',
          attachedEntities: narrativeNode.data?.attachedEntities || [],
          position: node.coordinates
        },
        precedingNodes,
        generationOptions: {
          targetLength: 'auto' as const,
          preferredTone: 'auto' as const,
          contentRating: 'PG-13' as const
        }
      };

      console.log('🚀 Calling AI fill pipeline...');
      const result = await api.fillNarrativeNodeWithAI(requestData);

      if (result.success && result.data) {
        const generatedText = result.data.generatedText || result.data.finalText?.content || '';

        if (generatedText) {
          const commandManager = getCommandManager();

          // Применяем сгенерированный текст к узлу
          commandManager.editNarrativeNode(nodeId, {
            title: narrativeNode.data?.title || '',
            text: generatedText,
            attachedEntities: narrativeNode.data?.attachedEntities || []
          });

          console.log('✅ AI Fill completed successfully');

          // Обновляем баланс кредитов после успешной генерации
          if (onCreditsRefresh) {
            setTimeout(() => {
              onCreditsRefresh();
            }, 300);
          }
        } else {
          throw new Error('No generated text found in response');
        }
      } else {
        throw new Error('AI Fill request failed');
      }
    } finally {
      // Сбрасываем состояние загрузки
      onLoadingChange?.(nodeId, false);
    }
  }
}
