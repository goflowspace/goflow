// backend/src/modules/ai/v2/core/ErrorClassification.ts

/**
 * Классификация ошибок для определения возможности повторной попытки
 */
export enum ErrorType {
  // Временные ошибки - можно повторять
  TEMPORARY = 'temporary',
  // Постоянные ошибки - нет смысла повторять
  PERMANENT = 'permanent',
  // Ошибки лимитов - можно повторить позже
  RATE_LIMIT = 'rate_limit',
  // Неизвестные ошибки - по умолчанию не повторяем
  UNKNOWN = 'unknown'
}

/**
 * Результат классификации ошибки
 */
export interface ErrorClassification {
  type: ErrorType;
  retryable: boolean;
  retryDelayMs?: number;
  reason: string;
}

/**
 * Классификатор ошибок для определения стратегии повторных попыток
 */
export class ErrorClassifier {
  
  /**
   * Классифицирует ошибку и определяет можно ли ее повторить
   */
  public static classifyError(error: Error): ErrorClassification {
    const errorMessage = error.message.toLowerCase();
    const errorName = error.name.toLowerCase();
    
    // Проверяем временные ошибки провайдеров AI
    if (this.isTemporaryAIError(error, errorMessage)) {
      return {
        type: ErrorType.TEMPORARY,
        retryable: true,
        retryDelayMs: 2000, // 2 секунды для временных ошибок
        reason: 'Temporary AI provider error'
      };
    }
    
    // Проверяем ошибки лимитов
    if (this.isRateLimitError(error, errorMessage)) {
      return {
        type: ErrorType.RATE_LIMIT,
        retryable: true,
        retryDelayMs: 5000, // 5 секунд для rate limit
        reason: 'Rate limit exceeded'
      };
    }
    
    // Проверяем сетевые ошибки
    if (this.isNetworkError(error, errorMessage, errorName)) {
      return {
        type: ErrorType.TEMPORARY,
        retryable: true,
        retryDelayMs: 3000, // 3 секунды для сетевых ошибок
        reason: 'Network connectivity issue'
      };
    }
    
    // Проверяем постоянные ошибки
    if (this.isPermanentError(error, errorMessage)) {
      return {
        type: ErrorType.PERMANENT,
        retryable: false,
        reason: 'Permanent error - retry would not help'
      };
    }
    
    // По умолчанию считаем ошибку неизвестной и не повторяемой
    return {
      type: ErrorType.UNKNOWN,
      retryable: false,
      reason: 'Unknown error type - conservative approach'
    };
  }
  
  /**
   * Проверяет временные ошибки AI провайдеров
   */
  private static isTemporaryAIError(_error: Error, errorMessage: string): boolean {
    // Google/Gemini временные ошибки
    if (errorMessage.includes('internal error') || 
        errorMessage.includes('internal server error') ||
        errorMessage.includes('status: "internal"') ||
        errorMessage.includes('503') ||
        errorMessage.includes('502') ||
        errorMessage.includes('504')) {
      return true;
    }
    
    // OpenAI временные ошибки
    if (errorMessage.includes('openai') && 
        (errorMessage.includes('server error') ||
         errorMessage.includes('service unavailable') ||
         errorMessage.includes('timeout'))) {
      return true;
    }
    
    // Anthropic временные ошибки
    if (errorMessage.includes('anthropic') && 
        (errorMessage.includes('service_error') ||
         errorMessage.includes('server_error') ||
         errorMessage.includes('overloaded'))) {
      return true;
    }
    
    // Общие временные ошибки
    if (errorMessage.includes('temporarily unavailable') ||
        errorMessage.includes('service temporarily unavailable') ||
        errorMessage.includes('please retry') ||
        errorMessage.includes('try again')) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Проверяет ошибки превышения лимитов
   */
  private static isRateLimitError(_error: Error, errorMessage: string): boolean {
    return errorMessage.includes('rate limit') ||
           errorMessage.includes('quota exceeded') ||
           errorMessage.includes('too many requests') ||
           errorMessage.includes('429') ||
           errorMessage.includes('rate_limit_exceeded') ||
           errorMessage.includes('quota_exceeded');
  }
  
  /**
   * Проверяет сетевые ошибки
   */
  private static isNetworkError(_error: Error, errorMessage: string, errorName: string): boolean {
    // Основные сетевые ошибки
    if (errorName.includes('timeout') ||
        errorName.includes('network') ||
        errorName.includes('connection')) {
      return true;
    }
    
    return errorMessage.includes('connection') ||
           errorMessage.includes('network') ||
           errorMessage.includes('timeout') ||
           errorMessage.includes('econnreset') ||
           errorMessage.includes('enotfound') ||
           errorMessage.includes('econnrefused') ||
           errorMessage.includes('socket hang up');
  }
  
  /**
   * Проверяет постоянные ошибки, которые не имеет смысла повторять
   */
  private static isPermanentError(_error: Error, errorMessage: string): boolean {
    // Ошибки валидации и конфигурации
    if (errorMessage.includes('invalid') ||
        errorMessage.includes('unauthorized') ||
        errorMessage.includes('forbidden') ||
        errorMessage.includes('not found') ||
        errorMessage.includes('bad request') ||
        errorMessage.includes('400') ||
        errorMessage.includes('401') ||
        errorMessage.includes('403') ||
        errorMessage.includes('404')) {
      return true;
    }
    
    // Ошибки API ключей
    if (errorMessage.includes('api key') ||
        errorMessage.includes('authentication') ||
        errorMessage.includes('api_key')) {
      return true;
    }
    
    // Ошибки парсинга JSON (теперь должны быть исправлены автоматически)
    if (errorMessage.includes('json') ||
        errorMessage.includes('parse') ||
        errorMessage.includes('unexpected token') ||
        errorMessage.includes('unexpected end')) {
      return true;
    }
    
    // Ошибки валидации схемы
    if (errorMessage.includes('validation') ||
        errorMessage.includes('schema') ||
        errorMessage.includes('format')) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Определяет задержку для повторной попытки с учетом экспоненциального отката
   */
  public static calculateRetryDelay(
    attempt: number, 
    baseDelayMs: number, 
    exponentialBackoff: boolean = true
  ): number {
    if (!exponentialBackoff) {
      return baseDelayMs;
    }
    
    // Экспоненциальный откат: базовая задержка * 2^попытка
    const exponentialDelay = baseDelayMs * Math.pow(2, attempt - 1);
    
    // Добавляем случайную составляющую (jitter) для избежания thundering herd
    const jitter = Math.random() * 0.3 * exponentialDelay; // ±30% случайности
    
    // Максимальная задержка - 30 секунд
    const maxDelay = 30000;
    
    return Math.min(exponentialDelay + jitter, maxDelay);
  }
}

