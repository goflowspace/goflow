/**
 * Основной сервис экспорта
 * Координирует работу процессора данных и генераторов кода
 * Следует принципам SOLID и поддерживает расширяемость
 */
import JSZip from 'jszip';

import {StoryData} from '../../playback/engine/core/StoryData';
import {DialogicCodeGenerator} from './implementations/DialogicCodeGenerator';
import {RenpyCodeGeneratorV5} from './implementations/RenpyCodeGeneratorV5';
import {StoryProcessor} from './implementations/StoryProcessor';
import {ExportConfig, ExportFormat, ExportResult, ExportStats, ICodeGenerator, IExportService, IExportServiceDependencies, IStoryProcessor} from './interfaces/exportInterfaces';

/**
 * Реализация сервиса экспорта
 * Single Responsibility: управление процессом экспорта
 * Open/Closed: можно расширять новыми генераторами без изменения основного кода
 */
export class ExportService implements IExportService {
  private codeGenerators = new Map<ExportFormat, ICodeGenerator>();
  private storyProcessor: IStoryProcessor;
  private logger?: any;

  constructor(dependencies?: IExportServiceDependencies) {
    this.storyProcessor = dependencies?.storyProcessor || new StoryProcessor();
    this.logger = dependencies?.logger;

    // Регистрируем генераторы по умолчанию
    this.registerDefaultGenerators();
  }

  /**
   * Экспортирует историю в указанный формат
   */
  async exportStory(storyData: StoryData, config: ExportConfig): Promise<ExportResult> {
    try {
      this.logger?.info('Starting story export', {format: config.format, title: storyData.title});

      // Получаем генератор для формата
      const generator = this.codeGenerators.get(config.format);
      if (!generator) {
        return {
          success: false,
          content: '',
          stats: this.createEmptyStats(config.format),
          errors: [`Формат экспорта ${config.format} не поддерживается`]
        };
      }

      // Обрабатываем данные истории
      const exportableStory = this.storyProcessor.flattenLayers(storyData);

      // Валидируем данные
      const validationErrors = this.storyProcessor.validateStory(exportableStory);

      // Валидируем для конкретного формата
      const formatErrors = 'validateForFormat' in generator ? (generator as any).validateForFormat(exportableStory) : [];

      const allErrors = [...validationErrors, ...formatErrors];

      if (allErrors.length > 0) {
        this.logger?.error('Story validation failed', {errors: allErrors});
        return {
          success: false,
          content: '',
          stats: this.createEmptyStats(config.format),
          errors: allErrors
        };
      }

      // Получаем предупреждения
      const warnings = 'getFormatWarnings' in generator ? (generator as any).getFormatWarnings(exportableStory) : [];

      // Генерируем код
      const content = generator.generateCode(exportableStory, config);

      // Генерируем README, если нужно
      let readmeContent: string | undefined;
      if (config.generateReadme) {
        readmeContent = generator.generateReadme(exportableStory, config);
      }

      // Генерируем дополнительные файлы
      const additionalFiles = generator.generateAdditionalFiles ? generator.generateAdditionalFiles(exportableStory, config) : undefined;

      // Создаем статистику
      const stats = this.createExportStats(exportableStory, config.format, warnings);

      // Создаем имя файла
      const baseFilename = this.generateFilename(storyData.title, '');
      const scriptFilename = `${baseFilename}${generator.getFileExtension()}`;

      // Для Ren'Py и Dialogic (с README) создаем zip-архив
      if (config.format === ExportFormat.RENPY || (config.format === ExportFormat.DIALOGIC && config.generateReadme)) {
        const zip = new JSZip();
        zip.file(scriptFilename, content);
        if (readmeContent) {
          zip.file('README.md', readmeContent);
        }
        if (additionalFiles) {
          for (const [filename, fileContent] of Object.entries(additionalFiles)) {
            zip.file(filename, fileContent);
          }
        }

        const archiveContentAsBuffer = await zip.generateAsync({
          type: 'nodebuffer',
          compression: 'STORE'
        });

        const archiveContent = archiveContentAsBuffer.toString('base64');

        // Добавляем формат в название архива
        const formatSuffix = config.format.toLowerCase();
        const archiveFilename = `${baseFilename}_${formatSuffix}.zip`;

        return {
          success: true,
          content: archiveContent,
          stats,
          metadata: {
            filename: archiveFilename,
            isBase64: true
          }
        };
      }

      this.logger?.info('Story export completed successfully', {
        filename: scriptFilename,
        contentLength: content.length,
        warnings: warnings.length
      });

      return {
        success: true,
        content,
        stats,
        metadata: {
          filename: scriptFilename,
          readmeContent,
          additionalFiles
        }
      };
    } catch (error) {
      this.logger?.error('Story export failed with exception', {error});

      return {
        success: false,
        content: '',
        stats: this.createEmptyStats(config.format),
        errors: [`Ошибка при экспорте: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  /**
   * Возвращает список поддерживаемых форматов
   */
  getSupportedFormats(): ExportFormat[] {
    return Array.from(this.codeGenerators.keys());
  }

  /**
   * Возвращает конфигурацию по умолчанию для формата
   */
  getDefaultConfig(format: ExportFormat): ExportConfig {
    const baseConfig: ExportConfig = {
      format,
      includeComments: true,
      minifyOutput: false,
      generateReadme: true,
      encoding: 'utf-8',
      indentSize: 4
    };

    // Специфичные настройки для форматов
    switch (format) {
      case ExportFormat.RENPY:
        return {
          ...baseConfig,
          customVariablePrefix: 'var_'
        };
      case ExportFormat.DIALOGIC:
        return {
          ...baseConfig,
          generateReadme: false // Dialogic files are self-contained
        };
      default:
        return baseConfig;
    }
  }

  /**
   * Регистрирует новый генератор кода
   */
  registerCodeGenerator(generator: ICodeGenerator): void {
    const format = generator.getSupportedFormat();
    this.codeGenerators.set(format, generator);
    this.logger?.info('Code generator registered', {format});
  }

  /**
   * Регистрирует генераторы по умолчанию
   */
  private registerDefaultGenerators(): void {
    this.registerCodeGenerator(new RenpyCodeGeneratorV5());
    this.registerCodeGenerator(new DialogicCodeGenerator());
  }

  /**
   * Создает статистику экспорта
   */
  private createExportStats(exportableStory: any, format: ExportFormat, warnings: string[]): ExportStats {
    const narrativeNodes = exportableStory.nodes.filter((n: any) => n.type === 'narrative').length;
    const choiceNodes = exportableStory.nodes.filter((n: any) => n.type === 'choice').length;

    // Подсчитываем операции
    const operations = exportableStory.nodes.reduce((count: number, node: any) => {
      return count + (node.operations ? node.operations.length : 0);
    }, 0);

    // Подсчитываем условия
    const conditions = exportableStory.edges.reduce((count: number, edge: any) => {
      return count + (edge.conditions ? edge.conditions.length : 0);
    }, 0);

    return {
      totalNodes: exportableStory.nodes.length,
      narrativeNodes,
      choiceNodes,
      variables: exportableStory.variables.length,
      operations,
      conditions,
      exportedAt: new Date().toISOString(),
      format,
      warnings
    };
  }

  /**
   * Создает пустую статистику для случаев ошибок
   */
  private createEmptyStats(format: ExportFormat): ExportStats {
    return {
      totalNodes: 0,
      narrativeNodes: 0,
      choiceNodes: 0,
      variables: 0,
      operations: 0,
      conditions: 0,
      exportedAt: new Date().toISOString(),
      format,
      warnings: []
    };
  }

  /**
   * Генерирует имя файла на основе названия истории
   */
  private generateFilename(title: string, extension: string): string {
    // Просто заменяем пробелы на подчеркивания, сохраняя все символы включая кириллицу
    const cleanTitle = title.replace(/\s+/g, '_').trim();

    // Если нет названия, используем стандартное
    const finalTitle = cleanTitle || 'story';

    return `${finalTitle}${extension}`;
  }
}

/**
 * Фабрика для создания сервиса экспорта
 */
export class ExportServiceFactory {
  /**
   * Создает настроенный экземпляр сервиса экспорта
   */
  static create(dependencies?: Partial<IExportServiceDependencies>): IExportService {
    const fullDependencies: IExportServiceDependencies = {
      storyProcessor: dependencies?.storyProcessor || new StoryProcessor(),
      logger: dependencies?.logger
    };

    return new ExportService(fullDependencies);
  }

  /**
   * Создает экземпляр с дополнительными генераторами
   */
  static createWithGenerators(generators: ICodeGenerator[], dependencies?: Partial<IExportServiceDependencies>): IExportService {
    const service = this.create(dependencies);

    generators.forEach((generator) => {
      service.registerCodeGenerator(generator);
    });

    return service;
  }
}
