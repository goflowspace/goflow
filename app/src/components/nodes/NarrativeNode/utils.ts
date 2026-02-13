import {MutableRefObject} from 'react';

import {DOM_EVENTS, TEXT_CONFIG} from './constants';

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
 * Устанавливает высоту текстового поля в соответствии с содержимым
 *
 * @param textArea - Ссылка на текстовое поле
 * @returns Информацию о количестве строк и линий
 */
export const adjustTextAreaHeight = (textArea: HTMLTextAreaElement | null): {rowsNeeded: number; maxRows: number; lineHeight: number} | undefined => {
  if (!textArea) return;

  textArea.style.height = 'auto';

  const style = window.getComputedStyle(textArea);
  const lineHeight = parseFloat(style.lineHeight || '1.5em');
  const computedLineHeight = lineHeight || 18;
  const maxRows = TEXT_CONFIG.MAX_ROWS;
  const maxHeight = computedLineHeight * maxRows;
  const scrollHeight = textArea.scrollHeight;

  const rowsNeeded = Math.ceil(scrollHeight / computedLineHeight);

  const newHeight = Math.min(scrollHeight, maxHeight);
  textArea.style.height = `${newHeight}px`;
  textArea.style.overflowY = rowsNeeded > maxRows ? 'auto' : 'hidden';

  return {rowsNeeded, maxRows, lineHeight: computedLineHeight};
};

/**
 * Подгоняет высоту карточки в зависимости от содержимого
 *
 * @param params - Параметры для расчета высоты
 */
export const adjustCardHeight = ({
  cardRef,
  staticTextRef,
  textRef,
  isEditingText,
  id
}: {
  cardRef: MutableRefObject<HTMLDivElement | null>;
  staticTextRef: MutableRefObject<HTMLDivElement | null>;
  textRef: MutableRefObject<HTMLTextAreaElement | null>;
  isEditingText: boolean;
  id: string;
}): void => {
  if (!cardRef.current) return;

  // Базовые константы для расчетов
  const headerHeight = TEXT_CONFIG.HEADER_HEIGHT;
  const minTextHeight = TEXT_CONFIG.MIN_TEXT_HEIGHT;
  const maxRows = TEXT_CONFIG.MAX_ROWS;
  const safetyMargin = TEXT_CONFIG.SAFETY_MARGIN;

  // Определяем высоту текстового содержимого
  let textContentHeight = minTextHeight;

  if (!isEditingText && staticTextRef.current) {
    // Расчет для статичного режима
    const staticTextStyle = window.getComputedStyle(staticTextRef.current);
    const lineHeight = parseFloat(staticTextStyle.lineHeight || '1.5em');
    const computedLineHeight = lineHeight || 18;

    // Измеряем реальную высоту контента
    const actualTextHeight = staticTextRef.current.scrollHeight;

    // Ограничиваем maxRows
    const maxStaticHeight = computedLineHeight * maxRows;
    textContentHeight = Math.max(minTextHeight, Math.min(actualTextHeight, maxStaticHeight));
  } else if (isEditingText && textRef.current) {
    // Расчет для режима редактирования
    const textAreaStyle = window.getComputedStyle(textRef.current);
    const lineHeight = parseFloat(textAreaStyle.lineHeight || '1.5em');
    const computedLineHeight = lineHeight || 18;

    // Измеряем реальную высоту контента
    const actualTextHeight = textRef.current.scrollHeight;

    // Ограничиваем maxRows
    const maxEditHeight = computedLineHeight * maxRows;
    textContentHeight = Math.max(minTextHeight, Math.min(actualTextHeight, maxEditHeight));
  }
  // Минимальная высота контента
  const baseContentHeight = headerHeight + textContentHeight;

  // Общая высота карточки
  const totalHeight = baseContentHeight + safetyMargin;

  // Применяем высоту с плавной анимацией
  if (cardRef.current) {
    // Устанавливаем короткий переход для быстрой анимации
    cardRef.current.style.transition = `height ${TEXT_CONFIG.ANIMATION_DURATION}ms ease-out`;

    // Устанавливаем высоту
    cardRef.current.style.height = `${totalHeight}px`;

    // Обновляем соединения
    updateNodeConnections(id);

    // Еще раз обновляем через короткую задержку для финальной перерисовки
    setTimeout(() => {
      updateNodeConnections(id);
    }, TEXT_CONFIG.NODE_UPDATE_DELAY);
  }
};

/**
 * Функция для определения фактического количества строк текста
 *
 * @param text - Текст для анализа
 * @returns Количество строк с учетом переносов
 */
export const getTextLinesCount = (text: string): number => {
  if (!text) return 0;

  // Считаем явные переносы строк
  const explicitLines = text.split('\n').length;

  // Быстрая эвристика для примерной оценки переносов слов
  const avgCharsPerLine = TEXT_CONFIG.CHARS_PER_LINE;
  const totalTextLength = text.length;
  const estimatedLineWraps = Math.floor(totalTextLength / avgCharsPerLine);

  // Общее примерное количество строк
  return explicitLines + estimatedLineWraps;
};
