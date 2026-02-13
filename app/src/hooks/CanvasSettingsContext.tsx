import React, {ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useRef} from 'react';

import {ControlsType, useEditorSettingsStore} from '../store/useEditorSettingsStore';
import {CanvasInputSettings} from '../types/canvas';
import {InputDeviceType} from '../utils/inputDetection';
import {useInputDeviceSettings} from './useInputDeviceSettings';

// Преобразование типов управления из хранилища редактора в типы устройств ввода
const controlsTypeToInputDeviceType = (controls: ControlsType): InputDeviceType => {
  const result = (() => {
    switch (controls) {
      case 'mouse':
        return 'mouse';
      case 'touchpad':
        return 'touchpad';
      case 'auto':
      default:
        return 'unknown'; // Для 'auto' вернем 'unknown', чтобы запустить автоопределение
    }
  })();

  return result;
};

// Преобразование типов устройств ввода в типы управления хранилища редактора
const inputDeviceTypeToControlsType = (inputDevice: InputDeviceType): ControlsType => {
  const result = (() => {
    switch (inputDevice) {
      case 'mouse':
        return 'mouse';
      case 'touchpad':
        return 'touchpad';
      case 'unknown':
      default:
        return 'auto';
    }
  })();

  return result;
};

// Настройки Canvas для разных типов устройств ввода
const DEVICE_SETTINGS: Record<InputDeviceType, CanvasInputSettings> = {
  // Настройки для мыши
  mouse: {
    zoomOnScroll: true, // Включаем масштабирование при прокрутке для мыши
    zoomOnPinch: true,
    panOnScroll: false,
    panOnDrag: [1, 2, 32]
  },
  // Настройки для тачпада
  touchpad: {
    zoomOnScroll: false, // Отключаем масштабирование при прокрутке для тачпада
    zoomOnPinch: true,
    panOnScroll: true,
    panOnDrag: false
  },
  // Настройки по умолчанию (когда тип устройства неизвестен)
  unknown: {
    zoomOnScroll: false, // По умолчанию отключаем масштабирование при прокрутке
    zoomOnPinch: true,
    panOnScroll: false,
    panOnDrag: false
  }
};

// Контекст для настроек Canvas
interface CanvasSettingsContextType {
  /** Текущий тип устройства ввода */
  inputDevice: InputDeviceType;
  /** Определено ли устройство ввода автоматически */
  isAutoDetected: boolean;
  /** Идет ли процесс определения устройства ввода */
  isDetecting: boolean;
  /** Настройки Canvas для текущего устройства ввода */
  canvasSettings: CanvasInputSettings;
  /** Установить тип устройства ввода вручную */
  setInputDevice: (device: InputDeviceType) => void;
  /** Перезапустить определение устройства ввода */
  detectInputDevice: () => void;
}

// Создаем контекст с дефолтными значениями
const CanvasSettingsContext = createContext<CanvasSettingsContextType>({
  inputDevice: 'unknown',
  isAutoDetected: false,
  isDetecting: false,
  canvasSettings: DEVICE_SETTINGS.unknown,
  setInputDevice: () => {
    /* пустая функция */
  },
  detectInputDevice: () => {
    /* пустая функция */
  }
});

// Хук для использования контекста настроек Canvas
export function useCanvasSettings(): CanvasSettingsContextType {
  return useContext(CanvasSettingsContext);
}

// Провайдер для настроек Canvas
interface CanvasSettingsProviderProps {
  children: ReactNode;
}

export const CanvasSettingsProvider = ({children}: CanvasSettingsProviderProps): React.ReactElement => {
  // Получаем настройки из хранилища редактора
  const editorControls = useEditorSettingsStore((s) => s.controls);
  const setEditorControls = useEditorSettingsStore((s) => s.setControls);

  // Используем хук для управления настройками устройства ввода
  const {inputDevice, isDetecting, isAutoDetected, setManualInputDevice, detectInputDevice} = useInputDeviceSettings();

  // Синхронизируем настройки редактора с нашим определителем устройства
  // При изменении editorControls в настройках редактора
  useEffect(() => {
    // Предотвращаем циклическое обновление, проверяя текущие значения
    const deviceType = controlsTypeToInputDeviceType(editorControls);

    // Обновляем только если текущее значение inputDevice отличается от ожидаемого
    // и тип контролов не 'auto' (который соответствует 'unknown')
    if (editorControls !== 'auto' && deviceType !== inputDevice) {
      setManualInputDevice(deviceType);
    } else if (editorControls === 'auto' && !isAutoDetected) {
      // Запускаем автоопределение только если оно ещё не было выполнено
      detectInputDevice();
    }
  }, [editorControls, inputDevice, isAutoDetected, setManualInputDevice, detectInputDevice]);

  // Обновляем настройки редактора только при изменении настроек устройства
  // и только если не было изменений в editorControls
  const prevInputDeviceRef = useRef<InputDeviceType>(inputDevice);
  const prevAutoDetectedRef = useRef<boolean>(isAutoDetected);

  useEffect(() => {
    // Проверяем, изменилось ли что-то относительно предыдущего состояния
    const inputDeviceChanged = prevInputDeviceRef.current !== inputDevice;
    const autoDetectedChanged = prevAutoDetectedRef.current !== isAutoDetected;

    // Обновляем ссылки для следующей проверки
    prevInputDeviceRef.current = inputDevice;
    prevAutoDetectedRef.current = isAutoDetected;

    // Выходим, если ничего не изменилось
    if (!inputDeviceChanged && !autoDetectedChanged) {
      return;
    }

    const newControlsType = inputDeviceTypeToControlsType(inputDevice);

    // Обновляем только если настройки фактически изменились
    if (isAutoDetected) {
      // Если устройство определено автоматически и текущие настройки не auto
      if (editorControls !== 'auto') {
        setEditorControls('auto');
      }
    } else if (editorControls !== newControlsType) {
      // Если устройство выбрано вручную и настройки отличаются
      setEditorControls(newControlsType);
    }
  }, [inputDevice, isAutoDetected, editorControls, setEditorControls]);

  // Получаем настройки Canvas для текущего устройства ввода
  const canvasSettings = useMemo(() => {
    return DEVICE_SETTINGS[inputDevice];
  }, [inputDevice]);

  // Функция для установки типа устройства ввода
  const setInputDevice = useCallback(
    (device: InputDeviceType) => {
      // Предотвращаем повторное обновление, если устройство не изменилось
      if (device === inputDevice) {
        return;
      }

      setManualInputDevice(device);

      // Обновляем настройки редактора только если они не соответствуют
      const expectedControlsType = inputDeviceTypeToControlsType(device);
      if (editorControls !== expectedControlsType) {
        setEditorControls(expectedControlsType);
      }
    },
    [inputDevice, setManualInputDevice, setEditorControls, editorControls]
  );

  // Значение контекста
  const contextValue = useMemo(
    () => ({
      inputDevice,
      isAutoDetected,
      isDetecting,
      canvasSettings,
      setInputDevice,
      detectInputDevice
    }),
    [inputDevice, isAutoDetected, isDetecting, canvasSettings, setInputDevice, detectInputDevice]
  );

  // Экспортируем контекст в глобальный объект для отладки
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Создаем __INTERNAL__ объект, если он еще не существует
      window.__INTERNAL__ = window.__INTERNAL__ || {};
      // Экспортируем текущий контекст
      window.__INTERNAL__.canvasSettingsContext = {
        setInputDevice
      };
    }

    return () => {
      // Удаляем ссылку при размонтировании
      if (window.__INTERNAL__?.canvasSettingsContext) {
        window.__INTERNAL__.canvasSettingsContext = undefined;
      }
    };
  }, [setInputDevice]);

  return <CanvasSettingsContext.Provider value={contextValue}>{children}</CanvasSettingsContext.Provider>;
};
