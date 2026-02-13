/**
 * Интерфейс рендерера истории
 * Определяет методы для отображения узлов и выборов
 */
import {Choice, Node} from '../../../types/nodes';
import {StoryEngine} from './StoryEngine';

export interface StoryRenderer {
  /**
   * Отображает узел
   */
  renderNode(node: Node, engine: StoryEngine): void;

  /**
   * Отображает варианты выбора
   */
  renderChoices(choices: Choice[], engine: StoryEngine): void;

  /**
   * Отображает сообщение об окончании истории или ошибке
   */
  renderMessage(message: string): void;

  /**
   * Обновляет состояние кнопок навигации (назад, перезапуск)
   */
  updateNavigation(canGoBack: boolean): void;
}
