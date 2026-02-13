import {trackTimelineCreated, trackTimelineDeleted, trackTimelineRenamed} from '@services/analytics';
import {api} from '@services/api';
import {deleteTimelinePlaybackData} from '@services/dbService';
import {ProjectDataService} from '@services/projectDataService';
import {Timeline} from '@types-folder/timelines';
import {create} from 'zustand';
import {devtools, subscribeWithSelector} from 'zustand/middleware';

import {useGraphStore} from '@store/useGraphStore';

import {generateAndSaveOperation} from '../commands/operationUtils';

interface TimelinesStore {
  timelines: Timeline[];
  currentTimelineId: string;
  loading: boolean;
  error: string | null;

  // API операции с таймлайнами
  loadProjectTimelines: (projectId: string) => Promise<void>;
  createTimeline: (projectId: string, name: string, description?: string) => Promise<string>;
  deleteTimeline: (projectId: string, id: string) => Promise<boolean>;
  duplicateTimeline: (id: string, newName: string) => Promise<string>;
  renameTimeline: (projectId: string, id: string, newName: string) => Promise<void>;
  switchTimeline: (id: string) => void;

  // Синхронизация с GraphStore при переключении
  syncWithGraphStore: () => void;

  // Вспомогательные методы
  getTimelineById: (id: string) => Timeline | undefined;
  getActiveTimeline: () => Timeline | undefined;
  canDeleteTimeline: (id: string) => boolean;

  // Инициализация (для совместимости со старым кодом)
  initializeTimelines: (projectData?: any) => void;

  // Получение данных для сохранения
  getTimelinesData: () => Timeline[];

  // Утилиты
  clearError: () => void;
  setLoading: (loading: boolean) => void;
  getMainTimelineId: () => string; // Получить ID основного таймлайна (MongoDB ObjectId)
}

export const useTimelinesStore = create<TimelinesStore>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      timelines: [],
      currentTimelineId: '', // Пустой ID до загрузки таймлайнов
      loading: false,
      error: null,

      // Загрузить таймлайны проекта с сервера
      loadProjectTimelines: async (projectId: string) => {
        set({loading: true, error: null});

        try {
          const timelines = await api.getProjectTimelines({projectId});

          // Конвертируем API Timeline в локальный Timeline
          const localTimelines: Timeline[] = timelines.map((t) => ({
            id: t.id,
            name: t.name,
            createdAt: new Date(t.createdAt).getTime(),
            isActive: t.isActive
          }));

          // Определяем активный таймлайн
          const activeTimeline = localTimelines.find((t) => t.isActive) || localTimelines[0];
          const newCurrentTimelineId = activeTimeline ? activeTimeline.id : '';

          set({
            timelines: localTimelines,
            currentTimelineId: newCurrentTimelineId,
            loading: false
          });
        } catch (error) {
          console.error('Failed to load project timelines:', error);
          set({
            error: error instanceof Error ? error.message : 'Failed to load timelines',
            loading: false
          });
        }
      },

      createTimeline: async (projectId: string, name: string, description?: string) => {
        set({loading: true, error: null});

        try {
          const createdTimeline = await api.createTimeline({
            projectId,
            name: name.trim() || 'Untitled Timeline',
            description
          });

          // Конвертируем API Timeline в локальный Timeline
          const newTimeline: Timeline = {
            id: createdTimeline.id,
            name: createdTimeline.name,
            createdAt: new Date(createdTimeline.createdAt).getTime(),
            isActive: createdTimeline.isActive
          };

          // Получаем текущее количество таймлайнов до добавления нового
          const currentTimelinesCount = get().timelines.length;
          const timelineIndex = currentTimelinesCount + 1; // Номер нового таймлайна

          set((state) => ({
            timelines: [...state.timelines, newTimeline],
            loading: false
          }));

          // Трекинг создания таймлайна
          trackTimelineCreated(projectId, timelineIndex);

          // 🚀 КОЛЛАБОРАЦИЯ: Генерируем операцию для синхронизации с другими пользователями
          try {
            generateAndSaveOperation(
              'timeline.created',
              {
                timelineId: createdTimeline.id,
                timeline: {
                  id: newTimeline.id,
                  name: newTimeline.name,
                  createdAt: newTimeline.createdAt,
                  isActive: newTimeline.isActive
                }
              },
              projectId,
              createdTimeline.id, // Используем ID нового таймлайна как contextual timeline
              'root'
            );
            console.log('✅ [TimelinesStore] Generated timeline.created operation for collaboration');
          } catch (operationError) {
            console.warn('⚠️ [TimelinesStore] Failed to generate timeline.created operation:', operationError);
            // Не прерываем создание таймлайна из-за ошибки операции
          }

          return createdTimeline.id;
        } catch (error) {
          console.error('Failed to create timeline:', error);
          set({
            error: error instanceof Error ? error.message : 'Failed to create timeline',
            loading: false
          });
          throw error;
        }
      },

      deleteTimeline: async (projectId: string, id: string) => {
        const {timelines, currentTimelineId, canDeleteTimeline} = get();

        // Проверяем, можно ли удалить таймлайн
        if (!canDeleteTimeline(id)) {
          console.warn('Cannot delete timeline: either it is the last timeline or it does not exist');
          return false;
        }

        set({loading: true, error: null});

        try {
          // Удаляем таймлайн через API
          await api.deleteTimeline(id);

          // Удаляем данные таймлайна из IndexedDB
          try {
            await ProjectDataService.deleteTimelineFromIndexedDB(projectId, id);
            console.log(`Timeline ${id} data removed from IndexedDB`);
          } catch (indexedDbError) {
            console.warn('Failed to remove timeline data from IndexedDB:', indexedDbError);
            // Не прерываем процесс удаления из-за ошибки IndexedDB
          }

          // Удаляем связанные playback данные
          try {
            await deleteTimelinePlaybackData(projectId, id);
            console.log(`Timeline ${id} playback data removed from IndexedDB`);
          } catch (playbackError) {
            console.warn('Failed to remove timeline playback data:', playbackError);
            // Не прерываем процесс удаления из-за ошибки playback данных
          }

          // Если удаляемый таймлайн активный, переключаемся на другой
          let newCurrentTimelineId = currentTimelineId;
          if (currentTimelineId === id) {
            const remainingTimelines = timelines.filter((t) => t.id !== id);
            newCurrentTimelineId = remainingTimelines[0]?.id || '';
          }

          set((state) => ({
            timelines: state.timelines.filter((t) => t.id !== id),
            currentTimelineId: newCurrentTimelineId,
            loading: false
          }));

          // Синхронизируем с GraphStore после обновления currentTimelineId
          if (newCurrentTimelineId !== currentTimelineId) {
            console.log('🔄 TimelinesStore: Syncing with GraphStore after deletion:', newCurrentTimelineId);
            // Используем setTimeout чтобы синхронизация произошла после обновления состояния
            setTimeout(() => {
              get().syncWithGraphStore();
            }, 0);
          }

          // Трекинг удаления таймлайна
          trackTimelineDeleted(projectId);

          // 🚀 КОЛЛАБОРАЦИЯ: Генерируем операцию для синхронизации с другими пользователями
          try {
            const deletedTimeline = timelines.find((t) => t.id === id);
            if (deletedTimeline) {
              generateAndSaveOperation(
                'timeline.deleted',
                {
                  timeline: {
                    id: deletedTimeline.id,
                    name: deletedTimeline.name,
                    createdAt: deletedTimeline.createdAt,
                    isActive: deletedTimeline.isActive
                  },
                  switchedToTimelineId: newCurrentTimelineId // Дополнительная информация для фронтенда
                },
                projectId,
                newCurrentTimelineId || id, // Контекст переключения
                'root'
              );
              console.log('✅ [TimelinesStore] Generated timeline.deleted operation for collaboration');
            }
          } catch (operationError) {
            console.warn('⚠️ [TimelinesStore] Failed to generate timeline.deleted operation:', operationError);
            // Не прерываем удаление таймлайна из-за ошибки операции
          }

          return true;
        } catch (error) {
          console.error('Failed to delete timeline:', error);
          set({
            error: error instanceof Error ? error.message : 'Failed to delete timeline',
            loading: false
          });
          return false;
        }
      },

      duplicateTimeline: async (id: string, newName: string) => {
        const {timelines} = get();
        const sourceTimeline = timelines.find((t) => t.id === id);

        if (!sourceTimeline) {
          console.warn(`Timeline with id ${id} not found for duplication`);
          return '';
        }

        set({loading: true, error: null});

        try {
          const duplicatedTimeline = await api.duplicateTimeline(id, newName.trim() || `${sourceTimeline.name} Copy`);

          // Конвертируем API Timeline в локальный Timeline
          const newTimeline: Timeline = {
            id: duplicatedTimeline.id,
            name: duplicatedTimeline.name,
            createdAt: new Date(duplicatedTimeline.createdAt).getTime(),
            isActive: duplicatedTimeline.isActive
          };

          set((state) => ({
            timelines: [...state.timelines, newTimeline],
            loading: false
          }));

          return duplicatedTimeline.id;
        } catch (error) {
          console.error('Failed to duplicate timeline:', error);
          set({
            error: error instanceof Error ? error.message : 'Failed to duplicate timeline',
            loading: false
          });
          return '';
        }
      },

      renameTimeline: async (projectId: string, id: string, newName: string) => {
        const trimmedName = newName.trim();
        if (!trimmedName) {
          console.warn('Timeline name cannot be empty');
          return;
        }

        const {timelines} = get();
        const oldTimeline = timelines.find((t) => t.id === id);
        if (!oldTimeline) {
          console.warn('Timeline not found for renaming:', id);
          return;
        }

        set({loading: true, error: null});

        try {
          const updatedTimeline = await api.updateTimeline(id, {name: trimmedName});

          set((state) => ({
            timelines: state.timelines.map((timeline) => (timeline.id === id ? {...timeline, name: updatedTimeline.name} : timeline)),
            loading: false
          }));

          // Трекинг переименования таймлайна
          trackTimelineRenamed(projectId);
        } catch (error) {
          console.error('Failed to rename timeline:', error);
          set({
            error: error instanceof Error ? error.message : 'Failed to rename timeline',
            loading: false
          });
        }
      },

      switchTimeline: (id: string) => {
        const {timelines} = get();
        const targetTimeline = timelines.find((t) => t.id === id);

        if (!targetTimeline) {
          console.warn(
            `Timeline with id ${id} not found in TimelinesStore. Available timelines:`,
            timelines.map((t) => t.id)
          );

          // Если таймлайн не найден, но есть другие таймлайны, переключаемся на первый
          if (timelines.length > 0) {
            const firstTimeline = timelines[0];
            console.log(`🔄 Switching to first available timeline: ${firstTimeline.id}`);

            set((state) => ({
              currentTimelineId: firstTimeline.id,
              timelines: state.timelines.map((timeline) => ({
                ...timeline,
                isActive: timeline.id === firstTimeline.id
              }))
            }));
          }
          return;
        }

        set((state) => ({
          currentTimelineId: id,
          timelines: state.timelines.map((timeline) => ({
            ...timeline,
            isActive: timeline.id === id
          }))
        }));
      },

      syncWithGraphStore: () => {
        // Импортируем GraphStore динамически, чтобы избежать циклических зависимостей
        const {currentTimelineId} = get();

        // Синхронизируем текущий таймлайн с GraphStore только если есть реальная необходимость
        const graphStore = useGraphStore.getState();
        if (graphStore.currentTimelineId !== currentTimelineId && currentTimelineId) {
          console.log('🔄 TimelinesStore: Syncing with GraphStore:', currentTimelineId);
          graphStore.switchToTimeline(currentTimelineId);
        }
      },

      getTimelineById: (id: string) => {
        const {timelines} = get();
        return timelines.find((t) => t.id === id);
      },

      getActiveTimeline: () => {
        const {timelines, currentTimelineId} = get();
        return timelines.find((t) => t.id === currentTimelineId);
      },

      canDeleteTimeline: (id: string) => {
        const {timelines} = get();

        // Нельзя удалить, если таймлайн не существует
        const timelineExists = timelines.some((t) => t.id === id);
        if (!timelineExists) return false;

        // Нельзя удалить последний таймлайн
        return timelines.length > 1;
      },

      initializeTimelines: (projectData?: any) => {
        console.log('🎯 TimelinesStore: initializeTimelines called with:', projectData);

        const {timelines: currentTimelines} = get();

        // Если таймлайны уже загружены через API и имеют актуальные данные,
        // не перезаписываем их данными из IndexedDB (для обратной совместимости)
        if (currentTimelines.length > 0) {
          console.log('⚠️ TimelinesStore: Timelines already loaded via API, skipping initialization from IndexedDB');
          return;
        }

        let initialTimelines: Timeline[] = [];
        let initialCurrentTimelineId = '';

        // Если есть готовые метаданные таймлайнов, используем их
        if (projectData?.timelinesMetadata && Array.isArray(projectData.timelinesMetadata)) {
          console.log('📋 Using timelinesMetadata:', projectData.timelinesMetadata);
          initialTimelines = projectData.timelinesMetadata;
          // Устанавливаем активный таймлайн
          const activeTimeline = initialTimelines.find((t) => t.isActive);
          if (activeTimeline) {
            initialCurrentTimelineId = activeTimeline.id;
            console.log('🎯 Active timeline found:', activeTimeline.id);
          }
        }
        // Если есть данные проекта с таймлайнами, но нет метаданных, создаем их
        else if (projectData?.timelines) {
          const timelineIds = Object.keys(projectData.timelines);
          console.log('⚙️ Creating timelines from IDs:', timelineIds);
          initialTimelines = timelineIds.map((id, index) => ({
            id,
            name: index === 0 ? 'Main Timeline' : `Timeline ${id.slice(-8)}`,
            createdAt: Date.now(),
            isActive: index === 0 // Первый таймлайн активный
          }));
        }

        // Если нет таймлайнов, не создаем никаких - они должны создаваться через API
        if (initialTimelines.length === 0) {
          console.log('⚠️ No timelines found, they should be loaded via API');
        }

        console.log('✅ Setting timelines:', {
          timelines: initialTimelines,
          currentTimelineId: initialCurrentTimelineId
        });

        set({
          timelines: initialTimelines,
          currentTimelineId: initialCurrentTimelineId
        });
      },

      getTimelinesData: () => {
        const {timelines} = get();
        return timelines;
      },

      // Утилитарные методы
      clearError: () => {
        set({error: null});
      },

      setLoading: (loading: boolean) => {
        set({loading});
      },

      getMainTimelineId: () => {
        const {timelines} = get();

        // Сначала ищем активный таймлайн
        const activeTimeline = timelines.find((t) => t.isActive);
        if (activeTimeline) {
          return activeTimeline.id;
        }

        // Если есть хотя бы один таймлайн, возвращаем первый
        if (timelines.length > 0) {
          return timelines[0].id;
        }

        // Если таймлайнов нет, возвращаем пустую строку
        return '';
      }
    })),
    {name: 'timelines-store'}
  )
);
