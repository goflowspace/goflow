// backend/src/modules/ai/v2/core/AbstractBibleGenerationOperation.ts
import { AIOperationInput, AIOperationOutput } from '../shared/types';
import { AbstractAIOperation } from './AbstractAIOperation';
import { ValidationSchema } from '../validation/ValidationTypes';
import { OperationValidationSchemas as BibleOperationValidationSchemas } from '../validation/BibleValidationSchemas';

/**
 * Base input interface for all bible generation operations.
 * It ensures that common context fields are always present.
 */
export interface BibleGenerationInput extends AIOperationInput {
  projectName: string;
  projectContext: string;
  additionalContext?: {
    existingFields?: Record<string, any>;
  };
}

/**
 * Abstract base class for all Bible Generation operations in the v2 architecture.
 * It centralizes the logic for building the context prompt, making it consistent
 * across all related operations (Logline, Synopsis, Genre, etc.).
 */
export abstract class AbstractBibleGenerationOperation<
  TInput extends BibleGenerationInput,
  TOutput extends AIOperationOutput,
> extends AbstractAIOperation<TInput, TOutput> {
  
  /**
   * Получить схему валидации на основе ID операции
   */
  protected getValidationSchema(): ValidationSchema | null {
    return BibleOperationValidationSchemas[this.id] || null;
  }
  /**
   * Builds a standardized context string from the input.
   * This method is intended to be used by subclasses within their `getUserPrompt` implementation.
   * @param input The operation input, extending BibleGenerationInput.
   * @returns A formatted string containing project context and additional information.
   */
  protected buildContextPrompt(input: TInput): string {
    const additionalInfoParts: string[] = [];
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
${input.projectContext}

${additionalInfo}
    `.trim();
  }


}

