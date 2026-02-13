// backend/src/modules/ai/v2/core/AIPipeline.ts
import { PipelineStep } from "../shared/pipeline-types";

export class AIPipeline {
  public readonly id: string;
  public readonly name: string;
  public readonly description: string;
  public readonly version: string;
  public readonly steps: PipelineStep[];

  constructor(id: string, name:string, description: string, version: string, steps: PipelineStep[]) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.version = version;
    this.steps = steps;
    this.validate();
  }
  
  /**
   * Проверяет пайплайн на наличие ошибок конфигурации, таких как
   * циклические зависимости или несуществующие зависимости.
   */
  private validate(): void {
    const stepIds = new Set(this.steps.map(s => s.id));
    
    // Проверяем, что все зависимости существуют
    for (const step of this.steps) {
      if (step.dependencies) {
        for (const depId of step.dependencies) {
          if (!stepIds.has(depId)) {
            throw new Error(`Pipeline "${this.id}" has an invalid dependency: step "${step.id}" depends on non-existent step "${depId}".`);
          }
        }
      }
    }
    
    // Проверяем на циклические зависимости
    this.detectCycles();
    
    console.log(`Pipeline "${this.id}" validated successfully.`);
  }

  /**
   * Обнаруживает циклические зависимости в пайплайне с помощью алгоритма DFS.
   * Использует три состояния для каждого узла:
   * - WHITE (0): узел не посещен
   * - GRAY (1): узел в процессе обработки (находится в стеке вызовов)
   * - BLACK (2): узел полностью обработан
   */
  private detectCycles(): void {
    const WHITE = 0;
    const GRAY = 1;
    const BLACK = 2;
    
    const colors = new Map<string, number>();
    const dependencyMap = new Map<string, string[]>();
    
    // Инициализируем карту зависимостей и цвета
    for (const step of this.steps) {
      colors.set(step.id, WHITE);
      dependencyMap.set(step.id, step.dependencies || []);
    }
    
    // DFS для обнаружения циклов
    const dfs = (stepId: string, path: string[]): void => {
      colors.set(stepId, GRAY);
      path.push(stepId);
      
      const dependencies = dependencyMap.get(stepId) || [];
      for (const depId of dependencies) {
        const depColor = colors.get(depId);
        
        if (depColor === GRAY) {
          // Найден обратный край - это цикл
          const cycleStart = path.indexOf(depId);
          const cycle = [...path.slice(cycleStart), depId];
          throw new Error(`Pipeline "${this.id}" contains a circular dependency: ${cycle.join(' -> ')}`);
        }
        
        if (depColor === WHITE) {
          dfs(depId, path);
        }
      }
      
      colors.set(stepId, BLACK);
      path.pop();
    };
    
    // Запускаем DFS для всех непосещенных узлов
    for (const step of this.steps) {
      if (colors.get(step.id) === WHITE) {
        dfs(step.id, []);
      }
    }
  }

  /**
   * Возвращает структуру пайплайна для API ответа.
   * Автоматически группирует шаги по уровням зависимостей.
   */
  public getPipelineStructure() {
    // Вычисляем уровень каждого шага на основе его зависимостей
    const stepLevels = new Map<string, number>();
    
    const calculateLevel = (stepId: string): number => {
      if (stepLevels.has(stepId)) {
        return stepLevels.get(stepId)!;
      }
      
      const step = this.steps.find(s => s.id === stepId);
      if (!step) {
        throw new Error(`Step ${stepId} not found`);
      }
      
      if (!step.dependencies || step.dependencies.length === 0) {
        stepLevels.set(stepId, 0);
        return 0;
      }
      
      const maxDepLevel = Math.max(...step.dependencies.map(depId => calculateLevel(depId)));
      const level = maxDepLevel + 1;
      stepLevels.set(stepId, level);
      return level;
    };
    
    // Вычисляем уровни для всех шагов
    this.steps.forEach(step => calculateLevel(step.id));
    
    // Группируем шаги по уровням
    const levelGroups = new Map<number, PipelineStep[]>();
    for (const step of this.steps) {
      const level = stepLevels.get(step.id)!;
      if (!levelGroups.has(level)) {
        levelGroups.set(level, []);
      }
      levelGroups.get(level)!.push(step);
    }
    
    // Создаем структуру групп
    const groups = Array.from(levelGroups.entries())
      .sort(([a], [b]) => a - b)
      .map(([level, steps]) => ({
        id: `level_${level}`,
        name: this.getLevelName(level),
        type: 'parallel' as const, // Шаги на одном уровне могут выполняться параллельно
        steps: steps.map(step => ({
          id: step.id,
          name: this.getStepDisplayName(step),
          description: this.getStepDescription(step),
          dependencies: step.dependencies || [],
          isOptional: false
        }))
      }));
    
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      version: this.version,
      groups
    };
  }
  
  /**
   * Возвращает человекочитаемое название для уровня.
   */
  protected getLevelName(level: number): string {
    const levelNames = [
      'Основной контент',
      'Базовые элементы', 
      'Концептуальные элементы',
      'Мир и аудитория',
      'Тематическое ядро',
      'Детализированные элементы'
    ];
    
    return levelNames[level] || `Уровень ${level + 1}`;
  }
  
  /**
   * Возвращает человекочитаемое название для шага.
   */
  protected getStepDisplayName(step: PipelineStep): string {
    // Пытаемся получить имя из операции, если доступно
    if (step.operation && 'name' in step.operation) {
      return (step.operation as any).name;
    }
    
    // Генерируем имя на основе ID
    const nameMap: Record<string, string> = {
      synopsis: 'Генерация синопсиса',
      logline: 'Генерация логлайна',
      genres: 'Определение жанров',
      setting: 'Генерация сеттинга',
      target_audience: 'Определение целевой аудитории',
      themes: 'Генерация тем',
      atmosphere: 'Генерация атмосферы',
      message: 'Генерация сообщения',
      unique_features: 'Генерация уникальных особенностей',
      references: 'Генерация референсов',
      visual_style: 'Генерация визуального стиля',
    };
    
    return nameMap[step.id] || step.id;
  }
  
  /**
   * Возвращает описание для шага.
   */
  protected getStepDescription(step: PipelineStep): string {
    const descriptionMap: Record<string, string> = {
      synopsis: 'Создание структурированного описания сюжета',
      logline: 'Создание краткого цепляющего описания проекта',
      genres: 'Определение основных жанров проекта',
      setting: 'Создание мира и локаций проекта',
      target_audience: 'Определение целевой аудитории',
      themes: 'Определение основных тем и мотивов',
      atmosphere: 'Создание атмосферы и настроения',
      message: 'Формулирование ключевого сообщения',
      unique_features: 'Определение уникальных особенностей проекта',
      references: 'Подбор референсов и вдохновения',
      visual_style: 'Определение визуального стиля'
    };
    
    return descriptionMap[step.id] || `Генерация ${step.id}`;
  }
}

