/**
 * Утилиты для работы с клавишами-модификаторами в зависимости от операционной системы
 */

/**
 * Проверяет, является ли текущая платформа macOS
 * @returns {boolean} true, если macOS, иначе false
 */
export const isMacOS = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  return navigator.platform.toUpperCase().indexOf('MAC') >= 0;
};

/**
 * Возвращает название клавиши-модификатора для текущей ОС
 * @returns {string} "Cmd" для macOS, "Ctrl" для других ОС
 */
export const getModifierKey = (): string => {
  return isMacOS() ? 'Cmd' : 'Ctrl';
};

/**
 * Проверяет, нажата ли клавиша-модификатор для текущей ОС
 * @param {KeyboardEvent} event - событие клавиатуры
 * @returns {boolean} true, если нажата соответствующая клавиша-модификатор
 */
export const isModifierKeyPressed = (event: KeyboardEvent): boolean => {
  return isMacOS() ? event.metaKey : event.ctrlKey;
};

/**
 * Возвращает текст хоткея с номером в зависимости от платформы
 * @param {string} key - клавиша хоткея
 * @returns {string} форматированный текст хоткея (Cmd+key для Mac, Ctrl+key для остальных)
 */
export const getHotkeyWithModifier = (key: string): string => {
  return `${getModifierKey()}+${key}`;
};

/**
 * Проверяет, нажата ли комбинация клавиши-модификатора с указанной клавишей
 * @param {KeyboardEvent} event - событие клавиатуры
 * @param {string} key - клавиша, которую нужно проверить
 * @returns {boolean} true, если нажата комбинация модификатора с указанной клавишей
 */
export const isModifierWithKey = (event: KeyboardEvent, key: string): boolean => {
  const modifierPressed = isModifierKeyPressed(event);
  const keyMatch = event.key.toLowerCase() === key.toLowerCase() || event.code === `Key${key.toUpperCase()}`;

  return modifierPressed && keyMatch;
};

/**
 * Проверяет, нажата ли комбинация для увеличения/уменьшения масштаба (Ctrl/Cmd+ или Ctrl/Cmd-)
 */
export const isZoomModifierKey = (event: KeyboardEvent): boolean => {
  const hasModifier = isModifierKeyPressed(event);
  return hasModifier && (event.key === '+' || event.key === '=' || event.key === '-' || event.key === 'Add' || event.key === 'Subtract' || event.code === 'Equal' || event.code === 'Minus');
};
