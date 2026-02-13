/**
 * Интерфейсы для сервиса экспорта
 * Следуют принципам SOLID для обеспечения расширяемости и тестируемости
 */
import {Layer, Link, Node} from '@types-folder/nodes';
import {Variable} from '@types-folder/variables';

import {StoryData} from '../../../playback/engine/core/StoryData';

/**
 * Перечисление поддерживаемых форматов экспорта
 */
export enum ExportFormat {
  JSON = 'json',
  HTML = 'html',
  RENPY = 'renpy',
  DIALOGIC = 'dialogic',
  TWINE = 'twine',
  INK = 'ink',
  YARN = 'yarn'
}

/**
 * Статистика экспорта
 */
export interface ExportStats {
  totalNodes: number;
  narrativeNodes: number;
  choiceNodes: number;
  variables: number;
  operations: number;
  conditions: number;
  exportedAt: string;
  format: ExportFormat;
  warnings: string[];
}

/**
 * Результат экспорта
 */
export interface ExportResult {
  success: boolean;
  content: string;
  stats: ExportStats;
  errors?: string[];
  metadata?: {
    filename: string;
    readmeContent?: string;
    additionalFiles?: Record<string, string>;
    isBase64?: boolean;
  };
}

/**
 * Конфигурация экспорта
 */
export interface ExportConfig {
  format: ExportFormat;
  includeComments: boolean;
  minifyOutput: boolean;
  generateReadme: boolean;
  customVariablePrefix?: string;
  encoding?: 'utf-8' | 'ascii';
  indentSize?: number;
}

/**
 * Внутренняя структура данных для экспорта
 * Плоская структура после разворачивания слоев
 */
export interface ExportableStory {
  title: string;
  nodes: Node[];
  edges: Link[];
  variables: Variable[];
  startNodeId: string;
  metadata: {
    originalLayers: Layer[];
    exportedAt: string;
    version: string;
  };
}

/**
 * Интерфейс для обработки данных перед экспортом
 */
export interface IStoryProcessor {
  /**
   * Разворачивает слои в плоскую структуру
   */
  flattenLayers(storyData: StoryData): ExportableStory;

  /**
   * Проводит валидацию данных
   */
  validateStory(story: ExportableStory): string[];

  /**
   * Находит стартовый узел
   */
  findStartNode(story: ExportableStory): string;
}

/**
 * Интерфейс для генерации кода конкретного формата
 */
export interface ICodeGenerator {
  /**
   * Генерирует код для конкретного формата
   */
  generateCode(story: ExportableStory, config: ExportConfig): string;

  /**
   * Генерирует README файл
   */
  generateReadme(story: ExportableStory, config: ExportConfig): string;

  /**
   * Генерирует дополнительные файлы (если нужны)
   */
  generateAdditionalFiles?(story: ExportableStory, config: ExportConfig): Record<string, string>;

  /**
   * Возвращает рекомендуемое расширение файла
   */
  getFileExtension(): string;

  /**
   * Возвращает поддерживаемый формат
   */
  getSupportedFormat(): ExportFormat;
}

/**
 * Интерфейс для валидации специфичной для формата
 */
export interface IFormatValidator {
  /**
   * Валидирует данные для конкретного формата
   */
  validateForFormat(story: ExportableStory): string[];

  /**
   * Возвращает предупреждения для конкретного формата
   */
  getFormatWarnings(story: ExportableStory): string[];
}

/**
 * Основной интерфейс сервиса экспорта
 * Single Responsibility: только экспорт историй
 */
export interface IExportService {
  /**
   * Экспортирует историю в указанный формат
   */
  exportStory(storyData: StoryData, config: ExportConfig): Promise<ExportResult>;

  /**
   * Возвращает список поддерживаемых форматов
   */
  getSupportedFormats(): ExportFormat[];

  /**
   * Возвращает конфигурацию по умолчанию для формата
   */
  getDefaultConfig(format: ExportFormat): ExportConfig;

  /**
   * Регистрирует новый генератор кода
   */
  registerCodeGenerator(generator: ICodeGenerator): void;
}

/**
 * Зависимости для инъекции в ExportService
 * Dependency Inversion: зависим от абстракций
 */
export interface IExportServiceDependencies {
  storyProcessor: IStoryProcessor;
  logger?: ILogger;
}

interface ILogger {
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
}
