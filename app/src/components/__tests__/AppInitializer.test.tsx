import React from 'react';

import {cleanup, render} from '@testing-library/react';

import {useWebSocket} from '../../contexts/WebSocketContext';
import {useCurrentProject} from '../../hooks/useCurrentProject';
// Импортируем моки
import {SyncServiceRegistry} from '../../services/syncServiceFactory';
import {useGraphStore} from '../../store/useGraphStore';
import {useTeamStore} from '../../store/useTeamStore';
import useUserStore from '../../store/useUserStore';
import {useFeatureFlag} from '../../utils/featureFlags';
import {AppInitializer} from '../AppInitializer/AppInitializer';

// Мокаем модули
jest.mock('../../services/syncServiceFactory', () => ({
  SyncServiceFactory: {
    create: jest.fn()
  },
  SyncServiceRegistry: {
    getOrCreate: jest.fn(),
    clear: jest.fn()
  }
}));

jest.mock('../../hooks/useCurrentProject', () => ({
  useCurrentProject: jest.fn()
}));

jest.mock('../../store/useGraphStore', () => ({
  useGraphStore: {
    getState: jest.fn()
  }
}));

jest.mock('../../contexts/WebSocketContext', () => ({
  useWebSocket: jest.fn()
}));

jest.mock('../../utils/featureFlags', () => ({
  useFeatureFlag: jest.fn()
}));

jest.mock('../../store/useTeamStore', () => ({
  useTeamStore: jest.fn()
}));

jest.mock('../../store/useUserStore', () => ({
  __esModule: true,
  default: jest.fn()
}));

// Мокаем window.setInterval и clearInterval
const mockSetInterval = jest.fn();
const mockClearInterval = jest.fn();

// Мокаем document.addEventListener и removeEventListener
const mockAddEventListener = jest.fn();
const mockRemoveEventListener = jest.fn();

describe('AppInitializer', () => {
  // Мок SyncService
  const mockSyncService = {
    start: jest.fn(),
    stop: jest.fn(),
    on: jest.fn()
  };

  // Мок для saveToDb
  const mockSaveToDb = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Сохраняем оригинальные методы
    Object.defineProperty(window, 'setInterval', {
      writable: true,
      value: mockSetInterval
    });
    Object.defineProperty(window, 'clearInterval', {
      writable: true,
      value: mockClearInterval
    });

    Object.defineProperty(document, 'addEventListener', {
      writable: true,
      value: mockAddEventListener
    });
    Object.defineProperty(document, 'removeEventListener', {
      writable: true,
      value: mockRemoveEventListener
    });

    // Настраиваем моки по умолчанию
    (useWebSocket as jest.Mock).mockReturnValue({
      socket: null,
      isConnected: false,
      joinProject: jest.fn(),
      leaveProject: jest.fn(),
      subscribeToAIEvents: jest.fn()
    });

    (useGraphStore.getState as jest.Mock).mockReturnValue({
      saveToDb: mockSaveToDb
    });

    (SyncServiceRegistry.getOrCreate as jest.Mock).mockReturnValue(mockSyncService);

    // Добавляем новые моки для обновленного AppInitializer
    (useFeatureFlag as jest.Mock).mockImplementation((flag: string) => {
      if (flag === 'WS_SYNC_ENABLED') return false; // По умолчанию WebSocket отключен
      if (flag === 'REALTIME_COLLABORATION') return false;
      return false;
    });

    (useTeamStore as unknown as jest.Mock).mockReturnValue({
      currentTeam: {id: 'test-team-id', name: 'Test Team'},
      initializeFromStorage: jest.fn(),
      loadUserTeams: jest.fn(),
      isInitialized: true
    });

    (useUserStore as unknown as jest.Mock).mockReturnValue({
      user: {id: 'test-user-id', name: 'Test User'}
    });

    (useCurrentProject as jest.Mock).mockReturnValue({
      projectId: 'test-project-id'
    });

    // Мокаем возврат intervalId
    mockSetInterval.mockReturnValue(12345);
  });

  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  describe('SyncService initialization', () => {
    it('should initialize SyncService when project exists', () => {
      // Мокаем наличие проекта через useCurrentProject
      (useCurrentProject as jest.Mock).mockReturnValue({
        projectId: 'test-project-id',
        isProjectLoaded: true
      });

      render(<AppInitializer />);

      // Проверяем инициализацию SyncService
      expect(SyncServiceRegistry.getOrCreate).toHaveBeenCalledWith('test-project-id', {
        syncIntervalMs: 5000,
        batchSize: 50,
        maxRetries: 3
      });

      expect(mockSyncService.start).toHaveBeenCalled();

      // Проверяем подписку на события SyncService
      expect(mockSyncService.on).toHaveBeenCalledWith('syncCompleted', expect.any(Function));
      expect(mockSyncService.on).toHaveBeenCalledWith('syncFailed', expect.any(Function));
      expect(mockSyncService.on).toHaveBeenCalledWith('statusChanged', expect.any(Function));
      expect(mockSyncService.on).toHaveBeenCalledWith('serverOperationsReceived', expect.any(Function));
    });

    it('should not initialize SyncService when no project exists', () => {
      // Мокаем отсутствие проекта
      (useCurrentProject as jest.Mock).mockReturnValue({
        projectId: null,
        isProjectLoaded: false
      });

      render(<AppInitializer />);

      // Проверяем что SyncService не инициализируется
      expect(SyncServiceRegistry.getOrCreate).not.toHaveBeenCalled();
      expect(mockSyncService.start).not.toHaveBeenCalled();
    });

    it('should handle SyncService initialization errors gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Мокаем ошибку при создании SyncService
      (useCurrentProject as jest.Mock).mockReturnValue({
        projectId: 'test-project-id',
        isProjectLoaded: true
      });

      (SyncServiceRegistry.getOrCreate as jest.Mock).mockImplementation(() => {
        throw new Error('SyncService initialization failed');
      });

      render(<AppInitializer />);

      // Проверяем что ошибка залогирована
      expect(consoleSpy).toHaveBeenCalledWith('Failed to initialize SyncService:', expect.any(Error));

      consoleSpy.mockRestore();
    });
  });

  describe('Periodic snapshots', () => {
    it('should start periodic snapshot timer', () => {
      (useCurrentProject as jest.Mock).mockReturnValue({
        projectId: 'test-project-id',
        isProjectLoaded: true
      });

      render(<AppInitializer />);

      // Проверяем что setInterval был вызван для снапшотов
      expect(mockSetInterval).toHaveBeenCalledWith(expect.any(Function), 60000);
    });

    it('should save snapshot when timer fires and project exists', () => {
      (useCurrentProject as jest.Mock).mockReturnValue({
        projectId: 'test-project-id',
        isProjectLoaded: true
      });

      render(<AppInitializer />);

      // Получаем функцию callback для снапшотов (вызов setInterval с интервалом 60000)
      const snapshotCall = mockSetInterval.mock.calls.find((call) => call[1] === 60000);
      expect(snapshotCall).toBeDefined();

      const snapshotCallback = snapshotCall[0];

      // Вызываем callback
      snapshotCallback();

      // Проверяем что saveToDb был вызван
      expect(mockSaveToDb).toHaveBeenCalled();
    });

    it('should not save snapshot when timer fires but no project exists', () => {
      // Начинаем с проекта, потом меняем на null (эмулируя изменение в runtime)
      (useCurrentProject as jest.Mock).mockReturnValue({
        projectId: null,
        isProjectLoaded: false
      });

      render(<AppInitializer />);

      // Получаем функцию callback из setInterval
      const snapshotCall = mockSetInterval.mock.calls.find((call) => call[1] === 60000);
      const snapshotCallback = snapshotCall?.[0];

      if (snapshotCallback) {
        // Вызываем callback
        snapshotCallback();
      }

      // Проверяем что saveToDb не был вызван
      expect(mockSaveToDb).not.toHaveBeenCalled();
    });
  });

  describe('Cleanup on unmount', () => {
    it('should clear SyncService registry and interval on unmount', () => {
      (useCurrentProject as jest.Mock).mockReturnValue({
        projectId: 'test-project-id',
        isProjectLoaded: true
      });

      const {unmount} = render(<AppInitializer />);

      // Размонтируем компонент
      unmount();

      // Проверяем очистку
      expect(SyncServiceRegistry.clear).toHaveBeenCalled();
      expect(mockClearInterval).toHaveBeenCalledWith(12345);
    });

    it.skip('should handle cleanup when no interval was set', () => {
      (useCurrentProject as jest.Mock).mockReturnValue({
        projectId: null,
        isProjectLoaded: false
      });

      // Мокаем что setInterval не был вызван
      mockSetInterval.mockReturnValue(undefined);

      const {unmount} = render(<AppInitializer />);

      // Размонтируем компонент
      unmount();

      // Проверяем что очистка все равно работает
      expect(SyncServiceRegistry.clear).toHaveBeenCalled();
      // clearInterval не должен быть вызван для undefined
      expect(mockClearInterval).not.toHaveBeenCalled();
    });
  });

  describe('Visibility change handling', () => {
    it('should add visibility change event listener', () => {
      (useCurrentProject as jest.Mock).mockReturnValue({
        projectId: 'test-project-id',
        isProjectLoaded: true
      });

      render(<AppInitializer />);

      expect(mockAddEventListener).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
    });

    it('should remove visibility change event listener on unmount', () => {
      (useCurrentProject as jest.Mock).mockReturnValue({
        projectId: 'test-project-id',
        isProjectLoaded: true
      });

      const {unmount} = render(<AppInitializer />);

      // Получаем функцию listener
      const listener = mockAddEventListener.mock.calls.find((call) => call[0] === 'visibilitychange')[1];

      unmount();

      expect(mockRemoveEventListener).toHaveBeenCalledWith('visibilitychange', listener);
    });

    it('should save snapshot when page becomes hidden and project exists', () => {
      (useCurrentProject as jest.Mock).mockReturnValue({
        projectId: 'test-project-id',
        isProjectLoaded: true
      });

      // Мокаем document.visibilityState
      Object.defineProperty(document, 'visibilityState', {
        writable: true,
        value: 'hidden'
      });

      render(<AppInitializer />);

      // Получаем функцию listener
      const listener = mockAddEventListener.mock.calls.find((call) => call[0] === 'visibilitychange')[1];

      // Вызываем listener
      listener();

      expect(mockSaveToDb).toHaveBeenCalled();
    });

    it('should not save snapshot when page becomes hidden but no project exists', () => {
      (useCurrentProject as jest.Mock).mockReturnValue({
        projectId: null,
        isProjectLoaded: false
      });

      // Мокаем document.visibilityState
      Object.defineProperty(document, 'visibilityState', {
        writable: true,
        value: 'hidden'
      });

      render(<AppInitializer />);

      // Получаем функцию listener
      const listener = mockAddEventListener.mock.calls.find((call) => call[0] === 'visibilitychange')[1];

      // Вызываем listener
      listener();

      expect(mockSaveToDb).not.toHaveBeenCalled();
    });

    it('should not save snapshot when page becomes visible', () => {
      (useCurrentProject as jest.Mock).mockReturnValue({
        projectId: 'test-project-id',
        isProjectLoaded: true
      });

      // Мокаем document.visibilityState как visible
      Object.defineProperty(document, 'visibilityState', {
        writable: true,
        value: 'visible'
      });

      render(<AppInitializer />);

      // Получаем функцию listener
      const listener = mockAddEventListener.mock.calls.find((call) => call[0] === 'visibilitychange')[1];

      // Вызываем listener
      listener();

      expect(mockSaveToDb).not.toHaveBeenCalled();
    });
  });

  describe('SyncService event handlers', () => {
    it('should log sync completion events', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      (useCurrentProject as jest.Mock).mockReturnValue({
        projectId: 'test-project-id',
        isProjectLoaded: true
      });

      render(<AppInitializer />);

      // Получаем обработчик события syncCompleted
      const syncCompletedHandler = mockSyncService.on.mock.calls.find((call) => call[0] === 'syncCompleted')[1];

      // Вызываем обработчик с тестовыми данными
      syncCompletedHandler({
        totalOperationsProcessed: 5,
        pendingOperations: 0,
        lastSyncTime: 1640995200000
      });

      expect(consoleSpy).toHaveBeenCalledWith('Sync completed successfully:', {
        processedOperations: 5,
        pendingOperations: 0,
        lastSyncTime: new Date(1640995200000).toLocaleTimeString()
      });

      consoleSpy.mockRestore();
    });

    it('should log sync failure events', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      (useCurrentProject as jest.Mock).mockReturnValue({
        projectId: 'test-project-id',
        isProjectLoaded: true
      });

      render(<AppInitializer />);

      // Получаем обработчик события syncFailed
      const syncFailedHandler = mockSyncService.on.mock.calls.find((call) => call[0] === 'syncFailed')[1];

      // Вызываем обработчик с тестовыми данными
      syncFailedHandler('Network error', {
        currentRetryCount: 2,
        failedSyncs: 1
      });

      expect(consoleSpy).toHaveBeenCalledWith('Sync failed:', 'Network error', {
        retryCount: 2,
        maxRetries: 1
      });

      consoleSpy.mockRestore();
    });

    it.skip('should log server operations received events', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      (useCurrentProject as jest.Mock).mockReturnValue({
        projectId: 'test-project-id',
        isProjectLoaded: true
      });

      render(<AppInitializer />);

      // Получаем обработчик события serverOperationsReceived
      const serverOpsHandler = mockSyncService.on.mock.calls.find((call) => call[0] === 'serverOperationsReceived')[1];

      // Вызываем обработчик с тестовыми данными
      const mockOperations = [
        {type: 'node.added', payload: {}},
        {type: 'edge.added', payload: {}}
      ];
      serverOpsHandler(mockOperations, 123);

      expect(consoleSpy).toHaveBeenCalledWith('Received 2 server operations, applying...');

      consoleSpy.mockRestore();
    });
  });

  describe('Component rendering', () => {
    it('should not render any visible UI elements', () => {
      (useCurrentProject as jest.Mock).mockReturnValue({
        projectId: 'test-project-id',
        isProjectLoaded: true
      });

      const {container} = render(<AppInitializer />);

      // Проверяем что компонент не рендерит никаких UI элементов
      expect(container.firstChild).toBeNull();
    });
  });

  describe('Console logging', () => {
    it.skip('should log SyncService initialization', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      (useCurrentProject as jest.Mock).mockReturnValue({
        projectId: 'test-project-id',
        isProjectLoaded: true
      });

      render(<AppInitializer />);

      expect(consoleSpy).toHaveBeenCalledWith('Initializing SyncService for project:', 'test-project-id');
      expect(consoleSpy).toHaveBeenCalledWith('SyncService started successfully for project:', 'test-project-id');

      consoleSpy.mockRestore();
    });

    it('should log when no project exists', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      (useCurrentProject as jest.Mock).mockReturnValue({
        projectId: null,
        isProjectLoaded: false
      });

      render(<AppInitializer />);

      expect(consoleSpy).toHaveBeenCalledWith('No project ID available, waiting...');

      consoleSpy.mockRestore();
    });

    it.skip('should log cleanup on unmount', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      (useCurrentProject as jest.Mock).mockReturnValue({
        projectId: 'test-project-id',
        isProjectLoaded: true
      });

      const {unmount} = render(<AppInitializer />);

      unmount();

      expect(consoleSpy).toHaveBeenCalledWith('Cleaning up SyncService...');

      consoleSpy.mockRestore();
    });
  });
});
