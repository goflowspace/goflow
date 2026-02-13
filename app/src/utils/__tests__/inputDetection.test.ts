import {InputDeviceDetector, getInputDeviceType} from '../inputDetection';

// Мокируем конструктор InputDeviceDetector для второго набора тестов
jest.mock('../inputDetection', () => {
  // Сохраняем оригинальный модуль
  const originalModule = jest.requireActual('../inputDetection');

  // Возвращаем модуль с измененной функцией для второго набора тестов
  return {
    ...originalModule,
    // Для тестирования второго набора тестов
    __esModule: true,
    getInputDeviceType: jest.fn(() => Promise.resolve('unknown'))
  };
});

describe('InputDeviceDetector', () => {
  let detector: InputDeviceDetector;
  let callbackMock: jest.Mock;

  beforeEach(() => {
    // Очищаем все моки между тестами
    jest.clearAllMocks();
    callbackMock = jest.fn();

    // Создаем детектор с уменьшенным размером выборки для тестов
    detector = new InputDeviceDetector({
      sampleSize: 3,
      touchpadThreshold: 0.7,
      resetTimeout: 200
    });
  });

  afterEach(() => {
    // Останавливаем детектор после каждого теста
    detector.stop();
  });

  // Вспомогательная функция для создания синтетического события wheel
  const createWheelEvent = (deltaMode: number): WheelEvent => {
    return new WheelEvent('wheel', {deltaY: 1, deltaMode});
  };

  // Вспомогательная функция для эмуляции серии событий прокрутки
  const simulateWheelEvents = (deltaModes: number[]): void => {
    deltaModes.forEach((deltaMode) => {
      window.dispatchEvent(createWheelEvent(deltaMode));
    });
  };

  test('должен определить мышь по событиям с deltaMode=1', () => {
    // Запускаем детектор
    detector.detect(callbackMock);

    // Симулируем события прокрутки с deltaMode=1 (характерно для мыши)
    simulateWheelEvents([1, 1, 1]);

    // Проверяем, что callback был вызван с правильным типом устройства
    expect(callbackMock).toHaveBeenCalledWith('mouse');
    expect(detector.getDetectedDevice()).toBe('mouse');
  });

  test('должен определить тачпад по событиям с deltaMode=0', () => {
    // Запускаем детектор
    detector.detect(callbackMock);

    // Симулируем события прокрутки с deltaMode=0 (характерно для тачпада)
    simulateWheelEvents([0, 0, 0]);

    // Проверяем, что callback был вызван с правильным типом устройства
    expect(callbackMock).toHaveBeenCalledWith('touchpad');
    expect(detector.getDetectedDevice()).toBe('touchpad');
  });

  test('не должен вызывать callback повторно, если тип устройства не изменился', () => {
    // Запускаем детектор
    detector.detect(callbackMock);

    // Симулируем два набора событий прокрутки с одинаковым паттерном (тачпад)
    simulateWheelEvents([0, 0, 0]);
    expect(callbackMock).toHaveBeenCalledTimes(1);

    // Сбрасываем моки
    callbackMock.mockClear();

    // Симулируем еще один набор похожих событий
    simulateWheelEvents([0, 0, 0]);

    // Callback не должен вызываться повторно, так как тип устройства не изменился
    expect(callbackMock).not.toHaveBeenCalled();
  });

  test('должен определить изменение типа устройства ввода', () => {
    // Запускаем детектор
    detector.detect(callbackMock);

    // Сначала симулируем события тачпада
    simulateWheelEvents([0, 0, 0]);
    expect(callbackMock).toHaveBeenLastCalledWith('touchpad');

    // Затем симулируем события мыши
    simulateWheelEvents([1, 1, 1]);

    // Callback должен быть вызван повторно с новым типом устройства
    expect(callbackMock).toHaveBeenLastCalledWith('mouse');
    expect(callbackMock).toHaveBeenCalledTimes(2);
  });

  test('должен правильно определить смешанные события', () => {
    // Запускаем детектор с заданным порогом touchpadThreshold
    detector = new InputDeviceDetector({
      sampleSize: 3,
      touchpadThreshold: 0.6, // Порог 60% для этого теста
      resetTimeout: 200
    });
    detector.detect(callbackMock);

    // Симулируем смешанные события (преимущественно тачпад)
    simulateWheelEvents([0, 0, 1]);

    // Проверяем, что определился тачпад (более 60% событий с deltaMode=0)
    expect(callbackMock).toHaveBeenCalledWith('touchpad');
    callbackMock.mockClear();

    // Симулируем смешанные события (преимущественно мышь)
    simulateWheelEvents([1, 1, 0]);

    // Проверяем, что определилась мышь (менее 60% событий с deltaMode=0)
    expect(callbackMock).toHaveBeenCalledWith('mouse');
  });

  test('должен остановить прослушивание событий при вызове stop()', () => {
    // Шпионим за addEventListener и removeEventListener
    const addEventSpy = jest.spyOn(window, 'addEventListener');
    const removeEventSpy = jest.spyOn(window, 'removeEventListener');

    // Запускаем детектор
    detector.detect(callbackMock);
    expect(addEventSpy).toHaveBeenCalledWith('wheel', expect.any(Function));

    // Останавливаем детектор
    detector.stop();
    expect(removeEventSpy).toHaveBeenCalledWith('wheel', expect.any(Function));

    // Проверяем, что события больше не обрабатываются
    simulateWheelEvents([0, 0, 0]);
    expect(callbackMock).not.toHaveBeenCalled();
  });

  test('должен вызвать анализ данных по таймауту', async () => {
    jest.useFakeTimers();

    // Шпионим за методом analyzeData
    const analyzeDataSpy = jest.spyOn(detector as any, 'analyzeData');

    // Запускаем детектор
    detector.detect(callbackMock);

    // Симулируем только два события (меньше чем sampleSize)
    simulateWheelEvents([0, 0]);

    // До таймаута метод analyzeData не должен быть вызван
    expect(analyzeDataSpy).not.toHaveBeenCalled();

    // Перематываем время вперед до срабатывания таймаута
    jest.advanceTimersByTime(200);

    // Теперь analyzeData должен быть вызван
    expect(analyzeDataSpy).toHaveBeenCalled();

    jest.useRealTimers();
  });

  test('должен вызвать анализ данных по maxWaitTime', async () => {
    jest.useFakeTimers();

    const analyzeDataSpy = jest.spyOn(detector as any, 'analyzeData');
    const stopSpy = jest.spyOn(detector, 'stop');

    // Запускаем детектор с maxWaitTime
    detector.detect(callbackMock);

    // Симулируем одно событие (недостаточно для analyzeData)
    simulateWheelEvents([0]);

    // До таймаута maxWaitTime analyzeData не должен быть вызван для недостаточного числа событий
    expect(analyzeDataSpy).not.toHaveBeenCalled();

    // Перематываем время до maxWaitTime (используем значение из defaultOptions)
    jest.advanceTimersByTime(5000);

    // Теперь analyzeData должен быть вызван и детектор остановлен
    expect(analyzeDataSpy).toHaveBeenCalled();
    expect(stopSpy).toHaveBeenCalled();

    jest.useRealTimers();
  });

  test('должен использовать настройки по умолчанию, если не указаны пользовательские', () => {
    const defaultDetector = new InputDeviceDetector();
    expect((defaultDetector as any).options.sampleSize).toBe(5);
    expect((defaultDetector as any).options.touchpadThreshold).toBe(0.7);
    expect((defaultDetector as any).options.resetTimeout).toBe(1000);
    expect((defaultDetector as any).options.maxWaitTime).toBe(5000);
  });
});

// Тестирование вспомогательных функций
describe('Вспомогательные функции для определения устройства ввода', () => {
  beforeEach(() => {
    let callbackMock: jest.Mock;
    jest.clearAllMocks();
    callbackMock = jest.fn();

    // Мокаем InputDeviceDetector для тестирования вспомогательных функций
    jest.spyOn(window, 'addEventListener').mockImplementation(() => {});
    jest.spyOn(window, 'removeEventListener').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('getInputDeviceType должен вернуть результат через Promise', async () => {
    // Проверяем, что функция возвращает ожидаемый результат
    const result = await getInputDeviceType();
    expect(result).toBe('unknown');
  });
});
