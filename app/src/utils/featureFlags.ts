'use client';

/**
 * Feature Flags для постепенного включения новых функций
 *
 * Принципы:
 * - Single Responsibility: только управление feature flags
 * - Open/Closed: легко добавить новые флаги
 * - KISS: простая логика включения/выключения
 */

export interface FeatureFlags {
  // WebSocket синхронизация
  WS_SYNC_ENABLED: boolean;

  // Real-time коллаборация
  REALTIME_COLLABORATION: boolean;

  // Async snapshots (для будущего использования)
  ASYNC_SNAPSHOTS: boolean;

  // Debug mode для WebSocket
  WS_DEBUG_MODE: boolean;
}

export class FeatureFlagService {
  private static instance: FeatureFlagService | null = null;
  private flags: FeatureFlags;

  private constructor() {
    this.flags = this.loadFeatureFlags();
  }

  /**
   * Получить singleton экземпляр
   */
  static getInstance(): FeatureFlagService {
    if (!FeatureFlagService.instance) {
      FeatureFlagService.instance = new FeatureFlagService();
    }
    return FeatureFlagService.instance;
  }

  /**
   * Проверить включен ли флаг
   */
  isEnabled(flag: keyof FeatureFlags): boolean {
    return this.flags[flag];
  }

  /**
   * Включить флаг
   */
  enable(flag: keyof FeatureFlags): void {
    this.flags[flag] = true;
    this.saveFeatureFlags();
    this.logFlagChange(flag, true);
  }

  /**
   * Выключить флаг
   */
  disable(flag: keyof FeatureFlags): void {
    this.flags[flag] = false;
    this.saveFeatureFlags();
    this.logFlagChange(flag, false);
  }

  /**
   * Переключить флаг
   */
  toggle(flag: keyof FeatureFlags): boolean {
    this.flags[flag] = !this.flags[flag];
    this.saveFeatureFlags();
    this.logFlagChange(flag, this.flags[flag]);
    return this.flags[flag];
  }

  /**
   * Получить все флаги
   */
  getAllFlags(): FeatureFlags {
    return {...this.flags};
  }

  /**
   * Сбросить все флаги к значениям по умолчанию
   */
  resetToDefaults(): void {
    this.flags = this.getDefaultFlags();
    this.saveFeatureFlags();
    console.log('🏁 [FeatureFlags] Reset all flags to defaults');
  }

  /**
   * Загрузить флаги из различных источников
   */
  private loadFeatureFlags(): FeatureFlags {
    const defaultFlags = this.getDefaultFlags();

    // 1. Начинаем с дефолтных значений
    let flags = {...defaultFlags};

    // 2. Переопределяем из environment variables
    flags = {...flags, ...this.loadFromEnvironment()};

    // 3. Переопределяем из localStorage (для разработки)
    flags = {...flags, ...this.loadFromLocalStorage()};

    // 4. Переопределяем из URL parameters (для тестирования)
    flags = {...flags, ...this.loadFromURL()};

    console.log('🚩 [FeatureFlags] Loaded flags:', flags);
    return flags;
  }

  /**
   * Значения по умолчанию (безопасные настройки)
   */
  private getDefaultFlags(): FeatureFlags {
    return {
      WS_SYNC_ENABLED: true, // WebSocket выключен по умолчанию
      REALTIME_COLLABORATION: true, // Real-time коллаборация выключена
      ASYNC_SNAPSHOTS: true, // Async snapshots выключены
      WS_DEBUG_MODE: true // Debug режим выключен
    };
  }

  /**
   * Загрузка из переменных окружения
   */
  private loadFromEnvironment(): Partial<FeatureFlags> {
    const flags: Partial<FeatureFlags> = {};

    if (typeof process !== 'undefined' && process.env) {
      if (process.env.NEXT_PUBLIC_WS_SYNC === 'true') {
        flags.WS_SYNC_ENABLED = true;
        flags.REALTIME_COLLABORATION = true; // Автоматически включаем коллаборацию
      }

      if (process.env.NEXT_PUBLIC_WS_DEBUG === 'true') {
        flags.WS_DEBUG_MODE = true;
      }

      if (process.env.NEXT_PUBLIC_ASYNC_SNAPSHOTS === 'true') {
        flags.ASYNC_SNAPSHOTS = true;
      }
    }

    return flags;
  }

  /**
   * Загрузка из localStorage (для разработки)
   */
  private loadFromLocalStorage(): Partial<FeatureFlags> {
    const flags: Partial<FeatureFlags> = {};

    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('feature_flags');
        if (stored) {
          const parsedFlags = JSON.parse(stored);
          Object.assign(flags, parsedFlags);
        }
      } catch (error) {
        console.warn('Failed to load feature flags from localStorage:', error);
      }
    }

    return flags;
  }

  /**
   * Загрузка из URL parameters (для тестирования)
   */
  private loadFromURL(): Partial<FeatureFlags> {
    const flags: Partial<FeatureFlags> = {};

    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);

      if (urlParams.get('ws_sync') === 'true') {
        flags.WS_SYNC_ENABLED = true;
        flags.REALTIME_COLLABORATION = true;
      }

      if (urlParams.get('ws_debug') === 'true') {
        flags.WS_DEBUG_MODE = true;
      }

      if (urlParams.get('async_snapshots') === 'true') {
        flags.ASYNC_SNAPSHOTS = true;
      }
    }

    return flags;
  }

  /**
   * Сохранить флаги в localStorage
   */
  private saveFeatureFlags(): void {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('feature_flags', JSON.stringify(this.flags));
      } catch (error) {
        console.warn('Failed to save feature flags to localStorage:', error);
      }
    }
  }

  /**
   * Логировать изменение флага
   */
  private logFlagChange(flag: keyof FeatureFlags, enabled: boolean): void {
    const emoji = enabled ? '✅' : '❌';
    console.log(`🚩 [FeatureFlags] ${emoji} ${flag} = ${enabled}`);
  }
}

/**
 * Хуки для использования в React компонентах
 */
export function useFeatureFlag(flag: keyof FeatureFlags): boolean {
  return FeatureFlagService.getInstance().isEnabled(flag);
}

export function useFeatureFlags(): {
  flags: FeatureFlags;
  isEnabled: (flag: keyof FeatureFlags) => boolean;
  enable: (flag: keyof FeatureFlags) => void;
  disable: (flag: keyof FeatureFlags) => void;
  toggle: (flag: keyof FeatureFlags) => boolean;
} {
  const service = FeatureFlagService.getInstance();

  return {
    flags: service.getAllFlags(),
    isEnabled: (flag) => service.isEnabled(flag),
    enable: (flag) => service.enable(flag),
    disable: (flag) => service.disable(flag),
    toggle: (flag) => service.toggle(flag)
  };
}

/**
 * Экспорт singleton для прямого использования
 */
export const featureFlags = FeatureFlagService.getInstance();

/**
 * Debug утилиты (доступны в консоли браузера)
 */
if (typeof window !== 'undefined') {
  (window as any).featureFlags = {
    enable: (flag: string) => featureFlags.enable(flag as keyof FeatureFlags),
    disable: (flag: string) => featureFlags.disable(flag as keyof FeatureFlags),
    toggle: (flag: string) => featureFlags.toggle(flag as keyof FeatureFlags),
    getAll: () => featureFlags.getAllFlags(),
    reset: () => featureFlags.resetToDefaults(),

    // Быстрые команды для WebSocket
    enableWS: () => {
      featureFlags.enable('WS_SYNC_ENABLED');
      featureFlags.enable('REALTIME_COLLABORATION');
      console.log('🚀 WebSocket sync enabled! Refresh the page.');
    },
    disableWS: () => {
      featureFlags.disable('WS_SYNC_ENABLED');
      featureFlags.disable('REALTIME_COLLABORATION');
      console.log('📡 WebSocket sync disabled! Refresh the page.');
    }
  };
}
