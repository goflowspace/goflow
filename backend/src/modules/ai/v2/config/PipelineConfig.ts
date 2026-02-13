// backend/src/modules/ai/v2/config/PipelineConfig.ts
import { QualityLevel } from '../shared/types';

/**
 * Интерфейс для описания операции в пайплайне
 */
export interface PipelineOperationConfig {
  /** ID операции */
  id: string;
  /** Уровень качества для этой операции в пайплайне */
  qualityLevel: QualityLevel;
  /** Зависимости от других операций */
  dependencies?: string[];
  /** Условие выполнения операции (опционально) */
  condition?: string;
  /** Является ли операция опциональной */
  optional?: boolean;
}

/**
 * Интерфейс для описания пайплайна
 */
export interface PipelineConfig {
  /** Уникальный ID пайплайна */
  id: string;
  /** Название пайплайна */
  name: string;
  /** Описание пайплайна */
  description: string;
  /** Версия пайплайна */
  version: string;
  /** Категория пайплайна */
  category: 'bible_generation' | 'entity_generation' | 'image_generation' | 'narrative_generation' | 'validation' | 'translation';
  /** Список операций в пайплайне */
  operations: PipelineOperationConfig[];
  /** Метаданные пайплайна */
  metadata?: {
    /** Сложность пайплайна */
    complexity: 'low' | 'medium' | 'high';
    /** Примерное время выполнения в секундах */
    estimatedDuration: number;
    /** Поддерживаемые уровни качества */
    supportedQualityLevels: QualityLevel[];
    /** Теги для категоризации */
    tags?: string[];
  };
}

/**
 * Статический конфиг всех пайплайнов v2
 * Единый источник истины для операций и их качества в пайплайнах
 */
export const PIPELINE_CONFIGS: Record<string, PipelineConfig> = {
  // Полная генерация библии проекта
  'bible-generation-v2': {
    id: 'bible-generation-v2',
    name: 'Full Bible Generation Pipeline (v2)',
    description: 'Generates all fields for a project bible using specialized v2 operations',
    version: '2.0.0',
    category: 'bible_generation',
    operations: [
      { id: 'language-detection-v2', qualityLevel: QualityLevel.FAST, dependencies: [] },
      { id: 'synopsis-generation-v2', qualityLevel: QualityLevel.STANDARD, dependencies: ['language-detection-v2'] },
      { id: 'logline-generation-v2', qualityLevel: QualityLevel.STANDARD, dependencies: ['synopsis-generation-v2', 'language-detection-v2'] },
      { id: 'genre-generation-v2', qualityLevel: QualityLevel.FAST, dependencies: ['synopsis-generation-v2', 'logline-generation-v2', 'language-detection-v2'] },
      { id: 'setting-generation-v2', qualityLevel: QualityLevel.STANDARD, dependencies: ['synopsis-generation-v2', 'genre-generation-v2', 'language-detection-v2'] },
      { id: 'target-audience-generation-v2', qualityLevel: QualityLevel.STANDARD, dependencies: ['synopsis-generation-v2', 'genre-generation-v2', 'language-detection-v2'] },
      { id: 'theme-generation-v2', qualityLevel: QualityLevel.STANDARD, dependencies: ['synopsis-generation-v2', 'target-audience-generation-v2', 'language-detection-v2'] },
      { id: 'atmosphere-generation-v2', qualityLevel: QualityLevel.STANDARD, dependencies: ['setting-generation-v2', 'theme-generation-v2', 'language-detection-v2'] },
      { id: 'message-generation-v2', qualityLevel: QualityLevel.STANDARD, dependencies: ['theme-generation-v2', 'language-detection-v2'] },
      { id: 'unique-features-generation-v2', qualityLevel: QualityLevel.STANDARD, dependencies: ['synopsis-generation-v2', 'genre-generation-v2', 'theme-generation-v2', 'language-detection-v2'] },
      { id: 'references-generation-v2', qualityLevel: QualityLevel.STANDARD, dependencies: ['genre-generation-v2', 'theme-generation-v2', 'language-detection-v2'] },
      { id: 'visual-style-generation-v2', qualityLevel: QualityLevel.STANDARD, dependencies: ['setting-generation-v2', 'atmosphere-generation-v2', 'language-detection-v2'] }
    ],
    metadata: {
      complexity: 'high',
      estimatedDuration: 180,
      supportedQualityLevels: [QualityLevel.FAST, QualityLevel.STANDARD, QualityLevel.EXPERT],
      tags: ['bible', 'comprehensive', 'project-setup']
    }
  },

  // Генерация одного поля библии
  'single-field-bible-v2': {
    id: 'single-field-bible-v2',
    name: 'Single Field Bible Generation Pipeline (v2)',
    description: 'Generates a single field for a project bible using specialized operation with language detection',
    version: '2.0.0',
    category: 'bible_generation',
    operations: [
      { id: 'language-detection-v2', qualityLevel: QualityLevel.FAST, dependencies: [] },
      { id: 'field-generation-placeholder', qualityLevel: QualityLevel.STANDARD, dependencies: ['language-detection-v2'] } // Будет заменено на конкретную операцию
    ],
    metadata: {
      complexity: 'low',
      estimatedDuration: 20,
      supportedQualityLevels: [QualityLevel.FAST, QualityLevel.STANDARD, QualityLevel.EXPERT],
      tags: ['bible', 'single-field', 'quick']
    }
  },

  // Генерация сущностей
  'adapted-entity-generation': {
    id: 'adapted-entity-generation',
    name: 'Adapted Entity Generation Pipeline',
    description: 'Адаптированный пайплайн генерации сущностей с использованием проверенных операций',
    version: '0.3.0',
    category: 'entity_generation',
    operations: [
      { id: 'project-context-analysis-v2', qualityLevel: QualityLevel.STANDARD, dependencies: [] },
      { id: 'language-detection-v2', qualityLevel: QualityLevel.FAST, dependencies: [] },
      { id: 'entity-type-detection-v2', qualityLevel: QualityLevel.STANDARD, dependencies: ['project-context-analysis-v2'], condition: 'hasAvailableEntityTypes' },
      { id: 'entity-field-generation-v2', qualityLevel: QualityLevel.STANDARD, dependencies: ['project-context-analysis-v2', 'entity-type-detection-v2', 'language-detection-v2'], condition: 'hasSelectedEntityType' },
      { id: 'entity-creation-v2', qualityLevel: QualityLevel.STANDARD, dependencies: ['project-context-analysis-v2', 'entity-type-detection-v2', 'entity-field-generation-v2'], condition: 'hasEntityName' }
    ],
    metadata: {
      complexity: 'medium',
      estimatedDuration: 45,
      supportedQualityLevels: [QualityLevel.FAST, QualityLevel.STANDARD, QualityLevel.EXPERT],
      tags: ['entity', 'generation', 'adaptive']
    }
  },

  // Генерация изображений сущностей
  'entity-image-generation-pipeline-v2': {
    id: 'entity-image-generation-pipeline-v2',
    name: 'Entity Image Generation Pipeline V2',
    description: 'Пайплайн генерации изображений сущностей с использованием архитектуры v2',
    version: '2.0.0',
    category: 'image_generation',
    operations: [
      { id: 'entity-context-analysis-v2', qualityLevel: QualityLevel.STANDARD, dependencies: [] },
      { id: 'image-prompt-generation-v2', qualityLevel: QualityLevel.STANDARD, dependencies: ['entity-context-analysis-v2'], condition: 'hasEnrichedContext' },
      { id: 'entity-image-generation-v2', qualityLevel: QualityLevel.STANDARD, dependencies: ['image-prompt-generation-v2'], condition: 'hasImagePrompt' }
    ],
    metadata: {
      complexity: 'high',
      estimatedDuration: 60,
      supportedQualityLevels: [QualityLevel.FAST, QualityLevel.STANDARD, QualityLevel.EXPERT],
      tags: ['image', 'entity', 'visual']
    }
  },

  // Генерация нарративного текста
  'narrative-text-generation-pipeline-v2': {
    id: 'narrative-text-generation-pipeline-v2',
    name: 'Narrative Text Generation Pipeline V2',
    description: 'Pipeline for generating narrative text for story nodes using architecture v2',
    version: '2.0.0',
    category: 'narrative_generation',
    operations: [
      { id: 'narrative-style-analysis-v2', qualityLevel: QualityLevel.STANDARD, dependencies: [] },
      { id: 'project-context-enrichment-v2', qualityLevel: QualityLevel.STANDARD, dependencies: [] },
      { id: 'narrative-text-generation-v2', qualityLevel: QualityLevel.STANDARD, dependencies: ['narrative-style-analysis-v2', 'project-context-enrichment-v2'], condition: 'hasStyleAndContext' },
      { id: 'content-safety-validation-v2', qualityLevel: QualityLevel.STANDARD, dependencies: ['narrative-text-generation-v2'], condition: 'hasGeneratedText' }
    ],
    metadata: {
      complexity: 'medium',
      estimatedDuration: 40,
      supportedQualityLevels: [QualityLevel.FAST, QualityLevel.STANDARD, QualityLevel.EXPERT],
      tags: ['narrative', 'text', 'story']
    }
  },

  // Генерация следующего узла
  'next-node-generation-pipeline-v2': {
    id: 'next-node-generation-pipeline-v2',
    name: 'Next Node Generation Pipeline V2',
    description: 'Generates next narrative node(s) with comprehensive context analysis and entity management',
    version: '2.0.0',
    category: 'narrative_generation',
    operations: [
      { id: 'next-node-context-analysis-v2', qualityLevel: QualityLevel.STANDARD, dependencies: [] },
      { id: 'next-node-project-enrichment-v2', qualityLevel: QualityLevel.STANDARD, dependencies: ['next-node-context-analysis-v2'] },
      { id: 'next-node-generation-v2', qualityLevel: QualityLevel.STANDARD, dependencies: ['next-node-context-analysis-v2', 'next-node-project-enrichment-v2'] },
      { id: 'next-node-entity-suggestion-v2', qualityLevel: QualityLevel.STANDARD, dependencies: ['next-node-generation-v2'], optional: true }
    ],
    metadata: {
      complexity: 'medium',
      estimatedDuration: 50,
      supportedQualityLevels: [QualityLevel.FAST, QualityLevel.STANDARD, QualityLevel.EXPERT],
      tags: ['narrative', 'next-node', 'context-aware']
    }
  },

  // Пайплайн перевода текста
  'translation-pipeline-v2': {
    id: 'translation-pipeline-v2',
    name: 'Translation Pipeline V2',
    description: 'Translates narrative text with context awareness using specialized v2 operation',
    version: '2.0.0',
    category: 'translation',
    operations: [
      { id: 'node-translation-v2', qualityLevel: QualityLevel.STANDARD, dependencies: [] }
    ],
    metadata: {
      complexity: 'low',
      estimatedDuration: 15,
      supportedQualityLevels: [QualityLevel.FAST, QualityLevel.STANDARD, QualityLevel.EXPERT],
      tags: ['translation', 'localization', 'context-aware', 'narrative']
    }
  }
};

/**
 * Получает конфигурацию пайплайна по ID
 */
export function getPipelineConfig(pipelineId: string): PipelineConfig | null {
  return PIPELINE_CONFIGS[pipelineId] || null;
}

/**
 * Получает все пайплайны определенной категории
 */
export function getPipelinesByCategory(category: PipelineConfig['category']): PipelineConfig[] {
  return Object.values(PIPELINE_CONFIGS).filter(config => config.category === category);
}

/**
 * Получает список всех доступных пайплайнов
 */
export function getAllPipelines(): PipelineConfig[] {
  return Object.values(PIPELINE_CONFIGS);
}

/**
 * Получает операции пайплайна с их уровнями качества
 */
export function getPipelineOperations(pipelineId: string): PipelineOperationConfig[] {
  const config = getPipelineConfig(pipelineId);
  return config ? config.operations : [];
}

/**
 * Создает конфигурацию для одного поля библии
 */
export function createSingleFieldBibleConfig(fieldOperationId: string): PipelineConfig {
  const baseConfig = PIPELINE_CONFIGS['single-field-bible-v2'];
  
  return {
    ...baseConfig,
    id: `single-field-bible-v2-${fieldOperationId}`,
    name: `Single Field Bible Generation - ${fieldOperationId}`,
    operations: [
      baseConfig.operations[0], // language-detection-v2
      {
        id: fieldOperationId,
        qualityLevel: QualityLevel.STANDARD,
        dependencies: ['language-detection-v2']
      }
    ]
  };
}

/**
 * Валидация конфигурации пайплайна
 */
export function validatePipelineConfig(config: PipelineConfig): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!config.id) errors.push('Pipeline ID is required');
  if (!config.name) errors.push('Pipeline name is required');
  if (!config.operations || config.operations.length === 0) errors.push('Pipeline must have at least one operation');

  // Проверяем зависимости
  const operationIds = new Set(config.operations.map(op => op.id));
  config.operations.forEach(operation => {
    if (operation.dependencies) {
      operation.dependencies.forEach(depId => {
        if (!operationIds.has(depId)) {
          errors.push(`Operation ${operation.id} depends on ${depId} which is not in the pipeline`);
        }
      });
    }
  });

  return {
    isValid: errors.length === 0,
    errors
  };
}
