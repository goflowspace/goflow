import {create} from 'zustand';
import {devtools} from 'zustand/middleware';

/**
 * Хранилище для управления состоянием редактирования узлов.
 * Позволяет глобально управлять режимами редактирования узлов,
 * например, деактивировать все режимы редактирования при создании новых узлов.
 */
interface EditingState {
  // Массив ID узлов, которые в данный момент находятся в режиме редактирования
  nodesInEditMode: string[];

  // Функция для регистрации узла в режиме редактирования
  registerEditingNode: (nodeId: string) => void;

  // Функция для удаления узла из режима редактирования
  unregisterEditingNode: (nodeId: string) => void;

  // Функция для получения списка обработчиков деактивации
  // Используется как уровень косвенности, чтобы не связывать напрямую хуки с этим хранилищем
  deactivationHandlers: Record<string, () => void>;

  // Добавление обработчика деактивации для конкретного узла
  addDeactivationHandler: (nodeId: string, handler: () => void) => void;

  // Удаление обработчика деактивации
  removeDeactivationHandler: (nodeId: string) => void;

  // Функция для деактивации всех режимов редактирования
  deactivateAllEditingModes: () => void;
}

export const useEditingStore = create<EditingState>()(
  devtools(
    (set, get) => ({
      nodesInEditMode: [],
      deactivationHandlers: {},

      registerEditingNode: (nodeId) => {
        set((state) => ({
          nodesInEditMode: [...state.nodesInEditMode, nodeId]
        }));
      },

      unregisterEditingNode: (nodeId) => {
        set((state) => ({
          nodesInEditMode: state.nodesInEditMode.filter((id) => id !== nodeId)
        }));
      },

      addDeactivationHandler: (nodeId, handler) => {
        set((state) => ({
          deactivationHandlers: {
            ...state.deactivationHandlers,
            [nodeId]: handler
          }
        }));
      },

      removeDeactivationHandler: (nodeId) => {
        set((state) => {
          const newHandlers = {...state.deactivationHandlers};
          delete newHandlers[nodeId];
          return {
            deactivationHandlers: newHandlers
          };
        });
      },

      deactivateAllEditingModes: () => {
        const {deactivationHandlers} = get();

        // Вызываем все зарегистрированные обработчики деактивации
        Object.values(deactivationHandlers).forEach((handler) => {
          if (typeof handler === 'function') {
            handler();
          }
        });

        // Очищаем список узлов в режиме редактирования
        set({
          nodesInEditMode: []
        });
      }
    }),
    {name: 'editing-store'}
  )
);
