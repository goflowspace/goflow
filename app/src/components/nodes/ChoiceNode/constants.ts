/**
 * Константы для настройки узла выбора
 */
import {getHotkeyWithModifier} from '../../../utils/keyboardModifiers';

// Константы для внешнего вида
export const CARD_STYLES = {
  BACKGROUND_COLOR: '#e9f7ef',
  SELECTED_BORDER_COLOR: '#34c759',
  HOVER_BACKGROUND: '#dff4e9'
};

// Константы для размеров текста и расчетов высоты узла
export const SIZE_CONFIG = {
  BASE_HEIGHT: 40, // Базовая высота для минимального количества строк
  MAX_HEIGHT: 200, // Максимальная высота узла
  MIN_LINES: 1, // Минимальное количество строк
  MAX_LINES: 10, // Максимальное количество видимых строк
  LINE_HEIGHT: 24, // Высота одной строки
  CHARS_PER_LINE: 35, // Примерное количество символов в строке
  NODE_PADDING: 10, // Отступы внутри узла
  SAFETY_MARGIN: 10 // Запас для предотвращения обрезания контента
};

// ID для DOM-событий
export const DOM_EVENTS = {
  UPDATE_NODE_INTERNALS: 'updateNodeInternals'
};

// Задержки для различных операций
export const DELAYS = {
  UPDATE_HEIGHT: 50,
  UPDATE_CONNECTIONS: 20
};

// Сообщения и подсказки
export const HINTS = {
  EDIT_HINT: 'press Enter to edit',
  EDIT_CONTROLS_HINT: 'Enter: save, Shift+Enter: new line',
  DEFAULT_PLACEHOLDER: 'Add choice here',
  ADD_CHOICE_HINT: `${getHotkeyWithModifier('2')} to add new choice`
};
