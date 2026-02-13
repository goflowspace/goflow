import type {Layer, Link, Node} from '@types-folder/nodes';

import {validateGraphConnectivity} from '../../../utils/graphConnectivityValidator';
import {pluralizeRussian} from '../../../utils/pluralization';

// Простой мок функции перевода для validateGraphConnectivity
const mockT = (key: string, fallback: string) => fallback;

// Вспомогательные функции для создания тестовых данных
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
    } as any;
  } else {
    return {
      ...baseNode,
      type: 'choice',
      data: {text: '', ...data}
    } as any;
  }
};

const createLink = (id: string, startNodeId: string, endNodeId: string): Link => ({
  id,
  type: 'link',
  startNodeId,
  endNodeId,
  conditions: []
});

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

describe('PlayBar - Интеграционные тесты', () => {
  describe('Логика обработки ошибок связности', () => {
    test('должен правильно формировать сообщение для множественных стартовых узлов', () => {
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

      // Проверяем, что сообщение содержит правильную плюрализацию
      expect(result.message).toContain('2 стартовых узла');
    });

    test('должен правильно обрабатывать плюрализацию в логике PlayBar', () => {
      // Тестируем только логику плюрализации
      const testCases = [
        {count: 1, expected: 'стартовый узел'},
        {count: 4, expected: 'стартовых узла'},
        {count: 5, expected: 'стартовых узлов'}
      ];

      testCases.forEach(({count, expected}) => {
        const result = pluralizeRussian(count, 'стартовый узел', 'стартовых узла', 'стартовых узлов');
        expect(result).toBe(expected);
      });
    });

    test('должен правильно определять информацию о стартовых узлах', () => {
      const node1 = createNode('node1', 'narrative', {
        title: 'Тестовый узел',
        text: 'Очень длинный текст, который должен быть обрезан до пятидесяти символов для предпросмотра'
      });
      const node2 = createNode('node2', 'choice', {text: 'Короткий выбор'});

      const layers = {
        root: createLayer('root', 'Root Layer', [node1, node2], [])
      };

      const result = validateGraphConnectivity(layers, mockT);

      expect(result.startNodeCount).toBe(2);

      const narrativeNode = result.startNodes.find((n) => n.id === 'node1');
      const choiceNode = result.startNodes.find((n) => n.id === 'node2');

      // Проверяем корректность извлечения информации о узлах
      expect(narrativeNode?.title).toBe('Тестовый узел');
      expect(narrativeNode?.textPreview).toBe('Очень длинный текст, который должен быть обрезан д...');
      expect(narrativeNode?.type).toBe('narrative');
      expect(narrativeNode?.layerName).toBe('Root Layer');

      expect(choiceNode?.title).toBe('Choice node');
      expect(choiceNode?.textPreview).toBe('Короткий выбор');
      expect(choiceNode?.type).toBe('choice');
    });

    test('должен обрабатывать узлы без содержимого', () => {
      const node1 = createNode('node1', 'narrative', {});
      const node2 = createNode('node2', 'choice', {});

      const layers = {
        root: createLayer('root', 'Root Layer', [node1, node2], [])
      };

      const result = validateGraphConnectivity(layers, mockT);

      const narrativeNode = result.startNodes.find((n) => n.id === 'node1');
      const choiceNode = result.startNodes.find((n) => n.id === 'node2');

      expect(narrativeNode?.title).toBe('Narrative node');
      expect(narrativeNode?.textPreview).toBe('No text');

      expect(choiceNode?.title).toBe('Choice node');
      expect(choiceNode?.textPreview).toBe('No text');
    });

    test('должен корректно обрабатывать циклические графы', () => {
      const node1 = createNode('node1', 'narrative', {title: 'Узел 1', text: 'Первый узел в цикле'});
      const node2 = createNode('node2', 'narrative', {title: 'Узел 2', text: 'Второй узел в цикле'});

      const edge1 = createLink('edge1', 'node1', 'node2');
      const edge2 = createLink('edge2', 'node2', 'node1'); // Создаем цикл

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

  describe('Плюрализация в разных сценариях', () => {
    test('должен использовать правильные формы для разных чисел стартовых узлов', () => {
      const testCases = [
        {count: 1, expected: 'стартовый узел'},
        {count: 2, expected: 'стартовых узла'},
        {count: 3, expected: 'стартовых узла'},
        {count: 4, expected: 'стартовых узла'},
        {count: 5, expected: 'стартовых узлов'},
        {count: 11, expected: 'стартовых узлов'},
        {count: 21, expected: 'стартовый узел'},
        {count: 22, expected: 'стартовых узла'},
        {count: 25, expected: 'стартовых узлов'}
      ];

      testCases.forEach(({count, expected}) => {
        const result = pluralizeRussian(count, 'стартовый узел', 'стартовых узла', 'стартовых узлов');
        expect(result).toBe(expected);
      });
    });
  });

  describe('Производительность и крайние случаи', () => {
    test('должен обрабатывать граф с большим количеством узлов', () => {
      const nodes = Array.from({length: 100}, (_, i) => createNode(`node${i}`, 'narrative', {title: `Узел ${i}`, text: `Текст узла ${i}`}));

      const layers = {
        root: createLayer('root', 'Root Layer', nodes, [])
      };

      const result = validateGraphConnectivity(layers, mockT);

      expect(result.startNodeCount).toBe(100);
      expect(result.startNodes).toHaveLength(100);
      expect(result.isConnected).toBe(false); // Все узлы изолированы
    });

    test('должен обрабатывать пустой граф', () => {
      const layers = {
        root: createLayer('root', 'Root Layer', [], [])
      };

      const result = validateGraphConnectivity(layers, mockT);

      expect(result.isConnected).toBe(true);
      expect(result.startNodeCount).toBe(0);
      expect(result.startNodes).toEqual([]);
      expect(result.unreachableNodes).toEqual([]);
    });
  });
});
