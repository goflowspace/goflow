import React, {useRef, useState} from 'react';

import {useCurrentProject} from '@hooks/useCurrentProject';
import {trackProjectImport} from '@services/analytics';
import {api} from '@services/api';
import {ProjectDataService} from '@services/projectDataService';
import {KEY_HAS_SEEN_WELCOME_MODAL, KEY_INCLUDE_WELCOME_STORY, KEY_LANGUAGE, StorageService} from '@services/storageService';
import {useTranslation} from 'react-i18next';

import {useCanvasStore} from '@store/useCanvasStore';
import {useGraphStore} from '@store/useGraphStore';
import {useProjectStore} from '@store/useProjectStore';
import {useTimelinesStore} from '@store/useTimelinesStore';
import {useVariablesStore} from '@store/useVariablesStore';

import demoStoryData from '../data/demoStory.json';
import welcomeStoryDataEn from '../data/welcome_story_en.json';
import welcomeStoryDataRu from '../data/welcome_story_ru.json';
import {notificationService} from '../services/notificationService';
import {getAggregatedPlayParams} from '../utils/analyticsUtils';
import {importStoryFromJsonData} from '../utils/importStoryFromJsonData';
import {createDefaultLayerMetadata, createEmptyRootLayer} from '../utils/projectStateHelpers';
import {validateImportedData} from '../utils/validateImportedData';
import {extractZipImport, isGoFlowZipExport, mergeZipImportData} from '../utils/zipImport';

export const useFlowMenu = () => {
  const {i18n, t} = useTranslation();
  const {setProjectName} = useProjectStore();
  const {projectId} = useCurrentProject();
  const timelineId = useGraphStore.getState().currentTimelineId || 'undefined';

  const [exportModalOpen, setExportModalOpen] = useState(false);
  const importToProjectInputRef = useRef<HTMLInputElement>(null);

  // Функция для загрузки демо истории
  const handleLoadDemoStory = async () => {
    try {
      const output = importStoryFromJsonData(demoStoryData);

      if (!output) {
        throw new Error('Ошибка при загрузке демо истории');
      }

      const {projectTitle, projectLayers, variables} = output;

      // Собираем метрики для аналитики импорта демо-истории
      const metricsParams = getAggregatedPlayParams(projectLayers, variables, 'PlayBar');

      // Отправляем событие импорта проекта
      trackProjectImport(metricsParams, projectId || 'undefined', timelineId).catch((err) => {
        console.error('Error sending analytics event:', err);
      });

      // Показываем уведомление об успехе
      notificationService.showSuccess(t('import.demo_story_success', {projectTitle}));
    } catch (error) {
      console.error('Error loading demo story:', error);
      notificationService.showError(t('import.demo_story_error', {error: error instanceof Error ? error.message : String(error)}));
    }
  };

  // Функция для открытия приветственной истории
  const handleOpenWelcomeStory = () => {
    // Запрашиваем подтверждение у пользователя
    if (!window.confirm(t('dialogs.open_welcome_story_confirm'))) {
      return; // Прерываем выполнение, если пользователь отменил действие
    }

    try {
      // Сбрасываем текущие данные проекта перед добавлением приветственной истории
      // Создаем пустой слой
      const resetLayers = {
        root: createEmptyRootLayer()
      };

      // Сбрасываем хранилище графа
      useGraphStore.setState({
        layers: resetLayers,
        currentGraphId: 'root',
        hasLoadedFromStorage: true,
        lastLayerNumber: 0,
        layerMetadata: {
          root: createDefaultLayerMetadata()
        }
      });

      // Включаем флаг, отвечающий за добавление welcome-истории
      useProjectStore.setState({
        includeWelcomeStory: true
      });

      // Определяем текущий язык интерфейса и загружаем соответствующую версию истории
      const currentLanguage = i18n.language;
      const isRussian = currentLanguage === 'ru';
      const welcomeStoryData = isRussian ? welcomeStoryDataRu : welcomeStoryDataEn;

      // Вызываем функцию добавления welcome-истории
      importStoryFromJsonData(welcomeStoryData);

      // Сохраняем изменения в localStorage
      useGraphStore.getState().saveToDb();
      StorageService.setItem(KEY_INCLUDE_WELCOME_STORY, 'true');
    } catch (error) {
      console.error('Error loading welcome story:', error);
      notificationService.showError(t('dialogs.load_welcome_story_error', {error: error instanceof Error ? error.message : String(error)}));
    }
  };

  // Функция для изменения языка
  const changeLanguage = (langCode: string) => {
    // Сохраняем выбранный язык в localStorage перед перезагрузкой
    StorageService.setItem(KEY_LANGUAGE, langCode);

    // Перезагружаем страницу для полной перегидратации с новым языком
    window.location.reload();

    // Меняем язык в i18n (это будет применено после перезагрузки)
    i18n.changeLanguage(langCode);
  };

  // Функция для импорта в текущий проект
  const handleImportToProjectClick = () => {
    importToProjectInputRef.current?.click();
  };

  // Обработчик импорта в текущий проект
  const handleImportToProjectChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Проверяем тип файла - поддерживаем JSON и ZIP
    const isJson = file.type === 'application/json';
    const isZip = isGoFlowZipExport(file);

    if (!isJson && !isZip) {
      notificationService.showError(t('dialogs.select_json_or_zip_file', 'Выберите JSON или ZIP файл'));
      return;
    }

    const processImport = async () => {
      try {
        let importedData: any;

        if (isZip) {
          // Обрабатываем ZIP файл
          const zipResult = await extractZipImport(file);
          importedData = mergeZipImportData(zipResult);
        } else {
          // Обрабатываем JSON файл (старый способ)
          const reader = new FileReader();
          const jsonContent = await new Promise<string>((resolve, reject) => {
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file);
          });
          importedData = JSON.parse(jsonContent);
        }

        // Валидация структуры импортированного JSON
        if (!validateImportedData(importedData)) {
          notificationService.showError(t('dialogs.invalid_file_format'));
          return;
        }

        // Получаем ID текущего проекта
        const currentProjectId = projectId || ProjectDataService.getStatus().currentProjectId;

        if (!currentProjectId) {
          notificationService.showError(t('dialogs.no_active_project_for_import'));
          return;
        }

        // Показываем диалог подтверждения
        const confirmMessage = t('dialogs.import_to_project_confirm', {title: importedData.title});
        if (!window.confirm(confirmMessage)) {
          return;
        }

        try {
          // Получаем активный таймлайн
          let {currentTimelineId} = useTimelinesStore.getState();

          // Если currentTimelineId пустой (новый проект), загружаем таймлайны
          if (!currentTimelineId) {
            console.log('Loading timelines for import in new project...');
            await useTimelinesStore.getState().loadProjectTimelines(currentProjectId);

            // Получаем обновленный currentTimelineId
            const updatedState = useTimelinesStore.getState();
            currentTimelineId = updatedState.currentTimelineId;

            // Если все еще пустой, используем активный таймлайн из API
            if (!currentTimelineId) {
              const timelines = await api.getProjectTimelines({projectId: currentProjectId});
              const activeTimeline = timelines.find((t: any) => t.isActive) || timelines[0];
              if (activeTimeline) {
                currentTimelineId = activeTimeline.id;
                // Обновляем store с найденным активным таймлайном
                useTimelinesStore.getState().switchTimeline(currentTimelineId);
              }
            }
          }

          // Отправляем данные на сервер с указанием активного таймлайна
          await api.importToProject(currentProjectId, importedData, currentTimelineId);

          // Загружаем обновленные данные с сервера
          await useGraphStore.getState().loadFromServer(currentProjectId);

          // Обновляем таймлайны после импорта (на случай создания нового таймлайна)
          await useTimelinesStore.getState().loadProjectTimelines(currentProjectId);

          const projectTitle = importedData.title;
          let projectLayers;
          let variables: any[] = [];

          // Определяем формат данных: старый или новый (с таймлайнами)
          if (importedData.data.timelines) {
            // Новый формат с таймлайнами
            const timelineKeys = Object.keys(importedData.data.timelines);
            const firstTimelineKey = timelineKeys[0];
            const timelineData = importedData.data.timelines[firstTimelineKey];

            projectLayers = timelineData.layers;
            variables = timelineData.variables || [];
          } else {
            // Старый формат без таймлайнов
            projectLayers = importedData.data.layers;
            variables = importedData.data.variables || [];
          }

          // Собираем метрики для аналитики
          const metricsParams = getAggregatedPlayParams(projectLayers, variables, 'PlayBar');

          // Отправляем событие импорта проекта
          trackProjectImport(metricsParams, currentProjectId, currentTimelineId).catch((err: Error) => {
            console.error('Error sending analytics event:', err);
          });

          // Показываем уведомление об успехе
          notificationService.showSuccess(t('import.import_success', {projectTitle}));
        } catch (error: any) {
          console.error('Error importing to project:', error);
          notificationService.showError(t('import.import_error', {error: error.message || t('dialogs.unknown_error')}));
        }
      } catch (error) {
        console.error('Error processing import file:', error);
        notificationService.showError(t('import.parse_error'));
      }
    };

    // Запускаем процесс импорта
    processImport();

    // Сбрасываем значение инпута для возможности повторной загрузки того же файла
    event.target.value = '';
  };

  return {
    // Состояния
    exportModalOpen,
    setExportModalOpen,
    importToProjectInputRef,

    // Функции
    handleImportToProjectClick,
    handleImportToProjectChange,
    handleLoadDemoStory,
    handleOpenWelcomeStory,
    changeLanguage
  };
};
