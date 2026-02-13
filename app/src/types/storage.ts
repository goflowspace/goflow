/**
 * Интерфейс для хранения состояния панелей слоя
 */
export interface LayerPanelState {
  startPanelOpen: boolean;
  endPanelOpen: boolean;
}

/**
 * Интерфейс для хранения viewport слоя
 */
export interface ViewportState {
  x: number;
  y: number;
  zoom: number;
}

/**
 * Интерфейс для метаданных слоя, хранимых в localStorage
 */
export interface LayerMetadata {
  panelState: LayerPanelState;
  viewport: ViewportState;
}
