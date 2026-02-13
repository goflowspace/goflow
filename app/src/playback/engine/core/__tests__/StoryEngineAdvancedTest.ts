/**
 * Продвинутые тесты для движка истории
 * Проверяют сложные сценарии навигации и возврата по графу
 */
import {Choice, ConditionGroup, Node} from '../../../../types/nodes';
import {ConditionEvaluatorImpl} from '../../conditions/ConditionEvaluatorImpl';
import {ConditionStrategyFactory} from '../../conditions/ConditionStrategyFactory';
import {GameState} from '../GameState';
import {StoryData} from '../StoryData';
import {StoryEngineImpl} from '../StoryEngineImpl';

/**
 * Версия движка истории для тестов с детерминированным выбором узлов
 * Всегда выбирает первый узел из сортированного по ID массива
 */
class DeterministicStoryEngine extends StoryEngineImpl {
  // Переопределяем метод получения случайного числа
  // Всегда возвращаем 0, что даст нам первый элемент массива
  protected override getRandom(max: number): number {
    return 0;
  }

  // Добавим метод для логирования истории
  logHistory(): void {
    console.log('История:', this.getState().history);
    console.log('Посещенные узлы:', Array.from(this.getState().visitedNodes));
  }
}

describe('StoryEngine Advanced Navigation', () => {
  // Используем детерминированную версию движка истории для тестов
  const strategyFactory = new ConditionStrategyFactory();
  const conditionEvaluator = new ConditionEvaluatorImpl(strategyFactory);
  let engine: DeterministicStoryEngine;

  // Создаем тестовые данные из файла result.json
  const advancedStoryData: StoryData = {
    title: 'My awesome story',
    data: {
      nodes: [
        {
          id: 'start',
          type: 'narrative',
          coordinates: {x: 281, y: 352},
          data: {title: '', text: 'start'}
        },
        {
          id: 'node_1',
          type: 'narrative',
          coordinates: {x: 581, y: 352},
          data: {title: '', text: 'node_1'}
        },
        {
          id: 'node_2',
          type: 'narrative',
          coordinates: {x: 881, y: 352},
          data: {title: '', text: 'node_2'}
        },
        {
          id: 'choice_2_a',
          type: 'choice',
          coordinates: {x: 1180, y: 280},
          data: {text: 'choice_2_a', height: 40}
        },
        {
          id: 'choice_2_b',
          type: 'choice',
          coordinates: {x: 1180, y: 500},
          data: {text: 'choice_2_b', height: 40}
        },
        {
          id: 'node_2_b',
          type: 'narrative',
          coordinates: {x: 1480, y: 500},
          data: {title: '', text: 'node_2_b'}
        },
        {
          id: 'node_2_a',
          type: 'narrative',
          coordinates: {x: 1480, y: 120},
          data: {title: '', text: 'node_2_a'}
        },
        {
          id: 'node_3',
          type: 'narrative',
          coordinates: {x: 1940, y: 300},
          data: {title: '', text: 'node_3'}
        },
        {
          id: 'final_1',
          type: 'narrative',
          coordinates: {x: 2480, y: 380},
          data: {title: '', text: 'final_1'}
        },
        {
          id: 'choice_2_b_a',
          type: 'choice',
          coordinates: {x: 1780, y: 540},
          data: {text: 'choice_2_b_a', height: 40}
        },
        {
          id: 'choice_2_b_b',
          type: 'choice',
          coordinates: {x: 1780, y: 660},
          data: {text: 'choice_2_b_b', height: 40}
        },
        {
          id: 'final_2',
          type: 'narrative',
          coordinates: {x: 2080, y: 540},
          data: {title: '', text: 'final_2'}
        },
        {
          id: 'final_3',
          type: 'narrative',
          coordinates: {x: 2080, y: 800},
          data: {title: '', text: 'final_3'}
        }
      ],
      edges: [
        {id: '6Mogd4QkgWT4Ghx7fiX7s', source: 'start', target: 'node_1', data: {conditions: []}},
        {id: 'X8DHEUZahiUD-5ItU6i0t', source: 'node_1', target: 'node_2', data: {conditions: []}},
        {id: 'DrkpQPvBUnzkZQWRnBXc3', source: 'node_2', target: 'choice_2_a', data: {conditions: []}},
        {id: 'PO1Z7vU3GqXq7HePIRCsA', source: 'node_2', target: 'choice_2_b', data: {conditions: []}},
        {id: 'm4-GiQ78ktY_HFO3ehkxA', source: 'choice_2_b', target: 'node_2_b', data: {conditions: []}},
        {id: 'PRormtVisM54WitpR569Q', source: 'choice_2_a', target: 'node_2_a', data: {conditions: []}},
        {id: '5udVE23GzDF3uvjPEYrON', source: 'node_2_a', target: 'node_3', data: {conditions: []}},
        {id: 'hESEzcOmcaxAuG3_CSvb1', source: 'node_3', target: 'final_1', data: {conditions: []}},
        {id: 'aqhUOsiqeM1wSisG4PSPM', source: 'node_2_b', target: 'choice_2_b_a', data: {conditions: []}},
        {id: 'oqKuE7awltj2Zb5CWeGIZ', source: 'node_2_b', target: 'choice_2_b_b', data: {conditions: []}},
        {id: '3UzCRvPeJm0nb8DkIRlpH', source: 'choice_2_b_a', target: 'final_2', data: {conditions: []}},
        {id: 'Lejg0zc4hwpQyDpNjE6Ya', source: 'choice_2_b_b', target: 'final_3', data: {conditions: []}}
      ],
      variables: []
    },
    metadata: {
      timestamp: new Date().toISOString(),
      version: '1.0'
    }
  };

  beforeEach(() => {
    // Создаем новый экземпляр движка перед каждым тестом
    engine = new DeterministicStoryEngine(conditionEvaluator);
    engine.initialize(advancedStoryData);
  });

  describe('Базовая навигация', () => {
    it('должен корректно перемещаться от стартового узла до финала', () => {
      // Начинаем с получения стартового узла
      const startNode = engine.getStartNode();
      expect(startNode).not.toBeNull();
      expect(startNode?.id).toBe('start');

      // Проверяем, что история пуста после getStartNode
      let state = engine.getState();
      expect(state.history).toEqual([]);
      expect(state.visitedNodes.has('start')).toBe(false);

      // Явно посещаем стартовый узел
      engine.visitNode('start');

      // Теперь проверяем, что стартовый узел в истории
      state = engine.getState();
      expect(state.history).toEqual(['start']);
      expect(state.visitedNodes.has('start')).toBe(true);

      // Переходим к следующему узлу с помощью moveForward
      let nextNode = engine.moveForward('start', true);
      expect(nextNode?.id).toBe('node_1');

      // Проверяем состояние после перехода
      state = engine.getState();
      expect(state.history).toEqual(['start', 'node_1']);
      expect(state.visitedNodes.has('node_1')).toBe(true);

      // Продолжаем движение по графу
      nextNode = engine.moveForward('node_1', true);
      expect(nextNode?.id).toBe('node_2');

      // Проверяем состояние
      state = engine.getState();
      expect(state.history).toEqual(['start', 'node_1', 'node_2']);
      expect(state.visitedNodes.has('node_2')).toBe(true);

      // Проверяем доступные выборы
      const choices = engine.getAvailableChoices('node_2');
      expect(choices.length).toBe(2);
      expect(choices[0].id).toBe('choice_2_a');
      expect(choices[1].id).toBe('choice_2_b');

      // Выполняем выбор
      const choiceResult = engine.executeChoice('choice_2_a');
      expect(choiceResult?.id).toBe('node_2_a');

      // Проверяем состояние после выбора
      state = engine.getState();
      expect(state.history).toEqual(['start', 'node_1', 'node_2', 'node_2_a']);
      expect(state.visitedNodes.has('choice_2_a')).toBe(true);
      expect(state.visitedNodes.has('node_2_a')).toBe(true);

      // Продолжаем движение
      nextNode = engine.moveForward('node_2_a', true);
      expect(nextNode?.id).toBe('node_3');

      // Завершаем путь
      nextNode = engine.moveForward('node_3', true);
      expect(nextNode?.id).toBe('final_1');

      // Проверяем, что больше нет путей дальше
      nextNode = engine.moveForward('final_1', true);
      expect(nextNode).toBeNull();

      // Проверяем финальное состояние
      state = engine.getState();
      expect(state.history).toEqual(['start', 'node_1', 'node_2', 'node_2_a', 'node_3', 'final_1']);
      expect(state.visitedNodes.has('final_1')).toBe(true);
    });
  });

  describe('Работа с выборами', () => {
    it('должен обрабатывать разные пути в зависимости от выбора', () => {
      // Начинаем историю
      engine.getStartNode();
      // Явно посещаем стартовый узел
      engine.visitNode('start');
      // Посещаем следующие узлы
      engine.moveForward('start', true);
      engine.moveForward('node_1', true);

      // Проверяем, что мы в узле с выбором
      const currentNode = engine.getCurrentNode();
      expect(currentNode?.id).toBe('node_2');

      // Проверяем доступные выборы
      let choices = engine.getAvailableChoices('node_2');
      expect(choices.length).toBe(2);

      // Выбираем второй путь
      // Для этого переопределяем getRandom
      Object.defineProperty(engine, 'getRandom', {
        value: function (max: number) {
          return max > 1 ? 1 : 0; // Выбираем второй элемент, когда возможно
        },
        configurable: true
      });

      const nodeAfterChoice = engine.executeChoice('choice_2_b');
      expect(nodeAfterChoice?.id).toBe('node_2_b');

      // Восстанавливаем оригинальное поведение getRandom
      Object.defineProperty(engine, 'getRandom', {
        value: function (max: number) {
          return 0;
        },
        configurable: true
      });

      // Проверяем состояние
      const state = engine.getState();
      expect(state.history).toEqual(['start', 'node_1', 'node_2', 'node_2_b']);
      expect(state.visitedNodes.has('choice_2_b')).toBe(true);
      expect(state.visitedNodes.has('node_2_b')).toBe(true);

      // Проверяем доступные выборы в node_2_b
      choices = engine.getAvailableChoices('node_2_b');
      expect(choices.length).toBe(2);
      expect(choices[0].id).toBe('choice_2_b_a');
      expect(choices[1].id).toBe('choice_2_b_b');
    });
  });

  describe('Возврат назад', () => {
    it('должен корректно возвращаться на шаг назад', () => {
      // Проходим путь до node_2_a
      engine.getStartNode();
      engine.visitNode('start');
      engine.moveForward('start', true);
      engine.moveForward('node_1', true);
      engine.moveForward('node_2', true);
      engine.executeChoice('choice_2_a');

      // Проверяем текущее состояние
      let state = engine.getState();
      expect(state.history).toEqual(['start', 'node_1', 'node_2', 'node_2_a']);

      // Возвращаемся на шаг назад
      const prevNode = engine.goBack();
      expect(prevNode).not.toBeNull();
      expect(prevNode?.id).toBe('node_2');

      // Проверяем обновленное состояние
      state = engine.getState();
      expect(state.history).toEqual(['start', 'node_1', 'node_2']);

      // Возвращаемся еще раз
      const prevNode2 = engine.goBack();
      expect(prevNode2).not.toBeNull();
      expect(prevNode2?.id).toBe('node_1');

      // Проверяем состояние
      state = engine.getState();
      expect(state.history).toEqual(['start', 'node_1']);
    });

    it('должен останавливаться на стартовом узле при многократном возврате', () => {
      // Проходим путь до node_1
      engine.getStartNode();
      engine.visitNode('start');
      engine.moveForward('start', true);

      // Проверяем начальное состояние
      let state = engine.getState();
      expect(state.history).toEqual(['start', 'node_1']);

      // Возвращаемся на шаг назад
      let prevNode = engine.goBack();
      expect(prevNode?.id).toBe('start');

      // Проверяем, что в истории только стартовый узел
      state = engine.getState();
      expect(state.history).toEqual(['start']);

      // Еще один возврат должен вернуть null, так как нельзя вернуться дальше единственного узла
      prevNode = engine.goBack();
      expect(prevNode).toBeNull();

      // История все еще содержит только стартовый узел
      state = engine.getState();
      expect(state.history).toEqual(['start']);
    });
  });

  describe('Перезапуск истории', () => {
    it('должен корректно перезапускать историю и сбрасывать состояние', () => {
      // Проходим путь до node_3
      engine.getStartNode();
      engine.visitNode('start');
      engine.moveForward('start', true);
      engine.moveForward('node_1', true);
      engine.moveForward('node_2', true);
      engine.executeChoice('choice_2_a');
      engine.moveForward('node_2_a', true);

      // Проверяем текущее состояние
      let state = engine.getState();
      expect(state.history.length).toBe(5); // start, node_1, node_2, node_2_a, node_3
      expect(state.visitedNodes.size).toBeGreaterThan(0);

      // Перезапускаем историю
      const startNode = engine.restart();
      expect(startNode).not.toBeNull();
      expect(startNode?.id).toBe('start');

      // Проверяем, что состояние сброшено
      state = engine.getState();
      expect(state.history).toEqual([]); // После restart история пуста
      expect(state.visitedNodes.size).toBe(0); // Нет посещенных узлов

      // Проверяем, что мы можем продолжить историю
      engine.visitNode('start');
      const nextNode = engine.moveForward('start', true);
      expect(nextNode?.id).toBe('node_1');
    });
  });

  describe('Альтернативные пути', () => {
    it('должен корректно возвращаться и выбирать другой путь', () => {
      // Проходим по первому пути
      engine.getStartNode();
      engine.visitNode('start');
      engine.moveForward('start', true);
      engine.moveForward('node_1', true);
      engine.moveForward('node_2', true);
      engine.executeChoice('choice_2_a');

      // Возвращаемся назад к узлу node_2
      const prevNode = engine.goBack();
      expect(prevNode?.id).toBe('node_2');

      // Выбираем альтернативный путь
      // Переопределяем getRandom для выбора второго пути
      Object.defineProperty(engine, 'getRandom', {
        value: function (max: number) {
          return max > 1 ? 1 : 0;
        },
        configurable: true
      });

      const nodeAfterChoice = engine.executeChoice('choice_2_b');
      expect(nodeAfterChoice?.id).toBe('node_2_b');

      // Восстанавливаем оригинальное поведение
      Object.defineProperty(engine, 'getRandom', {
        value: function (max: number) {
          return 0;
        },
        configurable: true
      });

      // Проверяем состояние
      const state = engine.getState();
      expect(state.history).toEqual(['start', 'node_1', 'node_2', 'node_2_b']);
      expect(state.visitedNodes.has('choice_2_a')).toBe(true); // Сохраняется предыдущий выбор
      expect(state.visitedNodes.has('choice_2_b')).toBe(true);
      expect(state.visitedNodes.has('node_2_a')).toBe(true); // Сохраняется предыдущий посещенный узел
      expect(state.visitedNodes.has('node_2_b')).toBe(true);
    });
  });

  describe('Проверка текущего узла', () => {
    it('должен правильно возвращать текущий узел на основе истории', () => {
      // Начинаем историю
      const startNode = engine.getStartNode();

      // Проверяем текущий узел (пока история пуста, возвращается стартовый)
      let currentNode = engine.getCurrentNode();
      expect(currentNode?.id).toBe('start');

      // Явно посещаем стартовый узел
      engine.visitNode('start');

      // Проверяем текущий узел после посещения
      currentNode = engine.getCurrentNode();
      expect(currentNode?.id).toBe('start');

      // Переходим вперед
      engine.moveForward('start', true);

      // Проверяем текущий узел
      currentNode = engine.getCurrentNode();
      expect(currentNode?.id).toBe('node_1');

      // Делаем еще шаг вперед
      engine.moveForward('node_1', true);

      // Проверяем текущий узел
      currentNode = engine.getCurrentNode();
      expect(currentNode?.id).toBe('node_2');

      // Возвращаемся назад
      engine.goBack();

      // Проверяем текущий узел после возврата
      currentNode = engine.getCurrentNode();
      expect(currentNode?.id).toBe('node_1');
    });
  });
});
