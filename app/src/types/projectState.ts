import type {Layer} from './nodes';

// Интерфейс для состояния панелей слоя
export interface LayerPanelState {
  startPanelOpen: boolean;
  endPanelOpen: boolean;
}

// Интерфейс для viewport слоя
export interface ViewportState {
  x: number;
  y: number;
  zoom: number;
}

// Интерфейс для метаданных слоя
export interface LayerMetadata {
  panelState: LayerPanelState;
  viewport: ViewportState;
}

// Интерфейс для данных таймлайна проекта
export interface ProjectTimelineData {
  layers: Record<string, Layer>;
  metadata: Record<string, LayerMetadata>;
  variables: any[];
  lastLayerNumber: number;
}

// Интерфейс для данных сохранения проекта
export interface ProjectSaveData {
  timelines: Record<string, ProjectTimelineData>;
  projectName: string;
  projectId?: string;
  _lastModified: number;
}

// Интерфейс для состояния пустого проекта
export interface EmptyProjectState {
  layers: Record<string, Layer>;
  layerMetadata: Record<string, LayerMetadata>;
  hasLoadedFromStorage: boolean;
}

// Константы для инициализации
export const ROOT_LAYER_ID = 'root' as const;

// Константы для значений по умолчанию
export const DEFAULT_PANEL_STATE: LayerPanelState = {
  startPanelOpen: true,
  endPanelOpen: true
} as const;

export const DEFAULT_VIEWPORT: ViewportState = {
  x: 0,
  y: 0,
  zoom: 1
} as const;

export const DEFAULT_LAYER_METADATA: LayerMetadata = {
  panelState: DEFAULT_PANEL_STATE,
  viewport: DEFAULT_VIEWPORT
} as const;
