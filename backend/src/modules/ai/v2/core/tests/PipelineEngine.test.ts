// backend/src/modules/ai/v2/core/tests/PipelineEngine.test.ts
import { StreamingPipelineEngine } from '../PipelineEngine';
import { AIPipeline } from '../AIPipeline';
import { MockOperation } from './mockOperation';
import { ExecutionContext, QualityLevel } from '../../shared/types';

// Стандартный контекст для всех тестов
const mockContext: ExecutionContext = {
  userId: 'test-user',
  projectId: 'test-project',
  requestId: 'test-request',
  qualityLevel: QualityLevel.STANDARD,  
  startTime: new Date()
};

describe('StreamingPipelineEngine', () => {
  let engine: StreamingPipelineEngine;
  let executionLog: string[];

  beforeEach(() => {
    engine = new StreamingPipelineEngine();
    executionLog = [];
  });

  it('should execute a simple linear pipeline in correct order', async () => {
    const opA = new MockOperation('A', 10, executionLog);
    const opB = new MockOperation('B', 10, executionLog);
    const opC = new MockOperation('C', 10, executionLog);

    const pipeline = new AIPipeline('linear-test', 'Linear Test', '', '1.0.0', [
      { id: 'A', operation: opA },
      { id: 'B', operation: opB, dependencies: ['A'] },
      { id: 'C', operation: opC, dependencies: ['B'] },
    ]);

    const results = await engine.execute(pipeline, {}, mockContext);

    expect(executionLog).toEqual(['A', 'B', 'C']);
    expect(results.has('C')).toBe(true);
    expect((results.get('C') as any).output_from_B).toBe('data_B');
  });

  it('should execute independent steps in parallel', async () => {
    const opA = new MockOperation('A', 100, executionLog); // Медленная
    const opB = new MockOperation('B', 100, executionLog); // Медленная
    const opC = new MockOperation('C', 10, executionLog);  // Быстрая

    const pipeline = new AIPipeline('parallel-test', 'Parallel Test', '', '1.0.0', [
      { id: 'A', operation: opA },
      { id: 'B', operation: opB },
      { id: 'C', operation: opC, dependencies: ['A', 'B'] },
    ]);

    const startTime = Date.now();
    await engine.execute(pipeline, {}, mockContext);
    const endTime = Date.now();
    const duration = endTime - startTime;

    // Если бы A и B выполнялись последовательно, время было бы > 200ms.
    // Параллельное выполнение должно быть ближе к 100ms (+ накладные расходы).
    expect(duration).toBeLessThan(150);
    expect(duration).toBeGreaterThan(100);

    // C должен выполниться последним
    expect(executionLog[2]).toBe('C');
  });

  it('should handle a diamond dependency graph correctly', async () => {
    const opA = new MockOperation('A', 10, executionLog);
    const opB = new MockOperation('B', 10, executionLog);
    const opC = new MockOperation('C', 10, executionLog);
    const opD = new MockOperation('D', 10, executionLog);

    const pipeline = new AIPipeline('diamond-test', 'Diamond Test', '', '1.0.0', [
      { id: 'A', operation: opA },
      { id: 'B', operation: opB, dependencies: ['A'] },
      { id: 'C', operation: opC, dependencies: ['A'] },
      { id: 'D', operation: opD, dependencies: ['B', 'C'] },
    ]);

    const results = await engine.execute(pipeline, {}, mockContext);
    
    // Проверяем, что D получил результаты от обоих B и C
    const resultD = results.get('D') as any;
    expect(resultD.output_from_B).toBe('data_B');
    expect(resultD.output_from_C).toBe('data_C');

    // Проверяем, что D выполнен последним
    expect(executionLog.length).toBe(4);
    expect(executionLog[3]).toBe('D');
  });

  it('should skip a step if its condition is not met', async () => {
    const opA = new MockOperation('A', 10, executionLog);
    const opB = new MockOperation('B', 10, executionLog);
    const opC = new MockOperation('C', 10, executionLog);

    const pipeline = new AIPipeline('conditional-test', 'Conditional Test', '', '1.0.0', [
        { id: 'A', operation: opA, mapInput: () => ({ shouldRunB: false }) },
        { id: 'B', operation: opB, dependencies: ['A'], condition: (results) => (results.get('A') as any)?.shouldRunB },
        { id: 'C', operation: opC, dependencies: ['A'] },
    ]);

    const results = await engine.execute(pipeline, {}, mockContext);

    expect(executionLog).toEqual(['A', 'C']);
    expect(results.has('B')).toBe(false);
  });

  it('should stop executing dependent steps after an error', async () => {
    const opA = new MockOperation('A', 10, executionLog);
    const opB = new MockOperation('B', 10, executionLog, true); // Этот шаг вызовет ошибку
    const opC = new MockOperation('C', 10, executionLog);

    const pipeline = new AIPipeline('error-test', 'Error Test', '', '1.0.0', [
      { id: 'A', operation: opA },
      { id: 'B', operation: opB, dependencies: ['A'] },
      { id: 'C', operation: opC, dependencies: ['B'] },
    ]);

    await expect(engine.execute(pipeline, {}, mockContext)).rejects.toThrow('Execution failed at step B');
    expect(executionLog).toEqual(['A', 'B']); // C не должен был выполниться
  });

  it('should map inputs correctly between steps', async () => {
    const opA = new MockOperation('A');
    const opB = new MockOperation('B');

    const pipeline = new AIPipeline('map-input-test', 'Map Input Test', '', '1.0.0', [
        { id: 'A', operation: opA },
        { id: 'B', operation: opB, dependencies: ['A'], mapInput: (results) => {
            const outputA = results.get('A');
            return { mapped_input: (outputA as any).output_from_A };
        }},
    ]);

    const results = await engine.execute(pipeline, {}, mockContext);
    
    const resultB = results.get('B');
    expect((resultB as any).mapped_input).toBe('data_A');
  });

  it('should throw an error for circular dependencies', async () => {
    const opA = new MockOperation('A');
    const opB = new MockOperation('B');

    const pipeline = new AIPipeline('circular-test', 'Circular Test', '', '1.0.0', [
      { id: 'A', operation: opA, dependencies: ['B'] },
      { id: 'B', operation: opB, dependencies: ['A'] },
    ]);
    
    // В текущей реализации рекурсивный движок вызовет 'Maximum call stack size exceeded'
    await expect(engine.execute(pipeline, {}, mockContext)).rejects.toThrow();
  });

  it('should handle a complex multi-branch graph (hexagon)', async () => {
    const opA = new MockOperation('A', 10, executionLog);
    const opB = new MockOperation('B', 50, executionLog); // Медленная ветка
    const opC = new MockOperation('C', 20, executionLog); // Быстрая ветка
    const opD = new MockOperation('D', 10, executionLog);
    const opE = new MockOperation('E', 10, executionLog);
    const opF = new MockOperation('F', 10, executionLog);

    const pipeline = new AIPipeline('hexagon-test', 'Hexagon Test', '', '1.0.0', [
      { id: 'A', operation: opA },
      { id: 'B', operation: opB, dependencies: ['A'] },
      { id: 'C', operation: opC, dependencies: ['A'] },
      { id: 'D', operation: opD, dependencies: ['B'] },
      { id: 'E', operation: opE, dependencies: ['C'] },
      { id: 'F', operation: opF, dependencies: ['D', 'E'] },
    ]);

    const results = await engine.execute(pipeline, {}, mockContext);

    // 1. Проверяем, что F получил данные от обоих родителей
    const resultF = results.get('F') as any;
    expect(resultF.output_from_D).toBe('data_D');
    expect(resultF.output_from_E).toBe('data_E');

    // 2. Проверяем, что все шаги выполнены
    expect(executionLog.length).toBe(6);
    expect(executionLog[5]).toBe('F'); // F - последний

    // 3. Проверяем, что быстрая ветка (C->E) завершилась до медленной (B->D)
    expect(executionLog.indexOf('E')).toBeLessThan(executionLog.indexOf('D'));
  });
});

