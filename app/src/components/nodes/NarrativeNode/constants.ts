/**
 * Константы для настройки нарративного узла
 */

// Константы для внешнего вида
export const CARD_STYLES = {
  BACKGROUND_COLOR: '#f0f4ff',
  HEADER_BACKGROUND: '#e2eafe',
  BORDER_COLOR: '#d0e0ff',
  SELECTED_BORDER_COLOR: '#4985fb'
};

// Константы для размеров текста
export const TEXT_CONFIG = {
  MAX_ROWS: 10, // Максимальное количество видимых строк в текстовом поле
  MIN_TEXT_HEIGHT: 110, // Минимальная высота текстового блока
  HEADER_HEIGHT: 40, // Высота заголовка карточки
  SAFETY_MARGIN: 10, // Запас для предотвращения обрезания контента
  ANIMATION_DURATION: 150, // Длительность анимации в мс
  NODE_UPDATE_DELAY: 50, // Задержка обновления узла после изменений
  CHARS_PER_LINE: 35 // Примерное количество символов в строке для расчета переносов
};

// ID для DOM-событий
export const DOM_EVENTS = {
  UPDATE_NODE_INTERNALS: 'updateNodeInternals'
};

// Задержки для различных операций
export const DELAYS = {
  SAVE: 50,
  UPDATE_CONNECTIONS: 20,
  UPDATE_AFTER_OPERATION_TOGGLE: 160
};
