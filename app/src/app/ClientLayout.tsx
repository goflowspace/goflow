'use client';

import React, {useEffect} from 'react';

import {useRouter} from 'next/navigation';

import {useUserInitialization} from '@hooks/useUserInitialization';
import {ReactFlowProvider} from '@xyflow/react';
import {ampli} from 'src/ampli';
import {isCloud} from 'src/utils/edition';
import {APP_VERSION} from 'src/utils/version';

import {useEditorSettingsStore} from '@store/useEditorSettingsStore';
import {useGraphStore} from '@store/useGraphStore';
import {useTeamStore} from '@store/useTeamStore';
import {useUIStore} from '@store/useUIStore';
import useUserStore from '@store/useUserStore';

import {AppInitializer} from '@components/AppInitializer/AppInitializer';
import NotificationsProvider, {initializeRouterForNotifications} from '@components/Notifications';
import Sidebar from '@components/Sidebar/Sidebar';
import WelcomeModal from '@components/WelcomeModal';
import WelcomeStoryInitializer from '@components/WelcomeStoryInitializer';

import {PipelinePricingProvider} from '../contexts/PipelinePricingContext';
import {WebSocketProvider} from '../contexts/WebSocketContext';
import {CanvasSettingsProvider} from '../hooks/CanvasSettingsContext';
import {I18nProvider} from './i18nProvider';

const ClientLayout: React.FC<{children: React.ReactNode}> = ({children}) => {
  const router = useRouter();
  const {isSidebarOpen} = useUIStore();
  const {user} = useUserStore();
  const {initializeFromStorage, loadUserTeams, isInitialized, currentTeam, currentUserRole, isLoadingUserRole, fetchCurrentUserRole} = useTeamStore();

  // Глобальная инициализация пользователя
  useUserInitialization();

  // Инициализируем Amplitude (только для Cloud, если задан API-ключ)
  useEffect(() => {
    if (!isCloud()) return;

    const apiKey = process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY;
    if (!apiKey) return;

    const initializeAmplitude = async () => {
      ampli.load({
        client: {
          apiKey,
          configuration: {
            appVersion: APP_VERSION
          }
        }
      });

      // Динамически импортируем плагины только на клиентской стороне
      if (typeof window !== 'undefined') {
        try {
          const {plugin: engagementPlugin} = await import('@amplitude/engagement-browser');
          const {plugin: sessionReplayPlugin} = await import('@amplitude/plugin-session-replay-browser');

          ampli.client.add(engagementPlugin());
          ampli.client.add(sessionReplayPlugin());
        } catch (error) {
          console.warn('Failed to load Amplitude plugins:', error);
        }
      }
    };

    initializeAmplitude();
  }, []);

  // Инициализируем глобальный роутер только один раз
  useEffect(() => {
    initializeRouterForNotifications(router);
  }, [router]);

  // Инициализируем хранилища
  useEffect(() => {
    // Загружаем данные из локального хранилища централизованно
    useGraphStore.getState().loadFromDb();

    // Загружаем настройки редактора из локального хранилища
    useEditorSettingsStore.getState().loadFromStorage();
  }, []);

  // Глобальная инициализация команд (Cloud-only в полном объеме)
  useEffect(() => {
    // Инициализируем из storage только если пользователь авторизован
    if (user) {
      initializeFromStorage();

      // Загружаем команды если команды не инициализированы
      if (!isInitialized) {
        loadUserTeams();
      }
    }
  }, [user, isInitialized, initializeFromStorage, loadUserTeams]);

  // Глобальная загрузка роли пользователя (только Cloud)
  useEffect(() => {
    if (!isCloud()) return;

    // Загружаем роль только для авторизованных пользователей
    if (user && currentTeam && !currentUserRole && !isLoadingUserRole) {
      // Дополнительная проверка что у нас есть токен
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      if (token) {
        fetchCurrentUserRole(currentTeam.id);
      }
    }
  }, [user, currentTeam, currentUserRole, isLoadingUserRole, fetchCurrentUserRole]);

  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      // Проверяем, является ли целевой элемент текстовым полем или элементом с возможностью редактирования
      const target = e.target as HTMLElement;
      const isEditable = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      // Если элемент не редактируемый - отменяем стандартное контекстное меню
      if (!isEditable) {
        e.preventDefault();
      }
    };

    // Добавляем обработчик события
    document.addEventListener('contextmenu', handleContextMenu);

    // Удаляем обработчик при размонтировании компонента
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, []);

  // OSS: минимальный набор провайдеров (без WebSocket, PipelinePricing)
  if (!isCloud()) {
    return (
      <I18nProvider>
        <CanvasSettingsProvider>
          <AppInitializer />
          {children}
          <WelcomeModal />
          <WelcomeStoryInitializer />
        </CanvasSettingsProvider>
      </I18nProvider>
    );
  }

  // Cloud: полный набор провайдеров
  return (
    <I18nProvider>
      <PipelinePricingProvider>
        <WebSocketProvider>
          <CanvasSettingsProvider>
            <NotificationsProvider>
              <AppInitializer />
              {children}
              <WelcomeModal />
              <WelcomeStoryInitializer />
            </NotificationsProvider>
          </CanvasSettingsProvider>
        </WebSocketProvider>
      </PipelinePricingProvider>
    </I18nProvider>
  );
};

export default ClientLayout;
