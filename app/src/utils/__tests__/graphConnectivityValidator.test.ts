import type {ChoiceNode, Layer, Link, NarrativeNode, Node} from '@types-folder/nodes';

import {validateGraphConnectivity} from '../graphConnectivityValidator';

// Мок функции перевода
const mockT = (key: string, fallback: string) => fallback;

// Вспомогательная функция для создания узла
const createNode = (id: string, type: 'narrative' | 'choice', data: any = {}): Node => {
  const baseNode = {
    id,
    coordinates: {x: 0, y: 0}
  };

  if (type === 'narrative') {
    return {
      ...baseNode,
      type: 'narrative',
      data: {title: '', text: '', ...data}
    } as NarrativeNode;
  } else {
    return {
      ...baseNode,
      type: 'choice',
      data: {text: '', ...data}
    } as ChoiceNode;
  }
};

// Вспомогательная функция для создания связи
const createLink = (id: string, startNodeId: string, endNodeId: string): Link => ({
  id,
  type: 'link',
  startNodeId,
  endNodeId,
  conditions: []
});

// Вспомогательная функция для создания слоя
const createLayer = (id: string, name: string, nodes: Node[] = [], edges: Link[] = []): Layer => ({
  type: 'layer',
  id,
  name,
  depth: 0,
  nodeIds: nodes.map((n) => n.id),
  nodes: nodes.reduce((acc, node) => ({...acc, [node.id]: node}), {}),
  edges: edges.reduce((acc, edge) => ({...acc, [edge.id]: edge}), {}),
  parentLayerId: 'root'
});

describe('validateGraphConnectivity', () => {
  describe('Пустой граф', () => {
    test('должен считать пустой граф корректным', () => {
      const layers = {
        root: createLayer('root', 'Root Layer', [], [])
      };

      const result = validateGraphConnectivity(layers, mockT);

      expect(result.isConnected).toBe(true);
      expect(result.startNodeCount).toBe(0);
      expect(result.startNodes).toEqual([]);
      expect(result.unreachableNodes).toEqual([]);
      expect(result.message).toBe('Граф пуст');
    });
  });

  describe('Один стартовый узел', () => {
    test('должен корректно обрабатывать граф с одним узлом', () => {
      const node1 = createNode('node1', 'narrative', {title: 'Начало', text: 'Начальный узел'});
      const layers = {
        root: createLayer('root', 'Root Layer', [node1], [])
      };

      const result = validateGraphConnectivity(layers, mockT);

      expect(result.isConnected).toBe(true);
      expect(result.startNodeCount).toBe(1);
      expect(result.startNodes).toHaveLength(1);
      expect(result.startNodes[0].id).toBe('node1');
      expect(result.startNodes[0].title).toBe('Начало');
      expect(result.unreachableNodes).toEqual([]);
    });

    test('должен корректно обрабатывать граф с несколькими связанными узлами', () => {
      const node1 = createNode('node1', 'narrative', {title: 'Начало', text: 'Стартовый узел'});
      const node2 = createNode('node2', 'choice', {text: 'Выбор'});
      const node3 = createNode('node3', 'narrative', {title: 'Конец', text: 'Финальный узел'});

      const edge1 = createLink('edge1', 'node1', 'node2');
      const edge2 = createLink('edge2', 'node2', 'node3');

      const layers = {
        root: createLayer('root', 'Root Layer', [node1, node2, node3], [edge1, edge2])
      };

      const result = validateGraphConnectivity(layers, mockT);

      expect(result.isConnected).toBe(true);
      expect(result.startNodeCount).toBe(1);
      expect(result.startNodes[0].id).toBe('node1');
      expect(result.unreachableNodes).toEqual([]);
    });
  });

  describe('Множественные стартовые узлы', () => {
    test('должен находить несколько стартовых узлов', () => {
      const node1 = createNode('node1', 'narrative', {title: 'Начало 1', text: 'Первый стартовый узел'});
      const node2 = createNode('node2', 'narrative', {title: 'Начало 2', text: 'Второй стартовый узел'});
      const node3 = createNode('node3', 'choice', {text: 'Выбор'});

      const edge1 = createLink('edge1', 'node1', 'node3');
      const edge2 = createLink('edge2', 'node2', 'node3');

      const layers = {
        root: createLayer('root', 'Root Layer', [node1, node2, node3], [edge1, edge2])
      };

      const result = validateGraphConnectivity(layers, mockT);

      expect(result.isConnected).toBe(false);
      expect(result.startNodeCount).toBe(2);
      expect(result.startNodes).toHaveLength(2);
      expect(result.startNodes.map((n) => n.id)).toContain('node1');
      expect(result.startNodes.map((n) => n.id)).toContain('node2');
      expect(result.unreachableNodes).toEqual([]);
      expect(result.message).toContain('2 стартовых узла');
    });

    test('должен правильно определять информацию о стартовых узлах', () => {
      const node1 = createNode('node1', 'narrative', {title: 'Тест 1', text: 'Длинный текст для проверки обрезки, который должен быть сокращен до 50 символов'});
      const node2 = createNode('node2', 'choice', {text: 'Короткий текст'});

      const layers = {
        root: createLayer('root', 'Root Layer', [node1, node2], [])
      };

      const result = validateGraphConnectivity(layers, mockT);

      expect(result.isConnected).toBe(false);
      expect(result.startNodeCount).toBe(2);

      const narrativeNode = result.startNodes.find((n) => n.id === 'node1');
      const choiceNode = result.startNodes.find((n) => n.id === 'node2');

      expect(narrativeNode?.title).toBe('Тест 1');
      expect(narrativeNode?.textPreview).toBe('Длинный текст для проверки обрезки, который должен...');
      expect(narrativeNode?.type).toBe('narrative');

      expect(choiceNode?.title).toBe('Choice node');
      expect(choiceNode?.textPreview).toBe('Короткий текст');
      expect(choiceNode?.type).toBe('choice');
    });
  });

  describe('Отсутствие стартовых узлов', () => {
    test('должен обнаруживать циклический граф без стартовых узлов', () => {
      const node1 = createNode('node1', 'narrative', {title: 'Узел 1', text: 'Первый узел'});
      const node2 = createNode('node2', 'narrative', {title: 'Узел 2', text: 'Второй узел'});

      const edge1 = createLink('edge1', 'node1', 'node2');
      const edge2 = createLink('edge2', 'node2', 'node1'); // Цикл

      const layers = {
        root: createLayer('root', 'Root Layer', [node1, node2], [edge1, edge2])
      };

      const result = validateGraphConnectivity(layers, mockT);

      expect(result.isConnected).toBe(false);
      expect(result.startNodeCount).toBe(0);
      expect(result.startNodes).toEqual([]);
      expect(result.unreachableNodes).toHaveLength(2);
      expect(result.message).toBe('Не найден стартовый узел. Все узлы имеют входящие связи (возможен цикл)');
    });
  });

  describe('Несвязанные узлы', () => {
    test('должен находить недостижимые узлы', () => {
      const node1 = createNode('node1', 'narrative', {title: 'Стартовый', text: 'Начало'});
      const node2 = createNode('node2', 'narrative', {title: 'Связанный', text: 'Связан со стартовым'});
      const node3 = createNode('node3', 'narrative', {title: 'Изолированный', text: 'Не связан с основным графом'});

      const edge1 = createLink('edge1', 'node1', 'node2');

      const layers = {
        root: createLayer('root', 'Root Layer', [node1, node2, node3], [edge1])
      };

      const result = validateGraphConnectivity(layers, mockT);

      expect(result.isConnected).toBe(false);
      expect(result.startNodeCount).toBe(2); // node1 и node3 - оба стартовые
      expect(result.startNodes).toHaveLength(2);
      expect(result.unreachableNodes).toEqual([]);
      expect(result.message).toContain('2 стартовых узла');
    });
  });

  describe('Узлы без названий', () => {
    test('должен обрабатывать узлы без title и text', () => {
      const node1 = createNode('node1', 'narrative', {});
      const node2 = createNode('node2', 'choice', {});

      const layers = {
        root: createLayer('root', 'Root Layer', [node1, node2], [])
      };

      const result = validateGraphConnectivity(layers, mockT);

      expect(result.startNodes).toHaveLength(2);

      const narrativeNode = result.startNodes.find((n) => n.id === 'node1');
      const choiceNode = result.startNodes.find((n) => n.id === 'node2');

      expect(narrativeNode?.title).toBe('Narrative node');
      expect(narrativeNode?.textPreview).toBe('No text');

      expect(choiceNode?.title).toBe('Choice node');
      expect(choiceNode?.textPreview).toBe('No text');
    });

    test('должен обрабатывать узлы с пустыми названиями', () => {
      const node1 = createNode('node1', 'narrative', {title: '', text: ''});

      const layers = {
        root: createLayer('root', 'Root Layer', [node1], [])
      };

      const result = validateGraphConnectivity(layers, mockT);

      expect(result.startNodes[0].title).toBe('Narrative node');
      expect(result.startNodes[0].textPreview).toBe('No text');
    });
  });

  describe('Многослойная структура', () => {
    test('должен обрабатывать узлы в разных слоях', () => {
      const node1 = createNode('node1', 'narrative', {title: 'Root Node', text: 'В корневом слое'});
      const node2 = createNode('node2', 'narrative', {title: 'Child Node', text: 'В дочернем слое'});

      const childLayer = createLayer('child', 'Child Layer', [node2], []);
      childLayer.parentLayerId = 'root';

      const layers = {
        root: createLayer('root', 'Root Layer', [node1], []),
        child: childLayer
      };

      const result = validateGraphConnectivity(layers, mockT);

      // Функция обрабатывает только корневой слой, поэтому ожидаем 1 узел
      expect(result.startNodes).toHaveLength(1);

      const rootNode = result.startNodes.find((n) => n.id === 'node1');

      expect(rootNode?.layerName).toBe('Root Layer');
      expect(rootNode?.id).toBe('node1');
    });
  });
});
