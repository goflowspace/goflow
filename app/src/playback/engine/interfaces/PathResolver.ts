/**
 * Интерфейс для определения доступных путей из текущего узла
 */
import {Condition, ConditionGroup, Link, Node} from '../../../types/nodes';
import {GameState} from '../core/GameState';

/**
 * Приоритеты путей при определении следующего узла
 */
export enum PathPriority {
  /**
   * Связь с условиями в нарративный узел (наивысший приоритет)
   */
  CONDITIONAL_NARRATIVE = 1,

  /**
   * Связь в выборы (средний приоритет)
   */
  CHOICE = 2,

  /**
   * Прямая связь без условий в нарративный узел (наименьший приоритет)
   */
  DIRECT_NARRATIVE = 3
}

export interface PathResolverResult {
  /**
   * Все доступные пути (включая невалидные)
   */
  availablePaths: Link[];

  /**
   * Валидные пути (прошедшие проверку условий)
   */
  validPaths: Link[];

  /**
   * Валидные пути, сгруппированные по приоритетам
   */
  prioritizedPaths: Record<PathPriority, Link[]>;

  /**
   * Автоматически выбранный путь на основе приоритетов
   */
  selectedPath?: Link;

  /**
   * Кеш результатов проверки условий для каждого пути
   * Ключ - ID связи (link.id), значение - результаты проверки
   */
  evaluationCache?: Map<
    string,
    {
      link: Link;
      passed: boolean;
      groupResults: Array<{
        group: ConditionGroup;
        passed: boolean;
        conditionResults: Array<{
          condition: Condition;
          result: boolean;
        }>;
      }>;
    }
  >;
}

export interface PathResolver {
  /**
   * Определяет доступные пути из текущего узла
   * @param currentNode - текущий узел
   * @param outgoingLinks - исходящие связи от текущего узла
   * @param gameState - текущее состояние игры
   * @param availableNodes - карта всех доступных узлов для определения типа целевого узла
   * @returns результат с доступными путями
   */
  resolvePaths(currentNode: Node, outgoingLinks: Link[], gameState: GameState, availableNodes: Record<string, Node>): PathResolverResult;
}
