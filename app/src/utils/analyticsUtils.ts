/**
 * Утилиты для сбора аналитических данных о проекте
 */
import {Layer} from '@types-folder/nodes';
import {Variable} from '@types-folder/variables';

/**
 * Интерфейс для агрегированных параметров проекта
 * Используется в событиях Playback – Launch, Project – Import, Project – Export
 */
export interface ProjectMetricsParams {
  averageTextLengthInChoiсes: number;
  averageTextLengthInNarrative: number;
  numberOfChoices: number;
  numberOfConditions: number;
  numberOfLayers: number;
  numberOfLayersWithUserName: number;
  numberOfLinksWithConditions: number;
  numberOfLinksWithoutConditions: number;
  numberOfNarratives: number;
  numberOfNarrativesWithUserName: number;
  numberOfNotes: number;
  numberOfOperations: number;
  numberOfVariables: number;
  maxLayerDepth: number;
  playbackLaunchMethod: 'PlayBar' | 'Node';
}

// Совместимость с ранее использованным именем
export type PlaybackParams = ProjectMetricsParams;

/**
 * Собирает агрегированные параметры для событий, связанных с воспроизведением
 * @param layers Слои проекта
 * @param variables Переменные проекта
 * @returns Объект с агрегированными параметрами
 */
export const getAggregatedPlayParams = (layers: Record<string, Layer>, variables: Variable[], playbackLaunchMethod: 'PlayBar' | 'Node'): PlaybackParams => {
  // Количество слоев
  const layersCount = Object.keys(layers).length;

  // Собираем статистику по узлам и связям
  let narrativeNodesCount = 0;
  let choiceNodesCount = 0;
  let noteNodesCount = 0;
  let layerNodesCount = 0;
  let edgesCount = 0;
  let edgesWithConditionsCount = 0;
  let conditionsCount = 0;
  let operationsCount = 0;
  let totalNarrativeTextLength = 0;
  let totalChoiceTextLength = 0;
  let layersWithCustomNameCount = 0;
  let narrativesWithCustomNameCount = 0;

  // Максимальная глубина слоя
  let maxLayerDepth = 0;

  // Проходим по всем слоям и собираем данные
  Object.values(layers).forEach((layer) => {
    const nodes = layer.nodes || {};
    const edges = layer.edges || {};

    // Проверяем, имеет ли слой пользовательское имя
    if (layer.name && layer.name !== 'root' && layer.name !== `Layer ${layer.id}`) {
      layersWithCustomNameCount++;
    }

    // Обновляем максимальную глубину
    if (layer.depth > maxLayerDepth) {
      maxLayerDepth = layer.depth;
    }

    // Считаем узлы разных типов
    Object.values(nodes).forEach((node: any) => {
      if (node.type === 'narrative') {
        narrativeNodesCount++;
        // Считаем операции в нарративных узлах
        if ('operations' in node && node.operations) {
          operationsCount += node.operations.length;
        }
        // Считаем общую длину текста нарративных узлов
        if (node.data?.text) {
          totalNarrativeTextLength += node.data.text.length;
        }
        // Проверяем, имеет ли нарративный узел пользовательское имя (не пустое и не дефолтное)
        if (node.data?.title && node.data.title !== '' && node.data.title !== 'Narrative') {
          narrativesWithCustomNameCount++;
        }
      } else if (node.type === 'choice') {
        choiceNodesCount++;
        // Считаем общую длину текста узлов выбора
        if (node.data?.text) {
          totalChoiceTextLength += node.data.text.length;
        }
      } else if (node.type === 'note') {
        noteNodesCount++;
      } else if (node.type === 'layer') {
        layerNodesCount++;
      }
    });

    // Считаем связи и условия
    Object.values(edges).forEach((edge: any) => {
      edgesCount++;

      if (edge.conditions && edge.conditions.length > 0) {
        edgesWithConditionsCount++;
        conditionsCount += edge.conditions.length;
      }
    });
  });

  // Считаем средние длины текстов
  const averageTextLengthInNarrative = narrativeNodesCount > 0 ? Math.round(totalNarrativeTextLength / narrativeNodesCount) : 0;
  const averageTextLengthInChoiсes = choiceNodesCount > 0 ? Math.round(totalChoiceTextLength / choiceNodesCount) : 0;

  // Считаем количество связей без условий
  const edgesWithoutConditionsCount = edgesCount - edgesWithConditionsCount;

  return {
    // Параметры соответствующие интерфейсу PlaybackLaunchProperties
    averageTextLengthInChoiсes,
    averageTextLengthInNarrative,
    numberOfChoices: choiceNodesCount,
    numberOfConditions: conditionsCount,
    numberOfLayers: layersCount,
    numberOfLayersWithUserName: layersWithCustomNameCount,
    numberOfLinksWithConditions: edgesWithConditionsCount,
    numberOfLinksWithoutConditions: edgesWithoutConditionsCount,
    numberOfNarratives: narrativeNodesCount,
    numberOfNarrativesWithUserName: narrativesWithCustomNameCount,
    numberOfNotes: noteNodesCount,
    numberOfOperations: operationsCount,
    numberOfVariables: variables.length,
    maxLayerDepth,
    playbackLaunchMethod
  };
};
