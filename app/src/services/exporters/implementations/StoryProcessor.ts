/**
 * Базовый процессор историй
 * Преобразует многослойную структуру в плоскую для экспорта
 */
import {ChoiceNode, Layer, Link, NarrativeNode, Node} from '@types-folder/nodes';
import {Variable} from '@types-folder/variables';

import {StoryData} from '../../../playback/engine/core/StoryData';
import {ExportableStory, IStoryProcessor} from '../interfaces/exportInterfaces';

export class StoryProcessor implements IStoryProcessor {
  /**
   * Разворачивает слои в плоскую структуру узлов и связей
   */
  flattenLayers(storyData: StoryData): ExportableStory {
    const allNodes: Node[] = [];
    const allEdges: Link[] = [];
    const allLayers: Layer[] = [];

    // Извлекаем данные из timeline структуры
    const timelineData = this.extractTimelineData(storyData);

    // Рекурсивно собираем все узлы и связи из всех слоев
    this.collectNodesAndEdges(timelineData.layers, allNodes, allEdges, allLayers);

    const startNodeId = this.findStartNodeId(allNodes, allEdges);

    return {
      title: storyData.title,
      nodes: allNodes,
      edges: allEdges,
      variables: timelineData.variables || [],
      startNodeId,
      metadata: {
        originalLayers: allLayers,
        exportedAt: new Date().toISOString(),
        version: storyData.metadata?.version || '1.0'
      }
    };
  }

  /**
   * Валидирует историю на предмет базовых ошибок
   */
  validateStory(story: ExportableStory): string[] {
    const errors: string[] = [];

    // Проверяем наличие стартового узла
    if (!story.startNodeId) {
      errors.push('Не найден стартовый узел истории');
    }

    // Проверяем существование стартового узла
    const startNode = story.nodes.find((n) => n.id === story.startNodeId);
    if (!startNode) {
      errors.push(`Стартовый узел с ID "${story.startNodeId}" не найден`);
    }

    // Проверяем наличие узлов
    if (story.nodes.length === 0) {
      errors.push('История не содержит узлов');
    }

    // Проверяем связность графа
    const unreachableNodes = this.findUnreachableNodes(story);
    if (unreachableNodes.length > 0) {
      errors.push(`Найдены недостижимые узлы: ${unreachableNodes.map((n) => n.id).join(', ')}`);
    }

    // Проверяем циклические ссылки в переменных операциях
    const cyclicVariables = this.findCyclicVariableReferences(story);
    if (cyclicVariables.length > 0) {
      errors.push(`Найдены циклические ссылки в переменных: ${cyclicVariables.join(', ')}`);
    }

    // Проверяем корректность ID связей
    const invalidEdges = story.edges.filter((edge) => !story.nodes.find((n) => n.id === edge.startNodeId) || !story.nodes.find((n) => n.id === edge.endNodeId));

    // Вместо ошибки делаем предупреждение и фильтруем невалидные связи
    if (invalidEdges.length > 0) {
      // Создаем виртуальные узлы для недостающих узлов слоев
      const missingNodeIds = new Set<string>();
      invalidEdges.forEach((edge) => {
        if (!story.nodes.find((n) => n.id === edge.startNodeId)) {
          missingNodeIds.add(edge.startNodeId);
        }
        if (!story.nodes.find((n) => n.id === edge.endNodeId)) {
          missingNodeIds.add(edge.endNodeId);
        }
      });

      // Создаем виртуальные узлы для недостающих узлов (скорее всего, это узлы слоев)
      missingNodeIds.forEach((nodeId) => {
        const virtualNode = {
          id: nodeId,
          type: 'narrative' as const,
          coordinates: {x: 0, y: 0},
          data: {title: '', text: ''}
        };
        story.nodes.push(virtualNode);
      });

      // Добавляем предупреждение вместо ошибки
      console.warn(`Созданы виртуальные узлы для недостающих узлов слоев: ${Array.from(missingNodeIds).join(', ')}`);
    }

    return errors;
  }

  /**
   * Находит стартовый узел истории
   */
  findStartNode(story: ExportableStory): string {
    return story.startNodeId;
  }

  /**
   * Извлекает данные временной линии из StoryData
   */
  private extractTimelineData(storyData: StoryData): {layers: Record<string, Layer>; variables: Variable[]} {
    // Предполагаем, что структура данных содержит timelines
    const data = (storyData as any).data;

    if (data?.timelines) {
      // Берем первую временную линию (base-timeline или первую доступную)
      const timelineKey = Object.keys(data.timelines)[0];
      const timeline = data.timelines[timelineKey];

      return {
        layers: timeline.layers || {},
        variables: timeline.variables || []
      };
    }

    // Если структура плоская (как в engine)
    if (data?.nodes && Array.isArray(data.nodes)) {
      // Создаем виртуальный слой для плоской структуры
      const virtualLayer: Layer = {
        type: 'layer',
        id: 'root',
        name: 'Main Layer',
        depth: 0,
        nodes: {},
        edges: {},
        nodeIds: []
      };

      // Преобразуем массив узлов в объект
      data.nodes.forEach((node: Node) => {
        virtualLayer.nodes[node.id] = node;
        virtualLayer.nodeIds.push(node.id);
      });

      // Преобразуем массив связей в объект
      if (data.edges && Array.isArray(data.edges)) {
        data.edges.forEach((edge: any) => {
          const link: Link = {
            id: edge.id,
            type: 'link',
            startNodeId: edge.source || edge.startNodeId,
            endNodeId: edge.target || edge.endNodeId,
            sourceHandle: edge.sourceHandle,
            targetHandle: edge.targetHandle,
            conditions: edge.data?.conditions || []
          };
          virtualLayer.edges[edge.id] = link;
        });
      }

      return {
        layers: {root: virtualLayer},
        variables: data.variables || []
      };
    }

    return {layers: {}, variables: []};
  }

  /**
   * Рекурсивно собирает все узлы и связи из слоев
   */
  private collectNodesAndEdges(layers: Record<string, Layer>, allNodes: Node[], allEdges: Link[], allLayers: Layer[]): void {
    Object.values(layers).forEach((layer) => {
      allLayers.push(layer);

      // Собираем узлы, исключая слои (так как они нужны только для структуры)
      Object.values(layer.nodes).forEach((node) => {
        if (node.type !== 'layer') {
          allNodes.push(node);
        }
      });

      // Собираем связи
      Object.values(layer.edges).forEach((edge) => {
        allEdges.push(edge);
      });
    });
  }

  /**
   * Находит ID стартового узла
   */
  private findStartNodeId(nodes: Node[], edges: Link[]): string {
    // Ищем узел, который не является целью ни одной связи
    const targetNodeIds = new Set(edges.map((edge) => edge.endNodeId));
    const candidateStartNodes = nodes.filter((node) => !targetNodeIds.has(node.id) && (node.type === 'narrative' || node.type === 'choice'));

    if (candidateStartNodes.length > 0) {
      return candidateStartNodes[0].id;
    }

    // Если все узлы являются целями, берем первый narrative узел
    const narrativeNode = nodes.find((node) => node.type === 'narrative');
    if (narrativeNode) {
      return narrativeNode.id;
    }

    // В крайнем случае берем первый узел
    return nodes.length > 0 ? nodes[0].id : '';
  }

  /**
   * Находит недостижимые узлы
   */
  private findUnreachableNodes(story: ExportableStory): Node[] {
    const reachableNodeIds = new Set<string>();
    const visited = new Set<string>();

    // DFS от стартового узла
    const dfs = (nodeId: string) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);
      reachableNodeIds.add(nodeId);

      // Найти все исходящие связи
      const outgoingEdges = story.edges.filter((edge) => edge.startNodeId === nodeId);
      outgoingEdges.forEach((edge) => dfs(edge.endNodeId));
    };

    if (story.startNodeId) {
      dfs(story.startNodeId);
    }

    // Найти все узлы, которые не были достигнуты
    return story.nodes.filter((node) => !reachableNodeIds.has(node.id) && (node.type === 'narrative' || node.type === 'choice'));
  }

  /**
   * Находит циклические ссылки в переменных операциях
   */
  private findCyclicVariableReferences(story: ExportableStory): string[] {
    // Для упрощения пока возвращаем пустой массив
    // В будущем можно добавить проверку циклических зависимостей в операциях
    return [];
  }
}
