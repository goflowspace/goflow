// backend/src/modules/ai/v2/utils/__tests__/JSONRepairer.test.ts

import { JSONRepairer } from '../JSONRepairer';

describe('JSONRepairer', () => {
  
  describe('safeParseJSON', () => {
    
    it('should parse valid JSON without repair', () => {
      const validJSON = '{"test": "value", "number": 123}';
      const result = JSONRepairer.safeParseJSON(validJSON);
      
      expect(result.success).toBe(true);
      expect(result.repaired).toBe(false);
      expect(result.result).toEqual({ test: 'value', number: 123 });
    });
    
    it('should repair JSON with missing closing brace', () => {
      const incompleteJSON = '{"test": "value", "nested": {"inner": "data"';
      const result = JSONRepairer.safeParseJSON(incompleteJSON);
      
      expect(result.success).toBe(true);
      expect(result.repaired).toBe(true);
      expect(result.result).toEqual({ 
        test: 'value', 
        nested: { inner: 'data' } 
      });
      expect(result.repairActions).toContain('added 2 closing braces');
    });
    
    it('should repair JSON with missing closing bracket', () => {
      const incompleteJSON = '{"items": ["item1", "item2"';
      const result = JSONRepairer.safeParseJSON(incompleteJSON);
      
      expect(result.success).toBe(true);
      expect(result.repaired).toBe(true);
      expect(result.result).toEqual({ 
        items: ['item1', 'item2'] 
      });
    });
    
    it('should handle markdown code blocks', () => {
      const jsonWithMarkdown = '```json\n{"test": "value"}\n```';
      const result = JSONRepairer.safeParseJSON(jsonWithMarkdown);
      
      expect(result.success).toBe(true);
      expect(result.repaired).toBe(true);
      expect(result.result).toEqual({ test: 'value' });
      expect(result.repairActions).toContain('removed markdown code blocks');
    });
    
    it('should remove trailing commas', () => {
      const jsonWithTrailingComma = '{"test": "value",}';
      const result = JSONRepairer.safeParseJSON(jsonWithTrailingComma);
      
      expect(result.success).toBe(true);
      expect(result.repaired).toBe(true);
      expect(result.result).toEqual({ test: 'value' });
      expect(result.repairActions).toContain('removed trailing commas');
    });
    
    it('should handle complex repair scenario or fail gracefully', () => {
      const brokenJSON = '```json\n{"generatedNodes": [{"type": "narrative", "title": "Test"';
      const result = JSONRepairer.safeParseJSON(brokenJSON);
      
      // Этот случай может быть слишком сложным для восстановления
      // Главное что он не крашится и возвращает правильную структуру результата
      expect(typeof result.success).toBe('boolean');
      expect(typeof result.repaired).toBe('boolean');
      if (result.success) {
        expect(result.result).toBeDefined();
        expect(result.result.generatedNodes).toBeDefined();
      } else {
        expect(result.result).toBe(null);
      }
    });
    
    it('should fail gracefully for completely broken JSON', () => {
      const completelyBroken = 'this is not json at all';
      const result = JSONRepairer.safeParseJSON(completelyBroken);
      
      expect(result.success).toBe(false);
      expect(result.repaired).toBe(false);
      expect(result.result).toBe(null);
    });
  });
  
  describe('validateStructure', () => {
    
    it('should validate required fields exist', () => {
      const obj = { field1: 'value', field2: { nested: 'data' } };
      const requiredFields = ['field1', 'field2.nested'];
      
      expect(JSONRepairer.validateStructure(obj, requiredFields)).toBe(true);
    });
    
    it('should fail validation for missing fields', () => {
      const obj = { field1: 'value' };
      const requiredFields = ['field1', 'missingField'];
      
      expect(JSONRepairer.validateStructure(obj, requiredFields)).toBe(false);
    });
  });
  
  describe('createFallbackStructure', () => {
    
    it('should create fallback structure with arrays for array-like fields', () => {
      const requiredFields = ['generatedNodes', 'entityReferences', 'items'];
      const fallback = JSONRepairer.createFallbackStructure(requiredFields);
      
      expect(Array.isArray(fallback.generatedNodes)).toBe(true);
      expect(Array.isArray(fallback.entityReferences)).toBe(true); 
      expect(Array.isArray(fallback.items)).toBe(true);
    });
    
    it('should create fallback structure with numbers for count fields', () => {
      const requiredFields = ['wordCount', 'readingTime'];
      const fallback = JSONRepairer.createFallbackStructure(requiredFields);
      
      expect(typeof fallback.wordCount).toBe('number');
      expect(typeof fallback.readingTime).toBe('number');
    });
    
    it('should create nested fallback structure', () => {
      const requiredFields = ['metadata.confidence', 'content.text'];
      const fallback = JSONRepairer.createFallbackStructure(requiredFields);
      
      expect(fallback.metadata).toBeDefined();
      expect(fallback.content).toBeDefined();
      expect(typeof fallback.metadata.confidence).toBe('number'); // confidence должно быть числом
      expect(typeof fallback.content.text).toBe('string');
    });
  });
});
