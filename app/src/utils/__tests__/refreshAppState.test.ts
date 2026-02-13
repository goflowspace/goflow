import {STORY_KEY, StorageService} from 'src/services/storageService';

import {useCanvasStore} from '@store/useCanvasStore';
import {useGraphStore} from '@store/useGraphStore';
import {useLayerStore} from '@store/useLayerStore';
import {useVariablesStore} from '@store/useVariablesStore';

import {refreshAppState} from '../refreshAppState';

// Мокаем модули
jest.mock('src/services/storageService');
jest.mock('@store/useGraphStore');
jest.mock('@store/useCanvasStore');
jest.mock('@store/useLayerStore');
jest.mock('@store/useVariablesStore');

describe('refreshAppState', () => {
  // Создаем тестовые данные
  const projectTitle = 'Тестовый проект';
  const projectLayers = {
    root: {
      id: 'root',
      name: 'Главный слой',
      type: 'layer',
      depth: 0,
      nodes: {},
      edges: {},
      nodeIds: []
    },
    secondLayer: {
      id: 'secondLayer',
      name: 'Второй слой',
      type: 'layer',
      depth: 1,
      nodes: {},
      edges: {},
      nodeIds: []
    }
  };
  const lastLayerNumber = 2;
  const variables = [{id: '1', name: 'testVar', value: '10', type: 'number'}];

  // Настраиваем моки перед каждым тестом
  beforeEach(() => {
    jest.resetAllMocks();
    jest.useFakeTimers();

    // Мокаем useState хранилищ
    (useGraphStore.setState as jest.Mock).mockImplementation(() => {});
    (useCanvasStore.setState as jest.Mock).mockImplementation(() => {});
    (useLayerStore.setState as jest.Mock).mockImplementation(() => {});
    (useVariablesStore.getState as jest.Mock).mockReturnValue({
      setVariables: jest.fn()
    });

    // Мокаем getState для useGraphStore с правильными метаданными и методом saveToDb
    const saveToDbMock = jest.fn().mockResolvedValue(undefined);
    (useGraphStore.getState as jest.Mock).mockReturnValue({
      layerMetadata: {
        root: {
          panelState: {startPanelOpen: true, endPanelOpen: true},
          viewport: {x: 0, y: 0, zoom: 1}
        },
        secondLayer: {
          panelState: {startPanelOpen: true, endPanelOpen: true},
          viewport: {x: 0, y: 0, zoom: 1}
        }
      },
      saveToDb: saveToDbMock
    });

    // Мокаем методы хранилища
    (StorageService.removeItem as jest.Mock).mockImplementation(() => {});
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('должен обновить название проекта если предоставлена функция setProjectName', () => {
    // Создаем мок функции setProjectName
    const setProjectName = jest.fn();

    // Вызываем тестируемую функцию
    refreshAppState(projectTitle, projectLayers, lastLayerNumber, variables, setProjectName);

    // Проверяем что функция setProjectName вызвана с правильным аргументом
    expect(setProjectName).toHaveBeenCalledWith(projectTitle);
  });

  it('не должен вызывать setProjectName если она не предоставлена', () => {
    // Создаем мок функции setProjectName
    const setProjectName = jest.fn();

    // Вызываем тестируемую функцию без функции setProjectName
    refreshAppState(projectTitle, projectLayers, lastLayerNumber, variables);

    // Проверяем что функция setProjectName не вызывалась
    expect(setProjectName).not.toHaveBeenCalled();
  });

  it('должен корректно инициализировать метаданные для слоев', () => {
    // Вызываем тестируемую функцию
    refreshAppState(projectTitle, projectLayers, lastLayerNumber, variables);

    // Проверяем что useGraphStore.setState вызван с правильными аргументами
    expect(useGraphStore.setState).toHaveBeenCalledWith({
      layers: projectLayers,
      currentGraphId: 'root',
      hasLoadedFromStorage: true,
      lastLayerNumber: lastLayerNumber,
      layerMetadata: {
        root: {
          panelState: {startPanelOpen: true, endPanelOpen: true},
          viewport: {x: 0, y: 0, zoom: 1}
        },
        secondLayer: {
          panelState: {startPanelOpen: true, endPanelOpen: true},
          viewport: {x: 0, y: 0, zoom: 1}
        }
      }
    });
  });

  it('должен устанавливать переменные если они предоставлены', () => {
    // Создаем мок функции setVariables
    const setVariables = jest.fn();
    (useVariablesStore.getState as jest.Mock).mockReturnValue({
      setVariables
    });

    // Вызываем тестируемую функцию
    refreshAppState(projectTitle, projectLayers, lastLayerNumber, variables);

    // Проверяем что функция setVariables вызвана с правильным аргументом
    expect(setVariables).toHaveBeenCalledWith(variables);
  });

  it('не должен устанавливать переменные если массив пуст', () => {
    // Создаем мок функции setVariables
    const setVariables = jest.fn();
    (useVariablesStore.getState as jest.Mock).mockReturnValue({
      setVariables
    });

    // Вызываем тестируемую функцию с пустым массивом переменных
    refreshAppState(projectTitle, projectLayers, lastLayerNumber, []);

    // Проверяем что функция setVariables не вызывалась
    expect(setVariables).not.toHaveBeenCalled();
  });

  it('должен обновить состояние канваса', () => {
    // Вызываем тестируемую функцию
    refreshAppState(projectTitle, projectLayers, lastLayerNumber, variables);

    // Проверяем что useCanvasStore.setState вызван с правильными аргументами
    expect(useCanvasStore.setState).toHaveBeenCalledWith({
      nodes: [],
      edges: [],
      draggingNodeId: null
    });
  });

  it('должен обновить состояние слоев', () => {
    // Вызываем тестируемую функцию
    refreshAppState(projectTitle, projectLayers, lastLayerNumber, variables);

    // Проверяем что useLayerStore.setState вызван с правильными аргументами
    expect(useLayerStore.setState).toHaveBeenCalledWith({
      currentLayer: 'Главный слой',
      isLayersPanelOpen: false
    });
  });

  it('должен сохранить данные в IndexedDB', () => {
    // Вызываем тестируемую функцию
    refreshAppState(projectTitle, projectLayers, lastLayerNumber, variables);

    // Проверяем что saveToDb был вызван
    const mockGraphStore = useGraphStore.getState as jest.Mock;
    expect(mockGraphStore().saveToDb).toHaveBeenCalled();
  });

  it('должен очистить preview из localStorage', () => {
    // Вызываем тестируемую функцию
    refreshAppState(projectTitle, projectLayers, lastLayerNumber, variables);

    // Проверяем что StorageService.removeItem вызван с правильным аргументом
    expect(StorageService.removeItem).toHaveBeenCalledWith(STORY_KEY);
  });

  it('должен имитировать переключение слоев для нескольких слоев', () => {
    // Вызываем тестируемую функцию
    refreshAppState(projectTitle, projectLayers, lastLayerNumber, variables);

    // Проверяем первый вызов таймера - переключение на другой слой
    jest.runOnlyPendingTimers();
    expect(useGraphStore.setState).toHaveBeenCalledWith({currentGraphId: 'secondLayer'});

    // Проверяем второй вызов таймера - переключение обратно на root
    jest.runOnlyPendingTimers();
    expect(useGraphStore.setState).toHaveBeenCalledWith({currentGraphId: 'root'});

    // Проверяем третий вызов таймера - изменение viewport для перерисовки
    jest.runOnlyPendingTimers();
    expect(useGraphStore.setState).toHaveBeenCalledWith({
      layerMetadata: expect.objectContaining({
        root: expect.objectContaining({
          viewport: expect.objectContaining({zoom: 1.01})
        })
      })
    });

    // Проверяем четвертый вызов таймера - возврат viewport к исходному значению
    jest.runOnlyPendingTimers();
    expect(useGraphStore.setState).toHaveBeenCalledWith({
      layerMetadata: expect.objectContaining({
        root: expect.objectContaining({
          viewport: expect.objectContaining({zoom: 1})
        })
      })
    });
  });

  it('должен имитировать переключение слоев для одного слоя', () => {
    // Создаем проект с одним слоем
    const singleLayerProject = {
      root: projectLayers.root
    };

    // Вызываем тестируемую функцию
    refreshAppState(projectTitle, singleLayerProject, lastLayerNumber, variables);

    // Проверяем первый вызов таймера - переключение на временный слой
    jest.runOnlyPendingTimers();
    expect(useGraphStore.setState).toHaveBeenCalledWith({currentGraphId: '_temp_'});

    // Проверяем второй вызов таймера - переключение обратно на root
    jest.runOnlyPendingTimers();
    expect(useGraphStore.setState).toHaveBeenCalledWith({currentGraphId: 'root'});

    // Проверяем третий вызов таймера - изменение viewport для перерисовки
    jest.runOnlyPendingTimers();
    expect(useGraphStore.setState).toHaveBeenCalledWith({
      layerMetadata: expect.any(Object)
    });

    // Проверяем четвертый вызов таймера - возврат viewport к исходному значению
    jest.runOnlyPendingTimers();
    expect(useGraphStore.setState).toHaveBeenCalledWith({
      layerMetadata: expect.any(Object)
    });
  });
});
