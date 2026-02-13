/**
 * Утилиты для работы с textarea
 */

/**
 * Создает временный элемент для измерения размеров текста
 * @param textarea - исходный textarea элемент
 * @param content - содержимое для измерения
 * @returns высота контента в пикселях
 */
const measureTextHeight = (textarea: HTMLTextAreaElement, content: string): number => {
  // Создаем временный div с теми же стилями, что и textarea
  const measurer = document.createElement('div');
  const computedStyle = window.getComputedStyle(textarea);

  // Копируем важные стили для корректного измерения
  measurer.style.position = 'absolute';
  measurer.style.visibility = 'hidden';
  measurer.style.height = 'auto';
  measurer.style.width = computedStyle.width;
  measurer.style.fontSize = computedStyle.fontSize;
  measurer.style.fontFamily = computedStyle.fontFamily;
  measurer.style.fontWeight = computedStyle.fontWeight;
  measurer.style.lineHeight = computedStyle.lineHeight;
  measurer.style.letterSpacing = computedStyle.letterSpacing;
  measurer.style.paddingLeft = computedStyle.paddingLeft;
  measurer.style.paddingRight = computedStyle.paddingRight;
  measurer.style.borderLeftWidth = computedStyle.borderLeftWidth;
  measurer.style.borderRightWidth = computedStyle.borderRightWidth;
  measurer.style.boxSizing = computedStyle.boxSizing;
  measurer.style.whiteSpace = 'pre-wrap';
  measurer.style.wordWrap = 'break-word';
  measurer.style.overflowWrap = 'break-word';

  // Устанавливаем содержимое
  measurer.textContent = content || ' '; // Используем пробел для пустого контента

  // Добавляем в DOM, измеряем и удаляем
  document.body.appendChild(measurer);
  const height = measurer.scrollHeight;
  document.body.removeChild(measurer);

  return height;
};

/**
 * Вычисляет оптимальное количество строк для textarea на основе реального содержимого
 * @param content - содержимое textarea
 * @param textarea - HTML элемент textarea для получения стилей
 * @param minRows - минимальное количество строк
 * @param maxRows - максимальное количество строк
 * @returns оптимальное количество строк
 */
export const calculateOptimalRows = (content: string, textarea: HTMLTextAreaElement | null | undefined, minRows: number = 2, maxRows: number = 8): number => {
  if (!textarea) {
    // Fallback если нет элемента
    const lines = content ? content.split('\n').length : 1;
    return Math.max(minRows, Math.min(maxRows, lines));
  }

  if (!content || content.trim().length === 0) {
    return minRows;
  }

  try {
    // Получаем высоту одной строки
    const singleLineHeight = measureTextHeight(textarea, 'A');

    // Получаем высоту всего контента
    const contentHeight = measureTextHeight(textarea, content);

    // Вычисляем количество строк
    const calculatedRows = Math.ceil(contentHeight / singleLineHeight);

    // Ограничиваем минимумом и максимумом
    return Math.max(minRows, Math.min(maxRows, calculatedRows));
  } catch (error) {
    console.warn('Error calculating optimal rows:', error);
    // Fallback к простому подсчету строк
    const lines = content.split('\n').length;
    return Math.max(minRows, Math.min(maxRows, lines));
  }
};

/**
 * Получает оптимальный размер для конкретного типа поля библии проекта
 * @param fieldType - тип поля
 * @param content - содержимое поля
 * @param textarea - HTML элемент textarea для точного измерения
 * @returns оптимальное количество строк
 */
export const getOptimalRowsForBibleField = (fieldType: string, content: string, textarea?: HTMLTextAreaElement | null | undefined): number => {
  // Определяем параметры для разных типов полей
  const fieldConfig: Record<string, {min: number; max: number}> = {
    logline: {min: 2, max: 4},
    synopsis: {min: 4, max: 50},
    setting: {min: 3, max: 50},
    targetAudience: {min: 2, max: 50},
    mainThemes: {min: 3, max: 50},
    message: {min: 2, max: 50},
    references: {min: 3, max: 50},
    uniqueFeatures: {min: 3, max: 50},
    atmosphere: {min: 2, max: 50},
    constraints: {min: 3, max: 50}
  };

  const config = fieldConfig[fieldType] || {min: 2, max: 8};

  return calculateOptimalRows(content, textarea, config.min, config.max);
};
