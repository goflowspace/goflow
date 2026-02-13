import {useCallback, useEffect, useState} from 'react';

import {InputDeviceType, getInputDeviceType} from '../utils/inputDetection';
import {isMacOS} from '../utils/keyboardModifiers';

// Ключ для хранения настроек в localStorage
const INPUT_DEVICE_STORAGE_KEY = 'flow-input-device';
// Ключ для хранения информации о том, было ли устройство определено автоматически
const INPUT_DEVICE_AUTO_DETECTED_KEY = 'flow-input-device-auto-detected';

/**
 * Использует базовые возможности браузера для предварительного определения типа устройства
 * @returns предварительно определенный тип устройства
 */
function getInitialDeviceHint(): InputDeviceType {
  // Обновленный метод с лучшей эвристикой определения устройства

  // Проверяем наличие сенсорных возможностей
  const hasTouchPoints = navigator.maxTouchPoints > 1;
  const isCoarsePointer = window.matchMedia?.('(pointer: coarse)').matches;

  // Пытаемся определить платформу/ОС
  const platform = navigator.platform || '';
  const userAgent = navigator.userAgent || '';
  const isIOS = /iPad|iPhone|iPod/.test(platform) || (/Mac/i.test(platform) && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/i.test(userAgent);

  // Если это явно мобильное устройство - считаем тачпадом
  if (isIOS || isAndroid || (hasTouchPoints && isCoarsePointer)) {
    return 'touchpad';
  }

  // Если нет явных признаков - оставляем unknown для дальнейшего определения
  return 'unknown';
}

/**
 * Хук для управления настройками устройства ввода
 * @returns Объект с данными и функциями для управления настройками устройства ввода
 */
export function useInputDeviceSettings() {
  // Текущее устройство ввода
  const [inputDevice, setInputDevice] = useState<InputDeviceType>('unknown');
  // Флаг, показывающий, определено ли устройство ввода автоматически
  const [isAutoDetected, setIsAutoDetected] = useState<boolean>(false);
  // Флаг, показывающий, идет ли в данный момент определение устройства
  const [isDetecting, setIsDetecting] = useState<boolean>(false);

  /**
   * Загружает сохраненные настройки устройства ввода из localStorage
   */
  const loadSavedSettings = useCallback(() => {
    try {
      // Загружаем сохраненное устройство
      const savedDevice = localStorage.getItem(INPUT_DEVICE_STORAGE_KEY);
      if (savedDevice) {
        setInputDevice(savedDevice as InputDeviceType);
      }

      // Загружаем флаг автоматического определения
      const autoDetected = localStorage.getItem(INPUT_DEVICE_AUTO_DETECTED_KEY);
      setIsAutoDetected(autoDetected === 'true');
    } catch (e) {
      console.error('Ошибка при загрузке настроек устройства ввода:', e);
    }
  }, []);

  /**
   * Сохраняет настройки устройства ввода в localStorage
   * @param device Тип устройства ввода
   * @param autoDetected Определено ли устройство автоматически
   */
  const saveSettings = useCallback((device: InputDeviceType, autoDetected: boolean) => {
    try {
      localStorage.setItem(INPUT_DEVICE_STORAGE_KEY, device);
      localStorage.setItem(INPUT_DEVICE_AUTO_DETECTED_KEY, String(autoDetected));

      setInputDevice(device);
      setIsAutoDetected(autoDetected);
    } catch (e) {
      console.error('Ошибка при сохранении настроек устройства ввода:', e);
    }
  }, []);

  /**
   * Запускает автоматическое определение устройства ввода
   */
  const detectInputDevice = useCallback(async () => {
    // Загружаем сохраненные настройки
    loadSavedSettings();

    // Если устройство уже было определено пользователем вручную,
    // то не запускаем автоматическое определение
    if (inputDevice !== 'unknown' && !isAutoDetected) {
      return;
    }

    // Запускаем определение устройства
    setIsDetecting(true);

    try {
      // Используем предварительное определение на основе браузерных API
      const initialDevice = getInitialDeviceHint();

      // Если предварительное определение дало конкретное устройство, используем его
      if (initialDevice !== 'unknown') {
        saveSettings(initialDevice, true);
        setIsDetecting(false);
        return;
      }

      // Если предварительное определение не дало результатов, используем детальное определение
      const detectedDevice = await getInputDeviceType();

      // Если определение не удалось (осталось unknown) и у нас уже есть сохраненное значение,
      // то не перезаписываем его
      if (detectedDevice !== 'unknown' || inputDevice === 'unknown') {
        saveSettings(detectedDevice, true);
      }
    } catch (e) {
      console.error('Ошибка при определении устройства ввода:', e);
    } finally {
      setIsDetecting(false);
    }
  }, [inputDevice, isAutoDetected, loadSavedSettings, saveSettings]);

  /**
   * Устанавливает тип устройства ввода вручную
   * @param device Тип устройства ввода
   */
  const setManualInputDevice = useCallback(
    (device: InputDeviceType) => {
      saveSettings(device, false);
    },
    [saveSettings]
  );

  // При монтировании компонента загружаем настройки и
  // запускаем определение устройства, если необходимо
  useEffect(() => {
    detectInputDevice();
  }, [detectInputDevice]);

  return {
    inputDevice,
    isDetecting,
    isAutoDetected,
    setManualInputDevice,
    detectInputDevice
  };
}
