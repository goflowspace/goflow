import React from 'react';

import {render} from '@testing-library/react';

import {OperationType} from '../../../../types/variables';
import {OperationView} from '../components/OperationView';
import {Operation} from '../types';

// Мокаем react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'playback.operations.inverted': 'inverted',
        'playback.operations.joined': 'joined with'
      };
      return translations[key] || key;
    }
  })
}));

describe('OperationView', () => {
  describe('formatOperator', () => {
    it('должен правильно форматировать операторы', () => {
      const testCases: Array<{operator: OperationType; expected: string}> = [
        {operator: 'addition', expected: '+'},
        {operator: 'subtract', expected: '-'},
        {operator: 'multiply', expected: '×'},
        {operator: 'divide', expected: '÷'},
        {operator: 'override', expected: ''},
        {operator: 'invert', expected: 'inverted'},
        {operator: 'join', expected: 'joined with'}
      ];

      testCases.forEach(({operator, expected}) => {
        const operation: Operation = {
          id: 'test',
          variableName: 'test',
          operator,
          value: undefined,
          result: undefined
        };

        const {container} = render(<OperationView operation={operation} index={1} />);
        const operatorElement = container.querySelector('.operationOperator');
        expect(operatorElement?.textContent).toBe(expected);
      });
    });
  });

  describe('formatValue', () => {
    it('должен форматировать процентные значения', () => {
      const operation: Operation = {
        id: 'test',
        variableName: 'percent_var',
        variableType: 'percent',
        operator: 'addition',
        value: 0.25, // 25%
        result: 0.5
      };

      const {container} = render(<OperationView operation={operation} index={1} />);
      const valueElement = container.querySelector('.operationValue');
      expect(valueElement?.textContent).toBe('25%');
    });

    it('должен форматировать строковые значения', () => {
      const operation: Operation = {
        id: 'test',
        variableName: 'string_var',
        variableType: 'string',
        operator: 'join',
        value: 'test string',
        result: 'test string'
      };

      const {container} = render(<OperationView operation={operation} index={1} />);
      const valueElement = container.querySelector('.operationValue');
      expect(valueElement?.textContent).toBe('"test string"');
    });

    it('должен форматировать булевые значения', () => {
      const operation: Operation = {
        id: 'test',
        variableName: 'bool_var',
        variableType: 'boolean',
        operator: 'addition',
        value: true,
        result: false
      };

      const {container} = render(<OperationView operation={operation} index={1} />);
      const valueElement = container.querySelector('.operationValue');
      expect(valueElement?.textContent).toBe('true');
    });

    it('должен форматировать числовые значения', () => {
      const operation: Operation = {
        id: 'test',
        variableName: 'number_var',
        variableType: 'integer',
        operator: 'addition',
        value: 42,
        result: 100
      };

      const {container} = render(<OperationView operation={operation} index={1} />);
      const valueElement = container.querySelector('.operationValue');
      expect(valueElement?.textContent).toBe('42');
    });

    it('не должен отображать значение для операций override и invert', () => {
      const operationOverride: Operation = {
        id: 'test1',
        variableName: 'var',
        operator: 'override',
        value: 10,
        result: 10
      };

      const operationInvert: Operation = {
        id: 'test2',
        variableName: 'bool_var',
        operator: 'invert',
        value: undefined,
        result: true
      };

      const {container: container1} = render(<OperationView operation={operationOverride} index={1} />);
      const {container: container2} = render(<OperationView operation={operationInvert} index={2} />);

      expect(container1.querySelector('.operationValue')).toBeNull();
      expect(container2.querySelector('.operationValue')).toBeNull();
    });
  });

  describe('formatResult', () => {
    it('должен форматировать процентные результаты', () => {
      const operation: Operation = {
        id: 'test',
        variableName: 'percent_var',
        variableType: 'percent',
        operator: 'addition',
        value: 0.25,
        result: 0.75 // 75%
      };

      const {container} = render(<OperationView operation={operation} index={1} />);
      const resultElement = container.querySelector('.operationResult');
      expect(resultElement?.textContent).toBe('75%');
    });

    it('должен форматировать строковые результаты', () => {
      const operation: Operation = {
        id: 'test',
        variableName: 'string_var',
        variableType: 'string',
        operator: 'join',
        value: 'World',
        result: 'Hello World'
      };

      const {container} = render(<OperationView operation={operation} index={1} />);
      const resultElement = container.querySelector('.operationResult');
      expect(resultElement?.textContent).toBe('"Hello World"');
    });

    it('должен форматировать числовые результаты', () => {
      const operation: Operation = {
        id: 'test',
        variableName: 'number_var',
        variableType: 'integer',
        operator: 'addition',
        value: 30,
        result: 130
      };

      const {container} = render(<OperationView operation={operation} index={1} />);
      const resultElement = container.querySelector('.operationResult');
      expect(resultElement?.textContent).toBe('130');
    });

    it('должен форматировать булевые результаты', () => {
      const operationTrue: Operation = {
        id: 'test1',
        variableName: 'bool_var',
        variableType: 'boolean',
        operator: 'invert',
        value: undefined,
        result: true
      };

      const operationFalse: Operation = {
        id: 'test2',
        variableName: 'bool_var',
        variableType: 'boolean',
        operator: 'invert',
        value: undefined,
        result: false
      };

      const {container: container1} = render(<OperationView operation={operationTrue} index={1} />);
      const {container: container2} = render(<OperationView operation={operationFalse} index={2} />);

      expect(container1.querySelector('.operationResult')?.textContent).toBe('true');
      expect(container2.querySelector('.operationResult')?.textContent).toBe('false');
    });

    it('должен отображать N/A для undefined результатов', () => {
      const operation: Operation = {
        id: 'test',
        variableName: 'var',
        operator: 'addition',
        value: 10,
        result: undefined
      };

      const {container} = render(<OperationView operation={operation} index={1} />);
      const resultElement = container.querySelector('.operationResult');
      expect(resultElement?.textContent).toBe('N/A');
    });
  });

  describe('интеграционные тесты', () => {
    it('должен корректно отображать полную операцию', () => {
      const operation: Operation = {
        id: 'test',
        variableName: 'score',
        variableType: 'integer',
        operator: 'addition',
        value: 10,
        result: 110
      };

      const {container} = render(<OperationView operation={operation} index={3} />);

      expect(container.querySelector('.operationIndex')?.textContent).toBe('3.');
      expect(container.querySelector('.operationVariable')?.textContent).toBe('score');
      expect(container.querySelector('.operationOperator')?.textContent).toBe('+');
      expect(container.querySelector('.operationValue')?.textContent).toBe('10');
      expect(container.querySelector('.operationArrow')?.textContent).toBe('→');
      expect(container.querySelector('.operationResult')?.textContent).toBe('110');
    });

    it('должен корректно отображать операцию override без значения', () => {
      const operation: Operation = {
        id: 'test',
        variableName: 'name',
        variableType: 'string',
        operator: 'override',
        value: 'John',
        result: 'John'
      };

      const {container} = render(<OperationView operation={operation} index={1} />);

      expect(container.querySelector('.operationIndex')?.textContent).toBe('1.');
      expect(container.querySelector('.operationVariable')?.textContent).toBe('name');
      expect(container.querySelector('.operationOperator')?.textContent).toBe('');
      expect(container.querySelector('.operationValue')).toBeNull(); // Не должно быть значения для override
      expect(container.querySelector('.operationArrow')?.textContent).toBe('→');
      expect(container.querySelector('.operationResult')?.textContent).toBe('"John"');
    });

    it('должен корректно отображать операцию invert без значения', () => {
      const operation: Operation = {
        id: 'test',
        variableName: 'isActive',
        variableType: 'boolean',
        operator: 'invert',
        value: undefined,
        result: false
      };

      const {container} = render(<OperationView operation={operation} index={2} />);

      expect(container.querySelector('.operationIndex')?.textContent).toBe('2.');
      expect(container.querySelector('.operationVariable')?.textContent).toBe('isActive');
      expect(container.querySelector('.operationOperator')?.textContent).toBe('inverted');
      expect(container.querySelector('.operationValue')).toBeNull(); // Не должно быть значения для invert
      expect(container.querySelector('.operationArrow')?.textContent).toBe('→');
      expect(container.querySelector('.operationResult')?.textContent).toBe('false');
    });
  });

  describe('formatValue2', () => {
    it('должен форматировать процентные значения', () => {
      const operation: Operation = {
        id: 'test',
        variableName: 'percent_var',
        variableType: 'percent',
        operator: 'addition',
        value: 0.25, // 25%
        result: 0.5
      };

      const {container} = render(<OperationView operation={operation} index={1} />);
      const valueElement = container.querySelector('.operationValue');
      expect(valueElement?.textContent).toBe('25%');
    });

    it('должен форматировать строковые значения', () => {
      const operation: Operation = {
        id: 'test',
        variableName: 'string_var',
        variableType: 'string',
        operator: 'join',
        value: 'test string',
        result: 'test string'
      };

      const {container} = render(<OperationView operation={operation} index={1} />);
      const valueElement = container.querySelector('.operationValue');
      expect(valueElement?.textContent).toBe('"test string"');
    });

    it('должен форматировать булевые значения', () => {
      const operation: Operation = {
        id: 'test',
        variableName: 'bool_var',
        variableType: 'boolean',
        operator: 'addition',
        value: true,
        result: false
      };

      const {container} = render(<OperationView operation={operation} index={1} />);
      const valueElement = container.querySelector('.operationValue');
      expect(valueElement?.textContent).toBe('true');
    });

    it('должен форматировать числовые значения', () => {
      const operation: Operation = {
        id: 'test',
        variableName: 'number_var',
        variableType: 'integer',
        operator: 'addition',
        value: 42,
        result: 100
      };

      const {container} = render(<OperationView operation={operation} index={1} />);
      const valueElement = container.querySelector('.operationValue');
      expect(valueElement?.textContent).toBe('42');
    });

    it('не должен отображать значение для операций override и invert', () => {
      const operationOverride: Operation = {
        id: 'test1',
        variableName: 'var',
        operator: 'override',
        value: 10,
        result: 10
      };

      const operationInvert: Operation = {
        id: 'test2',
        variableName: 'bool_var',
        operator: 'invert',
        value: undefined,
        result: true
      };

      const {container: container1} = render(<OperationView operation={operationOverride} index={1} />);
      const {container: container2} = render(<OperationView operation={operationInvert} index={2} />);

      expect(container1.querySelector('.operationValue')).toBeNull();
      expect(container2.querySelector('.operationValue')).toBeNull();
    });

    it('должен форматировать имена переменных без кавычек', () => {
      const operation: Operation = {
        id: 'test',
        variableName: 'int1',
        variableType: 'integer',
        operator: 'addition',
        value: 'int2', // Имя переменной
        result: 11,
        isVariableValue: true // Указываем, что это имя переменной
      };

      const {container} = render(<OperationView operation={operation} index={1} />);
      const valueElement = container.querySelector('.operationValue');
      expect(valueElement?.textContent).toBe('int2'); // Без кавычек
    });

    it('должен форматировать кастомные строковые значения с кавычками', () => {
      const operation: Operation = {
        id: 'test',
        variableName: 'name',
        variableType: 'string',
        operator: 'join',
        value: ' PETER', // Кастомное значение
        result: 'vasya PETER',
        isVariableValue: false // Указываем, что это кастомное значение
      };

      const {container} = render(<OperationView operation={operation} index={1} />);
      const valueElement = container.querySelector('.operationValue');
      expect(valueElement?.textContent).toBe('" PETER"'); // С кавычками
    });

    it('должен форматировать числовые значения без кавычек', () => {
      const operation: Operation = {
        id: 'test',
        variableName: 'score',
        variableType: 'integer',
        operator: 'addition',
        value: 42, // Числовое значение
        result: 142,
        isVariableValue: false
      };

      const {container} = render(<OperationView operation={operation} index={1} />);
      const valueElement = container.querySelector('.operationValue');
      expect(valueElement?.textContent).toBe('42'); // Без кавычек
    });

    it('должен правильно отображать операцию присваивания переменной', () => {
      const operation: Operation = {
        id: 'test',
        variableName: 'name2',
        variableType: 'string',
        operator: 'override',
        value: 'name', // Имя переменной
        result: 'vasya PETER',
        isVariableValue: true // Это имя переменной
      };

      const {container} = render(<OperationView operation={operation} index={1} />);

      // Для операции override не должно быть отображения значения
      const valueElement = container.querySelector('.operationValue');
      expect(valueElement).toBeNull();
    });
  });

  describe('formatNumber - округление числовых значений', () => {
    it('должен оставлять целые числа без изменений', () => {
      const operation: Operation = {
        id: 'test',
        variableName: 'score',
        variableType: 'integer',
        operator: 'addition',
        value: 42,
        result: 100
      };

      const {container} = render(<OperationView operation={operation} index={1} />);
      const valueElement = container.querySelector('.operationValue');
      const resultElement = container.querySelector('.operationResult');

      expect(valueElement?.textContent).toBe('42');
      expect(resultElement?.textContent).toBe('100');
    });

    it('должен округлять дробные числа до 2 знаков после запятой', () => {
      const operation: Operation = {
        id: 'test',
        variableName: 'temperature',
        variableType: 'float',
        operator: 'addition',
        value: 3.14159,
        result: 98.76543
      };

      const {container} = render(<OperationView operation={operation} index={1} />);
      const valueElement = container.querySelector('.operationValue');
      const resultElement = container.querySelector('.operationResult');

      expect(valueElement?.textContent).toBe('3.14');
      expect(resultElement?.textContent).toBe('98.77');
    });

    it('должен правильно обрабатывать числа с одним знаком после запятой', () => {
      const operation: Operation = {
        id: 'test',
        variableName: 'distance',
        variableType: 'float',
        operator: 'multiply',
        value: 2.5,
        result: 7.5
      };

      const {container} = render(<OperationView operation={operation} index={1} />);
      const valueElement = container.querySelector('.operationValue');
      const resultElement = container.querySelector('.operationResult');

      expect(valueElement?.textContent).toBe('2.5');
      expect(resultElement?.textContent).toBe('7.5');
    });

    it('должен убирать лишние нули после округления', () => {
      const operation: Operation = {
        id: 'test',
        variableName: 'weight',
        variableType: 'float',
        operator: 'addition',
        value: 5.1,
        result: 10.2
      };

      const {container} = render(<OperationView operation={operation} index={1} />);
      const valueElement = container.querySelector('.operationValue');
      const resultElement = container.querySelector('.operationResult');

      expect(valueElement?.textContent).toBe('5.1');
      expect(resultElement?.textContent).toBe('10.2');
    });

    it('должен округлять очень маленькие числа', () => {
      const operation: Operation = {
        id: 'test',
        variableName: 'precision',
        variableType: 'float',
        operator: 'divide',
        value: 0.123456789,
        result: 0.987654321
      };

      const {container} = render(<OperationView operation={operation} index={1} />);
      const valueElement = container.querySelector('.operationValue');
      const resultElement = container.querySelector('.operationResult');

      expect(valueElement?.textContent).toBe('0.12');
      expect(resultElement?.textContent).toBe('0.99');
    });

    it('должен не затрагивать процентные значения (они обрабатываются отдельно)', () => {
      const operation: Operation = {
        id: 'test',
        variableName: 'percent_var',
        variableType: 'percent',
        operator: 'addition',
        value: 0.333333, // 33.33%
        result: 0.666666 // 66.67%
      };

      const {container} = render(<OperationView operation={operation} index={1} />);
      const valueElement = container.querySelector('.operationValue');
      const resultElement = container.querySelector('.operationResult');

      // Процентные значения округляются до целых
      expect(valueElement?.textContent).toBe('33%');
      expect(resultElement?.textContent).toBe('67%');
    });
  });
});
