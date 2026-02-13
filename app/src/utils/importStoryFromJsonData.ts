import {Layer} from '@types-folder/nodes';
import {Variable} from '@types-folder/variables';

import {useGraphStore} from '@store/useGraphStore';

import {refreshAppState} from './refreshAppState';
import {validateImportedData} from './validateImportedData';

interface TimelineData {
  name?: string; // Имя таймлайна в новом формате (protocolVersion >= 4)
  layers: Record<string, Layer>;
  lastLayerNumber?: number;
  variables?: Variable[];
}

interface StoryData {
  title: string;
  data: {
    timelines?: Record<string, TimelineData>;
  };
}

export interface ImportStoryFromJsonDataOutput {
  projectTitle: string;
  projectLayers: Record<string, Layer>;
  lastLayerNumber: number;
  variables: Variable[];
}

export const importStoryFromJsonData = (data: any): ImportStoryFromJsonDataOutput | undefined => {
  const graphStore = useGraphStore.getState();
  const {layers} = graphStore;
  const rootLayerId = 'root';

  // Проверяем, есть ли ноды в корневом слое, чтобы не добавлять историю дважды
  const rootLayer = layers[rootLayerId] as Layer;
  if (rootLayer && Object.keys(rootLayer.nodes).length > 0) {
    return;
  }

  // Приводим данные к типизированному формату
  const typedData = data as StoryData;

  // Валидируем данные welcome-истории
  if (!validateImportedData(typedData)) {
    console.error('Некорректные данные в welcome_story.json');
    return;
  }

  // Получаем данные welcome-истории
  const projectTitle = typedData.title;
  let projectLayers;
  let lastLayerNumber = 0;
  let variables: any[] = [];

  if (typedData.data.timelines) {
    const timelineKeys = Object.keys(typedData.data.timelines);
    const firstTimelineKey = timelineKeys[0];
    const timelineData = typedData.data.timelines[firstTimelineKey];

    projectLayers = timelineData.layers;
    lastLayerNumber = timelineData.lastLayerNumber || 0;
    variables = timelineData.variables || [];
  } else {
    console.error('Недействительный формат данных. Убедитесь, что это файл экспорта Go Flow');
    return;
  }

  // Обновляем состояние приложения с загруженными данными
  refreshAppState(projectTitle, projectLayers, lastLayerNumber, variables);

  return {
    projectTitle,
    projectLayers,
    lastLayerNumber,
    variables
  };
};
