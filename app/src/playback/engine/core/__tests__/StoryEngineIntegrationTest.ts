/**
 * Интеграционные тесты для движка истории
 * Проверяют взаимодействие различных компонентов системы
 */
import {ConditionType} from '../../../../types/nodes';
import {ConditionEvaluatorImpl} from '../../conditions/ConditionEvaluatorImpl';
import {ConditionStrategyFactory} from '../../conditions/ConditionStrategyFactory';
import {StoryData} from '../StoryData';
import {StoryEngineImpl} from '../StoryEngineImpl';

describe('Story Engine Integration', () => {
  // Создаем экземпляры компонентов
  const strategyFactory = new ConditionStrategyFactory();
  const conditionEvaluator = new ConditionEvaluatorImpl(strategyFactory);
  const engine = new StoryEngineImpl(conditionEvaluator);

  // Тестовые данные истории с условиями и выборами
  const testStoryData: StoryData = {
    title: 'Integration Test Story',
    data: {
      nodes: [
        // Стартовый узел
        {
          id: 'start',
          type: 'narrative',
          coordinates: {x: 0, y: 0},
          data: {title: 'Start', text: 'This is the start of the story.'}
        },
        // Варианты выбора
        {
          id: 'choice_a',
          type: 'choice',
          coordinates: {x: 200, y: -50},
          data: {text: 'Option A', height: 80}
        },
        {
          id: 'choice_b',
          type: 'choice',
          coordinates: {x: 200, y: 50},
          data: {text: 'Option B', height: 80}
        },
        // Результаты выбора
        {
          id: 'result_a',
          type: 'narrative',
          coordinates: {x: 300, y: -50},
          data: {title: 'Result A', text: 'You chose option A.'}
        },
        {
          id: 'result_b',
          type: 'narrative',
          coordinates: {x: 300, y: 50},
          data: {title: 'Result B', text: 'You chose option B.'}
        },
        // Узел с условием
        {
          id: 'condition_node',
          type: 'narrative',
          coordinates: {x: 400, y: 0},
          data: {title: 'Condition', text: 'This path depends on a condition.'}
        },
        // Результаты условия
        {
          id: 'success_path',
          type: 'narrative',
          coordinates: {x: 500, y: -50},
          data: {title: 'Success', text: 'Condition was met!'}
        },
        {
          id: 'failure_path',
          type: 'narrative',
          coordinates: {x: 500, y: 50},
          data: {title: 'Failure', text: 'Condition was not met.'}
        },
        // Конечный узел
        {
          id: 'end',
          type: 'narrative',
          coordinates: {x: 600, y: 0},
          data: {title: 'End', text: 'The end of the story.'}
        }
      ],
      edges: [
        // Начальные переходы
        {
          id: 'e1',
          source: 'start',
          target: 'choice_a'
        },
        {
          id: 'e2',
          source: 'start',
          target: 'choice_b'
        },
        // Переходы от выборов к результатам
        {
          id: 'e4',
          source: 'choice_a',
          target: 'result_a'
        },
        {
          id: 'e5',
          source: 'choice_b',
          target: 'result_b'
        },
        // Переходы к узлу с условием
        {
          id: 'e6',
          source: 'result_a',
          target: 'condition_node'
        },
        {
          id: 'e7',
          source: 'result_b',
          target: 'condition_node'
        },
        // Переход с условием (если выбрали option A)
        {
          id: 'e8',
          source: 'condition_node',
          target: 'success_path',
          data: {
            conditions: [
              {
                id: 'cg1',
                operator: 'AND',
                conditions: [
                  {
                    id: 'c1',
                    type: ConditionType.NODE_HAPPENED,
                    nodeId: 'choice_a'
                  }
                ]
              }
            ]
          }
        },
        // Переход с условием (если выбрали option B)
        {
          id: 'e9',
          source: 'condition_node',
          target: 'failure_path',
          data: {
            conditions: [
              {
                id: 'cg2',
                operator: 'AND',
                conditions: [
                  {
                    id: 'c2',
                    type: ConditionType.NODE_HAPPENED,
                    nodeId: 'choice_b'
                  }
                ]
              }
            ]
          }
        },
        // Завершающие переходы
        {
          id: 'e10',
          source: 'success_path',
          target: 'end'
        },
        {
          id: 'e11',
          source: 'failure_path',
          target: 'end'
        }
      ],
      variables: [
        {
          id: 'score',
          name: 'Score',
          type: 'integer',
          value: 0
        },
        {
          id: 'visited_a',
          name: 'Visited A',
          type: 'boolean',
          value: false
        },
        {
          id: 'visited_b',
          name: 'Visited B',
          type: 'boolean',
          value: false
        }
      ]
    },
    metadata: {
      timestamp: new Date().toISOString(),
      version: '1.0'
    }
  };

  beforeEach(() => {
    // Инициализируем движок перед каждым тестом
    engine.initialize(testStoryData);
  });

  it('should navigate through the story with choices and conditions', () => {
    // Начинаем историю
    const startNode = engine.getStartNode();
    expect(startNode).not.toBeNull();
    expect(startNode?.id).toBe('start');

    // Получаем доступные выборы от стартового узла
    const choices = engine.getAvailableChoices('start');
    expect(choices.length).toBe(2);
    expect(choices[0].id).toBe('choice_a');
    expect(choices[1].id).toBe('choice_b');

    // Выбираем Option A
    const resultA = engine.executeChoice('choice_a');
    expect(resultA).not.toBeNull();
    expect(resultA?.id).toBe('result_a');

    // Проверяем, что узлы добавлены в посещенные
    const gameState = engine.getState();
    expect(gameState.visitedNodes.has('choice_a')).toBe(true);
    expect(gameState.visitedNodes.has('result_a')).toBe(true);

    // Переходим к узлу с условием
    const conditionNode = engine.getNextNode('result_a');
    expect(conditionNode).not.toBeNull();
    expect(conditionNode?.id).toBe('condition_node');

    // Переходим к узлу с результатом условия (должен быть success_path, т.к. мы выбрали option A)
    const successPath = engine.getNextNode('condition_node');
    expect(successPath).not.toBeNull();
    expect(successPath?.id).toBe('success_path');

    // Переходим к концу истории
    const endNode = engine.getNextNode('success_path');
    expect(endNode).not.toBeNull();
    expect(endNode?.id).toBe('end');

    // Проверяем, что нельзя перейти дальше конца
    const beyondEnd = engine.getNextNode('end');
    expect(beyondEnd).toBeNull();
  });

  it('should follow different path based on choice', () => {
    // Начинаем историю и получаем стартовый узел
    engine.getStartNode();

    // Выбираем Option B (другой путь)
    const resultB = engine.executeChoice('choice_b');
    expect(resultB).not.toBeNull();
    expect(resultB?.id).toBe('result_b');

    // Переходим к узлу с условием
    const conditionNode = engine.getNextNode('result_b');
    expect(conditionNode?.id).toBe('condition_node');

    // Переходим к узлу с результатом условия (должен быть failure_path, т.к. мы выбрали option B)
    const failurePath = engine.getNextNode('condition_node');
    expect(failurePath).not.toBeNull();
    expect(failurePath?.id).toBe('failure_path');

    // Переходим к концу
    const endNode = engine.getNextNode('failure_path');
    expect(endNode?.id).toBe('end');
  });

  it('should track visited nodes and history correctly', () => {
    // Инициализируем движок
    engine.initialize(testStoryData);

    // Начинаем историю
    const startNode = engine.getStartNode();
    expect(startNode).not.toBeNull();
    expect(startNode?.id).toBe('start');

    // Явно посещаем стартовый узел
    engine.visitNode('start');

    // Проверяем состояние после первого узла
    let gameState = engine.getState();
    expect(gameState.visitedNodes.has('start')).toBe(true);
    expect(gameState.history.length).toBe(1); // Теперь start в истории после явного посещения

    // Выбираем Option A
    const nodeAfterChoice = engine.executeChoice('choice_a');
    expect(nodeAfterChoice).not.toBeNull();
    expect(nodeAfterChoice?.id).toBe('result_a');

    // Проверяем состояние после выбора
    gameState = engine.getState();
    expect(gameState.visitedNodes.has('choice_a')).toBe(true);
    expect(gameState.visitedNodes.has('result_a')).toBe(true);
    expect(gameState.history).toEqual(['start', 'result_a']);
  });

  it('should go back in history correctly', () => {
    // Инициализируем движок
    engine.initialize(testStoryData);

    // Начинаем и явно посещаем стартовый узел
    const startNode = engine.getStartNode();
    engine.visitNode(startNode!.id);

    // Делаем выбор
    engine.executeChoice('choice_a');

    // Возвращаемся назад
    // (должны вернуться к узлу start, т.к. choice_a будет пропущен по новой логике)
    const previousNode = engine.goBack();
    expect(previousNode).not.toBeNull();
    expect(previousNode?.id).toBe('start'); // После goBack мы всегда возвращаемся к узлу типа narrative

    // Проверяем состояние
    const gameState = engine.getState();
    expect(gameState.history).toEqual(['start']);

    // Узлы остаются в посещенных
    expect(gameState.visitedNodes.has('choice_a')).toBe(true);
    expect(gameState.visitedNodes.has('result_a')).toBe(true);
  });

  it('should restart the story correctly', () => {
    // Инициализируем движок
    engine.initialize(testStoryData);

    // Начинаем историю и явно посещаем стартовый узел
    const startNode = engine.getStartNode();
    engine.visitNode(startNode!.id);

    // Делаем несколько переходов
    engine.executeChoice('choice_a');
    const finalNode = engine.getNextNode('result_a');
    expect(finalNode).not.toBeNull();

    // Проверяем состояние перед рестартом
    let gameState = engine.getState();
    expect(gameState.history.length).toBeGreaterThan(1);
    expect(gameState.visitedNodes.size).toBeGreaterThan(1);

    // Перезапускаем историю
    const restartedNode = engine.restart();
    expect(restartedNode).not.toBeNull();
    expect(restartedNode?.id).toBe('start');

    // Проверяем, что состояние было сброшено
    gameState = engine.getState();
    expect(gameState.history.length).toBe(0); // После restart история пуста
    expect(gameState.visitedNodes.size).toBe(0); // Нет посещенных узлов
  });
});
