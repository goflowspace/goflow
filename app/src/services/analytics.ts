import {ampli} from '../ampli';
import {CanvasColor, ControlsType, EditorSettingsState, EditorTheme, GridGap, GridType, LinkStyle, LinkThickness, ToolsHotkeys} from '../store/useEditorSettingsStore';
import useUserStore from '../store/useUserStore';
import {ToolId} from '../types/tools';
import {isOSS} from '../utils/edition';

// Типы для аналитики
type CreationModeType = 'Cursor' | 'Hotkey';
type ObjectType = 'Narrative' | 'Choice' | 'Layer' | 'Note' | 'Link' | 'Condition';
type EditingMethodType = 'Inspector' | 'Object';
type PropertyEditedType = 'Name' | 'Text';
export type ActivateMethodType = 'Hotkey' | 'PanelButton';
type WindowCloseMethodType = 'CancelButton' | 'ClickOutsideWindow' | 'ConfirmationButton' | 'DeleteButton' | 'CloseButton';
// Добавляем тип для внутреннего взаимодействия в приложении
export type InteractionType = 'hotkey' | 'mouse';
// Тип для метода входа в слой
export enum EnterMethodType {
  Sidebar = 'Sidebar',
  ObjectButton = 'ObjectButton',
  LayerBarRoot = 'LayerBarRoot',
  LayerBarUp = 'LayerBarUp',
  LayerHighlightRoot = 'LayerHighlightRoot',
  LayerHighlightParent = 'LayerHighlightParent'
}

// Типы инструментов для аналитики
export type MappedTool = 'select' | 'narrative' | 'choice' | 'layer' | 'jumper' | 'note';

// Вспомогательная функция для маппинга toolId в отображаемое значение
export const mapToolId = (toolId: ToolId): MappedTool => {
  if (toolId === 'cursor') return 'select';
  if (toolId === 'node-tool') return 'narrative';
  if (toolId === 'choice') return 'choice';
  return toolId as MappedTool;
};

// Конфигурация аналитики
interface AnalyticsConfig {
  /**
   * Флаг, указывающий, включена ли аналитика
   */
  enabled: boolean;

  /**
   * Флаг, указывающий, нужно ли логировать события в консоль (для отладки)
   */
  debug: boolean;
}

// Next.js автоматически подставляет значения NEXT_PUBLIC_ переменных непосредственно
// в коде во время сборки, поэтому это безопасно

const appEnv = process.env.NEXT_PUBLIC_APP_ENV || 'development';

// Определяем, находимся ли мы в режиме разработки
const isDevelopment = appEnv === 'development' || appEnv === 'local';

// Дефолтная конфигурация
let analyticsConfig: AnalyticsConfig = {
  enabled: true,
  debug: isDevelopment
};

/**
 * Обновляет конфигурацию аналитики
 */
export const configureAnalytics = (config: Partial<AnalyticsConfig>): void => {
  analyticsConfig = {
    ...analyticsConfig,
    ...config
  };
};

/**
 * Внутренняя функция для отправки события с учетом конфигурации
 */
const trackEvent = <T>(eventName: string, eventData: T, callback: () => void): void => {
  // В OSS аналитика полностью отключена
  if (isOSS()) return;

  // Если аналитика отключена, не отправляем событие
  if (!analyticsConfig.enabled) {
    return;
  }

  // Вызываем функцию отправки события
  callback();
};

/**
 * Внутренняя функция для отправки события с ожиданием завершения
 * @returns Promise, который резолвится, когда событие успешно отправлено
 */
const trackEventAsync = <T>(eventName: string, eventData: T, callback: () => any): Promise<void> => {
  // В OSS аналитика полностью отключена
  if (isOSS()) return Promise.resolve();

  // Если аналитика отключена, просто возвращаем выполненный промис
  if (!analyticsConfig.enabled) {
    return Promise.resolve();
  }

  // Возвращаем промис отправки события с таймаутом для безопасности
  return Promise.race([
    Promise.resolve(callback()),
    new Promise<void>((resolve) => setTimeout(resolve, 1000)) // Таймаут 1 секунда для гарантированного завершения
  ]).then(() => void 0);
};

/**
 * Преобразует внутренний тип взаимодействия в формат для аналитики
 */
export const mapInteractionToCreationMode = (interaction: InteractionType): CreationModeType => {
  return interaction === 'hotkey' ? 'Hotkey' : 'Cursor';
};

/**
 * Преобразует внутренний тип взаимодействия в formат для активации методов
 */
export const mapInteractionToActivateMethod = (interaction: InteractionType): ActivateMethodType => {
  return interaction === 'hotkey' ? 'Hotkey' : 'PanelButton';
};

/**
 * Получает глубину слоя
 * @param layerId ID слоя
 * @param layers Слои проекта
 * @param isRootLayer Флаг корневого слоя
 * @returns Глубина слоя
 */
export const getLayerDepth = (layerId: string, layers: Record<string, any>, isRootLayer: boolean = false): number => {
  if (isRootLayer) return 0;
  return layers[layerId]?.depth || 0;
};

/**
 * Получает ID последнего созданного узла в слое
 * @param layerId ID слоя
 * @param layers Слои проекта
 * @returns ID последнего созданного узла
 */
export const getLastCreatedNodeId = (layerId: string, layers: Record<string, any>): string => {
  const layer = layers[layerId];

  if (!layer || !layer.nodeIds || layer.nodeIds.length === 0) {
    return '';
  }

  return layer.nodeIds[layer.nodeIds.length - 1];
};

/**
 * Отправляет событие создания объекта
 */
export const trackObjectCreation = (
  objectType: ObjectType,
  layerId: string,
  layers: Record<string, any>,
  options: {
    isRootLayer?: boolean;
    interaction?: InteractionType;
    objectId?: string;
  } = {}
): void => {
  const creationMode = mapInteractionToCreationMode(options.interaction || 'mouse');
  const layerDepth = getLayerDepth(layerId, layers, options.isRootLayer);
  const objectId = options.objectId || getLastCreatedNodeId(layerId, layers);

  const eventData = {
    creationMode,
    objectType,
    layerID: layerId,
    objectID: objectId,
    layerDepth
  };

  trackEvent('Object – Creation', eventData, () => {
    ampli.objectCreation(eventData as any);
  });
};

/**
 * Отправляет событие редактирования объекта
 */
export const trackObjectEditing = (
  objectType: ObjectType,
  propertyEdited: PropertyEditedType,
  editingMethod: EditingMethodType = 'Object',
  isSidebarOpened: boolean = false,
  canvasZoomPercent: number = 100,
  displayResolution: string = 'na'
): void => {
  const eventData = {
    objectType,
    propertyEdited,
    editingMethod,
    isSidebarOpened,
    canvasZoomPercent,
    displayResolution
  };

  trackEvent('Object – Editing', eventData, () => {
    ampli.objectEditing(eventData as any);
  });
};

/**
 * Отправляет событие конвертации объекта
 */
export const trackObjectConvert = (from: 'Note' | 'Layer' | 'Narrative' | 'Choice', to: 'Layer' | 'Narrative' | 'Choice', projectId: string, timelineId: string): void => {
  const eventData = {
    from,
    projectId,
    timelineId,
    to
  };

  trackEvent('Object – Convert', eventData, () => {
    ampli.objectConvert(eventData);
  });
};

/**
 * Отправляет событие выбора инструмента
 */
export const trackToolSelection = (interaction: InteractionType = 'mouse', toolId: ToolId = 'cursor', projectId: string, timelineId: string): void => {
  const activateMethod = mapInteractionToActivateMethod(interaction);
  const mappedTool = mapToolId(toolId);

  const eventData = {
    activateMethod,
    projectId,
    timelineId,
    tool: mappedTool
  };

  trackEvent('Tool – Selection', eventData, () => {
    ampli.toolSelection(eventData);
  });
};

/**
 * Отправляет событие использования Undo
 */
export const trackUndoUsed = (interaction: InteractionType = 'mouse', projectId: string, timelineId: string): void => {
  const activateMethod = mapInteractionToActivateMethod(interaction);

  const eventData = {
    activateMethod,
    projectId,
    timelineId
  };

  trackEvent('Undo – Used', eventData, () => {
    ampli.undoUsed(eventData);
  });
};

/**
 * Отправляет событие использования Redo
 */
export const trackRedoUsed = (interaction: InteractionType = 'mouse', projectId: string, timelineId: string): void => {
  const activateMethod = mapInteractionToActivateMethod(interaction);

  const eventData = {
    activateMethod,
    projectId,
    timelineId
  };

  trackEvent('Redo – Used', eventData, () => {
    ampli.redoUsed(eventData);
  });
};

/**
 * Отправляет событие закрытия приветственного окна
 */
export const trackWelcomeWindowClosed = (isWelcomeStoryOn: boolean, projectId: string, timelineId: string): void => {
  const eventData = {
    isWelcomeStoryOn,
    projectId,
    timelineId
  };

  trackEvent('Welcome Window – Closed', eventData, () => {
    ampli.welcomeWindowClosed(eventData);
  });
};

/**
 * Отправляет событие закрытия мастера условий
 */
export const trackConditionMasterClosed = (windowCloseMethod: WindowCloseMethodType, masterMode: 'new' | 'existing' = 'new', projectId: string, timelineId: string): void => {
  const eventData = {
    windowCloseMethod,
    masterMode,
    projectId,
    timelineId
  };

  trackEvent('Condition – Close Master', eventData, () => {
    ampli.conditionCloseMaster(eventData);
  });
};

/**
 * Отправляет событие закрытия мастера операций
 */
export const trackOperationMasterClosed = (windowCloseMethod: WindowCloseMethodType, masterMode: 'new' | 'existing' = 'new', projectId: string, timelineId: string): void => {
  const eventData = {
    windowCloseMethod,
    masterMode,
    projectId,
    timelineId
  };

  trackEvent('Operation – Close Master', eventData, () => {
    ampli.operationCloseMaster(eventData);
  });
};

/**
 * Отправляет событие создания операции
 */
export const trackOperationCreation = (
  masterMode: 'new' | 'existing' = 'new',
  operationType: 'override' | 'addition' | 'subtract' | 'multiply' | 'divide' | 'invert' | 'join',
  variableType: 'string' | 'integer' | 'float' | 'percent' | 'boolean' | string = 'integer',
  targetType: 'variable' | 'custom' | '' = 'custom',
  objectID: string = '',
  projectId: string,
  timelineId: string
): void => {
  // Маппим тип переменной в формат для аналитики
  let mappedVarType: 'String' | 'Integer' | 'Float' | 'Percent' | 'Boolean' | 'Unknown' = 'Unknown';

  switch (variableType) {
    case 'string':
      mappedVarType = 'String';
      break;
    case 'integer':
      mappedVarType = 'Integer';
      break;
    case 'float':
      mappedVarType = 'Float';
      break;
    case 'percent':
      mappedVarType = 'Percent';
      break;
    case 'boolean':
      mappedVarType = 'Boolean';
      break;
    default:
      mappedVarType = 'Unknown';
  }

  // Маппим тип операции в формат для аналитики
  let mappedOpType: 'Override' | 'Invert' | 'Join' | 'Math' = 'Override';

  switch (operationType) {
    case 'override':
      mappedOpType = 'Override';
      break;
    case 'invert':
      mappedOpType = 'Invert';
      break;
    case 'join':
      mappedOpType = 'Join';
      break;
    case 'addition':
    case 'subtract':
    case 'multiply':
    case 'divide':
      mappedOpType = 'Math';
      break;
  }

  // Маппим тип цели в формат для аналитики
  let mappedTargetType: 'Variable' | 'Custom' | 'None' = 'None';

  switch (targetType) {
    case 'variable':
      mappedTargetType = 'Variable';
      break;
    case 'custom':
      mappedTargetType = 'Custom';
      break;
    default:
      mappedTargetType = 'None';
  }

  const eventData = {
    masterMode,
    operationType: mappedOpType,
    variableType: mappedVarType,
    targetType: mappedTargetType,
    objectID,
    projectId,
    timelineId
  };

  trackEvent('Operation – Creation', eventData, () => {
    ampli.operationCreation(eventData);
  });
};

/**
 * Отправляет событие открытия мастера операций
 */
export const trackOperationMasterOpened = (
  openMethod: 'Inspector' | 'Object' = 'Object',
  masterMode: 'new' | 'existing' = 'new',
  isSidebarOpened: boolean = false,
  projectId: string,
  timelineId: string
): void => {
  const eventData = {
    openMethod,
    masterMode,
    isSidebarOpened,
    projectId,
    timelineId
  };

  trackEvent('Operation – Open Master', eventData, () => {
    ampli.operationOpenMaster(eventData);
  });
};

/**
 * Отправляет событие закрытия мастера переменных
 */
export const trackVariableMasterClosed = (windowCloseMethod: WindowCloseMethodType, masterMode: 'new' | 'existing' = 'new', projectId: string, timelineId: string): void => {
  const eventData = {
    windowCloseMethod,
    masterMode,
    projectId,
    timelineId
  };

  trackEvent('Variable – Close Master', eventData, () => {
    ampli.variableCloseMaster(eventData);
  });
};

/**
 * Отправляет событие открытия мастера условий
 */
export const trackConditionMasterOpened = (
  openMethod: 'Inspector' | 'Object' = 'Object',
  masterMode: 'new' | 'existing' = 'new',
  isSidebarOpened: boolean = false,
  projectId: string,
  timelineId: string
): void => {
  const eventData = {
    openMethod,
    masterMode,
    isSidebarOpened,
    projectId,
    timelineId
  };

  trackEvent('Condition – Open Master', eventData, () => {
    ampli.conditionOpenMaster(eventData);
  });
};

/**
 * Отправляет событие входа в слой
 */
export const trackLayerEnter = (
  layerId: string,
  layers: Record<string, any>,
  enterMethod: EnterMethodType = EnterMethodType.ObjectButton,
  isSidebarOpened: boolean = false,
  projectId: string,
  timelineId: string
): void => {
  const layerDepth = getLayerDepth(layerId, layers, false);

  const eventData = {
    enterMethod,
    layerDepth,
    layerID: layerId,
    isSidebarOpened,
    projectId,
    timelineId
  };

  trackEvent('Layer – Enter', eventData, () => {
    // @ts-expect-error - добавляем игнорирование типизации, т.к. ampli может не иметь типов для новых значений EnterMethodType
    ampli.layerEnter(eventData);
  });
};

/**
 * Отправляет событие запуска поиска
 */
export const trackSearchLaunch = (interaction: InteractionType = 'mouse', projectId: string, timelineId: string): void => {
  const activateMethod = mapInteractionToActivateMethod(interaction);

  const eventData = {
    activateMethod,
    projectId,
    timelineId
  };

  trackEvent('Search – Launch', eventData, () => {
    ampli.searchLaunch(eventData);
  });
};

/**
 * Отправляет событие закрытия поиска
 */
export const trackSearchClose = (projectId: string, timelineId: string): void => {
  const eventData = {
    projectId,
    timelineId
  };

  trackEvent('Search – Close', eventData, () => {
    ampli.searchClose(eventData);
  });
};

/**
 * Отправляет событие выбора объекта в результатах поиска
 */
export const trackSearchObjectSelection = (objectType: ObjectType, projectId: string, timelineId: string): void => {
  const eventData = {
    objectType,
    projectId,
    timelineId
  };

  trackEvent('Search – Object Selection', eventData, () => {
    ampli.searchObjectSelection(eventData);
  });
};

/**
 * Отправляет событие удаления условия
 */
export const trackConditionDelete = (conditionDeleteSource: 'master' | 'preview' | 'inspector' = 'master', projectId: string, timelineId: string): void => {
  const eventData = {
    conditionDeleteSource,
    projectId,
    timelineId
  };

  trackEvent('Condition – Delete', eventData, () => {
    ampli.conditionDelete(eventData);
  });
};

/**
 * Отправляет событие создания условия сравнения переменных
 */
export const trackConditionCreationComparison = (
  masterMode: 'new' | 'existing' = 'new',
  comparisonType: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' = 'eq',
  comparisonRightType: 'variable' | 'custom' = 'variable',
  variableType: 'String' | 'Integer' | 'Float' | 'Percent' | 'Boolean' = 'Integer',
  projectId: string,
  timelineId: string
): void => {
  const eventData = {
    masterMode,
    comparisonType,
    comparisonRightType,
    variableType,
    projectId,
    timelineId
  };

  trackEvent('Condition – Creation Comparison', eventData, () => {
    ampli.conditionCreationComparison(eventData);
  });
};

/**
 * Отправляет событие создания условия вероятности
 */
export const trackConditionCreationProbability = (
  masterMode: 'new' | 'existing' = 'new',
  probabilityType: 'custom' | 'predefined' = 'custom',
  probabilityValue: number = 0.5,
  projectId: string,
  timelineId: string
): void => {
  const eventData = {
    masterMode,
    probabilityType,
    probabilityValue,
    projectId,
    timelineId
  };

  trackEvent('Condition – Creation Probability', eventData, () => {
    ampli.conditionCreationProbability(eventData);
  });
};

/**
 * Отправляет событие создания условия "узел посещен"
 */
export const trackConditionCreationHappened = (masterMode: 'new' | 'existing' = 'new', comparisonNodeType: 'Narrative' | 'Choice' = 'Narrative', projectId: string, timelineId: string): void => {
  const eventData = {
    masterMode,
    comparisonNodeType,
    projectId,
    timelineId
  };

  trackEvent('Condition – Creation Happened', eventData, () => {
    ampli.conditionCreationHappened(eventData);
  });
};

/**
 * Отправляет событие создания условия "узел не посещен"
 */
export const trackConditionCreationNotHappened = (masterMode: 'new' | 'existing' = 'new', comparisonNodeType: 'Narrative' | 'Choice' = 'Narrative', projectId: string, timelineId: string): void => {
  const eventData = {
    masterMode,
    comparisonNodeType,
    projectId,
    timelineId
  };

  trackEvent('Condition – Creation Not Happened', eventData, () => {
    ampli.conditionCreationNotHappened(eventData);
  });
};

/**
 * Отправляет событие создания переменной
 */
export const trackVariableCreation = (
  masterMode: 'new' | 'existing' = 'new',
  variableType: 'string' | 'integer' | 'float' | 'percent' | 'boolean' | string = 'integer',
  projectId: string,
  timelineId: string
): void => {
  // Маппим тип переменной в формат для аналитики
  let mappedType: 'String' | 'Integer' | 'Float' | 'Percent' | 'Boolean' | 'Unknown' = 'Unknown';

  switch (variableType) {
    case 'string':
      mappedType = 'String';
      break;
    case 'integer':
      mappedType = 'Integer';
      break;
    case 'float':
      mappedType = 'Float';
      break;
    case 'percent':
      mappedType = 'Percent';
      break;
    case 'boolean':
      mappedType = 'Boolean';
      break;
    default:
      mappedType = 'Unknown';
  }

  const eventData = {
    masterMode,
    variableType: mappedType,
    projectId,
    timelineId
  };

  trackEvent('Variable – Creation', eventData, () => {
    ampli.variableCreation(eventData);
  });
};

/**
 * Отправляет событие запуска воспроизведения
 * @param params Агрегированные параметры
 * @param hasConditionErrors Наличие ошибок в условиях
 */
export const trackPlaybackLaunch = (
  params: {
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
  },
  hasConditionErrors: boolean = false,
  projectId: string,
  timelineId: string
): void => {
  const eventData = {
    ...params,
    hasConditionErrors,
    projectId,
    timelineId
  };

  trackEvent('Playback – Launch', eventData, () => {
    ampli.playbackLaunch(eventData);
  });
};

/**
 * Отправляет событие экспорта проекта
 * @param params Агрегированные параметры проекта
 * @param exportFormat Формат экспорта: 'HTML' или 'JSON'
 * @returns Promise, который резолвится, когда событие отправлено
 */
export const trackProjectExport = (
  params: {
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
  },
  exportFormat: 'HTML' | 'JSON' | 'RENPY' | 'DIALOGIC',
  isSidebarOpened: boolean = false,
  projectId: string,
  timelineId: string
): Promise<void> => {
  const eventData = {
    ...params,
    exportFormat,
    isSidebarOpened,
    projectId,
    timelineId
  };

  return trackEventAsync('Project – Export', eventData, () => {
    return ampli.projectExport(eventData);
  });
};

/**
 * Отправляет событие импорта проекта
 * @param params Агрегированные параметры проекта
 * @returns Promise, который резолвится, когда событие отправлено
 */
export const trackProjectImport = (
  params: {
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
  },
  projectId: string,
  timelineId: string
): Promise<void> => {
  const eventData = {
    ...params,
    projectId,
    timelineId
  };

  return trackEventAsync('Project – Import', eventData, () => {
    return ampli.projectImport(eventData);
  });
};

/**
 * Отправляет событие открытия окна About
 */
export const trackAboutOpen = (projectId: string, timelineId: string = 'undefined'): void => {
  const eventData = {
    projectId,
    timelineId
  };

  trackEvent('About – Open', eventData, () => {
    ampli.aboutOpen(eventData);
  });
};

/**
 * Отправляет событие закрытия окна About
 */
export const trackAboutClose = (projectId: string, timelineId: string = 'undefined'): void => {
  const eventData = {
    projectId,
    timelineId
  };

  trackEvent('About – Close', eventData, () => {
    ampli.aboutClose(eventData);
  });
};

/**
 * Отправляет событие создания проекта в менеджере
 */
export const trackManagerCreateProject = (projectId: string): void => {
  const eventData = {
    projectId
  };

  trackEvent('Manager – Create Project', eventData, () => {
    ampli.managerCreateProject(eventData);
  });
};

/**
 * Отправляет событие удаления проекта в менеджере
 */
export const trackManagerDeleteProject = (projectId: string): void => {
  const eventData = {
    projectId
  };

  trackEvent('Manager – Delete Project', eventData, () => {
    ampli.managerDeleteProject(eventData);
  });
};

/**
 * Отправляет событие дублирования проекта в менеджере
 */
export const trackManagerDuplicateProject = (projectId: string): void => {
  const eventData = {
    projectId
  };

  trackEvent('Manager – Duplicate Project', eventData, () => {
    ampli.managerDuplicateProject(eventData);
  });
};

/**
 * Отправляет событие открытия редактора из менеджера
 */
export const trackManagerOpenEditor = (projectId: string): void => {
  const eventData = {
    projectId
  };

  trackEvent('Manager – Open Editor', eventData, () => {
    // TODO: Заменить на ampli.managerOpenEditor(eventData) когда событие будет добавлено в tracking plan
  });
};

// Entity Events

/**
 * Отправляет событие загрузки изображения сущности
 */
export const trackEntityImageDownload = (entityId: string, entityTypeName: string, projectId: string): void => {
  const eventData = {
    entityId,
    entityTypeName,
    projectId
  };

  trackEvent('Entity – Image – Download', eventData, () => {
    ampli.entityImageDownload(eventData);
  });
};

/**
 * Отправляет событие загрузки изображения сущности
 */
export const trackEntityImageUpload = (entityId: string, entityTypeName: string, projectId: string): void => {
  const eventData = {
    entityId,
    entityTypeName,
    projectId
  };

  trackEvent('Entity – Image – Upload', eventData, () => {
    ampli.entityImageUpload(eventData);
  });
};

/**
 * Отправляет событие создания параметра сущности
 */
export const trackEntityParamCreated = (
  entityParamName: string,
  entityParamType: 'ShortText' | 'Text' | 'Number' | 'YesNo' | 'SingleSelect' | 'MultiSelect' | 'MediaFile' | 'SingleEntity' | 'MultiEntity',
  entityTypeName: string,
  projectId: string
): void => {
  const eventData = {
    entityParamName,
    entityParamType,
    entityTypeName,
    projectId
  };

  trackEvent('Entity – Param – Created', eventData, () => {
    ampli.entityParamCreated(eventData);
  });
};

/**
 * Отправляет событие удаления параметра сущности
 */
export const trackEntityParamDeleted = (
  entityParamName: string,
  entityParamType: 'ShortText' | 'Text' | 'Number' | 'YesNo' | 'SingleSelect' | 'MultiSelect' | 'MediaFile' | 'SingleEntity' | 'MultiEntity',
  entityTypeName: string,
  projectId: string
): void => {
  const eventData = {
    entityParamName,
    entityParamType,
    entityTypeName,
    projectId
  };

  trackEvent('Entity – Param – Deleted', eventData, () => {
    ampli.entityParamDeleted(eventData);
  });
};

/**
 * Отправляет событие редактирования параметра сущности
 */
export const trackEntityParamEdit = (
  entityParamName: string,
  entityParamNameEdited: string,
  entityParamType: 'ShortText' | 'Text' | 'Number' | 'YesNo' | 'SingleSelect' | 'MultiSelect' | 'MediaFile' | 'SingleEntity' | 'MultiEntity',
  entityTypeName: string,
  projectId: string
): void => {
  const eventData = {
    entityParamName,
    entityParamNameEdited,
    entityParamType,
    entityTypeName,
    projectId
  };

  trackEvent('Entity – Param – Edit', eventData, () => {
    ampli.entityParamEdit(eventData);
  });
};

/**
 * Отправляет событие создания типа сущности
 */
export const trackEntityTypeCreated = (entityTypeName: string, entityTypeParams: string[], projectId: string): void => {
  const eventData = {
    entityTypeName,
    entityTypeParams,
    projectId
  };

  trackEvent('Entity – Type – Created', eventData, () => {
    ampli.entityTypeCreated(eventData);
  });
};

/**
 * Отправляет событие удаления типа сущности
 */
export const trackEntityTypeDeleted = (entityTypeName: string, projectId: string): void => {
  const eventData = {
    entityTypeName,
    projectId
  };

  trackEvent('Entity – Type – Deleted', eventData, () => {
    ampli.entityTypeDeleted(eventData);
  });
};

/**
 * Отправляет событие редактирования типа сущности
 */
export const trackEntityTypeEdited = (entityTypeName: string, entityTypeParams: string[], projectId: string): void => {
  const eventData = {
    entityTypeName,
    entityTypeParams,
    projectId
  };

  trackEvent('Entity – Type – Edited', eventData, () => {
    ampli.entityTypeEdited(eventData);
  });
};

/**
 * Отправляет событие переименования проекта
 */
export const trackProjectNameEditing = (projectNameLength: number, renameMethod: 'editor' | 'manager' = 'manager', projectId: string, timelineId: string = 'undefined'): void => {
  const eventData = {
    projectNameLength,
    renameMethod,
    projectId,
    timelineId
  };

  trackEvent('Project – Name Editing', eventData, () => {
    ampli.projectNameEditing(eventData);
  });
};

/**
 * Маппинг значений настроек редактора в формат для аналитики
 */
const mapEditorSettingsToAnalytics = (settings: Partial<EditorSettingsState>) => {
  const analyticsData: any = {};

  // Маппинг темы редактора
  if (settings.theme) {
    analyticsData.editorTheme = settings.theme;
  }

  // Маппинг типа сетки
  if (settings.grid) {
    analyticsData.canvasGridType = settings.grid;
  }

  // Маппинг размера сетки
  if (settings.gridGap) {
    analyticsData.canvasGridSpacing = `${settings.gridGap}px`;
  }

  // Маппинг цвета холста
  if (settings.canvasColor) {
    const colorMapping: Record<CanvasColor, string> = {
      lgray: 'lightGray',
      gray: 'gray',
      dgray: 'darkGray',
      lyellow: 'lightYellow',
      lgreen: 'lightGreen',
      lblue: 'lightBlue',
      lpink: 'lightPink',
      lpurple: 'lightPurple'
    };
    analyticsData.canvasBackgroudColor = colorMapping[settings.canvasColor];
  }

  // Маппинг привязки объектов к сетке
  if (settings.snapToGrid !== undefined) {
    analyticsData.canvasObjectsSnapping = settings.snapToGrid;
  }

  // Маппинг привязки связей
  if (settings.linkSnapping !== undefined) {
    analyticsData.canvasLinksSnapping = settings.linkSnapping;
  }

  // Маппинг толщины связей
  if (settings.linkThickness) {
    analyticsData.canvasLinksThickness = settings.linkThickness;
  }

  // Маппинг стиля связей
  if (settings.linkStyle) {
    const linkStyleMapping: Record<LinkStyle, string> = {
      solid: 'Solid',
      dash: 'dashed'
    };
    analyticsData.canvasLinksStyle = linkStyleMapping[settings.linkStyle];
  }

  // Маппинг типа управления
  if (settings.controls) {
    analyticsData.editorControls = settings.controls === 'auto' ? 'mouse' : settings.controls;
  }

  // Маппинг типа горячих клавиш
  if (settings.toolsHotkeys) {
    const hotkeysMapping: Record<ToolsHotkeys, string> = {
      num: 'numbers',
      sym: 'symbols'
    };
    analyticsData.editorHotkeysType = hotkeysMapping[settings.toolsHotkeys];
  }

  return analyticsData;
};

/**
 * Отправляет текущие настройки пространства редактора как user properties
 */
export const trackEditorSettingsAsUserProperties = (settings: Partial<EditorSettingsState>): void => {
  const analyticsData = mapEditorSettingsToAnalytics(settings);

  if (Object.keys(analyticsData).length > 0) {
    const {user} = useUserStore.getState();

    trackEvent('Editor Settings – User Properties', analyticsData, () => {
      ampli.identify(user?.id, analyticsData);
    });
  }
};

/**
 * Отправляет все текущие настройки редактора как user properties при открытии проекта
 */
export const trackEditorSettingsOnProjectOpen = (settings: EditorSettingsState): void => {
  const analyticsData = mapEditorSettingsToAnalytics(settings);
  const {user} = useUserStore.getState();

  trackEvent('Editor Settings – Project Open', analyticsData, () => {
    ampli.identify(user?.id, analyticsData);
  });
};

/**
 * Отправляет измененные настройки редактора как user properties
 */
export const trackEditorSettingChanged = (settingName: string, settings: Partial<EditorSettingsState>): void => {
  const analyticsData = mapEditorSettingsToAnalytics(settings);

  if (Object.keys(analyticsData).length > 0) {
    const {user} = useUserStore.getState();

    trackEvent(`Editor Settings – ${settingName} Changed`, analyticsData, () => {
      ampli.identify(user?.id, analyticsData);
    });
  }
};

export const trackBibleGenerateAllLaunch = (params: {additionalPromptLength: number}, projectId: string): void => {
  const eventData = {
    ...params,
    projectId,
    averageIdeaLength: 0
  };

  trackEvent('Bible – Comprehensive Generation', eventData, () => {
    ampli.bibleGenerateAllLaunch(eventData);
  });
};

export const trackBibleGenerateAllOpen = (bibleGenState: 'FirstGeneration' | 'Regeneration', projectId: string): void => {
  const eventData = {
    projectId,
    bibleGenState
  };

  trackEvent('Bible – Comprehensive Generation Open', eventData, () => {
    ampli.bibleGenerateAllOpen(eventData);
  });
};

export const trackBibleEditField = (bibleFieldName: string, bibleFieldEditMethod: 'generateFastFill' | 'generateFillWithIdea' | 'Manual', additionalPromptLength: number, projectId: string): void => {
  const eventData = {
    bibleFieldName,
    bibleFieldEditMethod,
    additionalPromptLength,
    projectId,
    averageIdeaLength: 0
  };

  trackEvent('Bible – Edit Field', eventData, () => {
    ampli.bibleEditField(eventData);
  });
};

export const trackCanvasAIFillNode = (
  fillNodeMethod: 'Hotkey' | 'ContextButton' | 'NodeButton',
  objectType: 'Narrative' | 'Choice' | 'Layer' | 'Note' | 'Link' | 'Condition',
  projectId: string,
  timelineId: string
): void => {
  const eventData = {
    fillNodeMethod,
    objectType,
    projectId,
    timelineId
  };

  trackEvent('Canvas – AI – Fill Node', eventData, () => {
    ampli.canvasAiFillNode(eventData);
  });
};

export const trackCanvasAINextNode = (parentNodeType: string, projectId: string, timelineId: string): void => {
  const eventData = {
    parentNodeType,
    projectId,
    timelineId
  };

  trackEvent('Canvas – AI – Next Node', eventData, () => {
    ampli.canvasAiNextNode(eventData);
  });
};

/**
 * Отправляет событие создания таймлайна
 */
export const trackTimelineCreated = (projectId: string, timelineIndex: number): void => {
  const eventData = {
    projectId,
    timelineIndex
  };

  trackEvent('Timeline – Created', eventData, () => {
    ampli.timelineCreated(eventData);
  });
};

/**
 * Отправляет событие удаления таймлайна
 */
export const trackTimelineDeleted = (projectId: string): void => {
  const eventData = {
    projectId
  };

  trackEvent('Timeline – Deleted', eventData, () => {
    ampli.timelineDeleted(eventData);
  });
};

/**
 * Отправляет событие переименования таймлайна
 */
export const trackTimelineRenamed = (projectId: string): void => {
  const eventData = {
    projectId
  };

  trackEvent('Timeline – Renamed', eventData, () => {
    ampli.timelineRenamed(eventData);
  });
};

/**
 * Отправляет событие открытия окна ИИ генерации сущности
 */
export const trackEntityGenerationOpen = (projectId: string): void => {
  const eventData = {
    projectId
  };

  trackEvent('Entity – Generation – Open', eventData, () => {
    ampli.entityGenerationOpen(eventData);
  });
};

/**
 * Отправляет событие запуска ИИ генерации сущности
 */
export const trackEntityGenerationLaunch = (projectId: string, additionalPromptLength: number): void => {
  const eventData = {
    projectId,
    additionalPromptLength
  };

  trackEvent('Entity – Generation – Launch', eventData, () => {
    ampli.entityGenerationLaunch(eventData);
  });
};

/**
 * Отправляет событие закрытия окна ИИ генерации сущности
 */
export const trackEntityGenerationClose = (projectId: string, entityGenCloseMethod: 'CloseButton' | 'CancelButton'): void => {
  const eventData = {
    projectId,
    entityGenCloseMethod
  };

  trackEvent('Entity – Generation – Close', eventData, () => {
    ampli.entityGenerationClose(eventData);
  });
};

/**
 * Отправляет событие создания сущности
 */
export const trackEntityCreated = (entityId: string, entityTypeName: string, entityCreationMethod: 'Generation' | 'Manual', entitySource: 'Canvas' | 'Workspace', projectId: string): void => {
  const eventData = {
    entityId,
    entityTypeName,
    entityCreationMethod,
    entitySource,
    projectId
  };

  trackEvent('Entity – Created', eventData, () => {
    ampli.entityCreated(eventData);
  });
};

/**
 * Отправляет событие запуска генерации изображения сущности
 */
export const trackEntityGenerateImageLaunch = (entityId: string, entityTypeName: string, additionalPromptLength: number, projectId: string, entityIndex: number = 0): void => {
  const eventData = {
    entityId,
    entityTypeName,
    additionalPromptLength,
    projectId,
    entityIndex
  };

  trackEvent('Entity – Generate Image – Launch', eventData, () => {
    ampli.entityGenerateImageLaunch(eventData);
  });
};

// Billing Events

/**
 * Отправляет событие открытия окна биллинга
 */
export const trackBillingOpen = (): void => {
  trackEvent('Billing – Open', {}, () => {
    ampli.billingOpen();
  });
};

/**
 * Отправляет событие покупки кредитов
 */
export const trackBillingCreditsPurchase = (creditsAmount: number, currency: string, stripePriceId: string, stripeProductId: string, unitAmount: number): void => {
  const eventData = {
    creditsAmount,
    currency,
    stripePriceId,
    stripeProductId,
    unitAmount
  };

  trackEvent('Billing – Credits Purchase', eventData, () => {
    ampli.billingCreditsPurchase(eventData);
  });
};

/**
 * Отправляет событие подписки на тариф
 */
export const trackBillingSubscribe = (creditsAmount: number, currency: string, period: 'monthly' | 'annual', stripePriceId: string, stripeProductId: string, unitAmount: number): void => {
  const eventData = {
    creditsAmount,
    currency,
    period,
    stripePriceId,
    stripeProductId,
    unitAmount
  };

  trackEvent('Billing – Subscribe', eventData, () => {
    ampli.billingSubscribe(eventData);
  });
};

// Usage Events

/**
 * Отправляет событие открытия страницы использования
 */
export const trackUsageOpen = (): void => {
  trackEvent('Usage – Open', {}, () => {
    ampli.usageOpen();
  });
};
