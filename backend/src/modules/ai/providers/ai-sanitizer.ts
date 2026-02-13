import { AISuggestionType } from '@prisma/client';

export class AISanitizer {
  /**
   * Удаляет системные упоминания из ответа AI
   */
  static sanitizeAIResponse(response: string): string {
    // Удаляем любые системные упоминания
    return response.replace(/system|prompt|instruction|api|chatgpt|openai|gemini/gi, '');
  }

  /**
   * Очищает текст от HTML, ссылок и системных слов
   * Поддерживает строки, массивы и объекты
   */
  static sanitizeText(text: any): string {
    if (!text) return '';
    
    // Если это не строка, конвертируем в строку
    let textStr: string;
    
    if (typeof text === 'string') {
      textStr = text;
    } else if (Array.isArray(text)) {
      // Если массив объектов с референсами, форматируем их красиво
      textStr = text.map((item, index) => {
        if (typeof item === 'object' && item.name && item.description) {
          return `${index + 1}. ${item.name}\n   ${item.description}\n   Релевантность: ${item.relevance || 'Не указана'}`;
        } else if (typeof item === 'object') {
          return `${index + 1}. ${JSON.stringify(item)}`;
        } else {
          return `${index + 1}. ${item}`;
        }
      }).join('\n\n');
    } else if (typeof text === 'object') {
      // Если объект, форматируем его красиво для библии проекта
      textStr = this.formatObjectToReadableText(text);
    } else {
      // Для других типов приводим к строке
      textStr = String(text);
    }
    
    // Удаляем HTML теги и системные ссылки
    return textStr
      .replace(/<[^>]*>/g, '')
      .replace(/https?:\/\/[^\s]+/g, '')
      .replace(/system|prompt|instruction/gi, '')
      .trim();
  }

  /**
   * Специальная очистка для JSON строк - убирает управляющие символы
   */
  static sanitizeForJSON(text: any): string {
    if (!text) return '';
    
    let textStr = typeof text === 'string' ? text : String(text);
    
    return textStr
      // Удаляем управляющие символы
      .replace(/[\x00-\x1F\x7F]/g, '')
      // Заменяем переносы и табы на пробелы
      .replace(/[\n\r\t]/g, ' ')
      // Сжимаем множественные пробелы
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Валидирует тип предложения AI
   */
  static validateSuggestionType(type: any, expectedType?: AISuggestionType): AISuggestionType {
    const validTypes: AISuggestionType[] = ['REPHRASE_NARRATIVE', 'REPHRASE_CHOICE', 'STRUCTURE_ONLY', 'NEXT_NODES', 'PROJECT_BIBLE'];
    
    if (validTypes.includes(type)) {
      return type;
    }
    
    // Если тип не валиден, возвращаем ожидаемый или дефолтный
    return expectedType || 'NEXT_NODES';
  }

  /**
   * Очищает и валидирует список сущностей
   */
  static sanitizeEntityList(entities: any[]): string[] {
    if (!Array.isArray(entities)) return [];
    
    return entities
      .filter(entity => typeof entity === 'string')
      .map(entity => entity.trim())
      .filter(entity => entity.length > 0 && entity.length < 100); // Разумные ограничения
  }

  /**
   * Форматирует объект в читаемый текст для полей библии проекта
   */
  static formatObjectToReadableText(obj: any): string {
    if (!obj || typeof obj !== 'object') {
      return String(obj || '');
    }

    // Если это простой объект с ключами-значениями
    const entries = Object.entries(obj);
    
    return entries.map(([key, value]) => {
      // Форматируем ключ
      const formattedKey = key
        .replace(/_/g, ' ')
        .replace(/([A-Z])/g, ' $1')
        .trim()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');

      // Форматируем значение
      if (Array.isArray(value)) {
        const items = value
          .filter(item => item && typeof item === 'string')
          .map(item => `• ${item}`)
          .join('\n');
        return `**${formattedKey}:**\n${items}`;
      } else if (typeof value === 'string') {
        return `**${formattedKey}:** ${value}`;
      } else if (typeof value === 'object' && value !== null) {
        // Рекурсивно обрабатываем вложенные объекты
        const nestedText = this.formatObjectToReadableText(value);
        return `**${formattedKey}:**\n${nestedText}`;
      } else {
        return `**${formattedKey}:** ${String(value)}`;
      }
    }).join('\n\n');
  }
} 