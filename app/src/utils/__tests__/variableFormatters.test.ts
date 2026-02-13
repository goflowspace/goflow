import {formatPercentValue, formatVariableValue} from '../variableFormatters';

describe('variableFormatters', () => {
  describe('formatPercentValue', () => {
    it('should convert numeric values from 0-1 to 0-100%', () => {
      expect(formatPercentValue(0)).toBe('0%');
      expect(formatPercentValue(0.5)).toBe('50%');
      expect(formatPercentValue(1)).toBe('100%');
      expect(formatPercentValue(0.333)).toBe('33%'); // Округляется до целого
    });

    it('should append % to string values', () => {
      expect(formatPercentValue('50')).toBe('50%');
      expect(formatPercentValue('test')).toBe('test%');
    });

    it('should handle edge cases', () => {
      expect(formatPercentValue(null)).toBe('null%');
      expect(formatPercentValue(undefined)).toBe('undefined%');
      expect(formatPercentValue({})).toBe('[object Object]%');
    });
  });

  describe('formatVariableValue', () => {
    describe('percent type', () => {
      it('should format values from 0-1 to percentages', () => {
        expect(formatVariableValue(0, 'percent')).toBe('0%');
        expect(formatVariableValue(0.5, 'percent')).toBe('50%');
        expect(formatVariableValue(1, 'percent')).toBe('100%');
        expect(formatVariableValue(0.333, 'percent')).toBe('33%');
      });

      it('should handle percent strings', () => {
        expect(formatVariableValue('50%', 'percent')).toBe('50%');
        expect(formatVariableValue('0.5', 'percent')).toBe('50%');
      });

      it('should append % to values > 1', () => {
        expect(formatVariableValue(50, 'percent')).toBe('50%');
        expect(formatVariableValue(123.45, 'percent')).toBe('123.45%');
      });
    });

    describe('integer type', () => {
      it('should round numbers to integers', () => {
        expect(formatVariableValue(10.5, 'integer')).toBe('11');
        expect(formatVariableValue(10.2, 'integer')).toBe('10');
        expect(formatVariableValue(-5.7, 'integer')).toBe('-6');
      });

      it('should convert string numbers to integers', () => {
        expect(formatVariableValue('10.5', 'integer')).toBe('11');
        expect(formatVariableValue('10', 'integer')).toBe('10');
      });
    });

    describe('float type', () => {
      it('should format floats with 2 decimal places', () => {
        expect(formatVariableValue(10.5678, 'float')).toBe('10.57');
        expect(formatVariableValue(10.2, 'float')).toBe('10.2');
        expect(formatVariableValue(10, 'float')).toBe('10');
      });

      it('should remove trailing zeros', () => {
        expect(formatVariableValue(10.5, 'float')).toBe('10.5');
        expect(formatVariableValue(10.0, 'float')).toBe('10');
      });

      it('should handle string floats', () => {
        expect(formatVariableValue('10.5678', 'float')).toBe('10.57');
        expect(formatVariableValue('10.5', 'float')).toBe('10.5');
      });
    });

    describe('boolean type', () => {
      it('should convert to true/false strings', () => {
        expect(formatVariableValue(true, 'boolean')).toBe('true');
        expect(formatVariableValue(false, 'boolean')).toBe('false');
      });
    });

    describe('fallback behavior', () => {
      it('should handle null/undefined', () => {
        expect(formatVariableValue(null as any, 'string')).toBe('N/A');
        expect(formatVariableValue(undefined as any, 'string')).toBe('N/A');
      });

      it('should handle objects', () => {
        expect(formatVariableValue({} as any, 'string')).toBe('NaN');
        expect(formatVariableValue([] as any, 'string')).toBe('NaN');
      });

      it('should convert to string for unknown types', () => {
        expect(formatVariableValue(123, 'unknown')).toBe('123');
        expect(formatVariableValue('test', 'string')).toBe('test');
        expect(formatVariableValue(true, 'custom')).toBe('true');
      });

      it('should convert to string when no type is provided', () => {
        expect(formatVariableValue(123)).toBe('123');
        expect(formatVariableValue('test')).toBe('test');
        expect(formatVariableValue(true)).toBe('true');
      });
    });
  });
});
