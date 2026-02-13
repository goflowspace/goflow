/**
 * Сервис для определения доступных путей из текущего узла
 */
import {ConditionGroup, Link, Node} from '../../../types/nodes';
import {GameState} from '../core/GameState';
import {ConditionEvaluator} from '../interfaces/ConditionEvaluator';
import {PathPriority, PathResolver, PathResolverResult} from '../interfaces/PathResolver';

export class PathResolverService implements PathResolver {
  constructor(private conditionEvaluator: ConditionEvaluator) {}

  /**
   * Определяет доступные пути из текущего узла
   * @param currentNode - текущий узел
   * @param outgoingLinks - исходящие связи от текущего узла
   * @param gameState - текущее состояние игры
   * @param availableNodes - карта всех доступных узлов для определения типа целевого узла
   * @returns результат с доступными путями
   */
  resolvePaths(currentNode: Node, outgoingLinks: Link[], gameState: GameState, availableNodes: Record<string, Node>): PathResolverResult {
    // Если нет исходящих связей, возвращаем пустой результат
    if (!outgoingLinks || outgoingLinks.length === 0) {
      return {
        availablePaths: [],
        validPaths: [],
        prioritizedPaths: {
          [PathPriority.CONDITIONAL_NARRATIVE]: [],
          [PathPriority.CHOICE]: [],
          [PathPriority.DIRECT_NARRATIVE]: []
        },
        evaluationCache: new Map()
      };
    }

    // Массив для хранения всех доступных путей
    const availablePaths = [...outgoingLinks];

    // Кеш для хранения результатов проверки условий
    const evaluationCache = new Map<
      string,
      {
        link: Link;
        passed: boolean;
        groupResults: Array<{
          group: ConditionGroup;
          passed: boolean;
          conditionResults: Array<{
            condition: any;
            result: boolean;
          }>;
        }>;
      }
    >();

    // Фильтруем пути по условиям, получая только валидные
    const validPaths = outgoingLinks.filter((link) => {
      // Если нет условий, путь всегда валиден
      if (!link.conditions || link.conditions.length === 0) {
        evaluationCache.set(link.id, {
          link,
          passed: true,
          groupResults: []
        });
        return true;
      }

      // Проверяем условия и сохраняем детальные результаты
      const groupResults: Array<{
        group: ConditionGroup;
        passed: boolean;
        conditionResults: Array<{
          condition: any;
          result: boolean;
        }>;
      }> = [];

      // Проверяем каждую группу условий
      let overallResult = false;

      // Сначала проверяем группы с оператором OR
      for (const group of link.conditions) {
        if (group.operator === 'OR') {
          const conditionResults: Array<{condition: any; result: boolean}> = [];

          // Для OR достаточно одного true
          const groupPassed = group.conditions.some((condition) => {
            const result = this.conditionEvaluator.evaluateCondition(condition, gameState, {
              nodeId: currentNode.id,
              edgeId: link.id,
              groupOperator: 'OR',
              groupId: group.id,
              silent: true
            });
            conditionResults.push({condition, result});
            return result;
          });

          groupResults.push({
            group,
            passed: groupPassed,
            conditionResults
          });

          if (groupPassed) {
            overallResult = true;
            break; // Для OR групп достаточно одной успешной
          }
        }
      }

      // Если ни одна OR группа не прошла, проверяем AND группы
      if (!overallResult) {
        const andGroups = link.conditions.filter((group) => group.operator === 'AND');

        if (andGroups.length === 0) {
          // Если были только OR группы и они не прошли
          overallResult = false;
        } else {
          // Все AND группы должны пройти
          overallResult = andGroups.every((group) => {
            const conditionResults: Array<{condition: any; result: boolean}> = [];

            // Для AND все условия должны быть true
            const groupPassed = group.conditions.every((condition) => {
              const result = this.conditionEvaluator.evaluateCondition(condition, gameState, {
                nodeId: currentNode.id,
                edgeId: link.id,
                groupOperator: 'AND',
                groupId: group.id,
                silent: true
              });
              conditionResults.push({condition, result});
              return result;
            });

            groupResults.push({
              group,
              passed: groupPassed,
              conditionResults
            });

            return groupPassed;
          });
        }
      }

      // Сохраняем результаты в кеш
      evaluationCache.set(link.id, {
        link,
        passed: overallResult,
        groupResults
      });

      return overallResult;
    });

    // Инициализируем объект для группировки путей по приоритетам
    const prioritizedPaths: Record<PathPriority, Link[]> = {
      [PathPriority.CONDITIONAL_NARRATIVE]: [],
      [PathPriority.CHOICE]: [],
      [PathPriority.DIRECT_NARRATIVE]: []
    };

    // Распределяем валидные пути по приоритетам
    for (const path of validPaths) {
      const targetNode = availableNodes[path.endNodeId];
      if (!targetNode) continue;

      // Определяем приоритет пути
      const priority = this.getPathPriority(path, targetNode);
      prioritizedPaths[priority].push(path);
    }

    // Выбираем путь с наивысшим приоритетом
    let selectedPath: Link | undefined;

    // Находим непустую группу с наивысшим приоритетом
    if (prioritizedPaths[PathPriority.CONDITIONAL_NARRATIVE].length > 0) {
      // Для нарративных узлов с условиями выбираем случайно
      const paths = prioritizedPaths[PathPriority.CONDITIONAL_NARRATIVE];
      selectedPath = paths[Math.floor(Math.random() * paths.length)];
    } else if (prioritizedPaths[PathPriority.CHOICE].length > 0) {
      // Для выборов НЕ устанавливаем selectedPath, так как пользователь должен сам выбрать
      // В этом случае selectedPath останется undefined
      // Пользователь сам выберет из доступных вариантов в prioritizedPaths[PathPriority.CHOICE]
    } else if (prioritizedPaths[PathPriority.DIRECT_NARRATIVE].length > 0) {
      // Для нарративных узлов без условий выбираем случайно
      const paths = prioritizedPaths[PathPriority.DIRECT_NARRATIVE];
      selectedPath = paths[Math.floor(Math.random() * paths.length)];
    }

    return {
      availablePaths,
      validPaths,
      prioritizedPaths,
      selectedPath,
      evaluationCache
    };
  }

  /**
   * Определяет приоритет пути на основе типа целевого узла и наличия условий
   */
  private getPathPriority(link: Link, targetNode: Node): PathPriority {
    const hasConditions = link.conditions && link.conditions.length > 0;

    // Связь в нарративный узел с условиями (наивысший приоритет)
    if (targetNode.type === 'narrative' && hasConditions) {
      return PathPriority.CONDITIONAL_NARRATIVE;
    }

    // Связь в выбор (средний приоритет)
    if (targetNode.type === 'choice') {
      return PathPriority.CHOICE;
    }

    // Связь в нарративный узел без условий (низший приоритет)
    if (targetNode.type === 'narrative' && !hasConditions) {
      return PathPriority.DIRECT_NARRATIVE;
    }

    // Для любых других типов узлов (если появятся) используем низший приоритет
    return PathPriority.DIRECT_NARRATIVE;
  }
}
