import {nanoid} from 'nanoid';
import {STORAGE_KEY} from 'src/utils/constants';
import {create} from 'zustand';
import {devtools, subscribeWithSelector} from 'zustand/middleware';

// Импортируем CommandManager
import {getCommandManager} from '../commands/CommandManager';
import {Variable, VariableType} from '../types/variables';
import {generateInternalName, transliterate} from '../utils/transliteration';
import {useGraphStore as importedGraphStore} from './useGraphStore';
import {useOperationsStore} from './useOperationsStore';

// Экспортируем функции для обратной совместимости
export {generateInternalName, transliterate};

interface VariablesStore {
  variables: Variable[];
  isVariablesPanelOpen: boolean;

  // Функции для работы с панелью переменных
  toggleVariablesPanel: () => void;

  // Функции для работы с переменными
  addVariable: (name: string, type: VariableType, value: string | number | boolean, description?: string, internalName?: string) => void;
  updateVariable: (id: string, updates: Partial<Omit<Variable, 'id'>>) => void;
  deleteVariable: (id: string) => void;

  // Интегрированное удаление переменной и всех связанных с ней элементов
  deleteVariableWithRelatedItems: (id: string) => void;

  // Функции для работы с хранилищем
  saveToLocalStorage: () => void;
  loadFromLocalStorage: () => void;

  // Функция для установки всех переменных из внешнего источника
  setVariables: (variables: Variable[]) => void;
}

// Объявление для предотвращения циклических импортов
let useGraphStore: any;

export const useVariablesStore = create<VariablesStore>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      variables: [],
      isVariablesPanelOpen: true,

      // Функции для работы с панелью переменных
      toggleVariablesPanel: () => set((state) => ({isVariablesPanelOpen: !state.isVariablesPanelOpen})),

      // Функции для работы с переменными
      addVariable: (name, type, value, description, internalName) => {
        const generatedInternalName = internalName || generateInternalName(name);
        const commandManager = getCommandManager();

        const newVariable: Variable = {
          id: nanoid(),
          name,
          internalName: generatedInternalName,
          type,
          value,
          description
        };

        commandManager.createVariable(newVariable);
      },

      updateVariable: (id, updates) => {
        const commandManager = getCommandManager();
        commandManager.updateVariable(id, updates);
      },

      deleteVariable: (id) => {
        const commandManager = getCommandManager();
        commandManager.deleteVariable(id);
      },

      // Интегрированное удаление переменной и всех связанных с ней элементов
      deleteVariableWithRelatedItems: (id) => {
        // Проверяем, существует ли переменная
        const variableExists = get().variables.some((v) => v.id === id);
        if (!variableExists) return;

        // Получаем информацию о переменной для логирования
        const variable = get().variables.find((v) => v.id === id);
        const commandManager = getCommandManager();
        commandManager.deleteVariable(id);

        // 1. Удаляем условия, которые используют переменную
        if (typeof window !== 'undefined') {
          // Используем importedGraphStore вместо useGraphStore
          importedGraphStore.getState().deleteConditionsWithVariable(id);
        }

        // 2. Удаляем операции, которые используют переменную
        useOperationsStore.getState().deleteOperationsByVariableId(id);

        // 3. Удаляем саму переменную
        set((state) => ({
          variables: state.variables.filter((v) => v.id !== id)
        }));

        // Сохраняем изменения
        get().saveToLocalStorage();
      },

      // Функции для работы с хранилищем
      saveToLocalStorage: () => {
        // Теперь сохранение происходит через централизованное хранилище в GraphStore
        if (typeof window !== 'undefined') {
          importedGraphStore.getState().saveToDb();
        }
      },

      loadFromLocalStorage: () => {
        if (typeof window !== 'undefined') {
          // Вместо загрузки из отдельного хранилища, загружаем из центрального хранилища
          const savedData = localStorage.getItem(STORAGE_KEY);

          if (savedData) {
            try {
              const parsedData = JSON.parse(savedData);
              if (parsedData.variables) {
                set({variables: parsedData.variables});
              }
            } catch (e) {
              console.error('Ошибка при загрузке переменных из localStorage:', e);
            }
          }
        }
      },

      // Функция для установки всех переменных
      setVariables: (variables: Variable[]) => {
        set({variables});
      }
    })),
    {name: 'variables-store'}
  )
);
