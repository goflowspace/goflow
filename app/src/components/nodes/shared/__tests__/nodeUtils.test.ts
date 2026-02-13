import {DELAYS, DOM_EVENTS} from '../constants';
import {hasValueChanged, updateNodeConnections} from '../nodeUtils';

describe('nodeUtils', () => {
  describe('updateNodeConnections', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.spyOn(document, 'dispatchEvent');
      jest.spyOn(global, 'setTimeout');
    });

    afterEach(() => {
      jest.useRealTimers();
      jest.clearAllMocks();
    });

    it('dispatches updateNodeInternals event with node ID', () => {
      const nodeId = 'test-node-id';

      updateNodeConnections(nodeId);

      // Проверяем, что таймер был запущен
      expect(global.setTimeout).toHaveBeenCalledWith(expect.any(Function), 0);

      // Запускаем таймеры
      jest.runAllTimers();

      // Проверяем, что событие было отправлено с правильным ID
      expect(document.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: DOM_EVENTS.UPDATE_NODE_INTERNALS,
          detail: {nodeId}
        })
      );
    });

    it('uses custom delay when provided', () => {
      const nodeId = 'test-node-id';
      const customDelay = 100;

      updateNodeConnections(nodeId, customDelay);

      // Проверяем, что таймер был запущен с указанной задержкой
      expect(global.setTimeout).toHaveBeenCalledWith(expect.any(Function), customDelay);

      // Запускаем таймеры
      jest.runAllTimers();

      // Проверяем, что событие было отправлено
      expect(document.dispatchEvent).toHaveBeenCalled();
    });
  });

  describe('hasValueChanged', () => {
    it('returns true for different string values', () => {
      expect(hasValueChanged('old', 'new')).toBe(true);
    });

    it('returns false for same string values', () => {
      expect(hasValueChanged('same', 'same')).toBe(false);
    });

    it('returns true for different object values', () => {
      expect(hasValueChanged({a: 1}, {a: 2})).toBe(true);
      expect(hasValueChanged({a: 1}, {b: 1})).toBe(true);
    });

    it('returns false for same object values', () => {
      expect(hasValueChanged({a: 1, b: 2}, {a: 1, b: 2})).toBe(false);
    });

    it('returns true for different primitive values', () => {
      expect(hasValueChanged(1, 2)).toBe(true);
      expect(hasValueChanged(true, false)).toBe(true);
      expect(hasValueChanged(null, undefined)).toBe(true);
    });

    it('returns false for same primitive values', () => {
      expect(hasValueChanged(1, 1)).toBe(false);
      expect(hasValueChanged(true, true)).toBe(false);
      expect(hasValueChanged(null, null)).toBe(false);
    });
  });
});
