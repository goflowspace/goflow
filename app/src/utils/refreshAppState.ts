import {STORY_KEY, StorageService} from 'src/services/storageService';

import {useCanvasStore} from '@store/useCanvasStore';
import {useGraphStore} from '@store/useGraphStore';
import {useLayerStore} from '@store/useLayerStore';
import {useVariablesStore} from '@store/useVariablesStore';

import {createDefaultLayerMetadata} from './projectStateHelpers';

/**
 * Полностью обновляет состояние приложения на основе импортированных данных
 *
 * @param projectTitle - название проекта
 * @param projectLayers - слои проекта
 * @param lastLayerNumber - последний номер слоя
 * @param variables - переменные проекта
 * @param setProjectName - функция для установки названия проекта
 */
export const refreshAppState = (projectTitle: string, projectLayers: any, lastLayerNumber: number, variables: any[], setProjectName?: (name: string) => void) => {
  // Устанавливаем название проекта, если передана функция
  if (setProjectName) {
    setProjectName(projectTitle);
  }

  // Готовим метаданные для слоев
  const layerMetadata: Record<string, any> = {};

  // Инициализируем метаданные для каждого слоя
  Object.keys(projectLayers).forEach((layerId) => {
    layerMetadata[layerId] = createDefaultLayerMetadata();
  });

  // Устанавливаем слои с метаданными
  useGraphStore.setState({
    layers: projectLayers,
    currentGraphId: 'root',
    hasLoadedFromStorage: true,
    lastLayerNumber: lastLayerNumber,
    layerMetadata: layerMetadata
  });

  // Устанавливаем переменные, если они есть
  if (variables.length > 0) {
    useVariablesStore.getState().setVariables(variables);
  }

  // Обновляем другие хранилища при необходимости
  useCanvasStore.setState({nodes: [], edges: [], draggingNodeId: null}); // Сбрасываем состояние канваса

  // Обновляем состояние слоев (LayerStore)
  useLayerStore.setState({
    currentLayer: projectLayers.root?.name || 'Главный слой',
    isLayersPanelOpen: false
  });

  // Сохраняем в IndexedDB используя GraphStore
  useGraphStore.getState().saveToDb();

  // Очищаем preview
  StorageService.removeItem(STORY_KEY);

  // Проверяем, есть ли хотя бы один дополнительный слой для переключения
  const layerIds = Object.keys(projectLayers);
  if (layerIds.length > 1) {
    // Находим слой, отличный от корневого
    const anotherLayerId = layerIds.find((id) => id !== 'root') || 'root';

    // Имитируем переключение слоев для триггера перерисовки
    setTimeout(() => {
      // Сначала переключаемся на другой слой
      useGraphStore.setState({currentGraphId: anotherLayerId});

      // Затем быстро переключаемся обратно на корневой слой
      setTimeout(() => {
        useGraphStore.setState({currentGraphId: 'root'});

        // Добавляем микро-изменение viewport для перерисовки
        setTimeout(() => {
          const currentLayerMetadata = {...useGraphStore.getState().layerMetadata};
          if (currentLayerMetadata.root) {
            // Изменяем zoom на миллисекунду и возвращаем обратно
            currentLayerMetadata.root.viewport = {...currentLayerMetadata.root.viewport, zoom: 1.01};
            useGraphStore.setState({layerMetadata: currentLayerMetadata});

            setTimeout(() => {
              currentLayerMetadata.root.viewport = {...currentLayerMetadata.root.viewport, zoom: 1};
              useGraphStore.setState({layerMetadata: currentLayerMetadata});
            }, 10);
          }
        }, 100);
      }, 50);
    }, 10);
  } else {
    // Если нет дополнительных слоев, просто обновляем текущий слой дважды для триггера перерисовки
    setTimeout(() => {
      // Имитируем смену слоя
      useGraphStore.setState({currentGraphId: '_temp_'});

      // И сразу возвращаем обратно
      setTimeout(() => {
        useGraphStore.setState({currentGraphId: 'root'});

        // Добавляем микро-изменение viewport для перерисовки
        setTimeout(() => {
          const currentLayerMetadata = {...useGraphStore.getState().layerMetadata};
          if (currentLayerMetadata.root) {
            // Изменяем zoom на миллисекунду и возвращаем обратно
            currentLayerMetadata.root.viewport = {...currentLayerMetadata.root.viewport, zoom: 1.01};
            useGraphStore.setState({layerMetadata: currentLayerMetadata});

            setTimeout(() => {
              currentLayerMetadata.root.viewport = {...currentLayerMetadata.root.viewport, zoom: 1};
              useGraphStore.setState({layerMetadata: currentLayerMetadata});
            }, 10);
          }
        }, 100);
      }, 50);
    }, 10);
  }
};
