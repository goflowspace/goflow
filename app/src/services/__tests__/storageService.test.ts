import {STORAGE_KEY} from '../../utils/constants';
import {STORY_KEY, StorageData, StorageService} from '../storageService';

// Создаем мок для localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    })
  };
})();

// Подменяем глобальный localStorage моком
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('StorageService', () => {
  beforeEach(() => {
    // Очищаем моки и хранилище перед каждым тестом
    localStorageMock.clear();
    jest.clearAllMocks();
  });

  describe('saveStoryPreview и loadStoryPreview', () => {
    it('должен сохранять и загружать данные превью истории', () => {
      // Arrange
      const previewData = {
        title: 'Test Story',
        data: {
          nodes: [],
          edges: [],
          variables: []
        },
        metadata: {
          timestamp: '2023-01-01T00:00:00.000Z',
          version: '1.0'
        }
      };

      // Act - сохраняем данные
      StorageService.saveStoryPreview(previewData);

      // Assert
      expect(localStorageMock.setItem).toHaveBeenCalledWith(STORY_KEY, JSON.stringify(previewData));

      // Arrange для загрузки
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(previewData));

      // Act - загружаем данные
      const result = StorageService.loadStoryPreview();

      // Assert
      expect(localStorageMock.getItem).toHaveBeenCalledWith(STORY_KEY);
      expect(result).toEqual(previewData);
    });
  });

  describe('clearAllData', () => {
    it('должен удалять все данные из localStorage', () => {
      // Act
      StorageService.clearAllData();

      // Assert
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(STORAGE_KEY);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(STORY_KEY);
    });
  });

  describe('setItem, getItem, removeItem, hasItem', () => {
    it('должен корректно работать с отдельными items в localStorage', () => {
      // Test setItem
      StorageService.setItem('test-key', 'test-value');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('test-key', 'test-value');

      // Test getItem
      localStorageMock.getItem.mockReturnValueOnce('test-value');
      const value = StorageService.getItem('test-key');
      expect(localStorageMock.getItem).toHaveBeenCalledWith('test-key');
      expect(value).toBe('test-value');

      // Test getItem с defaultValue
      localStorageMock.getItem.mockReturnValueOnce(null);
      const defaultValue = StorageService.getItem('non-existent', 'default');
      expect(defaultValue).toBe('default');

      // Test removeItem
      StorageService.removeItem('test-key');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('test-key');

      // Test hasItem (true)
      localStorageMock.getItem.mockReturnValueOnce('test-value');
      expect(StorageService.hasItem('test-key')).toBe(true);

      // Test hasItem (false)
      localStorageMock.getItem.mockReturnValueOnce(null);
      expect(StorageService.hasItem('test-key')).toBe(false);
    });
  });
});
