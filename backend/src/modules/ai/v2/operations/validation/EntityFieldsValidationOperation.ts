// backend/src/modules/ai/v2/operations/validation/EntityFieldsValidationOperation.ts
import { AbstractOperation } from '../../core/AbstractOperation';
import {
  OperationInput,
  OperationOutput,
  ExecutionContext,
  OperationType,
} from '../../shared/types';
import { GeneratedField } from '../../shared/shared-types';

export interface EntityFieldsValidationInput extends OperationInput {
  /** Тип сущности */
  entityType: string;
  /** Сгенерированные поля */
  generatedFields: GeneratedField[];
  /** Имя сущности */
  entityName: string;
  /** Описание сущности */
  entityDescription: string;
  /** Существующие сущности для проверки уникальности */
  existingEntities: any[];
  /** Уровень валидации */
  validationLevel: 'basic' | 'standard' | 'strict';
}

export interface ValidationIssue {
  /** Поле с проблемой */
  fieldName: string;
  /** Тип проблемы */
  issueType: 'missing' | 'invalid' | 'duplicate' | 'inconsistent' | 'too_short' | 'too_long';
  /** Описание проблемы */
  message: string;
  /** Серьезность проблемы */
  severity: 'error' | 'warning' | 'info';
  /** Предлагаемое исправление */
  suggestion?: string;
}

export interface EntityFieldsValidationOutput extends OperationOutput {
  /** Результат валидации */
  isValid: boolean;
  /** Валидированные поля */
  validatedFields: GeneratedField[];
  /** Валидированное имя */
  validatedName: string;
  /** Валидированное описание */
  validatedDescription: string;
  /** Найденные проблемы */
  validationIssues: ValidationIssue[];
  /** Исправления, которые были применены */
  appliedFixes: string[];
}

/**
 * Операция для валидации сгенерированных полей сущности
 * Проверяет корректность, согласованность и соответствие схеме типа сущности
 */
export class EntityFieldsValidationOperation extends AbstractOperation<
  EntityFieldsValidationInput,
  EntityFieldsValidationOutput
> {
  readonly id = 'entity-fields-validation';
  readonly name = 'Entity Fields Validation';
  readonly version = '1.0.0';
  readonly type = OperationType.VALIDATION;

  protected async executeOperation(
    input: EntityFieldsValidationInput,
    _context: ExecutionContext
  ): Promise<EntityFieldsValidationOutput> {
    const validationIssues: ValidationIssue[] = [];
    const appliedFixes: string[] = [];
    
    // 1. Валидация имени сущности
    let validatedName = input.entityName;
    const nameIssues = this.validateEntityName(input.entityName, input.existingEntities);
    validationIssues.push(...nameIssues);
    
    if (nameIssues.some(issue => issue.severity === 'error')) {
      validatedName = this.fixEntityName(input.entityName, input.existingEntities);
      appliedFixes.push(`Исправлено имя: ${input.entityName} → ${validatedName}`);
    }

    // 2. Валидация описания
    let validatedDescription = input.entityDescription;
    const descriptionIssues = this.validateEntityDescription(input.entityDescription);
    validationIssues.push(...descriptionIssues);
    
    if (descriptionIssues.some(issue => issue.severity === 'error')) {
      validatedDescription = this.fixEntityDescription(input.entityDescription);
      appliedFixes.push('Исправлено описание сущности');
    }

    // 3. Валидация полей
    const validatedFields = [...input.generatedFields];
    const fieldIssues = this.validateFields(input.generatedFields, input.entityType, input.validationLevel);
    validationIssues.push(...fieldIssues);

    // 4. Применяем исправления к полям
    for (let i = 0; i < validatedFields.length; i++) {
      const field = validatedFields[i];
      const fieldProblems = fieldIssues.filter(issue => issue.fieldName === field.name);
      
      if (fieldProblems.some(issue => issue.severity === 'error')) {
        const fixedField = this.fixField(field, fieldProblems);
        validatedFields[i] = fixedField;
        appliedFixes.push(`Исправлено поле: ${field.name}`);
      }
    }

    // 5. Проверка согласованности между полями
    const consistencyIssues = this.validateFieldConsistency(validatedFields);
    validationIssues.push(...consistencyIssues);

    // 6. Финальная оценка
    const errorCount = validationIssues.filter(issue => issue.severity === 'error').length;
    const isValid = errorCount === 0;


    return {
      isValid,
      validatedFields,
      validatedName,
      validatedDescription,
      validationIssues,
      appliedFixes,
      metadata: {
        executionTime: Date.now(),
        type: OperationType.VALIDATION,
        validationLevel: input.validationLevel,
        totalIssues: validationIssues.length,
        errorCount,
        warningCount: validationIssues.filter(issue => issue.severity === 'warning').length,
        appliedFixesCount: appliedFixes.length
      }
    };
  }

  /**
   * Валидирует имя сущности
   */
  private validateEntityName(name: string, existingEntities: any[]): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Проверка длины
    if (!name || name.trim().length === 0) {
      issues.push({
        fieldName: 'entityName',
        issueType: 'missing',
        message: 'Имя сущности не может быть пустым',
        severity: 'error',
        suggestion: 'Добавить имя сущности'
      });
    } else if (name.length < 2) {
      issues.push({
        fieldName: 'entityName',
        issueType: 'too_short',
        message: 'Имя сущности слишком короткое',
        severity: 'warning',
        suggestion: 'Использовать имя длиной не менее 2 символов'
      });
    } else if (name.length > 100) {
      issues.push({
        fieldName: 'entityName',
        issueType: 'too_long',
        message: 'Имя сущности слишком длинное',
        severity: 'warning',
        suggestion: 'Сократить имя до 100 символов'
      });
    }

    // Проверка уникальности
    const duplicateName = existingEntities.find(entity => 
      entity.name && entity.name.toLowerCase() === name.toLowerCase()
    );
    
    if (duplicateName) {
      issues.push({
        fieldName: 'entityName',
        issueType: 'duplicate',
        message: `Сущность с именем "${name}" уже существует`,
        severity: 'error',
        suggestion: 'Изменить имя или добавить уникальный суффикс'
      });
    }

    return issues;
  }

  /**
   * Валидирует описание сущности
   */
  private validateEntityDescription(description: string): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    if (!description || description.trim().length === 0) {
      issues.push({
        fieldName: 'entityDescription',
        issueType: 'missing',
        message: 'Описание сущности отсутствует',
        severity: 'warning',
        suggestion: 'Добавить описание сущности'
      });
    } else if (description.length < 10) {
      issues.push({
        fieldName: 'entityDescription',
        issueType: 'too_short',
        message: 'Описание сущности слишком короткое',
        severity: 'warning',
        suggestion: 'Добавить более детальное описание'
      });
    } else if (description.length > 2000) {
      issues.push({
        fieldName: 'entityDescription',
        issueType: 'too_long',
        message: 'Описание сущности слишком длинное',
        severity: 'warning',
        suggestion: 'Сократить описание до 2000 символов'
      });
    }

    return issues;
  }

  /**
   * Валидирует поля сущности
   */
  private validateFields(fields: GeneratedField[], entityType: string, validationLevel: string): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Базовые проверки для всех полей
    fields.forEach(field => {
      // Проверка наличия значения
      const valueStr = typeof field.value === 'string' ? field.value : String(field.value || '');
      if (!field.value || (valueStr.trim && valueStr.trim().length === 0)) {
        issues.push({
          fieldName: field.name,
          issueType: 'missing',
          message: `Поле "${field.name}" не имеет значения`,
          severity: 'error',
          suggestion: 'Добавить значение для поля'
        });
      }

      // Проверка длины значения (только для текстовых полей)
      if (field.value && typeof field.value === 'string' && field.value.length < 5) {
        issues.push({
          fieldName: field.name,
          issueType: 'too_short',
          message: `Значение поля "${field.name}" слишком короткое`,
          severity: 'warning',
          suggestion: 'Добавить более детальное содержание'
        });
      }

      if (field.value && typeof field.value === 'string' && field.value.length > 5000) {
        issues.push({
          fieldName: field.name,
          issueType: 'too_long',
          message: `Значение поля "${field.name}" слишком длинное`,
          severity: 'warning',
          suggestion: 'Сократить содержание поля'
        });
      }
    });

    // Специфичные проверки в зависимости от уровня валидации
    if (validationLevel === 'strict') {
      issues.push(...this.validateFieldsStrict(fields, entityType));
    }

    return issues;
  }

  /**
   * Строгая валидация полей
   */
  private validateFieldsStrict(fields: GeneratedField[], entityType: string): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    
    // Обязательные поля для разных типов сущностей
    const requiredFields: Record<string, string[]> = {
      character: ['appearance', 'personality'],
      location: ['description', 'atmosphere'],
      object: ['appearance', 'function']
    };

    const required = requiredFields[entityType.toLowerCase()] || [];
    
    required.forEach(requiredField => {
      const field = fields.find(f => f.name === requiredField);
      if (!field) {
        issues.push({
          fieldName: requiredField,
          issueType: 'missing',
          message: `Обязательное поле "${requiredField}" отсутствует для типа "${entityType}"`,
          severity: 'error',
          suggestion: `Добавить поле "${requiredField}"`
        });
      }
    });

    return issues;
  }

  /**
   * Проверяет согласованность между полями
   */
  private validateFieldConsistency(fields: GeneratedField[]): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Примеры проверок согласованности
    const personalityField = fields.find(f => f.name === 'personality');
    const backgroundField = fields.find(f => f.name === 'background');

    if (personalityField && backgroundField) {
      // Здесь можно добавить более сложные проверки согласованности
      // Например, проверить что характер соответствует предыстории
    }

    return issues;
  }

  /**
   * Исправляет имя сущности
   */
  private fixEntityName(name: string, existingEntities: any[]): string {
    if (!name || name.trim().length === 0) {
      return 'Безымянная сущность';
    }

    let fixedName = name.trim();
    
    // Обрезаем слишком длинные имена
    if (fixedName.length > 100) {
      fixedName = fixedName.substring(0, 97) + '...';
    }

    // Добавляем суффикс для уникальности
    const duplicateName = existingEntities.find(entity => 
      entity.name && entity.name.toLowerCase() === fixedName.toLowerCase()
    );
    
    if (duplicateName) {
      let counter = 1;
      let uniqueName = `${fixedName} ${counter}`;
      
      while (existingEntities.find(entity => 
        entity.name && entity.name.toLowerCase() === uniqueName.toLowerCase()
      )) {
        counter++;
        uniqueName = `${fixedName} ${counter}`;
      }
      
      fixedName = uniqueName;
    }

    return fixedName;
  }

  /**
   * Исправляет описание сущности
   */
  private fixEntityDescription(description: string): string {
    if (!description || description.trim().length === 0) {
      return 'Описание этой сущности будет добавлено позже.';
    }

    let fixedDescription = description.trim();
    
    // Обрезаем слишком длинные описания
    if (fixedDescription.length > 2000) {
      fixedDescription = fixedDescription.substring(0, 1997) + '...';
    }

    return fixedDescription;
  }

  /**
   * Исправляет поле
   */
  private fixField(field: GeneratedField, issues: ValidationIssue[]): GeneratedField {
    let fixedValue = field.value;

    // Исправляем пустые значения
    if (!fixedValue || (typeof fixedValue === 'string' && fixedValue.trim().length === 0)) {
      fixedValue = `Значение для поля "${field.name}" будет добавлено позже.`;
    }

    // Обрезаем слишком длинные значения (только для строк)
    if (typeof fixedValue === 'string' && fixedValue.length > 5000) {
      fixedValue = fixedValue.substring(0, 4997) + '...';
    }

    return {
      ...field,
      value: fixedValue,
      metadata: {
        ...field.metadata,
        fixed: true,
        issuesFixed: issues.map(i => i.issueType)
      }
    };
  }
}
