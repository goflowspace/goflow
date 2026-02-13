/**
 * Тесты для компонента StoryPlayer
 */
import React from 'react';

import {STORY_KEY} from '@services/storageService';
import {render, screen, waitFor} from '@testing-library/react';
import {Node} from '@types-folder/nodes';

import {PlaybackStorageService} from '../../../services/playbackStorageService';
import {ConditionEvaluatorImpl} from '../../engine/conditions/ConditionEvaluatorImpl';
import {ConditionStrategyFactory} from '../../engine/conditions/ConditionStrategyFactory';
import * as StoryEngineModule from '../../engine/core/StoryEngineImpl';
import {StoryEngine} from '../../engine/interfaces/StoryEngine';
import {timelineToStoryData} from '../../engine/utils/timelineToStoryData';
import {PlaybackLogProvider} from '../PlaybackLogPanelV2/contexts/LogContext';
import {StoryPlayer} from '../StoryPlayer';
import * as RadixRendererModule from '../renderers/RadixRendererClean';

// Мокаем react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'playback.story_player.story_not_found': 'Story not found',
        'playback.story_player.error_loading_story': 'Error loading story'
      };
      return translations[key] || key;
    }
  })
}));

// Мокаем localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    clear: jest.fn(() => {
      store = {};
    })
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Мокаем URLSearchParams
const mockURLSearchParams = jest.fn();
Object.defineProperty(window, 'URLSearchParams', {
  value: mockURLSearchParams
});

// Мокаем трансформер
jest.mock('../../engine/utils/timelineToStoryData', () => ({
  timelineToStoryData: jest.fn()
}));

// Мокаем PlaybackStorageService
jest.mock('../../../services/playbackStorageService', () => ({
  PlaybackStorageService: {
    loadPlaybackData: jest.fn()
  }
}));

// Мокаем ConditionStrategyFactory и ConditionEvaluatorImpl
jest.mock('../../engine/conditions/ConditionStrategyFactory');
jest.mock('../../engine/conditions/ConditionEvaluatorImpl');

// Мокаем движок
jest.mock('../../engine/core/StoryEngineImpl');

// Мокаем рендерер, чтобы он не рендерил сложный компонент
jest.mock('../renderers/RadixRendererClean', () => ({
  RadixRendererComponent: jest.fn(() => <div data-testid='radix-renderer' />)
}));

// Мокаем Theme для тестов
jest.mock('@radix-ui/themes', () => ({
  ...jest.requireActual('@radix-ui/themes'),
  Theme: ({children}: {children: React.ReactNode}) => <div data-testid='theme-container'>{children}</div>
}));

// Мокаем PlaybackLogProvider, так как он использует контекст
jest.mock('../PlaybackLogPanelV2', () => ({
  ...jest.requireActual('../PlaybackLogPanelV2'),
  PlaybackLogProvider: ({children}: {children: React.ReactNode}) => <div data-testid='log-provider'>{children}</div>
}));

describe('StoryPlayer', () => {
  let mockEngine: jest.Mocked<StoryEngine>;
  let mockPlaybackStorageService: jest.Mocked<typeof PlaybackStorageService>;

  beforeEach(() => {
    // Очищаем моки перед каждым тестом
    jest.clearAllMocks();
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.clear.mockClear();

    // Настраиваем мок для URLSearchParams
    mockURLSearchParams.mockImplementation((searchString: string) => ({
      get: jest.fn().mockReturnValue(null) // По умолчанию нет playbackId
    }));

    // Мокаем PlaybackStorageService
    mockPlaybackStorageService = PlaybackStorageService as jest.Mocked<typeof PlaybackStorageService>;

    // Создаем мок движка
    mockEngine = {
      initialize: jest.fn(),
      getStartNode: jest.fn().mockReturnValue({
        id: 'start',
        type: 'narrative',
        coordinates: {x: 0, y: 0},
        data: {title: 'Start', text: 'This is the start node'}
      } as Node),
      getNextNode: jest.fn(),
      executeChoice: jest.fn(),
      getAvailableChoices: jest.fn(),
      getState: jest.fn().mockReturnValue({
        variables: {},
        visitedNodes: new Set<string>(['start']),
        history: []
      }),
      goBack: jest.fn(),
      restart: jest.fn(),
      visitNode: jest.fn(),
      getEventEmitter: jest.fn().mockReturnValue({
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn()
      }),
      getStoryData: jest.fn().mockReturnValue({
        title: 'Test Story',
        data: {
          nodes: [
            {
              id: 'start',
              type: 'narrative',
              coordinates: {x: 0, y: 0},
              data: {title: 'Start', text: 'This is the start node'}
            }
          ],
          edges: [],
          variables: []
        }
      })
    } as unknown as jest.Mocked<StoryEngine>;

    // Настраиваем мок StoryEngineImpl для возврата нашего мока
    (StoryEngineModule.StoryEngineImpl as jest.Mock).mockImplementation(() => mockEngine);
  });

  it('should render story container with playbackId', async () => {
    // Настраиваем URLSearchParams для возврата playbackId
    mockURLSearchParams.mockImplementation(() => ({
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'playbackId') return 'test-playback-id';
        return null;
      })
    }));

    // Настраиваем данные для PlaybackStorageService
    const mockPlaybackData = {
      id: 'test-playback-id',
      projectId: 'test-project',
      teamId: 'test-team',
      timelineId: 'test-timeline',
      projectName: 'Test Story',
      data: {nodes: [], edges: [], variables: []},
      metadata: {timestamp: new Date().toISOString(), version: '1.0'},
      _lastModified: Date.now()
    };
    mockPlaybackStorageService.loadPlaybackData.mockResolvedValue(mockPlaybackData);

    render(
      <PlaybackLogProvider>
        <StoryPlayer />
      </PlaybackLogProvider>
    );

    // Ожидаем успешного рендеринга
    await waitFor(() => {
      expect(mockPlaybackStorageService.loadPlaybackData).toHaveBeenCalledWith('test-playback-id');
      expect(RadixRendererModule.RadixRendererComponent).toHaveBeenCalled();
    });
  });

  it('should show error message when no playbackId is found', async () => {
    // URLSearchParams уже настроен для возврата null для playbackId

    render(
      <PlaybackLogProvider>
        <StoryPlayer />
      </PlaybackLogProvider>
    );

    // Ожидаем появления сообщения об ошибке
    await waitFor(() => {
      expect(screen.getByText('Story not found')).toBeTruthy();
    });
  });

  it('should initialize story engine and render component', async () => {
    // Настраиваем URLSearchParams для возврата playbackId
    mockURLSearchParams.mockImplementation(() => ({
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'playbackId') return 'test-playback-id';
        return null;
      })
    }));

    // Подготавливаем тестовые данные
    const mockPlaybackData = {
      id: 'test-playback-id',
      projectId: 'test-project',
      teamId: 'test-team',
      timelineId: 'test-timeline',
      projectName: 'Test Story',
      data: {nodes: [], edges: [], variables: []},
      metadata: {timestamp: new Date().toISOString(), version: '1.0'},
      _lastModified: Date.now()
    };
    mockPlaybackStorageService.loadPlaybackData.mockResolvedValue(mockPlaybackData);

    render(
      <PlaybackLogProvider>
        <StoryPlayer />
      </PlaybackLogProvider>
    );

    // Ожидаем, что движок будет инициализирован и рендерер будет вызван
    await waitFor(() => {
      expect(StoryEngineModule.StoryEngineImpl).toHaveBeenCalled();
      expect(mockEngine.initialize).toHaveBeenCalledWith({
        title: 'Test Story',
        data: {nodes: [], edges: [], variables: []},
        metadata: {timestamp: expect.any(String), version: '1.0'}
      });
      expect(RadixRendererModule.RadixRendererComponent).toHaveBeenCalled();
    });
  });

  it('should handle errors when loading playback data', async () => {
    // Настраиваем URLSearchParams для возврата playbackId
    mockURLSearchParams.mockImplementation(() => ({
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'playbackId') return 'test-playback-id';
        return null;
      })
    }));

    // Мокаем ошибку в PlaybackStorageService
    mockPlaybackStorageService.loadPlaybackData.mockRejectedValue(new Error('IndexedDB error'));
    console.error = jest.fn();

    render(
      <PlaybackLogProvider>
        <StoryPlayer />
      </PlaybackLogProvider>
    );

    // Ожидаем появления сообщения об ошибке
    await waitFor(() => {
      expect(screen.getByText('Error loading story')).toBeTruthy();
      expect(console.error).toHaveBeenCalled();
    });
  });

  it('should handle playback data not found in IndexedDB', async () => {
    // Настраиваем URLSearchParams для возврата playbackId
    mockURLSearchParams.mockImplementation(() => ({
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'playbackId') return 'test-playback-id';
        return null;
      })
    }));

    // PlaybackStorageService возвращает null (данные не найдены)
    mockPlaybackStorageService.loadPlaybackData.mockResolvedValue(null);

    render(
      <PlaybackLogProvider>
        <StoryPlayer />
      </PlaybackLogProvider>
    );

    // Ожидаем появления сообщения об ошибке
    await waitFor(() => {
      expect(mockPlaybackStorageService.loadPlaybackData).toHaveBeenCalledWith('test-playback-id');
      expect(screen.getByText('Story not found')).toBeTruthy();
    });
  });
});
