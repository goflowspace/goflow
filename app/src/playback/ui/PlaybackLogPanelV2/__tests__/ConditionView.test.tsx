import React from 'react';

import {render} from '@testing-library/react';

import {ConditionType} from '../../../../types/nodes';
import {ConditionView} from '../components/ConditionView';
import {Condition, NodeHappenedCondition, NodeNotHappenedCondition, ProbabilityCondition, VariableComparisonCondition} from '../types';

// Мокаем react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'playback.log_panel.probability': 'Probability',
        'playback.log_panel.visited_node': 'Visited node',
        'playback.log_panel.not_visited_node': 'NOT visited node'
      };
      return translations[key] || key;
    }
  })
}));

describe('ConditionView', () => {
  describe('formatConditionValue', () => {
    it('должен форматировать процентные значения', () => {
      const condition: VariableComparisonCondition = {
        id: 'test',
        type: ConditionType.VARIABLE_COMPARISON,
        index: 1,
        valType: 'custom',
        variableName: 'sss',
        variableType: 'percent',
        comparator: '≥',
        value: 1
      };

      const {container} = render(<ConditionView condition={condition} />);
      const valueElement = container.querySelector('.conditionValue');
      expect(valueElement?.textContent).toBe('1%');
    });

    it('должен форматировать строковые значения', () => {
      const condition: VariableComparisonCondition = {
        id: 'test',
        type: ConditionType.VARIABLE_COMPARISON,
        index: 1,
        valType: 'custom',
        variableName: 'username',
        variableType: 'string',
        comparator: '=',
        value: 'John'
      };

      const {container} = render(<ConditionView condition={condition} />);
      const valueElement = container.querySelector('.conditionValue');
      expect(valueElement?.textContent).toBe('John');
    });

    it('должен форматировать булевые значения', () => {
      const conditionTrue: VariableComparisonCondition = {
        id: 'test1',
        type: ConditionType.VARIABLE_COMPARISON,
        index: 1,
        valType: 'custom',
        variableName: 'isActive',
        variableType: 'boolean',
        comparator: '=',
        value: true
      };

      const conditionFalse: VariableComparisonCondition = {
        id: 'test2',
        type: ConditionType.VARIABLE_COMPARISON,
        index: 2,
        valType: 'custom',
        variableName: 'isActive',
        variableType: 'boolean',
        comparator: '=',
        value: false
      };

      const {container: container1} = render(<ConditionView condition={conditionTrue} />);
      const {container: container2} = render(<ConditionView condition={conditionFalse} />);

      expect(container1.querySelector('.conditionValue')?.textContent).toBe('true');
      expect(container2.querySelector('.conditionValue')?.textContent).toBe('false');
    });

    it('должен форматировать числовые значения', () => {
      const condition: VariableComparisonCondition = {
        id: 'test',
        type: ConditionType.VARIABLE_COMPARISON,
        index: 1,
        valType: 'custom',
        variableName: 'score',
        variableType: 'integer',
        comparator: '>',
        value: 100
      };

      const {container} = render(<ConditionView condition={condition} />);
      const valueElement = container.querySelector('.conditionValue');
      expect(valueElement?.textContent).toBe('100');
    });
  });

  describe('сравнение переменных', () => {
    it('должен правильно отображать сравнение с кастомным значением', () => {
      const condition: VariableComparisonCondition = {
        id: 'test',
        type: ConditionType.VARIABLE_COMPARISON,
        index: 1,
        valType: 'custom',
        variableName: 'health',
        variableType: 'integer',
        comparator: '≤',
        value: 50
      };

      const {container} = render(<ConditionView condition={condition} />);

      expect(container.querySelector('.conditionIndex')?.textContent).toBe('1.');
      expect(container.querySelector('.conditionVariable')?.textContent).toBe('health');
      expect(container.querySelector('.conditionComparator')?.textContent).toBe('≤');
      expect(container.querySelector('.conditionValue')?.textContent).toBe('50');
    });

    it('должен правильно отображать сравнение двух переменных', () => {
      const condition: VariableComparisonCondition = {
        id: 'test',
        type: ConditionType.VARIABLE_COMPARISON,
        index: 2,
        valType: 'variable',
        variableName: 'playerScore',
        comparator: '>',
        comparisonVariableName: 'enemyScore'
      };

      const {container} = render(<ConditionView condition={condition} />);

      expect(container.querySelector('.conditionIndex')?.textContent).toBe('2.');
      const variables = container.querySelectorAll('.conditionVariable');
      expect(variables[0]?.textContent).toBe('playerScore');
      expect(variables[1]?.textContent).toBe('enemyScore');
      expect(container.querySelector('.conditionComparator')?.textContent).toBe('>');
    });
  });

  describe('условие вероятности', () => {
    it('должен правильно отображать условие вероятности', () => {
      const condition: ProbabilityCondition = {
        id: 'test',
        type: ConditionType.PROBABILITY,
        index: 1,
        probability: 75
      };

      const {container} = render(<ConditionView condition={condition} />);

      expect(container.querySelector('.conditionIndex')?.textContent).toBe('1.');
      expect(container.querySelector('.conditionVariable')?.textContent).toBe('Probability');
      expect(container.querySelector('.conditionComparator')?.textContent).toBe('>');
      expect(container.querySelector('.conditionValue')?.textContent).toBe('75%');
    });
  });

  describe('условия посещения узлов', () => {
    it('должен правильно отображать условие "узел посещен"', () => {
      const condition: NodeHappenedCondition = {
        id: 'test',
        type: ConditionType.NODE_HAPPENED,
        index: 3,
        nodeName: 'Начало истории'
      };

      const {container} = render(<ConditionView condition={condition} />);

      expect(container.querySelector('.conditionIndex')?.textContent).toBe('3.');
      expect(container.querySelector('.conditionVariable')?.textContent).toBe('Visited node');
      expect(container.querySelector('.conditionValue')?.textContent).toBe('Начало истории');
    });

    it('должен правильно отображать условие "узел НЕ посещен"', () => {
      const condition: NodeNotHappenedCondition = {
        id: 'test',
        type: ConditionType.NODE_NOT_HAPPENED,
        index: 4,
        nodeName: 'Секретная комната'
      };

      const {container} = render(<ConditionView condition={condition} />);

      expect(container.querySelector('.conditionIndex')?.textContent).toBe('4.');
      expect(container.querySelector('.conditionVariable')?.textContent).toBe('NOT visited node');
      expect(container.querySelector('.conditionValue')?.textContent).toBe('Секретная комната');
    });
  });

  describe('интеграционные тесты', () => {
    it('должен правильно отображать условие с процентной переменной', () => {
      const condition: VariableComparisonCondition = {
        id: 'test',
        type: ConditionType.VARIABLE_COMPARISON,
        index: 1,
        valType: 'custom',
        variableName: 'sss',
        variableType: 'percent',
        comparator: '≥',
        value: 1
      };

      const {container} = render(<ConditionView condition={condition} />);
      const text = container.textContent;
      expect(text).toBe('1.sss≥1%');
    });

    it('должен правильно отображать все типы компараторов', () => {
      const comparators = ['=', '≠', '>', '≥', '<', '≤'];

      comparators.forEach((comparator, index) => {
        const condition: VariableComparisonCondition = {
          id: `test-${index}`,
          type: ConditionType.VARIABLE_COMPARISON,
          index: index + 1,
          valType: 'custom',
          variableName: 'var',
          comparator,
          value: 10
        };

        const {container} = render(<ConditionView condition={condition} />);
        expect(container.querySelector('.conditionComparator')?.textContent).toBe(comparator);
      });
    });
  });

  describe('formatNumber - округление числовых значений', () => {
    it('должен оставлять целые числа без изменений', () => {
      const condition: VariableComparisonCondition = {
        id: 'test',
        type: ConditionType.VARIABLE_COMPARISON,
        index: 1,
        valType: 'custom',
        variableName: 'score',
        variableType: 'integer',
        comparator: '=',
        value: 42
      };

      const {container} = render(<ConditionView condition={condition} />);
      const valueElement = container.querySelector('.conditionValue');
      expect(valueElement?.textContent).toBe('42');
    });

    it('должен округлять дробные числа до 2 знаков после запятой', () => {
      const condition: VariableComparisonCondition = {
        id: 'test',
        type: ConditionType.VARIABLE_COMPARISON,
        index: 1,
        valType: 'custom',
        variableName: 'temperature',
        variableType: 'float',
        comparator: '>',
        value: 3.14159
      };

      const {container} = render(<ConditionView condition={condition} />);
      const valueElement = container.querySelector('.conditionValue');
      expect(valueElement?.textContent).toBe('3.14');
    });

    it('должен правильно обрабатывать числа с одним знаком после запятой', () => {
      const condition: VariableComparisonCondition = {
        id: 'test',
        type: ConditionType.VARIABLE_COMPARISON,
        index: 1,
        valType: 'custom',
        variableName: 'distance',
        variableType: 'float',
        comparator: '≥',
        value: 2.5
      };

      const {container} = render(<ConditionView condition={condition} />);
      const valueElement = container.querySelector('.conditionValue');
      expect(valueElement?.textContent).toBe('2.5');
    });

    it('должен убирать лишние нули после округления', () => {
      const condition: VariableComparisonCondition = {
        id: 'test',
        type: ConditionType.VARIABLE_COMPARISON,
        index: 1,
        valType: 'custom',
        variableName: 'weight',
        variableType: 'float',
        comparator: '≤',
        value: 5.1
      };

      const {container} = render(<ConditionView condition={condition} />);
      const valueElement = container.querySelector('.conditionValue');
      expect(valueElement?.textContent).toBe('5.1');
    });

    it('должен округлять очень маленькие числа', () => {
      const condition: VariableComparisonCondition = {
        id: 'test',
        type: ConditionType.VARIABLE_COMPARISON,
        index: 1,
        valType: 'custom',
        variableName: 'precision',
        variableType: 'float',
        comparator: '<',
        value: 0.123456789
      };

      const {container} = render(<ConditionView condition={condition} />);
      const valueElement = container.querySelector('.conditionValue');
      expect(valueElement?.textContent).toBe('0.12');
    });

    it('должен не затрагивать процентные значения (они обрабатываются отдельно)', () => {
      const condition: VariableComparisonCondition = {
        id: 'test',
        type: ConditionType.VARIABLE_COMPARISON,
        index: 1,
        valType: 'custom',
        variableName: 'success_rate',
        variableType: 'percent',
        comparator: '≥',
        value: 33.333333
      };

      const {container} = render(<ConditionView condition={condition} />);
      const valueElement = container.querySelector('.conditionValue');

      // Процентные значения не округляются в условиях, показываются как есть с символом %
      expect(valueElement?.textContent).toBe('33.333333%');
    });
  });
});
