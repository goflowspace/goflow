import {DOM_EVENTS, SIZE_CONFIG} from '../constants';
import {calculateHeightFromLines, calculateHeightFromText, calculateLinesFromText, updateNodeConnections} from '../utils';

// Мокаем DOM API
const dispatchEventMock = jest.fn();
Object.defineProperty(document, 'dispatchEvent', {
  value: dispatchEventMock,
  writable: true
});

// Мокаем глобальный setTimeout
jest.useFakeTimers();

describe('ChoiceNode Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateLinesFromText', () => {
    it('returns MIN_LINES for empty text', () => {
      const result = calculateLinesFromText('');
      expect(result).toBe(SIZE_CONFIG.MIN_LINES);
    });

    it('calculates lines for single-line text', () => {
      const shortText = 'Short text';
      expect(calculateLinesFromText(shortText)).toBe(SIZE_CONFIG.MIN_LINES);
    });

    it('calculates lines for multi-line text with line breaks', () => {
      const multiLineText = 'Line 1\nLine 2\nLine 3';
      expect(calculateLinesFromText(multiLineText)).toBe(3);
    });

    it('calculates lines for long text that wraps', () => {
      // Создаем текст, который будет длиннее CHARS_PER_LINE
      const longText = 'A'.repeat(SIZE_CONFIG.CHARS_PER_LINE * 2);
      expect(calculateLinesFromText(longText)).toBe(2);
    });

    it('handles empty lines correctly', () => {
      const textWithEmptyLines = 'Line 1\n\nLine 3';
      expect(calculateLinesFromText(textWithEmptyLines)).toBe(3);
    });

    it('respects MAX_LINES limit', () => {
      // Создаем текст с числом строк больше MAX_LINES
      const veryLongText = 'A\n'.repeat(SIZE_CONFIG.MAX_LINES + 5);
      expect(calculateLinesFromText(veryLongText)).toBe(SIZE_CONFIG.MAX_LINES);
    });
  });

  describe('calculateHeightFromLines', () => {
    it('returns BASE_HEIGHT for MIN_LINES', () => {
      const result = calculateHeightFromLines(SIZE_CONFIG.MIN_LINES);
      expect(result).toBe(SIZE_CONFIG.BASE_HEIGHT);
    });

    it('calculates height for lines more than MIN_LINES', () => {
      const lines = SIZE_CONFIG.MIN_LINES + 2;
      const expectedHeight = SIZE_CONFIG.BASE_HEIGHT + 2 * SIZE_CONFIG.LINE_HEIGHT;

      expect(calculateHeightFromLines(lines)).toBe(expectedHeight);
    });

    it('respects MAX_HEIGHT limit', () => {
      // Создаем такое число строк, которое бы превысило MAX_HEIGHT
      const tooManyLines = Math.ceil((SIZE_CONFIG.MAX_HEIGHT - SIZE_CONFIG.BASE_HEIGHT) / SIZE_CONFIG.LINE_HEIGHT) + SIZE_CONFIG.MIN_LINES + 10;

      expect(calculateHeightFromLines(tooManyLines)).toBe(SIZE_CONFIG.MAX_HEIGHT);
    });
  });

  describe('calculateHeightFromText', () => {
    it('calls calculateLinesFromText and calculateHeightFromLines', () => {
      const text = 'Test text';
      const result = calculateHeightFromText(text);

      // Для короткого текста ожидаем BASE_HEIGHT
      expect(result).toBe(SIZE_CONFIG.BASE_HEIGHT);
    });

    it('correctly calculates height for empty text', () => {
      expect(calculateHeightFromText('')).toBe(SIZE_CONFIG.BASE_HEIGHT);
    });

    it('correctly calculates height for multi-line text', () => {
      const multiLineText = 'Line 1\nLine 2\nLine 3';
      const expectedLines = 3;
      const expectedHeight = SIZE_CONFIG.BASE_HEIGHT + (expectedLines - SIZE_CONFIG.MIN_LINES) * SIZE_CONFIG.LINE_HEIGHT;

      expect(calculateHeightFromText(multiLineText)).toBe(expectedHeight);
    });
  });

  describe('updateNodeConnections', () => {
    it('dispatches a custom event with the correct nodeId', () => {
      const nodeId = 'test-node-id';
      updateNodeConnections(nodeId, 0);

      // Форсируем выполнение всех таймеров
      jest.runAllTimers();

      expect(dispatchEventMock).toHaveBeenCalledTimes(1);

      // Проверяем, что событие было отправлено с правильным типом и данными
      const event = dispatchEventMock.mock.calls[0][0];
      expect(event.type).toBe(DOM_EVENTS.UPDATE_NODE_INTERNALS);
      expect(event.detail).toEqual({nodeId});
    });

    it('respects the delay parameter', () => {
      const nodeId = 'test-node-id';
      const delay = 100;

      updateNodeConnections(nodeId, delay);

      // До истечения задержки событие не должно быть отправлено
      expect(dispatchEventMock).not.toHaveBeenCalled();

      // Прокручиваем таймеры вперед
      jest.advanceTimersByTime(delay);

      // Теперь событие должно быть отправлено
      expect(dispatchEventMock).toHaveBeenCalledTimes(1);
    });
  });
});
