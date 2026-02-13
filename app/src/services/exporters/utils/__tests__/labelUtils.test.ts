import {generateFallbackLabel, generateLabelFromNodeData} from '../labelUtils';

describe('labelUtils', () => {
  describe('generateLabelFromNodeData', () => {
    it('should use name when available without nodeId', () => {
      expect(generateLabelFromNodeData('Главная сцена', 'Длинный текст')).toBe('glavnaya_stsena');
      expect(generateLabelFromNodeData('Start Scene', 'Some text')).toBe('start_scene');
    });

    it('should use name with nodeId suffix when nodeId provided', () => {
      expect(generateLabelFromNodeData('Главная сцена', 'Длинный текст', 'node-123-abc')).toBe('glavnaya_stsena_123abc');
      expect(generateLabelFromNodeData('Start Scene', 'Some text', 'xyz789')).toBe('start_scene_xyz789');
    });

    it('should use first 3 words from text when name is not available', () => {
      expect(generateLabelFromNodeData('', 'Это очень длинный текст с множеством слов')).toBe('eto_ochen_dlinnyy');
      expect(generateLabelFromNodeData(undefined, 'This is a long text')).toBe('this_is_a');
    });

    it('should use first 3 words from text with nodeId suffix', () => {
      expect(generateLabelFromNodeData('', 'Это очень длинный текст', 'node-456')).toBe('eto_ochen_dlinnyy_456');
      expect(generateLabelFromNodeData(undefined, 'This is a long text', 'abc123def')).toBe('this_is_a_abc123def');
    });

    it('should limit to 30 characters from text without nodeId', () => {
      const longText = 'Очень очень очень очень длинный текст';
      const result = generateLabelFromNodeData('', longText);
      expect(result.length).toBeLessThanOrEqual(30);
    });

    it('should return empty string when no data provided', () => {
      expect(generateLabelFromNodeData('', '')).toBe('');
      expect(generateLabelFromNodeData()).toBe('');
      expect(generateLabelFromNodeData(undefined, undefined)).toBe('');
      expect(generateLabelFromNodeData('', '', 'node123')).toBe('');
    });

    it('should handle whitespace correctly', () => {
      expect(generateLabelFromNodeData('  Тест  ', '')).toBe('test');
      expect(generateLabelFromNodeData('', '  Первое второе третье  ')).toBe('pervoe_vtoroe_trete');
    });

    it('should prioritize name over text', () => {
      expect(generateLabelFromNodeData('Имя узла', 'Текст узла')).toBe('imya_uzla');
      expect(generateLabelFromNodeData('Имя узла', 'Текст узла', 'node789')).toBe('imya_uzla_789');
    });

    it('should handle single word text', () => {
      expect(generateLabelFromNodeData('', 'Привет')).toBe('privet');
      expect(generateLabelFromNodeData('', 'Hello')).toBe('hello');
    });

    it('should handle two word text', () => {
      expect(generateLabelFromNodeData('', 'Привет мир')).toBe('privet_mir');
      expect(generateLabelFromNodeData('', 'Hello world')).toBe('hello_world');
    });

    it('should handle text with special characters', () => {
      expect(generateLabelFromNodeData('', 'Привет, мир! Как дела?')).toBe('privet_mir_kak');
    });

    it('should handle names with special characters', () => {
      expect(generateLabelFromNodeData('Главная сцена!', '')).toBe('glavnaya_stsena');
      expect(generateLabelFromNodeData('Start (Scene)', '')).toBe('start_scene');
    });

    it('should handle exactly 30 character limit', () => {
      const exactText = 'Ровно тридцать символов текст'; // 30 chars
      const result = generateLabelFromNodeData('', exactText);
      expect(result).toBe('rovno_tridtsat_simvolov');
    });

    it('should handle text longer than 30 characters', () => {
      const longText = 'Это очень длинная строка которая превышает лимит';
      const result = generateLabelFromNodeData('', longText);
      expect(result).toBe('eto_ochen_dlinnaya');
    });

    it('should clean nodeId suffix from special characters', () => {
      expect(generateLabelFromNodeData('Test', '', 'node-123@456!abc')).toBe('test_123456abc');
      expect(generateLabelFromNodeData('Test', '', 'abc-def_ghi#jkl')).toBe('test_abcdehijkl');
    });

    it('should handle long nodeId by taking first 5 + last 5 characters', () => {
      expect(generateLabelFromNodeData('Test', '', 'very-long-node-id-123456789')).toBe('test_veryl56789');
      expect(generateLabelFromNodeData('Test', '', 'short')).toBe('test_short');
    });

    it('should prevent collisions with same text but different nodeId', () => {
      const text = 'Одинаковый текст узла';
      const result1 = generateLabelFromNodeData('', text, 'node123');
      const result2 = generateLabelFromNodeData('', text, 'node456');

      expect(result1).toBe('odinakovyy_tekst_uzla_123');
      expect(result2).toBe('odinakovyy_tekst_uzla_456');
      expect(result1).not.toBe(result2);
    });
  });

  describe('generateFallbackLabel', () => {
    it('should generate fallback labels from node IDs', () => {
      expect(generateFallbackLabel('abc123')).toBe('node_abc123');
      expect(generateFallbackLabel('node-with-dashes')).toBe('node_node_with_dashes');
    });

    it('should handle special characters in node IDs', () => {
      expect(generateFallbackLabel('node@123')).toBe('node_node_123');
      expect(generateFallbackLabel('node!@#$%')).toBe('node_node_____');
    });

    it('should handle empty node ID', () => {
      expect(generateFallbackLabel('')).toBe('node_');
    });

    it('should preserve alphanumeric characters and underscores', () => {
      expect(generateFallbackLabel('node_123_test')).toBe('node_node_123_test');
      expect(generateFallbackLabel('ABC123def')).toBe('node_ABC123def');
    });

    it('should handle unicode characters', () => {
      expect(generateFallbackLabel('узел123')).toBe('node_____123');
    });
  });
});
