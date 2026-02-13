import {OperationType} from '../../../../types/variables';

// Копируем функции форматирования из компонентов для тестирования
// В реальном проекте эти функции лучше вынести в отдельный файл утилит

// Из OperationView.tsx
const formatOperator = (operator: OperationType): string => {
  switch (operator) {
    case 'addition':
      return '+';
    case 'subtract':
      return '-';
    case 'multiply':
      return '×';
    case 'divide':
      return '÷';
    case 'override':
      return 'присвоено значение';
    case 'invert':
      return 'инвертировано';
    case 'join':
      return 'объединены';
    default:
      return operator;
  }
};

const formatResult = (result: string | number | boolean | undefined, variableType?: string): string => {
  if (result === undefined) {
    return 'N/A';
  }

  if (typeof result === 'boolean') {
    return result ? 'true' : 'false';
  }

  if (typeof result === 'string') {
    return `"${result}"`;
  }

  // Форматирование числовых значений с учетом типа переменной
  if (typeof result === 'number' && variableType === 'percent') {
    // Результат приходит как доля (0-1), конвертируем в проценты
    return `${Math.round(result * 100)}%`;
  }

  return String(result);
};

const formatValue = (value: string | number | boolean | undefined, variableType?: string): string => {
  if (value === undefined) {
    return '';
  }

  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }

  if (typeof value === 'string') {
    return `"${value}"`;
  }

  // Форматирование числовых значений с учетом типа переменной
  if (typeof value === 'number' && variableType === 'percent') {
    // Значение уже в процентах, просто добавляем символ %
    return `${Math.round(value * 100)}%`;
  }

  return String(value);
};

// Из ConditionView.tsx
const formatConditionValue = (value: string | number | boolean | undefined, variableType?: string): string => {
  if (value === undefined) return '';

  // Для булевых значений
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }

  // Для процентных переменных
  if (variableType === 'percent' && typeof value === 'number') {
    return `${value}%`;
  }

  return String(value);
};

describe('Форматтеры', () => {
  describe('formatOperator', () => {
    const testCases: Array<{input: OperationType; expected: string}> = [
      {input: 'addition', expected: '+'},
      {input: 'subtract', expected: '-'},
      {input: 'multiply', expected: '×'},
      {input: 'divide', expected: '÷'},
      {input: 'override', expected: 'присвоено значение'},
      {input: 'invert', expected: 'инвертировано'},
      {input: 'join', expected: 'объединены'}
    ];

    testCases.forEach(({input, expected}) => {
      it(`должен преобразовать "${input}" в "${expected}"`, () => {
        expect(formatOperator(input)).toBe(expected);
      });
    });
  });

  describe('formatResult', () => {
    it('должен возвращать N/A для undefined', () => {
      expect(formatResult(undefined)).toBe('N/A');
    });

    it('должен форматировать булевые значения', () => {
      expect(formatResult(true)).toBe('true');
      expect(formatResult(false)).toBe('false');
    });

    it('должен форматировать строки с кавычками', () => {
      expect(formatResult('hello')).toBe('"hello"');
      expect(formatResult('')).toBe('""');
    });

    it('должен конвертировать процентные результаты из долей', () => {
      expect(formatResult(0.68, 'percent')).toBe('68%');
      expect(formatResult(0.02, 'percent')).toBe('2%');
      expect(formatResult(1, 'percent')).toBe('100%');
      expect(formatResult(0, 'percent')).toBe('0%');
      expect(formatResult(0.333, 'percent')).toBe('33%');
      expect(formatResult(0.999, 'percent')).toBe('100%');
    });

    it('должен отображать обычные числа как есть', () => {
      expect(formatResult(42)).toBe('42');
      expect(formatResult(0)).toBe('0');
      expect(formatResult(-10)).toBe('-10');
      expect(formatResult(3.14)).toBe('3.14');
    });

    it('должен отображать числа без типа как есть', () => {
      expect(formatResult(0.5)).toBe('0.5');
      expect(formatResult(0.5, 'integer')).toBe('0.5');
      expect(formatResult(0.5, 'float')).toBe('0.5');
    });
  });

  describe('formatValue', () => {
    it('должен возвращать пустую строку для undefined', () => {
      expect(formatValue(undefined)).toBe('');
    });

    it('должен форматировать булевые значения', () => {
      expect(formatValue(true)).toBe('true');
      expect(formatValue(false)).toBe('false');
    });

    it('должен форматировать строки с кавычками', () => {
      expect(formatValue('test')).toBe('"test"');
      expect(formatValue('with "quotes"')).toBe('"with "quotes""');
    });

    it('должен форматировать процентные значения', () => {
      expect(formatValue(0.02, 'percent')).toBe('2%');
      expect(formatValue(0.25, 'percent')).toBe('25%');
      expect(formatValue(1, 'percent')).toBe('100%');
      expect(formatValue(0.002, 'percent')).toBe('0%'); // округление
    });

    it('должен отображать обычные числа как есть', () => {
      expect(formatValue(100)).toBe('100');
      expect(formatValue(100, 'integer')).toBe('100');
      expect(formatValue(3.14159)).toBe('3.14159');
    });
  });

  describe('formatConditionValue', () => {
    it('должен возвращать пустую строку для undefined', () => {
      expect(formatConditionValue(undefined)).toBe('');
    });

    it('должен форматировать булевые значения', () => {
      expect(formatConditionValue(true)).toBe('true');
      expect(formatConditionValue(false)).toBe('false');
    });

    it('должен добавлять % для процентных переменных', () => {
      expect(formatConditionValue(1, 'percent')).toBe('1%');
      expect(formatConditionValue(50, 'percent')).toBe('50%');
      expect(formatConditionValue(99.9, 'percent')).toBe('99.9%');
      expect(formatConditionValue(0, 'percent')).toBe('0%');
    });

    it('должен отображать строки как есть', () => {
      expect(formatConditionValue('hello')).toBe('hello');
      expect(formatConditionValue('123')).toBe('123');
    });

    it('должен отображать числа без типа как есть', () => {
      expect(formatConditionValue(42)).toBe('42');
      expect(formatConditionValue(3.14)).toBe('3.14');
      expect(formatConditionValue(42, 'integer')).toBe('42');
    });
  });

  describe('граничные случаи', () => {
    it('должен корректно обрабатывать очень маленькие процентные значения', () => {
      expect(formatResult(0.001, 'percent')).toBe('0%');
      expect(formatResult(0.004, 'percent')).toBe('0%');
      expect(formatResult(0.005, 'percent')).toBe('1%'); // округление
    });

    it('должен корректно обрабатывать отрицательные значения', () => {
      expect(formatResult(-0.5, 'percent')).toBe('-50%');
      expect(formatValue(-10)).toBe('-10');
      expect(formatConditionValue(-5, 'percent')).toBe('-5%');
    });

    it('должен корректно обрабатывать специальные строки', () => {
      expect(formatValue('')).toBe('""');
      expect(formatResult('\n\t')).toBe('"\n\t"');
      expect(formatConditionValue('')).toBe('');
    });
  });
});
