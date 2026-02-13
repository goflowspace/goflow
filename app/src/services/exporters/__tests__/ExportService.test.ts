/**
 * Тесты для сервиса экспорта
 */
import {StoryData} from '../../../playback/engine/core/StoryData';
import {ExportService, ExportServiceFactory} from '../ExportService';
import {StoryProcessor} from '../implementations/StoryProcessor';
import {ExportConfig, ExportFormat, ExportableStory, ICodeGenerator, IStoryProcessor} from '../interfaces/exportInterfaces';

describe('ExportService', () => {
  let exportService: ExportService;
  let mockLogger: any;
  let mockStoryProcessor: jest.Mocked<IStoryProcessor>;
  let mockCodeGenerator: jest.Mocked<ICodeGenerator>;

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    };

    mockStoryProcessor = {
      flattenLayers: jest.fn(),
      validateStory: jest.fn(),
      findStartNode: jest.fn()
    };

    mockCodeGenerator = {
      generateCode: jest.fn(),
      generateReadme: jest.fn(),
      getFileExtension: jest.fn(),
      getSupportedFormat: jest.fn(),
      generateAdditionalFiles: jest.fn()
    } as any;

    exportService = new ExportService({
      storyProcessor: mockStoryProcessor,
      logger: mockLogger
    });
  });

  describe('constructor', () => {
    it('should create instance with default dependencies', () => {
      const service = new ExportService();
      expect(service).toBeInstanceOf(ExportService);
    });

    it('should create instance with custom dependencies', () => {
      const service = new ExportService({
        storyProcessor: mockStoryProcessor,
        logger: mockLogger
      });
      expect(service).toBeInstanceOf(ExportService);
    });
  });

  describe('getSupportedFormats', () => {
    it('should return list of supported formats', () => {
      const formats = exportService.getSupportedFormats();
      expect(formats).toContain(ExportFormat.RENPY);
      expect(Array.isArray(formats)).toBe(true);
    });
  });

  describe('getDefaultConfig', () => {
    it('should return default config for RENPY format', () => {
      const config = exportService.getDefaultConfig(ExportFormat.RENPY);

      expect(config).toEqual({
        format: ExportFormat.RENPY,
        includeComments: true,
        minifyOutput: false,
        generateReadme: true,
        encoding: 'utf-8',
        indentSize: 4,
        customVariablePrefix: 'var_'
      });
    });

    it('should return base config for unsupported format', () => {
      const config = exportService.getDefaultConfig(ExportFormat.TWINE);

      expect(config.format).toBe(ExportFormat.TWINE);
      expect(config.includeComments).toBe(true);
      expect(config.generateReadme).toBe(true);
    });
  });

  describe('registerCodeGenerator', () => {
    it('should register new code generator', () => {
      mockCodeGenerator.getSupportedFormat.mockReturnValue(ExportFormat.TWINE);

      exportService.registerCodeGenerator(mockCodeGenerator);

      const formats = exportService.getSupportedFormats();
      expect(formats).toContain(ExportFormat.TWINE);
      expect(mockLogger.info).toHaveBeenCalledWith('Code generator registered', {format: ExportFormat.TWINE});
    });
  });

  describe('exportStory', () => {
    let mockStoryData: StoryData;
    let mockExportableStory: ExportableStory;
    let config: ExportConfig;

    beforeEach(() => {
      mockStoryData = {
        title: 'Test Story',
        data: {
          nodes: [],
          edges: [],
          variables: []
        }
      };

      mockExportableStory = {
        title: 'Test Story',
        nodes: [],
        edges: [],
        variables: [],
        startNodeId: 'start',
        metadata: {
          originalLayers: [],
          exportedAt: '2023-01-01T00:00:00.000Z',
          version: '1.0'
        }
      };

      config = {
        format: ExportFormat.RENPY,
        includeComments: true,
        minifyOutput: false,
        generateReadme: true,
        encoding: 'utf-8',
        indentSize: 4
      };

      mockStoryProcessor.flattenLayers.mockReturnValue(mockExportableStory);
      mockStoryProcessor.validateStory.mockReturnValue([]);
    });

    it('should successfully export story', async () => {
      mockCodeGenerator.getSupportedFormat.mockReturnValue(ExportFormat.RENPY);
      mockCodeGenerator.generateCode.mockReturnValue('label start:\n    "Hello World"\n    return');
      mockCodeGenerator.generateReadme.mockReturnValue('# Test Story\n\nGenerated story');
      mockCodeGenerator.getFileExtension.mockReturnValue('.rpy');
      (mockCodeGenerator as any).validateForFormat = jest.fn().mockReturnValue([]);
      (mockCodeGenerator as any).getFormatWarnings = jest.fn().mockReturnValue([]);

      exportService.registerCodeGenerator(mockCodeGenerator);

      const result = await exportService.exportStory(mockStoryData, config);

      expect(result.success).toBe(true);

      // Для Ren'Py мы теперь ожидаем zip-архив в base64
      if (config.format === ExportFormat.RENPY) {
        expect(result.metadata?.filename).toBe('Test_Story_renpy.zip');
        expect(result.metadata?.isBase64).toBe(true);
        const base64Regex = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
        expect(base64Regex.test(result.content)).toBe(true);
      } else {
        expect(result.content).toBe('label start:\n    "Hello World"\n    return');
        expect(result.metadata?.filename).toBe('Test_Story.rpy');
        expect(result.metadata?.readmeContent).toBe('# Test Story\n\nGenerated story');
        expect(result.metadata?.isBase64).toBeFalsy();
      }

      expect(mockStoryProcessor.flattenLayers).toHaveBeenCalledWith(mockStoryData);
      expect(mockStoryProcessor.validateStory).toHaveBeenCalledWith(mockExportableStory);
    });

    it('should fail when format is not supported', async () => {
      config.format = ExportFormat.TWINE; // Не зарегистрированный формат

      const result = await exportService.exportStory(mockStoryData, config);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Формат экспорта twine не поддерживается');
    });

    it('should fail when story validation fails', async () => {
      mockStoryProcessor.validateStory.mockReturnValue(['Validation error']);

      const result = await exportService.exportStory(mockStoryData, config);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Validation error');
      expect(mockLogger.error).toHaveBeenCalledWith('Story validation failed', {errors: ['Validation error', 'Стартовый узел не найден в списке узлов']});
    });

    it('should fail when format validation fails', async () => {
      mockCodeGenerator.getSupportedFormat.mockReturnValue(ExportFormat.RENPY);
      (mockCodeGenerator as any).validateForFormat = jest.fn().mockReturnValue(['Format validation error']);

      exportService.registerCodeGenerator(mockCodeGenerator);

      const result = await exportService.exportStory(mockStoryData, config);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Format validation error');
    });

    it('should handle exceptions during export', async () => {
      mockStoryProcessor.flattenLayers.mockImplementation(() => {
        throw new Error('Processing error');
      });

      const result = await exportService.exportStory(mockStoryData, config);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Ошибка при экспорте: Processing error');
      expect(mockLogger.error).toHaveBeenCalledWith('Story export failed with exception', {error: expect.any(Error)});
    });

    it('should include warnings in result', async () => {
      mockCodeGenerator.getSupportedFormat.mockReturnValue(ExportFormat.RENPY);
      mockCodeGenerator.generateCode.mockReturnValue('generated code');
      mockCodeGenerator.getFileExtension.mockReturnValue('.rpy');
      (mockCodeGenerator as any).validateForFormat = jest.fn().mockReturnValue([]);
      (mockCodeGenerator as any).getFormatWarnings = jest.fn().mockReturnValue(['Warning message']);

      exportService.registerCodeGenerator(mockCodeGenerator);

      const result = await exportService.exportStory(mockStoryData, config);

      expect(result.success).toBe(true);
      expect(result.stats.warnings).toContain('Warning message');
    });

    it('should not generate readme when disabled', async () => {
      config.generateReadme = false;

      mockCodeGenerator.getSupportedFormat.mockReturnValue(ExportFormat.RENPY);
      mockCodeGenerator.generateCode.mockReturnValue('generated code');
      mockCodeGenerator.getFileExtension.mockReturnValue('.rpy');
      (mockCodeGenerator as any).validateForFormat = jest.fn().mockReturnValue([]);

      exportService.registerCodeGenerator(mockCodeGenerator);

      const result = await exportService.exportStory(mockStoryData, config);

      expect(result.success).toBe(true);
      expect(result.metadata?.readmeContent).toBeUndefined();
      expect(mockCodeGenerator.generateReadme).not.toHaveBeenCalled();
    });

    it.skip('should handle non-Latin story titles correctly', async () => {
      const storyData: StoryData = {
        title: 'Моя История',
        data: {
          nodes: [
            {
              id: 'start',
              type: 'narrative',
              coordinates: {x: 0, y: 0},
              data: {
                title: 'Start',
                text: 'This is the start of the story.'
              }
            }
          ],
          edges: [],
          variables: []
        },
        metadata: {
          timestamp: '2024-01-01T00:00:00.000Z',
          version: '1.0.0'
        }
      };

      const config: ExportConfig = {
        format: ExportFormat.DIALOGIC,
        includeComments: false,
        minifyOutput: false,
        generateReadme: true,
        indentSize: 4
      };

      const result = await exportService.exportStory(storyData, config);

      expect(result.success).toBe(true);
      expect(result.metadata?.filename).toBe('Моя_История_dialogic.zip');
      expect(result.metadata?.isBase64).toBe(true);
    });
  });
});

describe('ExportServiceFactory', () => {
  describe('create', () => {
    it('should create service with default dependencies', () => {
      const service = ExportServiceFactory.create();
      expect(service).toBeInstanceOf(ExportService);
    });

    it('should create service with custom dependencies', () => {
      const mockProcessor = new StoryProcessor();
      const service = ExportServiceFactory.create({storyProcessor: mockProcessor});
      expect(service).toBeInstanceOf(ExportService);
    });
  });

  describe('createWithGenerators', () => {
    it('should create service with additional generators', () => {
      const mockGenerator = {
        generateCode: jest.fn(),
        generateReadme: jest.fn(),
        getFileExtension: jest.fn(() => '.test'),
        getSupportedFormat: jest.fn(() => ExportFormat.TWINE)
      } as jest.Mocked<ICodeGenerator>;

      const service = ExportServiceFactory.createWithGenerators([mockGenerator]);

      expect(service).toBeInstanceOf(ExportService);
      expect(service.getSupportedFormats()).toContain(ExportFormat.TWINE);
    });
  });
});

describe('Integration', () => {
  it('should successfully export with real components', async () => {
    const storyData = {
      title: 'Integration Test Story',
      data: {
        timelines: {
          'base-timeline': {
            layers: {
              root: {
                type: 'layer',
                id: 'root',
                name: 'Main Layer',
                depth: 0,
                nodes: {
                  node1: {
                    id: 'node1',
                    type: 'narrative',
                    coordinates: {x: 0, y: 0},
                    data: {
                      title: 'Start',
                      text: 'This is the beginning of our story.'
                    }
                  }
                },
                edges: {},
                nodeIds: ['node1']
              }
            },
            variables: [
              {
                id: 'var1',
                name: 'Test Variable',
                internalName: 'test_var',
                type: 'integer',
                value: 42
              }
            ]
          }
        }
      }
    } as any;

    const service = ExportServiceFactory.create();
    const config = service.getDefaultConfig(ExportFormat.RENPY);

    const result = await service.exportStory(storyData, config);

    expect(result.success).toBe(true);
    expect(result.metadata?.filename).toBe('Integration_Test_Story_renpy.zip');
    expect(result.metadata?.isBase64).toBe(true);
  });
});
