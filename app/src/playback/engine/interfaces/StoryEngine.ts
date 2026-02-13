/**
 * Интерфейс движка истории
 * Определяет основные методы для работы с историей
 */
import {Choice, ChoiceNode, NarrativeNode, Node} from '@types-folder/nodes';
import {Variable} from '@types-folder/variables';

import {StoryData} from '../core/StoryData';
import {EngineEventEmitter} from '../events/EngineEvents';

// GameState и StoryData импортируем напрямую
interface GameState {
  variables: Record<string, Variable>;
  visitedNodes: Set<string>;
  history: string[];
  displayHistory: Node[];
}

export interface StoryEngine {
  /**
   * Инициализирует движок данными истории
   */
  initialize(storyData: StoryData): void;

  /**
   * Возвращает данные истории
   */
  getStoryData(): StoryData | null;

  /**
   * Возвращает стартовый узел истории
   */
  getStartNode(): Node | null;

  /**
   * Возвращает следующий узел после текущего
   * (учитывая приоритеты и условия)
   */
  getNextNode(currentNodeId: string): Node | null;

  /**
   * Посещает узел: добавляет его в историю и выполняет операции
   * Используется для нарративных узлов
   */
  visitNode(nodeId: string): Node | null;

  /**
   * Обрабатывает прямой переход между нарративными узлами
   * (когда у игрока нет реального выбора)
   */
  handleDirectNarrativeTransition(nodeId: string): Node | null;

  /**
   * Двигает историю вперед от текущего узла
   * Автоматически определяет тип перехода и управляет историей
   * @param currentNodeId ID текущего узла
   * @param forceMove Если true, всегда выполнять переход (даже после рестарта)
   */
  moveForward(currentNodeId: string, forceMove?: boolean): Node | null;

  /**
   * Выполняет действие по выбору и возвращает следующий узел
   */
  executeChoice(choiceId: string): Node | null;

  /**
   * Возвращает все доступные выборы для текущего узла
   */
  getAvailableChoices(nodeId: string): Choice[];

  /**
   * Возвращает текущее состояние игры
   */
  getState(): GameState;

  /**
   * Возвращается на предыдущий узел (если есть история)
   */
  goBack(): Node | null;

  /**
   * Перезапускает историю с начала
   */
  restart(): Node | null;

  /**
   * Возвращает историю узлов для отображения
   * В режиме "novel" вернет только текущий узел
   * В режиме "waterfall" вернет все узлы для отображения
   */
  getDisplayHistory(mode: 'novel' | 'waterfall', currentNode: Node): Node[];

  /**
   * Добавляет узел выбора в историю отображения
   * Используется для добавления отображаемого выбора перед переходом к следующему узлу
   */
  addChoiceToDisplayHistory(choice: Choice): void;

  /**
   * Обновляет историю отображения при навигации назад
   * Возвращает новую историю отображения
   */
  updateDisplayHistoryOnBack(mode: 'novel' | 'waterfall'): Node[];

  /**
   * Проверяет, является ли узел нарративным
   */
  isNarrativeNode(node: Node): node is NarrativeNode;

  /**
   * Проверяет, является ли узел выбором
   */
  isChoiceNode(node: Node): node is ChoiceNode;

  /**
   * Получает текущий узел на основе истории
   * Полезно для синхронизации состояния
   */
  getCurrentNode(): Node | null;

  /**
   * Устанавливает значение переменной
   * @param variableId ID переменной
   * @param value Новое значение переменной
   */
  setVariable(variableId: string, value: string | number | boolean): void;

  /**
   * Устанавливает значение переменной вручную, без добавления в историю операций
   * Изменение не будет откатываться при goBack
   * @param variableId ID переменной
   * @param value Новое значение переменной
   */
  setVariableManually(variableId: string, value: string | number | boolean): void;

  /**
   * Возвращает EventEmitter для подписки на события движка
   */
  getEventEmitter(): EngineEventEmitter;
}
