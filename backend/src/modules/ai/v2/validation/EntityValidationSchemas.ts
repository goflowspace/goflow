// backend/src/modules/ai/v2/validation/EntityValidationSchemas.ts
import { ValidationSchema } from './ValidationTypes';
import { CommonValidationRules } from './InputValidator';

/**
 * Базовая схема для операций генерации сущностей
 */
export const EntityGenerationInputSchema: ValidationSchema = {
  projectId: {
    required: true,
    type: 'string',
    minLength: 1,
    maxLength: 100,
    customRules: [CommonValidationRules.required('Project ID is required')]
  },
  userDescription: {
    required: true,
    type: 'string',
    minLength: 3,
    maxLength: 2000,
    customRules: [
      CommonValidationRules.required('User description is required'),
      CommonValidationRules.noHtmlTags()
    ]
  }
};

/**
 * Схема для анализа контекста проекта
 */
export const ProjectContextAnalysisInputSchema: ValidationSchema = {
  ...EntityGenerationInputSchema,
  includeProjectInfo: {
    required: false,
    type: 'boolean',
    customRules: [CommonValidationRules.optional(), CommonValidationRules.boolean('includeProjectInfo must be boolean')]
  },
  includeExistingEntities: {
    required: false,
    type: 'boolean',
    customRules: [CommonValidationRules.optional(), CommonValidationRules.boolean('includeExistingEntities must be boolean')]
  }
};

/**
 * Схема для определения типа сущности
 */
export const EntityTypeDetectionInputSchema: ValidationSchema = {
  ...EntityGenerationInputSchema,
  preferredEntityType: {
    required: false,
    type: 'string',
    maxLength: 100,
    customRules: [CommonValidationRules.optional()]
  }
};

/**
 * Схема для генерации полей сущности
 */
export const EntityFieldGenerationInputSchema: ValidationSchema = {
  ...EntityGenerationInputSchema,
  customInstructions: {
    required: false,
    type: 'string',
    maxLength: 1000,
    customRules: [
      CommonValidationRules.optional(),
      CommonValidationRules.noHtmlTags()
    ]
  }
};

/**
 * Схема для создания сущности
 */
export const EntityCreationInputSchema: ValidationSchema = {
  projectId: {
    required: true,
    type: 'string',
    minLength: 1,
    customRules: [CommonValidationRules.required('Project ID is required')]
  },
  entityName: {
    required: true,
    type: 'string',
    minLength: 1,
    maxLength: 200,
    customRules: [CommonValidationRules.required('Entity name is required')]
  },
  entityDescription: {
    required: false,
    type: 'string',
    maxLength: 1000,
    customRules: [CommonValidationRules.optional()]
  }
};

/**
 * Маппинг операций к схемам валидации
 */
export const OperationValidationSchemas: Record<string, ValidationSchema> = {
  'project-context-analysis-v2': ProjectContextAnalysisInputSchema,
  'entity-type-detection-v2': EntityTypeDetectionInputSchema,
  'entity-field-generation-v2': EntityFieldGenerationInputSchema,
  'entity-creation-v2': EntityCreationInputSchema
};
