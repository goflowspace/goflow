/**
 * Утилиты для определения окружения приложения
 */

// Типы возможных окружений
export type AppEnvironment = 'production' | 'qa' | 'development' | 'local';

/**
 * Получает текущее окружение приложения
 * Приоритет:
 * 1. DEPLOYMENT_ENV (установленная в Docker)
 * 2. NEXT_PUBLIC_APP_ENV (для клиентской части)
 * 3. NODE_ENV (fallback)
 */
export const getAppEnvironment = (): AppEnvironment => {
  if (typeof process !== 'undefined' && process.env) {
    // Сначала проверяем DEPLOYMENT_ENV
    if (process.env.DEPLOYMENT_ENV) {
      return process.env.DEPLOYMENT_ENV as AppEnvironment;
    }

    // Затем проверяем NEXT_PUBLIC_ переменную
    if (process.env.NEXT_PUBLIC_APP_ENV) {
      return process.env.NEXT_PUBLIC_APP_ENV as AppEnvironment;
    }

    // В крайнем случае используем NODE_ENV
    if (process.env.NODE_ENV) {
      // NODE_ENV обычно бывает 'production', 'development' или 'test'
      if (process.env.NODE_ENV === 'test') {
        return 'development'; // Для тестов используем development
      }
      return process.env.NODE_ENV as AppEnvironment;
    }
  }

  // Если ничего не определено, возвращаем development
  return 'development';
};

// Хелперы для проверки окружения
export const isProduction = (): boolean => getAppEnvironment() === 'production';
export const isQA = (): boolean => getAppEnvironment() === 'qa';
export const isDevelopment = (): boolean => getAppEnvironment() === 'development' || getAppEnvironment() === 'local';

// Возвращает название окружения для отображения
export const getEnvironmentDisplayName = (): string => {
  const env = getAppEnvironment();
  switch (env) {
    case 'production':
      return 'PROD';
    case 'qa':
      return 'QA';
    case 'development':
      return 'DEV';
    case 'local':
      return 'LOCAL';
    default:
      return String(env).toUpperCase();
  }
};

export const getApiUrl = (): string => {
  // API URL задаётся через переменную окружения
  if (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }

  // Fallback для локальной разработки
  return 'http://localhost:3001';
};
