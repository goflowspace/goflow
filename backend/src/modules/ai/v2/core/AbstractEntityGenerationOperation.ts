// backend/src/modules/ai/v2/core/AbstractEntityGenerationOperation.ts
import { AIOperationInput, AIOperationOutput } from '../shared/types';
import { AbstractAIOperation } from './AbstractAIOperation';
import { ValidationSchema } from '../validation/ValidationTypes';
import { OperationValidationSchemas as EntityOperationValidationSchemas } from '../validation/EntityValidationSchemas';

/**
 * Base input interface for all entity generation operations.
 * It ensures that common context fields are always present.
 */
export interface EntityGenerationInput extends AIOperationInput {
  projectId: string;
  userDescription: string;
  additionalContext?: {
    projectInfo?: any;
    existingEntities?: any[];
    entityRelationships?: any[];
    availableEntityTypes?: any[];
    existingFields?: Record<string, any>;
    includeProjectInfo?: boolean;
    includeExistingEntities?: boolean;
    preferredEntityType?: string;
    customInstructions?: string;
  };
}

/**
 * Abstract base class for all Entity Generation operations in the v2 architecture.
 * It centralizes the logic for building the context prompt, making it consistent
 * across all related operations (ContextAnalysis, TypeDetection, FieldGeneration, etc.).
 */
export abstract class AbstractEntityGenerationOperation<
  TInput extends EntityGenerationInput,
  TOutput extends AIOperationOutput,
> extends AbstractAIOperation<TInput, TOutput> {
  
  /**
   * Получить схему валидации на основе ID операции
   */
  protected getValidationSchema(): ValidationSchema | null {
    return EntityOperationValidationSchemas[this.id] || null;
  }

  /**
   * Builds a standardized context string from the input.
   * This method is intended to be used by subclasses within their `getUserPrompt` implementation.
   * @param input The operation input, extending EntityGenerationInput.
   * @returns A formatted string containing project context and additional information.
   */
  protected buildContextPrompt(input: TInput): string {
    const additionalInfoParts: string[] = [];
    
    if (input.additionalContext?.projectInfo) {
      const projectInfo = input.additionalContext.projectInfo;
      const projectParts: string[] = [];
      
      if (projectInfo.synopsis) projectParts.push(`Synopsis: ${projectInfo.synopsis}`);
      if (projectInfo.logline) projectParts.push(`Logline: ${projectInfo.logline}`);
      if (projectInfo.genres?.length > 0) projectParts.push(`Genres: ${projectInfo.genres.join(', ')}`);
      if (projectInfo.targetAudience) projectParts.push(`Target Audience: ${projectInfo.targetAudience}`);
      if (projectInfo.mainThemes) projectParts.push(`Main Themes: ${projectInfo.mainThemes}`);
      if (projectInfo.atmosphere) projectParts.push(`Atmosphere: ${projectInfo.atmosphere}`);
      if (projectInfo.uniqueFeatures) projectParts.push(`Unique Features: ${projectInfo.uniqueFeatures}`);
      if (projectInfo.keyMessage) projectParts.push(`Key Message: ${projectInfo.keyMessage}`);
      if (projectInfo.referenceWorks) projectParts.push(`Reference Works: ${projectInfo.referenceWorks}`);
      
      if (projectParts.length > 0) {
        additionalInfoParts.push(`Информация о проекте:\n${projectParts.map(p => `  - ${p}`).join('\n')}`);
      }
    }

    if (input.additionalContext?.existingEntities && input.additionalContext.existingEntities.length > 0) {
      const entities = input.additionalContext.existingEntities
        .map(entity => `  - ${entity.name} (${entity.entityType?.name || 'Unknown type'})${entity.description ? `: ${entity.description}` : ''}`)
        .join('\n');
      additionalInfoParts.push(`Существующие сущности в проекте:\n${entities}`);
    }

    if (input.additionalContext?.availableEntityTypes && input.additionalContext.availableEntityTypes.length > 0) {
      const types = input.additionalContext.availableEntityTypes
        .map(type => `  - ${type.name} (${type.type})${type.description ? `: ${type.description}` : ''}`)
        .join('\n');
      additionalInfoParts.push(`Доступные типы сущностей:\n${types}`);
    }

    if (input.additionalContext?.existingFields) {
      const fields = Object.entries(input.additionalContext.existingFields)
        .map(([key, value]) => `  - ${key}: ${value}`)
        .join('\n');
      if (fields) additionalInfoParts.push(`Существующие поля:\n${fields}`);
    }

    const additionalInfo =
      additionalInfoParts.length > 0
        ? `ДОПОЛНИТЕЛЬНАЯ ИНФОРМАЦИЯ:\n${additionalInfoParts.join('\n\n')}`
        : 'ДОПОЛНИТЕЛЬНАЯ ИНФОРМАЦИЯ: Отсутствует.';

    return `
КОНТЕКСТ ПРОЕКТА:
ID проекта: ${input.projectId}
Описание пользователя: ${input.userDescription}

${additionalInfo}
    `.trim();
  }

  /**
   * Builds a structured output format for entity generation operations
   */
  protected buildStructuredOutputFormat(): string {
    return `
Ответ должен быть в JSON формате со следующей структурой:
{
  "result": {
    // основной результат операции
  },
  "confidence": 0.85, // уверенность в результате (0-1)
  "reasoning": "объяснение принятых решений",
  "metadata": {
    // дополнительные метаданные
  }
}`;
  }

  /**
   * Parses a structured JSON response commonly used in entity generation operations
   */
  protected parseStructuredResponse(aiResult: string, defaultResult: any = null): any {
    try {
      const parsed = JSON.parse(aiResult);
      
      // Базовая валидация структуры
      if (typeof parsed !== 'object' || !parsed.result) {
        console.warn('AI response missing required "result" field, using fallback parsing');
        return {
          result: defaultResult || aiResult,
          confidence: 0.5,
          reasoning: 'Fallback parsing due to invalid structure',
          metadata: {}
        };
      }

      return {
        result: parsed.result,
        confidence: parsed.confidence || 0.7,
        reasoning: parsed.reasoning || 'No reasoning provided',
        metadata: parsed.metadata || {}
      };
    } catch (error) {
      console.warn('Failed to parse AI response as JSON, using fallback:', error);
      return {
        result: defaultResult || aiResult,
        confidence: 0.3,
        reasoning: 'Fallback parsing due to JSON parse error',
        metadata: { parseError: (error as Error).message }
      };
    }
  }
}
