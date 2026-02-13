import {Layer} from '@types-folder/nodes';
import {LayerMetadata} from '@types-folder/storage';
import {Variable} from '@types-folder/variables';

import {STORAGE_KEY} from '../utils/constants';

// Константы для ключей localStorage
export const STORY_KEY = 'flow_current_story';
export const KEY_HAS_SEEN_WELCOME_MODAL = 'has_seen_welcome_modal';
export const KEY_INCLUDE_WELCOME_STORY = 'include_welcome_story';
export const KEY_LANGUAGE = 'language';

// Интерфейсы для типизации данных хранилища

export interface TimelineData {
  layers: Record<string, Layer>;
  metadata: Record<string, LayerMetadata>;
  lastLayerNumber: number;
  variables: Variable[];
}

export interface StorageData {
  timelines: Record<string, TimelineData>;
  projectName: string;
  projectId?: string; // ID проекта, к которому относятся данные
  _lastModified?: number; // Временная метка последнего изменения
}

export interface StoryPreviewData {
  title: string;
  data: {
    nodes: any[];
    edges: any[];
    variables: Variable[];
  };
  metadata: {
    timestamp: string;
    version: string;
  };
}

/**
 * Сервис для работы с локальным хранилищем
 */
export class StorageService {
  /**
   * Сохраняет данные для предпросмотра истории
   * @param data Данные истории для предпросмотра
   */
  public static saveStoryPreview(data: StoryPreviewData): void {
    try {
      localStorage.setItem(STORY_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save story preview data to localStorage:', error);
    }
  }

  /**
   * Загружает данные истории для предпросмотра
   * @returns Данные истории или null, если данных нет или произошла ошибка
   */
  public static loadStoryPreview(): StoryPreviewData | null {
    try {
      const raw = localStorage.getItem(STORY_KEY);
      if (!raw) return null;

      return JSON.parse(raw) as StoryPreviewData;
    } catch (error) {
      console.error('Failed to load story preview data from localStorage:', error);
      return null;
    }
  }

  /**
   * Удаляет все данные приложения из localStorage
   */
  public static clearAllData(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(STORY_KEY);
    } catch (error) {
      console.error('Failed to clear data from localStorage:', error);
    }
  }

  /**
   * Сохраняет отдельное значение в localStorage
   * @param key Ключ
   * @param value Значение
   */
  public static setItem(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.error(`Failed to save item "${key}" to localStorage:`, error);
    }
  }

  /**
   * Получает значение из localStorage
   * @param key Ключ
   * @param defaultValue Значение по умолчанию, если ключ не найден
   * @returns Значение или defaultValue, если ключ не найден
   */
  public static getItem(key: string, defaultValue: string = ''): string {
    try {
      const value = localStorage.getItem(key);
      return value !== null ? value : defaultValue;
    } catch (error) {
      console.error(`Failed to get item "${key}" from localStorage:`, error);
      return defaultValue;
    }
  }

  /**
   * Удаляет значение из localStorage
   * @param key Ключ
   */
  public static removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Failed to remove item "${key}" from localStorage:`, error);
    }
  }

  /**
   * Проверяет, существует ли ключ в localStorage
   * @param key Ключ
   * @returns true, если ключ существует, иначе false
   */
  public static hasItem(key: string): boolean {
    try {
      return localStorage.getItem(key) !== null;
    } catch (error) {
      console.error(`Failed to check item "${key}" in localStorage:`, error);
      return false;
    }
  }
}
