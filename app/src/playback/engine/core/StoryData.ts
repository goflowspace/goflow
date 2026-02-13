/**
 * Интерфейс структуры данных истории
 */
import {Edge, Node} from '@types-folder/nodes';
import {Variable} from '@types-folder/variables';

export interface StoryData {
  /**
   * Название истории
   */
  title: string;

  /**
   * Данные истории
   */
  data: {
    /**
     * Узлы истории
     */
    nodes: Node[];

    /**
     * Связи между узлами
     */
    edges: Edge[];

    /**
     * Переменные истории
     */
    variables: Variable[];
  };

  /**
   * Метаданные истории
   */
  metadata?: {
    /**
     * Временная метка создания/изменения
     */
    timestamp: string;

    /**
     * Версия формата
     */
    version: string;

    /**
     * Дополнительные метаданные
     */
    [key: string]: any;
  };
}
