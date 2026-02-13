'use client';

import React from 'react';

import type {AppRouterInstance} from 'next/dist/shared/lib/app-router-context.shared-runtime';
import {useRouter} from 'next/navigation';

import {Toaster, toast} from 'sonner';

import './Notifications.css';

// Тип для системы уведомлений
export interface NotificationOptions {
  message: string;
  autoClose?: boolean;
  duration?: number;
  actionButton?: {
    label: string;
    onClick: () => void;
  };
  navigationButton?: {
    label: string;
    path: string;
  };
}

// Глобальный роутер для использования в уведомлениях из неконтекстных функций
let globalRouter: AppRouterInstance | null = null;

// Синглтон для управления уведомлениями
class NotificationManager {
  private static instance: NotificationManager;
  private router: AppRouterInstance | null = null;

  private constructor() {}

  public static getInstance(): NotificationManager {
    if (!NotificationManager.instance) {
      NotificationManager.instance = new NotificationManager();
    }
    return NotificationManager.instance;
  }

  // Установка роутера для навигации
  public setRouter(router: AppRouterInstance): void {
    this.router = router;
    // Также устанавливаем глобальный роутер
    globalRouter = router;
  }

  // Получение роутера для навигации (с запасным вариантом)
  private getRouter(): AppRouterInstance | null {
    // Используем локальный роутер, если он установлен
    if (this.router) {
      return this.router;
    }

    // Если локальный роутер не установлен, используем глобальный
    if (globalRouter) {
      return globalRouter;
    }

    console.warn('Router is not set in NotificationManager');
    return null;
  }

  // Показать уведомление об ошибке
  public showError(message: string, autoClose: boolean = true, duration: number = 10000): void {
    toast.error(message, {
      duration: duration
    });
  }

  // Показать уведомление об ошибке с кнопкой действия
  public showErrorWithAction(message: string, actionLabel: string, actionCallback: () => void, autoClose: boolean = false, duration: number = 10000): void {
    toast.error(message, {
      duration: autoClose ? duration : Infinity,
      action: {
        label: actionLabel,
        onClick: actionCallback
      }
    });
  }

  // Показать уведомление об ошибке с кнопкой навигации
  public showErrorWithNavigation(message: string, actionLabel: string, path: string, autoClose: boolean = true, duration: number = 10000): void {
    toast.error(message, {
      duration: autoClose ? duration : Infinity,
      action: {
        label: actionLabel,
        onClick: () => {
          const router = this.getRouter();
          if (router) {
            router.push(path);
          } else {
            // Запасной вариант для перехода без роутера
            window.location.href = path;
          }
        }
      }
    });
  }

  // Показать успешное уведомление
  public showSuccess(message: string, autoClose: boolean = true, duration: number = 10000): void {
    toast.success(message, {
      duration: duration
    });
  }

  // Показать успешное уведомление с кнопкой действия
  public showSuccessWithAction(message: string, actionLabel: string, actionCallback: () => void, autoClose: boolean = false, duration: number = 10000): void {
    toast.success(message, {
      duration: autoClose ? duration : Infinity,
      action: {
        label: actionLabel,
        onClick: actionCallback
      }
    });
  }

  // Показать успешное уведомление с кнопкой навигации
  public showSuccessWithNavigation(message: string, actionLabel: string, path: string, autoClose: boolean = true, duration: number = 10000): void {
    toast.success(message, {
      duration: autoClose ? duration : Infinity,
      action: {
        label: actionLabel,
        onClick: () => {
          const router = this.getRouter();
          if (router) {
            router.push(path);
          } else {
            // Запасной вариант для перехода без роутера
            window.location.href = path;
          }
        }
      }
    });
  }
}

// Экспортируем функцию для доступа к NotificationManager
export const getNotificationManager = (): NotificationManager => {
  return NotificationManager.getInstance();
};

// Хук для использования NotificationManager в компонентах
export const useNotifications = () => {
  const router = useRouter();

  React.useEffect(() => {
    // Устанавливаем роутер для менеджера уведомлений
    getNotificationManager().setRouter(router);
  }, [router]);

  return {
    showError: (message: string, autoClose?: boolean, duration?: number) => getNotificationManager().showError(message, autoClose, duration),
    showErrorWithAction: (message: string, actionLabel: string, actionCallback: () => void, autoClose?: boolean, duration?: number) =>
      getNotificationManager().showErrorWithAction(message, actionLabel, actionCallback, autoClose, duration),
    showErrorWithNavigation: (message: string, actionLabel: string, path: string, autoClose?: boolean, duration?: number) =>
      getNotificationManager().showErrorWithNavigation(message, actionLabel, path, autoClose, duration),
    showSuccess: (message: string, autoClose?: boolean, duration?: number) => getNotificationManager().showSuccess(message, autoClose, duration),
    showSuccessWithAction: (message: string, actionLabel: string, actionCallback: () => void, autoClose?: boolean, duration?: number) =>
      getNotificationManager().showSuccessWithAction(message, actionLabel, actionCallback, autoClose, duration),
    showSuccessWithNavigation: (message: string, actionLabel: string, path: string, autoClose?: boolean, duration?: number) =>
      getNotificationManager().showSuccessWithNavigation(message, actionLabel, path, autoClose, duration)
  };
};

// Инициализация роутера в провайдере
export const initializeRouterForNotifications = (router: AppRouterInstance): void => {
  getNotificationManager().setRouter(router);
  globalRouter = router;
};

// Компонент для рендеринга Toaster
export const NotificationsProvider: React.FC<{children: React.ReactNode}> = ({children}) => {
  const router = useRouter();

  React.useEffect(() => {
    // Инициализируем глобальный роутер при монтировании провайдера
    initializeRouterForNotifications(router);
  }, [router]);

  return (
    <>
      <Toaster
        position='bottom-center'
        expand={true}
        richColors
        closeButton
        visibleToasts={3}
        toastOptions={{
          style: {
            fontSize: '0.875rem',
            width: 'auto',
            maxWidth: '500px'
          },
          className: 'notification-toast',
          duration: 10000,
          descriptionClassName: 'notification-description'
        }}
      />
      {children}
    </>
  );
};

export default NotificationsProvider;
