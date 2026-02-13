/**
 * Файл с информацией о версии приложения
 * Используется для отображения версии в интерфейсе и отправки в аналитику
 */
import {getAppEnvironment, getEnvironmentDisplayName} from './environment';

export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || '0.3';
export const APP_ENV = process.env.APP_ENV;

// Функция для получения информации о версии в формате строки
export const getVersionString = (): string => {
  if (getAppEnvironment() === 'production') {
    return `v${APP_VERSION}`;
  }
  return `v${APP_VERSION} (${getEnvironmentDisplayName()})`;
};
