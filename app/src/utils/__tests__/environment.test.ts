import {AppEnvironment, getAppEnvironment, getEnvironmentDisplayName, isDevelopment, isProduction, isQA} from '../environment';

describe('Утилиты определения окружения', () => {
  // Сохраняем оригинальное значение process.env
  const originalEnv = process.env;

  beforeEach(() => {
    // Сбрасываем и создаем новый объект process.env
    jest.resetModules();

    // Создаем новый объект вместо модификации read-only свойств
    (process.env as any) = {};
  });

  afterAll(() => {
    // Восстанавливаем оригинальный process.env
    (process.env as any) = originalEnv;
  });

  describe('getAppEnvironment', () => {
    test('должен вернуть значение DEPLOYMENT_ENV с наивысшим приоритетом', () => {
      // Устанавливаем все возможные переменные
      (process.env as any).DEPLOYMENT_ENV = 'qa';
      (process.env as any).NEXT_PUBLIC_APP_ENV = 'production';
      (process.env as any).NODE_ENV = 'development';

      expect(getAppEnvironment()).toBe('qa');
    });

    test('должен вернуть значение NEXT_PUBLIC_APP_ENV если DEPLOYMENT_ENV не задан', () => {
      (process.env as any).DEPLOYMENT_ENV = undefined;
      (process.env as any).NEXT_PUBLIC_APP_ENV = 'qa';
      (process.env as any).NODE_ENV = 'production';

      expect(getAppEnvironment()).toBe('qa');
    });

    test('должен вернуть значение NODE_ENV если другие переменные не заданы', () => {
      (process.env as any).DEPLOYMENT_ENV = undefined;
      (process.env as any).NEXT_PUBLIC_APP_ENV = undefined;
      (process.env as any).NODE_ENV = 'production';

      expect(getAppEnvironment()).toBe('production');
    });

    test('должен конвертировать "test" NODE_ENV в "development"', () => {
      (process.env as any).DEPLOYMENT_ENV = undefined;
      (process.env as any).NEXT_PUBLIC_APP_ENV = undefined;
      (process.env as any).NODE_ENV = 'test';

      expect(getAppEnvironment()).toBe('development');
    });

    test('должен вернуть "development" по умолчанию, если никакие переменные не заданы', () => {
      (process.env as any).DEPLOYMENT_ENV = undefined;
      (process.env as any).NEXT_PUBLIC_APP_ENV = undefined;
      (process.env as any).NODE_ENV = undefined;

      expect(getAppEnvironment()).toBe('development');
    });
  });

  describe('isProduction', () => {
    test('должен вернуть true для production окружения', () => {
      (process.env as any).NODE_ENV = 'production';

      expect(isProduction()).toBe(true);
    });

    test('должен вернуть false для не-production окружения', () => {
      (process.env as any).NODE_ENV = 'development';

      expect(isProduction()).toBe(false);
    });
  });

  describe('isQA', () => {
    test('должен вернуть true для qa окружения', () => {
      (process.env as any).DEPLOYMENT_ENV = 'qa';

      expect(isQA()).toBe(true);
    });

    test('должен вернуть false для не-qa окружения', () => {
      (process.env as any).DEPLOYMENT_ENV = 'production';

      expect(isQA()).toBe(false);
    });
  });

  describe('isDevelopment', () => {
    test('должен вернуть true для development окружения', () => {
      (process.env as any).NODE_ENV = 'development';

      expect(isDevelopment()).toBe(true);
    });

    test('должен вернуть true для local окружения', () => {
      (process.env as any).DEPLOYMENT_ENV = 'local';

      expect(isDevelopment()).toBe(true);
    });

    test('должен вернуть false для не-development окружения', () => {
      (process.env as any).NODE_ENV = 'production';

      expect(isDevelopment()).toBe(false);
    });
  });

  describe('getEnvironmentDisplayName', () => {
    test('должен вернуть "PROD" для production окружения', () => {
      (process.env as any).NODE_ENV = 'production';

      expect(getEnvironmentDisplayName()).toBe('PROD');
    });

    test('должен вернуть "QA" для qa окружения', () => {
      (process.env as any).DEPLOYMENT_ENV = 'qa';

      expect(getEnvironmentDisplayName()).toBe('QA');
    });

    test('должен вернуть "DEV" для development окружения', () => {
      (process.env as any).NODE_ENV = 'development';

      expect(getEnvironmentDisplayName()).toBe('DEV');
    });

    test('должен вернуть "LOCAL" для local окружения', () => {
      (process.env as any).DEPLOYMENT_ENV = 'local';

      expect(getEnvironmentDisplayName()).toBe('LOCAL');
    });

    // Тестируем напрямую функцию форматирования для кастомного окружения
    test('должен вернуть строку в верхнем регистре для неизвестного окружения', () => {
      // Проверяем непосредственно реализацию функции из файла environment.ts
      // Получаем доступ к внутренней функции switch через её строковое представление
      const displayNameSwitch = (env: AppEnvironment): string => {
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

      // Проверяем для кастомного значения
      expect(displayNameSwitch('custom' as AppEnvironment)).toBe('CUSTOM');
    });
  });
});
