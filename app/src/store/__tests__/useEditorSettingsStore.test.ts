import {beforeEach, describe, expect, it, jest} from '@jest/globals';

import {useEditorSettingsStore} from '../useEditorSettingsStore';

// Мок для localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    })
  };
})();

// Устанавливаем мок перед всеми тестами
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('useEditorSettingsStore', () => {
  // Очищаем состояние хранилища перед каждым тестом
  beforeEach(() => {
    localStorageMock.clear();
    useEditorSettingsStore.setState({
      theme: 'auto',
      grid: 'dots',
      gridGap: 20,
      canvasColor: 'lgray',
      snapToGrid: true,
      linkSnapping: true,
      linkThickness: 'thin',
      linkStyle: 'solid',
      controls: 'auto',
      toolsHotkeys: 'num'
    });
    jest.clearAllMocks();
  });

  it('should initialize with default values', () => {
    const state = useEditorSettingsStore.getState();
    expect(state.theme).toBe('auto');
    expect(state.grid).toBe('dots');
    expect(state.gridGap).toBe(20);
    expect(state.canvasColor).toBe('lgray');
    expect(state.snapToGrid).toBe(true);
    expect(state.linkSnapping).toBe(true);
    expect(state.linkThickness).toBe('thin');
    expect(state.linkStyle).toBe('solid');
    expect(state.controls).toBe('auto');
    expect(state.toolsHotkeys).toBe('num');
  });

  it('should update theme', () => {
    const {setTheme} = useEditorSettingsStore.getState();
    setTheme('dark');
    const state = useEditorSettingsStore.getState();
    expect(state.theme).toBe('dark');
    // Проверяем, что значение было сохранено в localStorage
    expect(localStorageMock.setItem).toHaveBeenCalled();
  });

  it('should update grid', () => {
    const {setGrid} = useEditorSettingsStore.getState();
    setGrid('lines');
    const state = useEditorSettingsStore.getState();
    expect(state.grid).toBe('lines');
    expect(localStorageMock.setItem).toHaveBeenCalled();
  });

  it('should update grid gap', () => {
    const {setGridGap} = useEditorSettingsStore.getState();
    setGridGap(30);
    const state = useEditorSettingsStore.getState();
    expect(state.gridGap).toBe(30);
    expect(localStorageMock.setItem).toHaveBeenCalled();
  });

  it('should update canvas color', () => {
    const {setCanvasColor} = useEditorSettingsStore.getState();
    setCanvasColor('lblue');
    const state = useEditorSettingsStore.getState();
    expect(state.canvasColor).toBe('lblue');
    expect(localStorageMock.setItem).toHaveBeenCalled();
  });

  it('should update snap to grid', () => {
    const {setSnapToGrid} = useEditorSettingsStore.getState();
    setSnapToGrid(false);
    const state = useEditorSettingsStore.getState();
    expect(state.snapToGrid).toBe(false);
    expect(localStorageMock.setItem).toHaveBeenCalled();
  });

  it('should update link snapping', () => {
    const {setLinkSnapping} = useEditorSettingsStore.getState();
    setLinkSnapping(false);
    const state = useEditorSettingsStore.getState();
    expect(state.linkSnapping).toBe(false);
    expect(localStorageMock.setItem).toHaveBeenCalled();
  });

  it('should update link thickness', () => {
    const {setLinkThickness} = useEditorSettingsStore.getState();
    setLinkThickness('thick');
    const state = useEditorSettingsStore.getState();
    expect(state.linkThickness).toBe('thick');
    expect(localStorageMock.setItem).toHaveBeenCalled();
  });

  it('should update link style', () => {
    const {setLinkStyle} = useEditorSettingsStore.getState();
    setLinkStyle('dash');
    const state = useEditorSettingsStore.getState();
    expect(state.linkStyle).toBe('dash');
    expect(localStorageMock.setItem).toHaveBeenCalled();
  });

  it('should update controls', () => {
    const {setControls} = useEditorSettingsStore.getState();
    setControls('touchpad');
    const state = useEditorSettingsStore.getState();
    expect(state.controls).toBe('touchpad');
    expect(localStorageMock.setItem).toHaveBeenCalled();
  });

  it('should update tools hotkeys', () => {
    const {setToolsHotkeys} = useEditorSettingsStore.getState();
    setToolsHotkeys('sym');
    const state = useEditorSettingsStore.getState();
    expect(state.toolsHotkeys).toBe('sym');
    expect(localStorageMock.setItem).toHaveBeenCalled();
  });

  it('should reset to defaults', () => {
    // Сначала изменим несколько настроек
    const {setTheme, setGrid, setGridGap, setLinkThickness, resetToDefaults} = useEditorSettingsStore.getState();
    setTheme('light');
    setGrid('lines');
    setGridGap(50);
    setLinkThickness('thick');

    // Проверим, что они изменились
    const stateBeforeReset = useEditorSettingsStore.getState();
    expect(stateBeforeReset.theme).toBe('light');
    expect(stateBeforeReset.grid).toBe('lines');
    expect(stateBeforeReset.gridGap).toBe(50);
    expect(stateBeforeReset.linkThickness).toBe('thick');

    // Теперь сбросим настройки
    resetToDefaults();

    // И проверим, что они вернулись к значениям по умолчанию
    const stateAfterReset = useEditorSettingsStore.getState();
    expect(stateAfterReset.theme).toBe('auto');
    expect(stateAfterReset.grid).toBe('dots');
    expect(stateAfterReset.gridGap).toBe(20);
    expect(stateAfterReset.canvasColor).toBe('lgray');
    expect(stateAfterReset.snapToGrid).toBe(true);
    expect(stateAfterReset.linkSnapping).toBe(true);
    expect(stateAfterReset.linkThickness).toBe('thin');
    expect(stateAfterReset.linkStyle).toBe('solid');
    expect(stateAfterReset.controls).toBe('auto');
    expect(stateAfterReset.toolsHotkeys).toBe('num');
  });

  it('should load settings from localStorage', () => {
    // Предварительно сохраним настройки в localStorage
    const settings = {
      theme: 'dark',
      grid: 'lines',
      gridGap: 40,
      canvasColor: 'lblue',
      snapToGrid: false,
      linkSnapping: false,
      linkThickness: 'thick',
      linkStyle: 'dash',
      controls: 'touchpad',
      toolsHotkeys: 'sym'
    };
    localStorage.setItem('editor_settings', JSON.stringify(settings));

    const {loadFromStorage} = useEditorSettingsStore.getState();
    loadFromStorage();

    const state = useEditorSettingsStore.getState();
    expect(state.theme).toBe('dark');
    expect(state.grid).toBe('lines');
    expect(state.gridGap).toBe(40);
    expect(state.canvasColor).toBe('lblue');
    expect(state.snapToGrid).toBe(false);
    expect(state.linkSnapping).toBe(false);
    expect(state.linkThickness).toBe('thick');
    expect(state.linkStyle).toBe('dash');
    expect(state.controls).toBe('touchpad');
    expect(state.toolsHotkeys).toBe('sym');
  });

  it('should handle error when loading from localStorage', () => {
    // Имитируем ошибку при получении данных из localStorage
    localStorageMock.getItem.mockImplementationOnce(() => {
      throw new Error('LocalStorage error');
    });

    const {loadFromStorage} = useEditorSettingsStore.getState();

    // Не должно выбросить ошибку
    expect(() => loadFromStorage()).not.toThrow();

    // Должно установить значения по умолчанию
    const state = useEditorSettingsStore.getState();
    expect(state.theme).toBe('auto');
  });

  it('should handle error when saving to localStorage', () => {
    // Имитируем ошибку при сохранении данных в localStorage
    localStorageMock.setItem.mockImplementationOnce(() => {
      throw new Error('LocalStorage error');
    });

    const {setTheme} = useEditorSettingsStore.getState();

    // Не должно выбросить ошибку
    expect(() => setTheme('dark')).not.toThrow();

    // Состояние должно измениться, несмотря на ошибку сохранения
    const state = useEditorSettingsStore.getState();
    expect(state.theme).toBe('dark');
  });

  it('should validate gridGap values', () => {
    const {setGridGap} = useEditorSettingsStore.getState();

    // Проверка допустимых значений
    setGridGap(10);
    expect(useEditorSettingsStore.getState().gridGap).toBe(10);

    setGridGap(20);
    expect(useEditorSettingsStore.getState().gridGap).toBe(20);

    setGridGap(30);
    expect(useEditorSettingsStore.getState().gridGap).toBe(30);

    setGridGap(40);
    expect(useEditorSettingsStore.getState().gridGap).toBe(40);

    setGridGap(50);
    expect(useEditorSettingsStore.getState().gridGap).toBe(50);

    // TypeScript должен предотвращать передачу недопустимых значений на этапе компиляции,
    // но мы всё равно можем проверить runtime-поведение через any
    const setGridGapAny = setGridGap as any;

    // Недопустимое значение не должно изменить текущее
    const currentGap = useEditorSettingsStore.getState().gridGap;
    setGridGapAny(15); // Недопустимое значение
    expect(useEditorSettingsStore.getState().gridGap).toBe(currentGap);
  });
});
