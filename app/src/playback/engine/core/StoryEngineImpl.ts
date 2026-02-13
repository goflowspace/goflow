/**
 * Реализация движка истории
 * Обеспечивает навигацию по узлам с учетом условий
 */
import {Choice, ChoiceNode, Edge, Link, NarrativeNode, Node} from '@types-folder/nodes';

import {EngineEventEmitter} from '../events/EngineEvents';
import {SimpleEventEmitter} from '../events/EventEmitter';
import {ConditionEvaluator} from '../interfaces/ConditionEvaluator';
import {PathPriority, PathResolver} from '../interfaces/PathResolver';
import {StoryEngine} from '../interfaces/StoryEngine';
import {OperationsService} from '../services/OperationsService';
import {PathResolverService} from '../services/PathResolverService';
import {GameState} from './GameState';
import {StoryData} from './StoryData';

export class StoryEngineImpl implements StoryEngine {
  private storyData: StoryData | null = null;
  private gameState: GameState = {
    variables: {},
    visitedNodes: new Set<string>(),
    history: [],
    displayHistory: [],
    executedOperations: [],
    triggeredConditions: []
  };
  private operationsService: OperationsService;
  private pathResolver: PathResolver;
  private eventEmitter: SimpleEventEmitter;
  private isInitialLoad = true; // Флаг для отслеживания первой инициализации

  constructor(private conditionEvaluator: ConditionEvaluator) {
    this.eventEmitter = new SimpleEventEmitter();
    this.operationsService = new OperationsService(this.eventEmitter);
    this.pathResolver = new PathResolverService(conditionEvaluator);

    // Передаем eventEmitter в conditionEvaluator, если он поддерживает это
    if (conditionEvaluator.setEventEmitter) {
      conditionEvaluator.setEventEmitter(this.eventEmitter);
    }
  }

  /**
   * Возвращает данные истории
   */
  getStoryData(): StoryData | null {
    return this.storyData;
  }

  /**
   * Инициализирует движок данными истории
   */
  initialize(storyData: StoryData): void {
    this.storyData = storyData;

    // Инициализируем переменные из storyData
    if (storyData.data.variables) {
      this.gameState.variables = {};
      storyData.data.variables.forEach((variable) => {
        this.gameState.variables[variable.id] = {...variable};
      });
    }

    // Сбрасываем состояние посещенных узлов и историю
    this.gameState.visitedNodes = new Set<string>();
    this.gameState.history = [];
    this.gameState.displayHistory = [];
  }

  /**
   * Находит начальный узел истории
   */
  getStartNode(): Node | null {
    // Используем приватный метод findStartNode(), который не изменяет состояние
    return this.findStartNode();
  }

  /**
   * Выполняет операции узла
   */
  private executeOperations(node: Node): void {
    if (node.type === 'choice') {
      console.warn('[WARNING] У узла выбора нет операций:', node.id);
      return;
    }

    if (!this.storyData) {
      console.warn('[WARNING] Нет данных истории для выполнения операций узла:', node.id);
      return;
    }

    this.operationsService.executeOperations(node, this.gameState, this.storyData);
  }

  /**
   * Создает карту узлов для использования в PathResolver
   * @returns Карта узлов по их ID
   */
  private createNodesMap(): Record<string, Node> {
    if (!this.storyData) {
      return {};
    }

    const availableNodes: Record<string, Node> = {};
    this.storyData.data.nodes.forEach((node) => {
      availableNodes[node.id] = node;
    });

    return availableNodes;
  }

  /**
   * Преобразует Edge в формат Link для PathResolver
   * @param edges Исходящие связи
   * @returns Массив связей в формате Link
   */
  private convertEdgesToLinks(edges: Edge[]): Link[] {
    return edges.map((edge) => ({
      id: edge.id,
      type: 'link' as const,
      startNodeId: edge.source,
      endNodeId: edge.target,
      conditions: edge.data?.conditions || []
    }));
  }

  /**
   * Получает исходящие связи для узла
   * @param nodeId ID узла
   * @returns Массив исходящих связей
   */
  private getOutgoingEdges(nodeId: string): Edge[] {
    if (!this.storyData) {
      return [];
    }

    return this.storyData.data.edges.filter((e) => e.source === nodeId);
  }

  /**
   * Определяет следующий узел после текущего (без изменения состояния)
   * Этот метод только рассчитывает, какой узел должен быть следующим, но не изменяет историю
   */
  getNextNode(currentNodeId: string): Node | null {
    if (!this.storyData || !currentNodeId) {
      return null;
    }

    const {nodes} = this.storyData.data;

    // Получаем все исходящие связи
    const outgoingEdges = this.getOutgoingEdges(currentNodeId);

    // Если нет связей, возвращаем null
    if (outgoingEdges.length === 0) {
      return null;
    }

    // Создаем карту доступных узлов для PathResolver
    const availableNodes = this.createNodesMap();

    // Получаем текущий узел
    const currentNode = nodes.find((n) => n.id === currentNodeId);
    if (!currentNode) {
      return null;
    }

    // Преобразуем Edge в формат Link для PathResolver
    const outgoingLinks = this.convertEdgesToLinks(outgoingEdges);

    // Используем PathResolver для определения следующего узла
    const pathResult = this.pathResolver.resolvePaths(currentNode, outgoingLinks, this.gameState, availableNodes);

    // Если есть автоматический выбор пути, используем его
    if (pathResult.selectedPath) {
      const nextNodeId = pathResult.selectedPath.endNodeId;

      // Логируем кешированные результаты проверки условий
      if (pathResult.evaluationCache && pathResult.evaluationCache.has(pathResult.selectedPath.id)) {
        const cachedResult = pathResult.evaluationCache.get(pathResult.selectedPath.id)!;

        // Логируем каждую группу условий и их результаты
        for (const groupResult of cachedResult.groupResults) {
          // Логируем каждое условие в группе
          for (const conditionResult of groupResult.conditionResults) {
            this.eventEmitter.emit({
              type: 'condition.evaluated',
              timestamp: Date.now(),
              nodeId: currentNodeId,
              edgeId: pathResult.selectedPath.id,
              condition: conditionResult.condition,
              result: conditionResult.result,
              groupOperator: groupResult.group.operator
            });
          }

          // Логируем результат группы
          this.eventEmitter.emit({
            type: 'condition.group.evaluated',
            timestamp: Date.now(),
            nodeId: currentNodeId,
            edgeId: pathResult.selectedPath.id,
            conditions: groupResult.conditionResults,
            groupOperator: groupResult.group.operator,
            groupResult: groupResult.passed
          });
        }
      }

      return nodes.find((n) => n.id === nextNodeId) || null;
    }
    // Если есть пути к выборам, берем первый из них
    else if (pathResult.prioritizedPaths[PathPriority.CHOICE].length > 0) {
      const choicePath = pathResult.prioritizedPaths[PathPriority.CHOICE][0];
      return nodes.find((n) => n.id === choicePath.endNodeId) || null;
    }

    return null;
  }

  /**
   * Посещает узел: добавляет его в историю и выполняет операции
   * Этот метод должен вызываться только для нарративных узлов
   */
  visitNode(nodeId: string): Node | null {
    if (!this.storyData) {
      return null;
    }

    const {nodes} = this.storyData.data;
    const node = nodes.find((n) => n.id === nodeId);

    if (!node) {
      return null;
    }

    // Проверяем, что это нарративный узел
    if (node.type !== 'narrative') {
      console.warn(`[WARNING] Попытка посетить не-нарративный узел ${nodeId} через visitNode`);
      return node;
    }

    // Выполняем операции узла
    this.executeOperations(node);

    // Добавляем узел в историю всегда (даже если это повторное посещение)
    this.gameState.history.push(nodeId);

    // Добавляем узел в посещенные
    this.gameState.visitedNodes.add(nodeId);

    // Сбрасываем флаг первой загрузки после посещения любого узла
    if (this.isInitialLoad) {
      this.isInitialLoad = false;
    }

    // Генерируем событие посещения узла
    this.eventEmitter.emit({
      type: 'node.visited',
      timestamp: Date.now(),
      nodeId: node.id,
      nodeName: node.data?.title || node.data?.text || node.id,
      nodeType: 'narrative'
    });

    return node;
  }

  /**
   * Выполняет выбор и возвращает следующий узел
   * Обрабатывает только узлы выбора
   */
  executeChoice(choiceId: string): Node | null {
    if (!this.storyData) {
      return null;
    }

    const {nodes} = this.storyData.data;

    // Находим узел выбора
    const choiceNode = nodes.find((n) => n.id === choiceId);

    if (!choiceNode) {
      return null;
    }

    // Проверяем, что это узел выбора
    if (choiceNode.type !== 'choice') {
      console.warn(`[WARNING] Попытка выполнить выбор на не-choice узле ${choiceId}`);
      return null;
    }

    // Добавляем узел в посещенные
    this.gameState.visitedNodes.add(choiceId);

    // Генерируем событие выбора
    this.eventEmitter.emit({
      type: 'choice.selected',
      timestamp: Date.now(),
      nodeId: this.gameState.history[this.gameState.history.length - 1] || '',
      choice: {
        id: choiceNode.id,
        text: choiceNode.data?.text || 'Выбор',
        hasNextNode: true
      }
    });

    // Находим следующий узел после выбора
    const nextNode = this.getNextNode(choiceId);

    if (nextNode) {
      // Если следующий узел найден и это нарративный узел, посещаем его
      if (nextNode.type === 'narrative') {
        return this.visitNode(nextNode.id);
      } else {
        // В случае если за выбором следует другой не-нарративный узел (редкий случай)
        // просто возвращаем его без изменения истории
        console.warn(`[WARNING] За выбором ${choiceId} следует не-нарративный узел ${nextNode.id}`);
        return nextNode;
      }
    }

    return null;
  }

  /**
   * Возвращает все доступные выборы для текущего узла
   * Если выборов нет, но есть прямая связь с нарративным узлом,
   * возвращает "виртуальный" выбор "Продолжить"
   */
  getAvailableChoices(nodeId: string): Choice[] {
    if (!this.storyData) {
      return [];
    }

    const {nodes, edges} = this.storyData.data;

    // Получаем текущий узел
    const currentNode = nodes.find((n) => n.id === nodeId);
    if (!currentNode) {
      return [];
    }

    // Получаем все исходящие связи
    const outgoingEdges = this.getOutgoingEdges(nodeId);

    // Если нет исходящих связей
    if (outgoingEdges.length === 0) {
      return [];
    }

    // Создаем карту доступных узлов для PathResolver
    const availableNodes = this.createNodesMap();

    // Преобразуем Edge в формат Link для PathResolver
    const outgoingLinks = this.convertEdgesToLinks(outgoingEdges);

    // Используем PathResolver для определения доступных путей
    const pathResult = this.pathResolver.resolvePaths(currentNode, outgoingLinks, this.gameState, availableNodes);

    // Выборы имеют приоритет CHOICE
    const choicePaths = pathResult.prioritizedPaths[PathPriority.CHOICE];

    // Если есть выборы, преобразуем их в формат Choice
    if (choicePaths.length > 0) {
      return choicePaths
        .map((path) => {
          const targetNode = nodes.find((n) => n.id === path.endNodeId);
          if (!targetNode || targetNode.type !== 'choice') {
            return null;
          }

          // Проверяем, есть ли у выбора следующий узел
          const hasNextNode = edges.some((e) => e.source === targetNode.id);

          return {
            id: targetNode.id,
            text: targetNode.data?.text || 'Выбор',
            hasNextNode
          };
        })
        .filter((choice) => choice !== null) as Choice[];
    }

    // Если нет выборов, проверяем наличие прямых нарративных путей
    const directNarrativePaths = pathResult.prioritizedPaths[PathPriority.DIRECT_NARRATIVE];
    const conditionalNarrativePaths = pathResult.prioritizedPaths[PathPriority.CONDITIONAL_NARRATIVE];
    const narrativePath = pathResult.selectedPath || (conditionalNarrativePaths.length > 0 ? conditionalNarrativePaths[0] : directNarrativePaths.length > 0 ? directNarrativePaths[0] : null);

    // Если есть прямой путь к нарративному узлу, создаем "виртуальный" выбор
    if (narrativePath) {
      const targetNode = nodes.find((n) => n.id === narrativePath.endNodeId);
      if (targetNode && targetNode.type === 'narrative') {
        return [
          {
            id: targetNode.id,
            text: 'Продолжить',
            hasNextNode: true,
            isVirtual: true,
            pathLink: narrativePath,
            evaluationCache: pathResult.evaluationCache
          }
        ];
      }
    }

    return [];
  }

  /**
   * Возвращает текущее состояние игры
   */
  getState(): GameState {
    return {...this.gameState};
  }

  /**
   * Возвращается на предыдущий узел
   */
  goBack(): Node | null {
    if (!this.storyData || this.gameState.history.length <= 1) {
      return null; // Нельзя вернуться дальше начального узла
    }

    const {nodes} = this.storyData.data;

    // Удаляем последний узел из истории (это должен быть нарративный узел)
    const removedNode = this.gameState.history.pop();

    // Если у узла были операции с переменными, откатываем их
    if (removedNode) {
      this.operationsService.rollbackNodeOperations(removedNode, this.gameState);
    }

    // Если история пуста после удаления, возвращаем стартовый узел
    if (this.gameState.history.length === 0) {
      const startNode = this.getStartNode();
      return startNode;
    }

    // Получаем ID узла, который теперь является последним в истории
    const prevNodeId = this.gameState.history[this.gameState.history.length - 1];

    // Ищем узел по ID
    const prevNode = nodes.find((n) => n.id === prevNodeId);

    // По новой логике, в истории должны быть только нарративные узлы,
    // поэтому нет необходимости в цикле для пропуска узлов выбора

    // Генерируем событие навигации назад
    if (removedNode && prevNode) {
      this.eventEmitter.emit({
        type: 'navigation.back',
        timestamp: Date.now(),
        fromNodeId: removedNode,
        toNodeId: prevNode.id
      });
    }

    // Возвращаем узел, который теперь стал последним в истории
    return prevNode || null;
  }

  /**
   * Перезапускает историю
   */
  restart(): Node | null {
    // Сбрасываем состояние
    this.gameState.visitedNodes = new Set<string>();
    this.gameState.history = [];
    this.gameState.displayHistory = [];

    // Сбрасываем историю операций
    this.gameState.executedOperations = [];

    // Сбрасываем историю проверенных условий
    this.gameState.triggeredConditions = [];

    // Сбрасываем переменные к начальным значениям
    if (this.storyData?.data.variables) {
      this.gameState.variables = {};
      this.storyData.data.variables.forEach((variable) => {
        this.gameState.variables[variable.id] = {...variable};
      });
    }

    // Устанавливаем флаг, что это не первая загрузка, а рестарт
    this.isInitialLoad = false;

    // Находим стартовый узел без авто-перехода к следующему
    const startNode = this.findStartNode();

    // Генерируем событие рестарта
    if (startNode) {
      this.eventEmitter.emit({
        type: 'story.restarted',
        timestamp: Date.now(),
        startNodeId: startNode.id
      });
    }

    return startNode;
  }

  /**
   * Находит начальный узел истории без добавления в историю
   * (вспомогательный метод для restart)
   */
  private findStartNode(): Node | null {
    if (!this.storyData) {
      return null;
    }

    const {nodes, edges} = this.storyData.data;

    // Ищем narrative узел без входящих связей
    const allTargets = edges.map((e) => e.target);
    const narrativeNodes = nodes.filter((n) => n.type === 'narrative');

    // Узел без входящих связей
    const startNode = narrativeNodes.find((n) => !allTargets.includes(n.id));
    if (startNode) {
      return startNode;
    }

    // Или первый narrative узел
    if (narrativeNodes.length > 0) {
      return narrativeNodes[0];
    }

    return null;
  }

  /**
   * Получает текущий узел на основе истории
   * Полезно для синхронизации состояния
   */
  getCurrentNode(): Node | null {
    if (!this.storyData) {
      return null;
    }

    const {nodes} = this.storyData.data;

    // Если история пуста, возвращаем стартовый узел
    if (this.gameState.history.length === 0) {
      return this.getStartNode();
    }

    // Получаем последний узел из истории
    const currentNodeId = this.gameState.history[this.gameState.history.length - 1];
    const currentNode = nodes.find((n) => n.id === currentNodeId);

    // Если узел не найден, возвращаем стартовый узел
    if (!currentNode) {
      return this.getStartNode();
    }

    return currentNode;
  }

  /**
   * Получает следующий узел с учетом приоритетов проверки
   * (заменен на использование PathResolver)
   */
  private getNextNodeWithPriorities(nodeId: string): {nextNodeId: string | null} {
    if (!this.storyData) {
      return {nextNodeId: null};
    }

    const {nodes} = this.storyData.data;

    // Получаем текущий узел
    const currentNode = nodes.find((n) => n.id === nodeId);
    if (!currentNode) {
      return {nextNodeId: null};
    }

    // Получаем все исходящие связи
    const outgoingEdges = this.getOutgoingEdges(nodeId);

    // Если нет исходящих связей
    if (outgoingEdges.length === 0) {
      return {nextNodeId: null};
    }

    // Создаем карту доступных узлов для PathResolver
    const availableNodes = this.createNodesMap();

    // Преобразуем Edge в формат Link для PathResolver
    const outgoingLinks = this.convertEdgesToLinks(outgoingEdges);

    // Используем PathResolver для определения следующего узла
    const pathResult = this.pathResolver.resolvePaths(currentNode, outgoingLinks, this.gameState, availableNodes);

    // Если PathResolver определил путь, используем его
    if (pathResult.selectedPath) {
      return {nextNodeId: pathResult.selectedPath.endNodeId};
    }

    return {nextNodeId: null};
  }

  /**
   * Восстанавливает полную историю отображения включая выборы
   * Используется при переключении на режим waterfall
   */
  private rebuildFullDisplayHistory(): void {
    if (!this.storyData) {
      return;
    }

    const nodes = this.storyData.data.nodes;
    const newDisplayHistory: Node[] = [];

    // Проходим по истории нарративных узлов
    for (let i = 0; i < this.gameState.history.length; i++) {
      const nodeId = this.gameState.history[i];
      const node = nodes.find((n) => n.id === nodeId);

      if (node) {
        // Добавляем нарративный узел
        newDisplayHistory.push(node);

        // Если это не последний узел в истории, ищем выбор который привел к следующему узлу
        if (i < this.gameState.history.length - 1) {
          const nextNodeId = this.gameState.history[i + 1];

          // Ищем выбор, который ведет к следующему узлу
          const outgoingEdges = this.getOutgoingEdges(nodeId);

          for (const edge of outgoingEdges) {
            const targetNode = nodes.find((n) => n.id === edge.target);

            // Если это узел выбора
            if (targetNode && targetNode.type === 'choice') {
              // Проверяем, ведет ли этот выбор к следующему узлу в истории
              const choiceOutgoingEdges = this.getOutgoingEdges(targetNode.id);
              const leadsToNext = choiceOutgoingEdges.some((e) => {
                // Прямая связь к следующему узлу
                if (e.target === nextNodeId) return true;

                // Или через промежуточные узлы (не choice)
                const intermediateNode = nodes.find((n) => n.id === e.target);
                if (intermediateNode && intermediateNode.type !== 'choice' && intermediateNode.type !== 'narrative') {
                  const intermediateOutgoing = this.getOutgoingEdges(intermediateNode.id);
                  return intermediateOutgoing.some((ie) => ie.target === nextNodeId);
                }

                return false;
              });

              if (leadsToNext) {
                // Добавляем выбор в историю
                newDisplayHistory.push(targetNode);
                break;
              }
            }
          }
        }
      }
    }

    this.gameState.displayHistory = newDisplayHistory;
  }

  /**
   * Возвращает историю узлов для отображения
   */
  getDisplayHistory(mode: 'novel' | 'waterfall', currentNode: Node): Node[] {
    if (mode === 'novel') {
      // В режиме "novel" отображаем только текущий узел
      this.gameState.displayHistory = [currentNode];
      return [currentNode];
    } else {
      // В режиме "waterfall" нужно правильно инициализировать историю

      // Если история отображения пуста или содержит только один узел (после переключения из novel),
      // восстанавливаем полную историю включая выборы
      if (this.gameState.displayHistory.length <= 1) {
        this.rebuildFullDisplayHistory();
      }

      // Проверяем, не является ли текущий узел уже последним в истории отображения
      const lastDisplayNode = this.gameState.displayHistory.length > 0 ? this.gameState.displayHistory[this.gameState.displayHistory.length - 1] : null;

      if (!lastDisplayNode || lastDisplayNode.id !== currentNode.id) {
        this.gameState.displayHistory.push(currentNode);
      }

      return [...this.gameState.displayHistory];
    }
  }

  /**
   * Добавляет узел выбора в историю отображения
   */
  addChoiceToDisplayHistory(choice: Choice): void {
    // Создаем узел выбора для отображения
    const choiceNode: Node = {
      id: choice.id,
      type: 'choice',
      coordinates: {x: 0, y: 0},
      data: {
        text: choice.text,
        height: 40
      }
    };

    // Добавляем выбор в историю всегда (даже при повторном выборе)
    this.gameState.displayHistory.push(choiceNode);
  }

  /**
   * Обновляет историю отображения при навигации назад
   */
  updateDisplayHistoryOnBack(mode: 'novel' | 'waterfall'): Node[] {
    if (!this.storyData) {
      return [];
    }

    const {nodes} = this.storyData.data;

    if (mode === 'novel') {
      // В режиме "novel" отображаем только текущий узел
      // Получаем текущий узел (после goBack это последний элемент истории или стартовый)
      let currentNode: Node | null = null;

      if (this.gameState.history.length > 0) {
        const currentNodeId = this.gameState.history[this.gameState.history.length - 1];
        currentNode = nodes.find((n) => n.id === currentNodeId) || null;
      }

      if (!currentNode) {
        currentNode = this.getStartNode();
      }

      if (currentNode) {
        this.gameState.displayHistory = [currentNode];
        return [currentNode];
      }

      return [];
    } else {
      // В режиме "waterfall"
      // Если предыдущий узел был выбором, удаляем последние 2 элемента из отображаемой истории
      // Иначе удаляем только последний элемент
      if (this.gameState.displayHistory.length <= 1) {
        return [...this.gameState.displayHistory];
      }

      const lastNode = this.gameState.displayHistory[this.gameState.displayHistory.length - 1];
      const secondLastNode = this.gameState.displayHistory.length >= 2 ? this.gameState.displayHistory[this.gameState.displayHistory.length - 2] : null;

      if (lastNode.type === 'narrative' && secondLastNode?.type === 'choice') {
        // Если последовательность: choice -> narrative, удаляем оба
        this.gameState.displayHistory = this.gameState.displayHistory.slice(0, -2);
      } else {
        // Удаляем только последний
        this.gameState.displayHistory = this.gameState.displayHistory.slice(0, -1);
      }

      return [...this.gameState.displayHistory];
    }
  }

  /**
   * Проверяет, является ли узел нарративным
   */
  isNarrativeNode(node: Node): node is NarrativeNode {
    return node.type === 'narrative';
  }

  /**
   * Проверяет, является ли узел выбором
   */
  isChoiceNode(node: Node): node is ChoiceNode {
    return node.type === 'choice';
  }

  /**
   * Обрабатывает прямой переход между нарративными узлами
   * (когда у игрока нет реального выбора)
   */
  handleDirectNarrativeTransition(nodeId: string): Node | null {
    if (!this.storyData) {
      return null;
    }

    // Проверяем, является ли узел первым в истории (при первой инициализации или после рестарта)
    // Если это первый узел, не делаем автоматический переход
    const isFirstNode = this.gameState.history.length === 1 && this.gameState.history[0] === nodeId;
    if (isFirstNode) {
      return null;
    }

    // Получаем доступные выборы с помощью getAvailableChoices, который теперь использует PathResolver
    const choices = this.getAvailableChoices(nodeId);

    // Если есть только один виртуальный выбор "Продолжить"
    if (choices.length === 1 && choices[0].isVirtual) {
      const choice = choices[0];

      // Логируем кешированные результаты проверки условий
      if (choice.pathLink && choice.evaluationCache && choice.evaluationCache.has(choice.pathLink.id)) {
        const cachedResult = choice.evaluationCache.get(choice.pathLink.id)!;

        // Логируем каждую группу условий и их результаты
        for (const groupResult of cachedResult.groupResults) {
          // Логируем каждое условие в группе
          for (const conditionResult of groupResult.conditionResults) {
            this.eventEmitter.emit({
              type: 'condition.evaluated',
              timestamp: Date.now(),
              nodeId: nodeId,
              edgeId: choice.pathLink.id,
              condition: conditionResult.condition,
              result: conditionResult.result,
              groupOperator: groupResult.group.operator
            });
          }

          // Логируем результат группы
          this.eventEmitter.emit({
            type: 'condition.group.evaluated',
            timestamp: Date.now(),
            nodeId: nodeId,
            edgeId: choice.pathLink.id,
            conditions: groupResult.conditionResults,
            groupOperator: groupResult.group.operator,
            groupResult: groupResult.passed
          });
        }
      }

      // Посещаем нарративный узел напрямую
      return this.visitNode(choice.id);
    }

    return null;
  }

  // Для тестирования можно переопределить этот метод
  protected getRandom(max: number): number {
    return Math.floor(Math.random() * max);
  }

  /**
   * Двигает историю вперед от текущего узла
   * Автоматически определяет тип перехода и управляет историей
   */
  moveForward(currentNodeId: string, forceMove: boolean = false): Node | null {
    if (!this.storyData) {
      return null;
    }

    // Сначала проверяем наличие виртуального выбора "Продолжить"
    // используя getAvailableChoices, который теперь работает с PathResolver
    const choices = this.getAvailableChoices(currentNodeId);

    // Проверяем, является ли узел первым в истории (при первой инициализации или после рестарта)
    // Блокируем автоматический переход если это первый узел и не требуется принудительный переход
    const isFirstNode = this.gameState.history.length === 1 && this.gameState.history[0] === currentNodeId;

    // Если это первый узел (при первой инициализации или после рестарта) и не требуется принудительный переход,
    // просто возвращаем обычный узел, чтобы кнопка "Продолжить" была активна
    if (isFirstNode && !forceMove) {
      return this.getNodeById(currentNodeId);
    }

    // Если есть только один виртуальный выбор "Продолжить"
    if (choices.length === 1 && choices[0].isVirtual) {
      const choice = choices[0];

      // Логируем кешированные результаты проверки условий
      if (choice.pathLink && choice.evaluationCache && choice.evaluationCache.has(choice.pathLink.id)) {
        const cachedResult = choice.evaluationCache.get(choice.pathLink.id)!;

        // Логируем каждую группу условий и их результаты
        for (const groupResult of cachedResult.groupResults) {
          // Логируем каждое условие в группе
          for (const conditionResult of groupResult.conditionResults) {
            this.eventEmitter.emit({
              type: 'condition.evaluated',
              timestamp: Date.now(),
              nodeId: currentNodeId,
              edgeId: choice.pathLink.id,
              condition: conditionResult.condition,
              result: conditionResult.result,
              groupOperator: groupResult.group.operator
            });
          }

          // Логируем результат группы
          this.eventEmitter.emit({
            type: 'condition.group.evaluated',
            timestamp: Date.now(),
            nodeId: currentNodeId,
            edgeId: choice.pathLink.id,
            conditions: groupResult.conditionResults,
            groupOperator: groupResult.group.operator,
            groupResult: groupResult.passed
          });
        }
      }

      // Посещаем нарративный узел напрямую
      return this.visitNode(choice.id);
    }

    // Если нет виртуального выбора, используем обычное определение следующего узла
    // теперь с PathResolver через getNextNode
    const nextNode = this.getNextNode(currentNodeId);

    if (!nextNode) {
      return null;
    }

    // Если следующий узел - выбор, просто возвращаем его (не посещаем)
    if (nextNode.type === 'choice') {
      return nextNode;
    }

    // Если следующий узел - нарративный, посещаем его
    if (nextNode.type === 'narrative') {
      return this.visitNode(nextNode.id);
    }

    // Для других типов узлов
    return nextNode;
  }

  /**
   * Вспомогательный метод для получения узла по ID
   */
  private getNodeById(nodeId: string): Node | null {
    if (!this.storyData) {
      return null;
    }

    const {nodes} = this.storyData.data;
    return nodes.find((n) => n.id === nodeId) || null;
  }

  /**
   * Устанавливает значение переменной
   * @param variableId ID переменной
   * @param value Новое значение переменной
   */
  setVariable(variableId: string, value: string | number | boolean): void {
    if (!this.gameState.variables[variableId]) {
      console.warn(`Переменная с ID ${variableId} не найдена`);
      return;
    }

    // Обновляем значение переменной
    this.gameState.variables[variableId].value = value;
  }

  /**
   * Устанавливает значение переменной вручную, без добавления в историю операций
   * Изменение не будет откатываться при goBack
   * @param variableId ID переменной
   * @param value Новое значение переменной
   */
  setVariableManually(variableId: string, value: string | number | boolean): void {
    if (!this.gameState.variables[variableId]) {
      console.warn(`Переменная с ID ${variableId} не найдена`);
      return;
    }

    // Обновляем значение переменной напрямую
    this.gameState.variables[variableId].value = value;
  }

  /**
   * Возвращает EventEmitter для подписки на события движка
   */
  getEventEmitter(): EngineEventEmitter {
    return this.eventEmitter;
  }
}
