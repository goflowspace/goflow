/**
 * Утилита для определения типа устройства ввода (мышь или тачпад)
 */

export type InputDeviceType = 'mouse' | 'touchpad' | 'unknown';

interface DetectionOptions {
  /** Количество событий wheel для анализа */
  sampleSize?: number;
  /** Порог для определения тачпада на основе отношения deltaMode=0 к общему числу событий */
  touchpadThreshold?: number;
  /** Таймаут для сброса собранных данных (мс) */
  resetTimeout?: number;
  /** Максимальное время ожидания определения в миллисекундах */
  maxWaitTime?: number;
}

/**
 * Класс для определения типа устройства ввода (мышь или тачпад) на основе
 * анализа событий прокрутки (wheel events) и их deltaMode
 */
export class InputDeviceDetector {
  // Количество событий wheel с deltaMode=0 (пиксельный режим, характерен для тачпада)
  private pixelModeCount = 0;
  // Общее количество обработанных событий wheel
  private totalEvents = 0;
  // Колбэк для возврата результата
  private callback: ((type: InputDeviceType) => void) | null = null;
  // Идентификатор таймера сброса
  private resetTimeoutId: number | null = null;
  // Последнее определенное устройство
  private lastDetectedDevice: InputDeviceType = 'unknown';
  // Флаг активности детектора
  private isListening = false;

  private options: Required<DetectionOptions> = {
    sampleSize: 5,
    touchpadThreshold: 0.7, // Если более 70% событий имеют deltaMode=0, считаем устройством тачпад
    resetTimeout: 1000,
    maxWaitTime: 5000
  };

  constructor(options?: DetectionOptions) {
    if (options) {
      this.options = {...this.options, ...options};
    }
  }

  /**
   * Запускает процесс определения устройства ввода
   * @param callback Функция, которая будет вызвана при определении типа устройства
   */
  public detect(callback: (type: InputDeviceType) => void): void {
    if (this.isListening) {
      return;
    }

    this.callback = callback;
    window.addEventListener('wheel', this.handleWheelEvent);
    this.isListening = true;

    // Устанавливаем максимальное время ожидания определения
    setTimeout(() => {
      if (this.isListening) {
        this.analyzeData();
        this.stop();
      }
    }, this.options.maxWaitTime);
  }

  /**
   * Останавливает процесс определения устройства ввода
   */
  public stop(): void {
    if (!this.isListening) {
      return;
    }

    window.removeEventListener('wheel', this.handleWheelEvent);
    this.isListening = false;
    this.resetData();
  }

  /**
   * Возвращает текущее определенное устройство ввода
   * @returns Текущий определенный тип устройства ввода
   */
  public getDetectedDevice(): InputDeviceType {
    return this.lastDetectedDevice;
  }

  private handleWheelEvent = (event: WheelEvent): void => {
    this.resetTimeout();
    this.totalEvents++;

    // На основе SO: https://stackoverflow.com/a/62415754
    // deltaMode: 0 - пиксели, типичны для тачпада
    // deltaMode: 1 - строки, типичны для мыши
    if (event.deltaMode === 0) {
      this.pixelModeCount++;
    }

    if (this.totalEvents >= this.options.sampleSize) {
      this.analyzeData();
    }
  };

  private analyzeData(): void {
    if (this.totalEvents === 0) {
      return;
    }

    // Вычисляем отношение событий с deltaMode=0 к общему числу событий
    const pixelModeRatio = this.pixelModeCount / this.totalEvents;

    // Если большинство событий имеют deltaMode=0, вероятно это тачпад
    const deviceType: InputDeviceType = pixelModeRatio >= this.options.touchpadThreshold ? 'touchpad' : 'mouse';

    if (deviceType !== this.lastDetectedDevice) {
      this.lastDetectedDevice = deviceType;
      if (this.callback) {
        this.callback(deviceType);
      }
    }

    this.resetData();
  }

  private resetTimeout(): void {
    if (this.resetTimeoutId !== null) {
      window.clearTimeout(this.resetTimeoutId);
    }

    this.resetTimeoutId = window.setTimeout(() => {
      if (this.totalEvents > 0) {
        this.analyzeData();
      }
    }, this.options.resetTimeout);
  }

  private resetData(): void {
    this.pixelModeCount = 0;
    this.totalEvents = 0;
    if (this.resetTimeoutId !== null) {
      window.clearTimeout(this.resetTimeoutId);
      this.resetTimeoutId = null;
    }
  }
}

/**
 * Простая функция для создания и использования детектора устройств ввода
 * @param callback Функция, которая будет вызвана при определении типа устройства
 * @param options Опции для настройки детектора
 * @returns Функция для остановки детектора
 */
export function detectInputDevice(callback: (type: InputDeviceType) => void, options?: DetectionOptions): () => void {
  const detector = new InputDeviceDetector(options);
  detector.detect(callback);

  return () => detector.stop();
}

/**
 * Создает промис, который резолвится с типом устройства ввода после
 * определенного количества событий wheel или по таймауту
 * @param options Опции для настройки детектора
 * @returns Promise с типом устройства
 */
export function getInputDeviceType(options?: DetectionOptions): Promise<InputDeviceType> {
  return new Promise((resolve) => {
    const detector = new InputDeviceDetector(options);

    detector.detect((type) => {
      detector.stop();
      resolve(type);
    });
  });
}

// Расширяем глобальные типы для окна
declare global {
  interface Window {
    __INTERNAL__?: {
      canvasSettingsContext?: {
        setInputDevice: (deviceType: InputDeviceType) => void;
      };
    };
  }
}
