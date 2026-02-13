// backend/src/modules/ai/v2/utils/JSONRepairer.ts

/**
 * Результат попытки восстановления JSON
 */
export interface JSONRepairResult {
  success: boolean;
  repaired: boolean;
  result: any;
  originalError?: Error;
  repairActions?: string[];
}

/**
 * Утилита для автоматического восстановления невалидного JSON от AI
 * Особенно полезна когда AI не закрывает скобки из-за лимитов токенов
 */
export class JSONRepairer {
  
  /**
   * Пытается распарсить JSON, при неудаче - восстановить его
   */
  public static safeParseJSON(jsonString: string): JSONRepairResult {
    // Сначала пробуем парсить как есть
    try {
      const result = JSON.parse(jsonString);
      return {
        success: true,
        repaired: false,
        result
      };
    } catch (originalError) {
      console.log('🔧 JSON parsing failed, attempting repair...');
      
      // Пытаемся восстановить JSON
      return this.attemptRepair(jsonString, originalError as Error);
    }
  }
  
  /**
   * Пытается восстановить поврежденный JSON
   */
  private static attemptRepair(jsonString: string, originalError: Error): JSONRepairResult {
    const repairActions: string[] = [];
    let repairedJson = jsonString.trim();
    
    try {
      // 1. Убираем возможные артефакты в начале/конце
      repairedJson = this.cleanupJSONString(repairedJson, repairActions);
      
      // 2. Анализируем структуру скобок
      const bracketAnalysis = this.analyzeBrackets(repairedJson);
      
      // 3. Добавляем недостающие закрывающие скобки
      repairedJson = this.fixMissingBrackets(repairedJson, bracketAnalysis, repairActions);
      
      // 4. Исправляем другие частые проблемы
      repairedJson = this.fixCommonIssues(repairedJson, repairActions);
      
      // 5. Пытаемся распарсить восстановленный JSON
      const result = JSON.parse(repairedJson);
      
      console.log('✅ JSON successfully repaired:', repairActions);
      
      return {
        success: true,
        repaired: true,
        result,
        originalError,
        repairActions
      };
      
    } catch (repairError) {
      console.log('❌ JSON repair failed:', repairActions);
      
      return {
        success: false,
        repaired: false,
        result: null,
        originalError,
        repairActions
      };
    }
  }
  
  /**
   * Очищает JSON строку от артефактов
   */
  private static cleanupJSONString(jsonString: string, repairActions: string[]): string {
    let cleaned = jsonString;
    
    // Убираем markdown блоки кода
    if (cleaned.includes('```json') || cleaned.includes('```')) {
      cleaned = cleaned.replace(/```json\s*/g, '').replace(/```\s*/g, '');
      repairActions.push('removed markdown code blocks');
    }
    
    // Убираем комментарии (которых не должно быть в JSON)
    if (cleaned.includes('//')) {
      cleaned = cleaned.replace(/\/\/.*$/gm, '');
      repairActions.push('removed comments');
    }
    
    // Ищем начало JSON объекта или массива
    const jsonStartObj = cleaned.indexOf('{');
    const jsonStartArray = cleaned.indexOf('[');
    let jsonStart = -1;
    
    if (jsonStartObj !== -1 && jsonStartArray !== -1) {
      jsonStart = Math.min(jsonStartObj, jsonStartArray);
    } else if (jsonStartObj !== -1) {
      jsonStart = jsonStartObj;
    } else if (jsonStartArray !== -1) {
      jsonStart = jsonStartArray;
    }
    
    if (jsonStart > 0) {
      cleaned = cleaned.substring(jsonStart);
      repairActions.push('trimmed to JSON start');
    }
    
    return cleaned.trim();
  }
  
  /**
   * Анализирует баланс скобок в JSON
   */
  private static analyzeBrackets(jsonString: string) {
    let openBraces = 0;      // {
    let closeBraces = 0;     // }
    let openBrackets = 0;    // [
    let closeBrackets = 0;   // ]
    let inString = false;
    let escaped = false;
    
    for (let i = 0; i < jsonString.length; i++) {
      const char = jsonString[i];
      
      // Обрабатываем экранирование
      if (escaped) {
        escaped = false;
        continue;
      }
      
      if (char === '\\') {
        escaped = true;
        continue;
      }
      
      // Обрабатываем строки
      if (char === '"') {
        inString = !inString;
        continue;
      }
      
      // Считаем скобки только вне строк
      if (!inString) {
        switch (char) {
          case '{':
            openBraces++;
            break;
          case '}':
            closeBraces++;
            break;
          case '[':
            openBrackets++;
            break;
          case ']':
            closeBrackets++;
            break;
        }
      }
    }
    
    return {
      openBraces,
      closeBraces,
      openBrackets,
      closeBrackets,
      missingBraces: openBraces - closeBraces,
      missingBrackets: openBrackets - closeBrackets,
      inString // если true, строка не была закрыта
    };
  }
  
  /**
   * Добавляет недостающие закрывающие скобки
   */
  private static fixMissingBrackets(
    jsonString: string, 
    bracketAnalysis: any, 
    repairActions: string[]
  ): string {
    let repaired = jsonString;
    
    // Закрываем незакрытую строку если нужно
    if (bracketAnalysis.inString) {
      repaired += '"';
      repairActions.push('closed unclosed string');
    }
    
    // Добавляем недостающие закрывающие квадратные скобки
    if (bracketAnalysis.missingBrackets > 0) {
      repaired += ']'.repeat(bracketAnalysis.missingBrackets);
      repairActions.push(`added ${bracketAnalysis.missingBrackets} closing square brackets`);
    }
    
    // Добавляем недостающие закрывающие фигурные скобки
    if (bracketAnalysis.missingBraces > 0) {
      repaired += '}'.repeat(bracketAnalysis.missingBraces);
      repairActions.push(`added ${bracketAnalysis.missingBraces} closing braces`);
    }
    
    return repaired;
  }
  
  /**
   * Исправляет другие частые проблемы JSON
   */
  private static fixCommonIssues(jsonString: string, repairActions: string[]): string {
    let repaired = jsonString;
    
    // Убираем лишние запятые перед закрывающими скобками
    const trailingCommaRegex = /,(\s*[}\]])/g;
    if (trailingCommaRegex.test(repaired)) {
      repaired = repaired.replace(trailingCommaRegex, '$1');
      repairActions.push('removed trailing commas');
    }
    
    // Исправляем одинарные кавычки на двойные (вне строк)
    // Это более сложно, поэтому делаем простую замену только если нет двойных кавычек
    if (!repaired.includes('"') && repaired.includes("'")) {
      repaired = repaired.replace(/'/g, '"');
      repairActions.push('converted single quotes to double quotes');
    }
    
    // Убираем мусор в конце
    const lastValidChar = Math.max(
      repaired.lastIndexOf('}'),
      repaired.lastIndexOf(']')
    );
    
    if (lastValidChar > 0 && lastValidChar < repaired.length - 1) {
      const afterLastChar = repaired.substring(lastValidChar + 1).trim();
      if (afterLastChar && !afterLastChar.match(/^[}\]\s]*$/)) {
        repaired = repaired.substring(0, lastValidChar + 1);
        repairActions.push('trimmed garbage after JSON end');
      }
    }
    
    return repaired;
  }
  
  /**
   * Проверяет, содержит ли восстановленный JSON ожидаемые поля
   */
  public static validateStructure(parsedJSON: any, requiredFields: string[]): boolean {
    if (!parsedJSON || typeof parsedJSON !== 'object') {
      return false;
    }
    
    return requiredFields.every(field => {
      const parts = field.split('.');
      let current = parsedJSON;
      
      for (const part of parts) {
        if (current === null || current === undefined || !(part in current)) {
          return false;
        }
        current = current[part];
      }
      
      return true;
    });
  }
  
  /**
   * Создает упрощенную версию JSON для fallback случаев
   */
  public static createFallbackStructure(requiredFields: string[]): any {
    const fallback: any = {};
    
    for (const field of requiredFields) {
      const parts = field.split('.');
      let current = fallback;
      
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (!(part in current)) {
          current[part] = {};
        }
        current = current[part];
      }
      
      const lastPart = parts[parts.length - 1];
      // Создаем разумные значения по умолчанию на основе имени поля
      current[lastPart] = this.getDefaultValue(lastPart);
    }
    
    return fallback;
  }
  
  /**
   * Возвращает разумное значение по умолчанию для поля
   */
  private static getDefaultValue(fieldName: string): any {
    const lowerField = fieldName.toLowerCase();
    
    if (lowerField.includes('array') || lowerField.includes('list') || 
        lowerField.includes('items') || lowerField.includes('entities') ||
        lowerField.includes('elements') || lowerField.includes('nodes') ||
        lowerField.includes('references') || lowerField.includes('suggestions') ||
        lowerField.includes('mapping') || lowerField.endsWith('s')) {
      return [];
    }
    
    if (lowerField.includes('count') || lowerField.includes('number') || 
        lowerField.includes('time') || lowerField.includes('length') ||
        lowerField.includes('confidence') || lowerField.includes('score')) {
      return 0;
    }
    
    if (lowerField.includes('boolean') || lowerField.includes('enabled') || 
        lowerField.includes('should') || lowerField.includes('is')) {
      return false;
    }
    
    // По умолчанию - строка
    return `Generated ${fieldName}`;
  }
}
