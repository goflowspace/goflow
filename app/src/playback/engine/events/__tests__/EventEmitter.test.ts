import {ChoiceSelectedEvent, NodeVisitedEvent, PlaybackEngineEvent} from '../EngineEvents';
import {SimpleEventEmitter} from '../EventEmitter';

describe('SimpleEventEmitter', () => {
  let emitter: SimpleEventEmitter;
  let mockListener: jest.Mock;
  let mockListener2: jest.Mock;

  beforeEach(() => {
    emitter = new SimpleEventEmitter();
    mockListener = jest.fn();
    mockListener2 = jest.fn();
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Управление слушателями', () => {
    it('должен добавлять слушателя', () => {
      emitter.on(mockListener);

      const event: NodeVisitedEvent = {
        type: 'node.visited',
        timestamp: Date.now(),
        nodeId: 'node1',
        nodeName: 'Test Node',
        nodeType: 'narrative'
      };

      emitter.emit(event);

      expect(mockListener).toHaveBeenCalledTimes(1);
      expect(mockListener).toHaveBeenCalledWith(event);
    });

    it('должен поддерживать несколько слушателей', () => {
      emitter.on(mockListener);
      emitter.on(mockListener2);

      const event: NodeVisitedEvent = {
        type: 'node.visited',
        timestamp: Date.now(),
        nodeId: 'node1',
        nodeName: 'Test Node',
        nodeType: 'narrative'
      };

      emitter.emit(event);

      expect(mockListener).toHaveBeenCalledTimes(1);
      expect(mockListener2).toHaveBeenCalledTimes(1);
      expect(mockListener).toHaveBeenCalledWith(event);
      expect(mockListener2).toHaveBeenCalledWith(event);
    });

    it('должен удалять слушателя', () => {
      emitter.on(mockListener);
      emitter.on(mockListener2);
      emitter.off(mockListener);

      const event: NodeVisitedEvent = {
        type: 'node.visited',
        timestamp: Date.now(),
        nodeId: 'node1',
        nodeName: 'Test Node',
        nodeType: 'narrative'
      };

      emitter.emit(event);

      expect(mockListener).not.toHaveBeenCalled();
      expect(mockListener2).toHaveBeenCalledTimes(1);
    });

    it('должен безопасно обрабатывать удаление несуществующего слушателя', () => {
      const nonExistentListener = jest.fn();

      expect(() => {
        emitter.off(nonExistentListener);
      }).not.toThrow();
    });

    it('должен удалять всех слушателей', () => {
      emitter.on(mockListener);
      emitter.on(mockListener2);

      emitter.removeAllListeners();

      const event: NodeVisitedEvent = {
        type: 'node.visited',
        timestamp: Date.now(),
        nodeId: 'node1',
        nodeName: 'Test Node',
        nodeType: 'narrative'
      };

      emitter.emit(event);

      expect(mockListener).not.toHaveBeenCalled();
      expect(mockListener2).not.toHaveBeenCalled();
    });
  });

  describe('Эмиссия событий', () => {
    it('должен добавлять timestamp к событию, если его нет', () => {
      emitter.on(mockListener);

      const eventWithoutTimestamp = {
        type: 'node.visited',
        nodeId: 'node1',
        nodeName: 'Test Node',
        nodeType: 'narrative'
      } as NodeVisitedEvent;

      const beforeEmit = Date.now();
      emitter.emit(eventWithoutTimestamp);
      const afterEmit = Date.now();

      expect(mockListener).toHaveBeenCalledTimes(1);
      const emittedEvent = mockListener.mock.calls[0][0];
      expect(emittedEvent.timestamp).toBeDefined();
      expect(emittedEvent.timestamp).toBeGreaterThanOrEqual(beforeEmit);
      expect(emittedEvent.timestamp).toBeLessThanOrEqual(afterEmit);
    });

    it('должен сохранять существующий timestamp', () => {
      emitter.on(mockListener);

      const customTimestamp = 123456789;
      const event: NodeVisitedEvent = {
        type: 'node.visited',
        timestamp: customTimestamp,
        nodeId: 'node1',
        nodeName: 'Test Node',
        nodeType: 'narrative'
      };

      emitter.emit(event);

      expect(mockListener).toHaveBeenCalledTimes(1);
      expect(mockListener.mock.calls[0][0].timestamp).toBe(customTimestamp);
    });

    it('должен передавать событие всем слушателям без изменений (кроме timestamp)', () => {
      emitter.on(mockListener);
      emitter.on(mockListener2);

      const event: ChoiceSelectedEvent = {
        type: 'choice.selected',
        timestamp: Date.now(),
        nodeId: 'node1',
        choice: {
          id: 'choice1',
          text: 'Choice Text',
          hasNextNode: true
        }
      };

      emitter.emit(event);

      expect(mockListener).toHaveBeenCalledWith(event);
      expect(mockListener2).toHaveBeenCalledWith(event);

      // Проверяем, что оба слушателя получили одинаковый объект
      expect(mockListener.mock.calls[0][0]).toEqual(mockListener2.mock.calls[0][0]);
    });
  });

  describe('Обработка ошибок', () => {
    it('должен продолжать уведомлять других слушателей при ошибке в одном', () => {
      const errorListener = jest.fn(() => {
        throw new Error('Test error');
      });

      emitter.on(errorListener);
      emitter.on(mockListener);
      emitter.on(mockListener2);

      const event: NodeVisitedEvent = {
        type: 'node.visited',
        timestamp: Date.now(),
        nodeId: 'node1',
        nodeName: 'Test Node',
        nodeType: 'narrative'
      };

      emitter.emit(event);

      expect(errorListener).toHaveBeenCalledTimes(1);
      expect(mockListener).toHaveBeenCalledTimes(1);
      expect(mockListener2).toHaveBeenCalledTimes(1);
      expect(console.error).toHaveBeenCalledWith('Error in event listener:', expect.any(Error));
    });

    it('должен логировать все ошибки от разных слушателей', () => {
      const errorListener1 = jest.fn(() => {
        throw new Error('Error 1');
      });
      const errorListener2 = jest.fn(() => {
        throw new Error('Error 2');
      });

      emitter.on(errorListener1);
      emitter.on(mockListener);
      emitter.on(errorListener2);

      const event: NodeVisitedEvent = {
        type: 'node.visited',
        timestamp: Date.now(),
        nodeId: 'node1',
        nodeName: 'Test Node',
        nodeType: 'narrative'
      };

      emitter.emit(event);

      expect(console.error).toHaveBeenCalledTimes(2);
      expect(console.error).toHaveBeenNthCalledWith(1, 'Error in event listener:', expect.objectContaining({message: 'Error 1'}));
      expect(console.error).toHaveBeenNthCalledWith(2, 'Error in event listener:', expect.objectContaining({message: 'Error 2'}));
      expect(mockListener).toHaveBeenCalledTimes(1);
    });
  });

  describe('Регрессионные тесты', () => {
    it('не должен вызывать слушателей при пустом событии', () => {
      emitter.on(mockListener);

      emitter.emit({} as PlaybackEngineEvent);

      expect(mockListener).toHaveBeenCalledTimes(1);
      expect(mockListener).toHaveBeenCalledWith(
        expect.objectContaining({
          timestamp: expect.any(Number)
        })
      );
    });

    it('должен корректно обрабатывать повторное добавление одного слушателя', () => {
      emitter.on(mockListener);
      emitter.on(mockListener); // Добавляем второй раз

      const event: NodeVisitedEvent = {
        type: 'node.visited',
        timestamp: Date.now(),
        nodeId: 'node1',
        nodeName: 'Test Node',
        nodeType: 'narrative'
      };

      emitter.emit(event);

      // Set должен предотвратить дублирование
      expect(mockListener).toHaveBeenCalledTimes(1);
    });

    it('должен корректно работать после удаления всех слушателей и добавления новых', () => {
      emitter.on(mockListener);
      emitter.removeAllListeners();
      emitter.on(mockListener2);

      const event: NodeVisitedEvent = {
        type: 'node.visited',
        timestamp: Date.now(),
        nodeId: 'node1',
        nodeName: 'Test Node',
        nodeType: 'narrative'
      };

      emitter.emit(event);

      expect(mockListener).not.toHaveBeenCalled();
      expect(mockListener2).toHaveBeenCalledTimes(1);
    });
  });
});
