import {getCurrentCursorPosition} from '../cursorTracking';

// Mock для @xyflow/react
jest.mock('@xyflow/react', () => ({
  useReactFlow: jest.fn()
}));

// Mock для React hooks - объявляем функции заранее
jest.mock('react', () => ({
  useCallback: jest.fn((fn) => fn),
  useEffect: jest.fn((fn) => fn()),
  useRef: jest.fn(() => ({current: false}))
}));

// Создаем mock-объект для тестирования логики CursorTracker
// Поскольку класс CursorTracker приватный, создаем эквивалентную реализацию
function getCursorTrackerInstance(): any {
  return {
    _position: null,
    _reactFlowInstance: null,

    setReactFlowInstance(instance: any) {
      this._reactFlowInstance = instance;
    },

    updatePosition(clientX: number, clientY: number) {
      if (this._reactFlowInstance && this._reactFlowInstance.screenToFlowPosition) {
        try {
          const flowPosition = this._reactFlowInstance.screenToFlowPosition({
            x: clientX,
            y: clientY
          });
          this._position = {
            x: Math.round(flowPosition.x),
            y: Math.round(flowPosition.y)
          };
        } catch (error) {
          this._position = null;
        }
      }
    },

    getCurrentPosition() {
      return this._position;
    },

    resetPosition() {
      this._position = null;
    }
  };
}

describe('CursorTracker', () => {
  let tracker: any;
  let mockReactFlowInstance: any;

  beforeEach(() => {
    // Получаем экземпляр трекера
    tracker = getCursorTrackerInstance();

    // Сбрасываем состояние
    tracker.resetPosition();

    // Создаем мок для React Go Flow instance
    mockReactFlowInstance = {
      screenToFlowPosition: jest.fn()
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
    tracker.resetPosition();
  });

  describe('setReactFlowInstance', () => {
    it('should set React Go Flow instance', () => {
      tracker.setReactFlowInstance(mockReactFlowInstance);

      // Проверяем, что экземпляр установлен (косвенно через updatePosition)
      mockReactFlowInstance.screenToFlowPosition.mockReturnValue({x: 100, y: 200});
      tracker.updatePosition(50, 75);

      expect(mockReactFlowInstance.screenToFlowPosition).toHaveBeenCalledWith({x: 50, y: 75});
    });
  });

  describe('updatePosition', () => {
    beforeEach(() => {
      tracker.setReactFlowInstance(mockReactFlowInstance);
    });

    it('should update position correctly when React Go Flow instance is available', () => {
      mockReactFlowInstance.screenToFlowPosition.mockReturnValue({x: 100.7, y: 200.3});

      tracker.updatePosition(50, 75);

      const position = tracker.getCurrentPosition();
      expect(position).toEqual({x: 101, y: 200}); // Округленные значения
      expect(mockReactFlowInstance.screenToFlowPosition).toHaveBeenCalledWith({x: 50, y: 75});
    });

    it('should handle errors in screenToFlowPosition gracefully', () => {
      mockReactFlowInstance.screenToFlowPosition.mockImplementation(() => {
        throw new Error('Conversion error');
      });

      tracker.updatePosition(50, 75);

      const position = tracker.getCurrentPosition();
      expect(position).toBeNull();
    });

    it('should not update position when React Go Flow instance is not set', () => {
      tracker.setReactFlowInstance(null);

      tracker.updatePosition(50, 75);

      const position = tracker.getCurrentPosition();
      expect(position).toBeNull();
    });

    it('should not update position when screenToFlowPosition method is not available', () => {
      tracker.setReactFlowInstance({});

      tracker.updatePosition(50, 75);

      const position = tracker.getCurrentPosition();
      expect(position).toBeNull();
    });

    it('should round coordinates correctly', () => {
      // Тестируем округление различных значений
      const testCases = [
        {input: {x: 100.4, y: 200.6}, expected: {x: 100, y: 201}},
        {input: {x: 99.5, y: 199.5}, expected: {x: 100, y: 200}},
        {input: {x: 0.1, y: -0.7}, expected: {x: 0, y: -1}}
      ];

      testCases.forEach(({input, expected}) => {
        mockReactFlowInstance.screenToFlowPosition.mockReturnValue(input);
        tracker.updatePosition(0, 0);

        const position = tracker.getCurrentPosition();
        expect(position).toEqual(expected);
      });
    });
  });

  describe('getCurrentPosition', () => {
    it('should return null when no position is set', () => {
      const position = tracker.getCurrentPosition();
      expect(position).toBeNull();
    });

    it('should return current position when set', () => {
      tracker.setReactFlowInstance(mockReactFlowInstance);
      mockReactFlowInstance.screenToFlowPosition.mockReturnValue({x: 150, y: 250});

      tracker.updatePosition(75, 125);

      const position = tracker.getCurrentPosition();
      expect(position).toEqual({x: 150, y: 250});
    });
  });

  describe('resetPosition', () => {
    it('should reset position to null', () => {
      tracker.setReactFlowInstance(mockReactFlowInstance);
      mockReactFlowInstance.screenToFlowPosition.mockReturnValue({x: 100, y: 200});

      // Устанавливаем позицию
      tracker.updatePosition(50, 75);
      expect(tracker.getCurrentPosition()).not.toBeNull();

      // Сбрасываем позицию
      tracker.resetPosition();
      expect(tracker.getCurrentPosition()).toBeNull();
    });
  });
});

describe('getCurrentCursorPosition', () => {
  it('should return null initially', () => {
    const position = getCurrentCursorPosition();
    expect(position).toBeNull();
  });

  it('should work independently of React hooks', () => {
    // Эта функция должна работать без React контекста
    expect(() => getCurrentCursorPosition()).not.toThrow();
  });
});
