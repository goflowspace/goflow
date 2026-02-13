import {generateInternalName, transliterate} from '../transliteration';

describe('transliteration utils', () => {
  describe('transliterate', () => {
    it('should transliterate Russian text to Latin', () => {
      expect(transliterate('привет мир')).toBe('privet mir');
      expect(transliterate('Привет Мир')).toBe('Privet Mir');
      expect(transliterate('тест123')).toBe('test123');
    });

    it('should handle all Russian letters correctly', () => {
      expect(transliterate('абвгдеёжзийклмнопрстуфхцчшщъыьэюя')).toBe('abvgdeezhziyklmnoprstufhtschshschyeyuya');
      expect(transliterate('АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ')).toBe('ABVGDEEZhZIYKLMNOPRSTUFHTsChShSchYEYuYa');
    });

    it('should keep non-Cyrillic characters unchanged', () => {
      expect(transliterate('hello world')).toBe('hello world');
      expect(transliterate('123 test')).toBe('123 test');
      expect(transliterate('test@example.com')).toBe('test@example.com');
    });

    it('should handle mixed text', () => {
      expect(transliterate('Hello мир')).toBe('Hello mir');
      expect(transliterate('test123тест')).toBe('test123test');
    });

    it('should handle special characters and spaces', () => {
      expect(transliterate('Привет, мир!')).toBe('Privet, mir!');
      expect(transliterate('Тест - 2024')).toBe('Test - 2024');
    });
  });

  describe('generateInternalName', () => {
    it('should generate valid internal names from Russian text', () => {
      expect(generateInternalName('Привет мир')).toBe('privet_mir');
      expect(generateInternalName('Моя переменная')).toBe('moya_peremennaya');
    });

    it('should generate valid internal names from English text', () => {
      expect(generateInternalName('Test Name')).toBe('test_name');
      expect(generateInternalName('My Variable')).toBe('my_variable');
    });

    it('should handle special characters', () => {
      expect(generateInternalName('Test-Name!')).toBe('testname');
      expect(generateInternalName('Тест@123')).toBe('test123');
      expect(generateInternalName('Test (1)')).toBe('test_1');
    });

    it('should handle names starting with numbers', () => {
      expect(generateInternalName('123test')).toBe('var123test');
      expect(generateInternalName('1 переменная')).toBe('var1_peremennaya');
    });

    it('should handle empty and invalid names', () => {
      expect(generateInternalName('')).toBe('_');
      expect(generateInternalName('   ')).toBe('_');
      expect(generateInternalName('!@#$%')).toBe('_');
    });

    it('should handle multiple spaces and consecutive special chars', () => {
      expect(generateInternalName('Test   Multiple   Spaces')).toBe('test_multiple_spaces');
      expect(generateInternalName('Test---Name')).toBe('testname');
    });

    it('should preserve underscores in reasonable way', () => {
      expect(generateInternalName('test_name')).toBe('test_name');
      expect(generateInternalName('_test_name_')).toBe('_test_name_');
    });

    it('should handle very long names', () => {
      const longName = 'Очень длинное имя переменной которое должно быть обработано корректно';
      const result = generateInternalName(longName);
      expect(result).toBe('ochen_dlinnoe_imya_peremennoy_kotoroe_dolzhno_byt_obrabotano_korrektno');
    });
  });
});
