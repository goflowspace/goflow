import type {Layer} from '@types-folder/nodes';
import type {EmptyProjectState, LayerMetadata, ProjectSaveData, ProjectTimelineData} from '@types-folder/projectState';
import {DEFAULT_LAYER_METADATA, ROOT_LAYER_ID} from '@types-folder/projectState';

// Создает пустой корневой слой
export function createEmptyRootLayer(): Layer {
  return {
    type: 'layer',
    id: ROOT_LAYER_ID,
    name: ROOT_LAYER_ID,
    depth: 0,
    nodeIds: [],
    nodes: {},
    edges: {}
  };
}

// Создает начальные метаданные для корневого слоя
export function createDefaultLayerMetadata(): LayerMetadata {
  return DEFAULT_LAYER_METADATA;
}

// Создает полное состояние пустого проекта
export function createEmptyProjectState(): EmptyProjectState {
  return {
    layers: {
      [ROOT_LAYER_ID]: createEmptyRootLayer()
    },
    layerMetadata: {
      [ROOT_LAYER_ID]: createDefaultLayerMetadata()
    },
    hasLoadedFromStorage: true
  };
}

// Создает данные для сохранения проекта
export function createProjectSaveData(
  layers: Record<string, Layer>,
  layerMetadata: Record<string, LayerMetadata>,
  lastLayerNumber: number,
  variables: any[],
  projectName: string,
  timelineId: string,
  projectId?: string
): ProjectSaveData {
  return {
    timelines: {
      [timelineId]: {
        layers,
        metadata: layerMetadata,
        variables,
        lastLayerNumber
      }
    },
    projectName,
    ...(projectId && {projectId}),
    _lastModified: Date.now()
  };
}

// Проверяет, является ли данные валидными для проекта
export function isValidProjectData(data: any): boolean {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return false;
  }

  if (!data.timelines || typeof data.timelines !== 'object') {
    return false;
  }

  // Проверяем, что есть хотя бы один таймлайн
  const timelineKeys = Object.keys(data.timelines);
  if (timelineKeys.length === 0) {
    return false;
  }

  // Проверяем, что первый таймлайн имеет валидную структуру
  const firstTimeline = data.timelines[timelineKeys[0]];
  if (!firstTimeline || typeof firstTimeline.layers !== 'object') {
    return false;
  }

  return true;
}
