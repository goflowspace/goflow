// backend/src/modules/ai/v2/validation/InputSanitizer.ts
import { SanitizationOptions } from './ValidationTypes';

export class InputSanitizer {
  /**
   * Основной метод для санитизации текста
   */
  static sanitizeText(text: string, options: SanitizationOptions = {}): string {
    if (typeof text !== 'string') {
      return '';
    }

    let sanitized = text;

    // Удаляем потенциально опасные скрипты и HTML теги
    sanitized = this.removeScripts(sanitized);
    sanitized = this.removeHtmlTags(sanitized, options.allowedTags);
    
    // Нормализуем пробелы и переносы строк
    if (options.normalizeSpaces !== false) {
      sanitized = this.normalizeSpaces(sanitized);
    }
    
    if (options.removeEmptyLines) {
      sanitized = this.removeEmptyLines(sanitized);
    }
    
    if (options.trimWhitespace !== false) {
      sanitized = sanitized.trim();
    }

    // Ограничиваем длину
    if (options.maxLength && sanitized.length > options.maxLength) {
      sanitized = sanitized.substring(0, options.maxLength).trim();
    }

    return sanitized;
  }

  /**
   * Санитизация объектов (рекурсивно)
   */
  static sanitizeObject<T extends Record<string, any>>(
    obj: T, 
    fieldOptions: Record<string, SanitizationOptions> = {}
  ): T {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    const sanitized = { ...obj } as any;

    for (const [key, value] of Object.entries(sanitized)) {
      const options = fieldOptions[key] || {};
      
      if (typeof value === 'string') {
        sanitized[key] = this.sanitizeText(value, options);
      } else if (Array.isArray(value)) {
        sanitized[key] = value.map(item => 
          typeof item === 'string' 
            ? this.sanitizeText(item, options)
            : typeof item === 'object' 
              ? this.sanitizeObject(item, fieldOptions)
              : item
        );
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeObject(value, fieldOptions);
      }
    }

    return sanitized as T;
  }

  /**
   * Удаление скриптов и потенциально опасного кода
   */
  private static removeScripts(text: string): string {
    return text
      // Удаляем script теги
      .replace(/<script[^>]*>.*?<\/script>/gims, '')
      // Удаляем javascript: протокол
      .replace(/javascript:/gim, '')
      // Удаляем data: протокол (может содержать вредоносный код)
      .replace(/data:/gim, '')
      // Удаляем vbscript: протокол
      .replace(/vbscript:/gim, '')
      // Удаляем обработчики событий
      .replace(/on\w+\s*=/gim, '')
      // Удаляем потенциально опасные теги
      .replace(/<(iframe|embed|object|applet|meta|link)[^>]*>/gim, '');
  }

  /**
   * Удаление HTML тегов (с возможностью разрешить некоторые)
   */
  private static removeHtmlTags(text: string, allowedTags: string[] = []): string {
    if (allowedTags.length === 0) {
      // Удаляем все HTML теги
      return text.replace(/<[^>]*>/g, '');
    }

    // Создаем регулярное выражение для разрешенных тегов
    const allowedPattern = allowedTags.join('|');
    const regex = new RegExp(`<(?!\/?(?:${allowedPattern})(?:\\s|>))[^>]*>`, 'gim');
    
    return text.replace(regex, '');
  }

  /**
   * Нормализация пробелов
   */
  private static normalizeSpaces(text: string): string {
    return text
      // Заменяем множественные пробелы на одинарные
      .replace(/[ \t]+/g, ' ')
      // Заменяем множественные переносы строк на максимум два
      .replace(/\n{3,}/g, '\n\n')
      // Удаляем пробелы в конце строк
      .replace(/[ \t]+$/gm, '');
  }

  /**
   * Удаление пустых строк
   */
  private static removeEmptyLines(text: string): string {
    return text
      .split('\n')
      .filter(line => line.trim().length > 0)
      .join('\n');
  }

  /**
   * Экранирование специальных символов для безопасности
   */
  static escapeSpecialChars(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  /**
   * Валидация и санитизация промптов для AI
   */
  static sanitizeAIPrompt(prompt: string): string {
    return this.sanitizeText(prompt, {
      maxLength: 50000, // Разумное ограничение для промптов
      normalizeSpaces: true,
      removeEmptyLines: false, // Сохраняем структуру промпта
      trimWhitespace: true
    });
  }

  /**
   * Проверка на наличие потенциально вредоносного содержимого
   */
  static detectSuspiciousContent(text: string): { 
    isSuspicious: boolean; 
    reasons: string[] 
  } {
    const reasons: string[] = [];
    
    // Проверяем на наличие подозрительных паттернов
    const suspiciousPatterns = [
      { pattern: /<script/i, reason: 'Содержит script теги' },
      { pattern: /javascript:/i, reason: 'Содержит javascript протокол' },
      { pattern: /on\w+\s*=/i, reason: 'Содержит обработчики событий' },
      { pattern: /eval\s*\(/i, reason: 'Содержит eval функцию' },
      // { pattern: /document\./i, reason: 'Попытка доступа к DOM' },
      // { pattern: /window\./i, reason: 'Попытка доступа к window объекту' },
      // { pattern: /\{\{.*\}\}/g, reason: 'Подозрительные шаблонные выражения' },
      // { pattern: /\$\{.*\}/g, reason: 'Подозрительные JS выражения' }
    ];

    for (const { pattern, reason } of suspiciousPatterns) {
      if (pattern.test(text)) {
        reasons.push(reason);
      }
    }

    return {
      isSuspicious: reasons.length > 0,
      reasons
    };
  }
}
