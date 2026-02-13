import type {AppRouterInstance} from 'next/dist/shared/lib/app-router-context.shared-runtime';

import {useGraphStore} from '@store/useGraphStore';

import {getNotificationManager} from '@components/Notifications';

import {getCurrentTimelineId} from '../utils/getCurrentTimelineId';
import {buildEditorPath} from '../utils/navigation';
import {generateAndSaveOperation} from './operationUtils';

/**
 * Метаданные для команд
 */
export interface CommandMetadata {
  timestamp: number; // Время создания команды
  description?: string; // Описание команды для истории
  details?: Record<string, any>; // Дополнительные данные для отображения в истории
  layerId?: string; // Идентификатор слоя, в котором была создана команда
}

/**
 * Базовый интерфейс для команд
 */
export interface Command {
  execute(): void;
  undo(): void;
  redo(): void;
  canSafelyUndo?(): boolean; // Опциональный метод для проверки безопасности отмены
  canSafelyRedo?(): boolean; // Опциональный метод для проверки безопасности повтора
  getMetadata?(): CommandMetadata; // Метод для получения метаданных команды для отображения в истории
  getLayerId?(): string; // Метод для получения идентификатора слоя, к которому относится команда
  getType?(): string; // Метод для получения типа команды, не зависящий от минификации
}

/**
 * Класс для управления историей команд (Undo/Redo)
 */
export class CommandHistory {
  private static instance: CommandHistory;
  private undoStack: Command[] = [];
  private redoStack: Command[] = [];
  private maxHistorySize = 100;
  private router: AppRouterInstance;
  private projectId: string | undefined;

  private constructor(router: AppRouterInstance, projectId?: string) {
    this.router = router;
    this.projectId = projectId;
  }

  /**
   * Получить единственный экземпляр класса (Singleton)
   */
  public static getInstance(router: AppRouterInstance, projectId?: string): CommandHistory {
    if (!CommandHistory.instance) {
      CommandHistory.instance = new CommandHistory(router, projectId);
    }
    return CommandHistory.instance;
  }

  /**
   * Проверяет, безопасно ли выполнять операции и находится ли пользователь
   * в правильном слое для выполнения команды
   */
  private isCommandInCurrentLayer(command: Command): boolean {
    const graphStore = useGraphStore.getState();
    const currentGraphId = graphStore.currentGraphId;

    // Если команда имеет метод getLayerId, используем его
    if (typeof command.getLayerId === 'function') {
      const commandLayerId = command.getLayerId();

      // Если команда относится к другому слою и это не корневой слой
      if (commandLayerId && commandLayerId !== currentGraphId) {
        console.warn(`Невозможно выполнить операцию, так как вы находитесь в слое ${currentGraphId}, а операция относится к слою ${commandLayerId}`);

        // Получаем название слоя для отображения
        const layerName = this.getLayerNameById(commandLayerId) || commandLayerId;

        // Формируем путь с учетом timeline
        const timelineId = getCurrentTimelineId();
        const path = this.projectId && timelineId ? buildEditorPath(this.projectId, timelineId, commandLayerId === 'root' ? undefined : commandLayerId) : '#';

        getNotificationManager().showErrorWithNavigation(
          `Can't perform the operation because you are in a different layer. Please navigate to layer "${layerName}" and try again.`,
          'Open layer',
          path
        );

        return false;
      }
    }

    // Если команда имеет метаданные с layerId, проверим их
    if (command.getMetadata && command.getMetadata().layerId) {
      const commandLayerId = command.getMetadata().layerId;

      // Если команда относится к другому слою и это не корневой слой
      if (commandLayerId && commandLayerId !== currentGraphId) {
        console.warn(`Невозможно выполнить операцию, так как вы находитесь в слое ${currentGraphId}, а операция относится к слою ${commandLayerId}`);

        // Получаем название слоя для отображения
        const layerName = this.getLayerNameById(commandLayerId) || commandLayerId;

        // Формируем путь с учетом timeline
        const timelineId = getCurrentTimelineId();
        const path = this.projectId && timelineId ? buildEditorPath(this.projectId, timelineId, commandLayerId === 'root' ? undefined : commandLayerId) : '#';

        getNotificationManager().showErrorWithNavigation(
          `Can't perform the operation because you are in a different layer. Please navigate to layer "${layerName}" and try again.`,
          'Open layer',
          path
        );

        return false;
      }
    }

    return true;
  }

  /**
   * Получает название слоя по его ID
   */
  private getLayerNameById(layerId: string): string | null {
    const graphStore = useGraphStore.getState();

    // Если это корневой слой
    if (layerId === 'root') {
      return 'Main layer';
    }

    // Получаем слой по ID
    const layer = graphStore.layers[layerId];
    if (layer && layer.name) {
      return layer.name;
    }

    // Ищем слой в списке узлов всех слоев
    for (const currentLayerId in graphStore.layers) {
      const currentLayer = graphStore.layers[currentLayerId];
      const layerNode = currentLayer.nodes[layerId];

      if (layerNode && layerNode.type === 'layer' && 'name' in layerNode) {
        return layerNode.name;
      }
    }

    return null;
  }

  /**
   * Проверяет, безопасно ли выполнять отмену операций
   * Этот метод проверяет состояние приложения, а не конкретную команду
   */
  private isUndoSafe(): boolean {
    const graphStore = useGraphStore.getState();
    const currentGraphId = graphStore.currentGraphId;

    // Проверяем, существует ли текущий слой
    const currentLayerExists = !!graphStore.layers[currentGraphId];

    if (!currentLayerExists && currentGraphId !== 'root') {
      getNotificationManager().showError(`Can't undo the operation because you are in a non-existent layer. Please navigate to the main layer or another existing layer and try again.`);
      return false;
    }

    return true;
  }

  /**
   * Добавить и выполнить команду
   */
  public executeCommand(command: Command): void {
    // Добавляем метаданные с временной меткой и текущим слоем, если их еще нет
    if (!command.getMetadata) {
      const originalCommand = command;
      const graphStore = useGraphStore.getState();
      const currentGraphId = graphStore.currentGraphId;

      command = Object.assign(Object.create(Object.getPrototypeOf(command)), command);
      command.getMetadata = function () {
        return {
          timestamp: Date.now(),
          description: originalCommand.constructor.name.replace('Command', ''),
          layerId: currentGraphId // Сохраняем слой, в котором была создана команда
        };
      };

      // Добавляем метод getLayerId, если его нет
      if (!command.getLayerId) {
        command.getLayerId = function () {
          return currentGraphId;
        };
      }
    }

    // Добавляем метод getType, если его нет
    if (!command.getType) {
      const originalCommand = command;
      command.getType = function () {
        // Используем имя конструктора без 'Command' в качестве типа
        return originalCommand.constructor.name.replace('Command', '');
      };
    }

    command.execute();
    this.undoStack.push(command);

    // Очистка стека Redo, так как история "ветвится" в новом направлении
    this.redoStack = [];

    // Если история превышает максимальный размер, удаляем самые старые записи
    if (this.undoStack.length > this.maxHistorySize) {
      this.undoStack.shift();
    }
  }

  /**
   * Отменить последнюю команду
   */
  public undo(): void {
    if (this.undoStack.length > 0) {
      // Сначала проверяем общее состояние безопасности отмены
      if (!this.isUndoSafe()) {
        return;
      }

      const command = this.undoStack[this.undoStack.length - 1];

      // Проверяем, находится ли пользователь в слое, к которому относится команда
      if (!this.isCommandInCurrentLayer(command)) {
        return;
      }

      // Проверяем безопасность отмены на уровне команды
      if (typeof command.canSafelyUndo === 'function') {
        const safeToUndo = command.canSafelyUndo();

        if (!safeToUndo) {
          return;
        }
      }

      // Удаляем команду из стека undo только после успешной проверки безопасности
      this.undoStack.pop();
      command.undo();
      this.redoStack.push(command);

      // Генерируем операцию для undo
      // TODO: проверить, нужно ли генерировать операции для undo
      // if (this.projectId && command.getType) {
      //   const commandType = command.getType();
      //   const metadata = command.getMetadata ? command.getMetadata() : {};
      //   const graphStore = useGraphStore.getState();
      //   const timelineId = getCurrentTimelineId();
      //   const layerId = command.getLayerId ? command.getLayerId() : graphStore.currentGraphId;

      // generateAndSaveOperation(
      //   `${commandType}.undo`,
      //   {
      //     command: {
      //       type: commandType,
      //       metadata: metadata
      //     }
      //   },
      //   this.projectId,
      //   timelineId,
      //   layerId
      // );
      // }
    }
  }

  /**
   * Повторить последнюю отмененную команду
   */
  public redo(): void {
    if (this.redoStack.length > 0) {
      // Сначала проверяем общее состояние безопасности повтора
      if (!this.isUndoSafe()) {
        return;
      }

      const command = this.redoStack[this.redoStack.length - 1];

      // Проверяем, находится ли пользователь в слое, к которому относится команда
      if (!this.isCommandInCurrentLayer(command)) {
        return;
      }

      // Проверяем безопасность повтора на уровне команды, если такой метод есть
      if (typeof command.canSafelyRedo === 'function') {
        const safeToRedo = command.canSafelyRedo();

        if (!safeToRedo) {
          return;
        }
      }

      this.redoStack.pop();
      command.redo();
      this.undoStack.push(command);

      // Генерируем операцию для redo
      // TODO: проверить, нужно ли генерировать операции для redo
      // if (this.projectId && command.getType) {
      //   const commandType = command.getType();
      //   const metadata = command.getMetadata ? command.getMetadata() : {};
      //   const graphStore = useGraphStore.getState();
      //   const timelineId = getCurrentTimelineId();
      //   const layerId = command.getLayerId ? command.getLayerId() : graphStore.currentGraphId;

      //   generateAndSaveOperation(
      //     `${commandType}.redo`,
      //     {
      //       command: {
      //         type: commandType,
      //         metadata: metadata
      //       }
      //     },
      //     this.projectId,
      //     timelineId,
      //     layerId
      //   );
      // }
    }
  }

  /**
   * Очистить историю команд
   */
  public clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }

  /**
   * Проверка доступности отмены
   */
  public canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  /**
   * Проверка доступности повтора
   */
  public canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /**
   * Получить текущую историю команд
   */
  public getHistory(): {undo: Command[]; redo: Command[]} {
    return {
      undo: [...this.undoStack],
      redo: [...this.redoStack]
    };
  }

  /**
   * Получить стек команд для отмены
   */
  public getUndoStack(): Command[] {
    return [...this.undoStack];
  }

  /**
   * Получить стек команд для повтора
   */
  public getRedoStack(): Command[] {
    return [...this.redoStack];
  }

  /**
   * Добавить команду в историю без выполнения
   * Используется когда команда уже была выполнена
   */
  public addCommandWithoutExecution(command: Command): void {
    // Добавляем метаданные с временной меткой и текущим слоем, если их еще нет
    if (!command.getMetadata) {
      const originalCommand = command;
      const graphStore = useGraphStore.getState();
      const currentGraphId = graphStore.currentGraphId;

      command = Object.assign(Object.create(Object.getPrototypeOf(command)), command);
      command.getMetadata = function () {
        return {
          timestamp: Date.now(),
          description: originalCommand.constructor.name.replace('Command', ''),
          layerId: currentGraphId // Сохраняем слой, в котором была создана команда
        };
      };

      // Добавляем метод getLayerId, если его нет
      if (!command.getLayerId) {
        command.getLayerId = function () {
          return currentGraphId;
        };
      }
    }

    // Добавляем метод getType, если его нет
    if (!command.getType) {
      const originalCommand = command;
      command.getType = function () {
        // Используем имя конструктора без 'Command' в качестве типа
        return originalCommand.constructor.name.replace('Command', '');
      };
    }

    this.undoStack.push(command);

    // Очистка стека Redo, так как история "ветвится" в новом направлении
    this.redoStack = [];

    // Если история превышает максимальный размер, удаляем самые старые записи
    if (this.undoStack.length > this.maxHistorySize) {
      this.undoStack.shift();
    }
  }
}

// Вспомогательная функция для доступа к командам из разных частей приложения
export const getCommandHistory = (router: AppRouterInstance, projectId?: string): CommandHistory => {
  return CommandHistory.getInstance(router, projectId);
};
