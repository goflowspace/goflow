import {
  AIPipeline,
  PipelineStep,
  PipelineInput,
  PipelineStructure
} from '../interfaces/pipeline.interface';
import { ExecutionContext, ValidationResult } from '../interfaces/operation.interface';

/**
 * Базовый класс для пайплайнов
 * Следует принципу DRY - содержит общую логику
 */
export abstract class BasePipeline implements AIPipeline {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly description: string,
    public readonly version: string,
    public readonly steps: PipelineStep[]
  ) {}

  /**
   * Валидация пайплайна
   */
  validate(): ValidationResult {
    const errors: string[] = [];

    // Проверяем, что есть шаги
    if (!this.steps || this.steps.length === 0) {
      errors.push('Pipeline must have at least one step');
    }

    // Проверяем уникальность ID шагов
    const stepIds = new Set<string>();
    for (const step of this.steps) {
      if (stepIds.has(step.id)) {
        errors.push(`Duplicate step ID: ${step.id}`);
      }
      stepIds.add(step.id);
    }

    // Проверяем зависимости
    for (const step of this.steps) {
      for (const depId of step.dependencies) {
        if (!stepIds.has(depId)) {
          errors.push(`Step ${step.id} depends on non-existent step: ${depId}`);
        }
      }
    }

    // Проверяем циклические зависимости
    const cycleCheck = this.detectCycles();
    if (cycleCheck.hasCycle) {
      errors.push(`Circular dependency detected: ${cycleCheck.cycle?.join(' -> ')}`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Оценка общей стоимости пайплайна
   */
  estimateCost(input: PipelineInput, context: ExecutionContext): number {
    return this.steps.reduce((total, step) => {
      return total + step.operation.estimateCost(input, context);
    }, 0);
  }

  /**
   * Оценка времени выполнения пайплайна
   * Простая оценка - сумма времени всех операций (без учета параллелизма)
   */
  estimateTime(_input: PipelineInput, _context: ExecutionContext): number {
    // Базовая оценка времени на основе сложности операций
    return this.steps.reduce((total, step) => {
      const operationTime = step.operation.complexity * 1000; // миллисекунды
      return total + operationTime;
    }, 0);
  }

  /**
   * Проверка циклических зависимостей
   */
  private detectCycles(): { hasCycle: boolean; cycle?: string[] } {
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const stepMap = new Map<string, PipelineStep>();

    // Создаем карту шагов
    this.steps.forEach(step => stepMap.set(step.id, step));

    const visit = (stepId: string, path: string[]): { hasCycle: boolean; cycle?: string[] } => {
      if (visiting.has(stepId)) {
        const cycleStart = path.indexOf(stepId);
        return {
          hasCycle: true,
          cycle: [...path.slice(cycleStart), stepId]
        };
      }

      if (visited.has(stepId)) {
        return { hasCycle: false };
      }

      const step = stepMap.get(stepId);
      if (!step) {
        return { hasCycle: false };
      }

      visiting.add(stepId);
      const newPath = [...path, stepId];

      // Проверяем все зависимости
      for (const depId of step.dependencies) {
        const result = visit(depId, newPath);
        if (result.hasCycle) {
          return result;
        }
      }

      visiting.delete(stepId);
      visited.add(stepId);

      return { hasCycle: false };
    };

    // Проверяем все шаги
    for (const step of this.steps) {
      if (!visited.has(step.id)) {
        const result = visit(step.id, []);
        if (result.hasCycle) {
          return result;
        }
      }
    }

    return { hasCycle: false };
  }

  /**
   * Базовая реализация подготовки входных данных
   * Каждый пайплайн может переопределить этот метод
   */
  prepareInput(...args: any[]): PipelineInput {
    // Базовая реализация - просто возвращаем первый аргумент как входные данные
    if (args.length === 0) {
      return {};
    }
    if (typeof args[0] === 'object' && args[0] !== null) {
      return args[0];
    }
    return { data: args[0] };
  }

  /**
   * Базовая реализация трансформации результата
   * Каждый пайплайн может переопределить этот метод
   */
  transformResult(pipelineResult: any, startTime: Date): any {
    const processingTime = Date.now() - startTime.getTime();
    
    return {
      success: pipelineResult.success || false,
      data: pipelineResult.data,
      processingTime,
      totalCost: pipelineResult.totalCost || 0,
      totalTime: pipelineResult.totalTime || processingTime,
      steps: pipelineResult.steps,
      errors: pipelineResult.error ? [pipelineResult.error] : []
    };
  }

  /**
   * Базовая реализация получения детального отчета
   * Каждый пайплайн может переопределить этот метод
   */
  getDetailedReport(pipelineResult: any): string {
    const report: string[] = [`📊 Отчет о выполнении пайплайна: ${this.name}`, ''];

    if (pipelineResult.success) {
      report.push('✅ Выполнение: успешно');
    } else {
      report.push('❌ Выполнение: ошибка');
      if (pipelineResult.error) {
        report.push(`   ⚠️ ${pipelineResult.error}`);
      }
    }

    if (pipelineResult.steps) {
      report.push('');
      report.push('🔄 Шаги выполнения:');
      
      if (pipelineResult.steps instanceof Map) {
        pipelineResult.steps.forEach((stepResult: any, stepId: string) => {
          const status = stepResult.success ? '✅' : '❌';
          report.push(`   ${status} ${stepId}`);
          if (stepResult.metadata?.executionTime) {
            report.push(`      ⏱️ ${stepResult.metadata.executionTime}мс`);
          }
          if (stepResult.metadata?.tokensUsed) {
            report.push(`      📊 ${stepResult.metadata.tokensUsed} токенов`);
          }
        });
      }
    }

    report.push('');
    report.push(`⏱️ Общее время: ${pipelineResult.totalTime || 0}мс`);
    report.push(`💰 Общая стоимость: ${pipelineResult.totalCost || 0} кредитов`);

    return report.join('\n');
  }

  /**
   * Абстрактный метод для получения структуры пайплайна
   * Каждый наследник должен реализовать этот метод
   */
  abstract getPipelineStructure(): PipelineStructure;
} 