import {DOM_EVENTS, SIZE_CONFIG} from './constants';

/**
 * Обновляет соединения для указанного узла
 *
 * @param nodeId - ID узла
 * @param delay - Задержка перед отправкой события
 */
export const updateNodeConnections = (nodeId: string, delay = 0): void => {
  setTimeout(() => {
    const updateEvent = new CustomEvent(DOM_EVENTS.UPDATE_NODE_INTERNALS, {
      detail: {nodeId}
    });
    document.dispatchEvent(updateEvent);
  }, delay);
};

/**
 * Рассчитывает количество строк на основе текста
 *
 * @param text - Текст для анализа
 * @returns Рассчитанное количество строк
 */
export const calculateLinesFromText = (text: string): number => {
  if (!text) return SIZE_CONFIG.MIN_LINES;

  // Разбиваем текст на строки
  const lines = text.split('\n');
  let totalLines = 0;

  // Для каждой строки определяем, сколько строк она займет
  lines.forEach((line) => {
    if (line.length === 0) {
      // Пустая строка
      totalLines += 1;
    } else {
      // Расчет количества строк для непустой строки
      const lineCount = Math.ceil(line.length / SIZE_CONFIG.CHARS_PER_LINE);
      totalLines += lineCount;
    }
  });

  // Ограничиваем количество строк между MIN_LINES и MAX_LINES
  return Math.max(SIZE_CONFIG.MIN_LINES, Math.min(SIZE_CONFIG.MAX_LINES, totalLines));
};

/**
 * Рассчитывает высоту узла на основе количества строк
 *
 * @param lineCount - Количество строк текста
 * @returns Рассчитанная высота в пикселях
 */
export const calculateHeightFromLines = (lineCount: number): number => {
  // Базовая высота для MIN_LINES строк
  if (lineCount <= SIZE_CONFIG.MIN_LINES) return SIZE_CONFIG.BASE_HEIGHT;

  // Дополнительная высота для строк сверх минимума
  const additionalHeight = (lineCount - SIZE_CONFIG.MIN_LINES) * SIZE_CONFIG.LINE_HEIGHT;

  return Math.min(SIZE_CONFIG.MAX_HEIGHT, SIZE_CONFIG.BASE_HEIGHT + additionalHeight);
};

/**
 * Рассчитывает высоту узла на основе текста
 *
 * @param text - Текст для анализа
 * @returns Рассчитанная высота в пикселях
 */
export const calculateHeightFromText = (text: string): number => {
  const lineCount = calculateLinesFromText(text);
  return calculateHeightFromLines(lineCount);
};
