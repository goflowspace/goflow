// backend/src/modules/ai/v2/core/tests/mockOperation.ts
import { AbstractAIOperation } from '../AbstractAIOperation';
import { AIOperationInput, AIOperationOutput, OperationAIConfig } from '../../shared/types';

/**
 * Утилита для создания задержки
 */
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Специальная Mock-операция для тестов.
 * - Позволяет имитировать задержку выполнения.
 * - Записывает порядок выполнения шагов.
 * - Может быть настроена на выброс ошибки.
 */
export class MockOperation extends AbstractAIOperation<AIOperationInput, AIOperationOutput> {
  id: string;
  name: string;
  version = '1.0.0';
  aiConfig: OperationAIConfig = {} as any; // Not needed for these tests

  private readonly executionDelay: number;
  private readonly executionLog: string[];
  private readonly shouldThrow: boolean;

  constructor(id: string, executionDelayMs = 0, executionLog: string[] = [], shouldThrow = false) {
    super();
    this.id = id;
    this.name = `MockOp-${id}`;
    this.executionDelay = executionDelayMs;
    this.executionLog = executionLog;
    this.shouldThrow = shouldThrow;
  }

  protected getSystemPrompt() {
    return 'You are a mock assistant.';
  }

  protected getUserPrompt(input: AIOperationInput) {
    return `Mock task with input: ${JSON.stringify(input)}`;
  }

  parseResult(aiResult: string) {
    // In tests, we don't get a real AI result, so we just pass through
    // The important data is added in the execute method's return value
    return JSON.parse(aiResult || '{}');
  }

  async execute(input: AIOperationInput): Promise<AIOperationOutput> {
    this.executionLog.push(this.id);
    console.log(`[Test] >>>> Executing mock operation: ${this.id}`);
    
    await delay(this.executionDelay);

    if (this.shouldThrow) {
      console.log(`[Test] <<<< Throwing error from mock operation: ${this.id}`);
      throw new Error(`Test error from ${this.id}`);
    }

    console.log(`[Test] <<<< Finished mock operation: ${this.id}`);
    // Важно: возвращаем и входные данные, и свой результат, чтобы имитировать цепочку
    return { ...input, [`output_from_${this.id}`]: `data_${this.id}` };
  }
}

