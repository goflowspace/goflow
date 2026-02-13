import {Layer} from '@types-folder/nodes';
import {Variable} from '@types-folder/variables';

import {useGraphStore} from '@store/useGraphStore';

import {importStoryFromJsonData} from '../importStoryFromJsonData';
import {refreshAppState} from '../refreshAppState';
import {validateImportedData} from '../validateImportedData';

// Мокаем модули
jest.mock('@store/useGraphStore');
jest.mock('../validateImportedData');
jest.mock('../refreshAppState');

describe('importStoryFromJsonData', () => {
  // Создаем тестовые данные
  const mockData = {
    title: 'Тестовая история',
    data: {
      timelines: {
        'base-timeline': {
          layers: {
            root: {
              id: 'root',
              name: 'Главный слой',
              type: 'layer',
              depth: 0,
              nodes: {
                node1: {id: 'node1', type: 'narrative', coordinates: {x: 100, y: 100}, data: {title: 'Тест', text: 'Текст'}}
              },
              edges: {},
              nodeIds: ['node1']
            }
          },
          lastLayerNumber: 1,
          variables: [{id: '1', name: 'testVar', value: '10', type: 'number'}]
        }
      }
    }
  };

  // Настраиваем моки перед каждым тестом
  beforeEach(() => {
    jest.resetAllMocks();

    // Мокаем validateImportedData чтобы возвращал true
    (validateImportedData as jest.Mock).mockReturnValue(true);

    // Мокаем useGraphStore.getState()
    const mockGetState = jest.fn().mockReturnValue({
      layers: {
        root: {
          id: 'root',
          name: 'Главный слой',
          type: 'layer',
          depth: 0,
          nodes: {}, // Пустой слой для тестов
          edges: {},
          nodeIds: []
        }
      }
    });
    (useGraphStore.getState as jest.Mock).mockImplementation(mockGetState);

    // Мокаем refreshAppState
    (refreshAppState as jest.Mock).mockImplementation(() => {});
  });

  it('должен корректно импортировать данные из JSON и вернуть результат', () => {
    // Вызываем тестируемую функцию
    const result = importStoryFromJsonData(mockData);

    // Проверяем что вызвана validateImportedData с правильными параметрами
    expect(validateImportedData).toHaveBeenCalledWith(mockData);

    // Проверяем что вызвана refreshAppState с правильными параметрами
    expect(refreshAppState).toHaveBeenCalledWith('Тестовая история', mockData.data.timelines['base-timeline'].layers, 1, [{id: '1', name: 'testVar', value: '10', type: 'number'}]);

    // Проверяем что функция вернула ожидаемый результат
    expect(result).toEqual({
      projectTitle: 'Тестовая история',
      projectLayers: mockData.data.timelines['base-timeline'].layers,
      lastLayerNumber: 1,
      variables: [{id: '1', name: 'testVar', value: '10', type: 'number'}]
    });
  });

  it('должен вернуть undefined если root слой уже содержит ноды', () => {
    // Меняем мок useGraphStore, чтобы вернуть слой с нодами
    const mockGetState = jest.fn().mockReturnValue({
      layers: {
        root: {
          id: 'root',
          name: 'Главный слой',
          type: 'layer',
          depth: 0,
          nodes: {
            existingNode: {id: 'existingNode', type: 'narrative'} // Имитируем наличие ноды
          },
          edges: {},
          nodeIds: ['existingNode']
        }
      }
    });
    (useGraphStore.getState as jest.Mock).mockImplementation(mockGetState);

    // Вызываем тестируемую функцию
    const result = importStoryFromJsonData(mockData);

    // Проверяем что функция вернула undefined
    expect(result).toBeUndefined();

    // Проверяем что validateImportedData и refreshAppState не вызывались
    expect(validateImportedData).not.toHaveBeenCalled();
    expect(refreshAppState).not.toHaveBeenCalled();
  });

  it('должен вернуть undefined если validateImportedData вернул false', () => {
    // Меняем мок validateImportedData чтобы возвращал false
    (validateImportedData as jest.Mock).mockReturnValue(false);

    // Вызываем тестируемую функцию
    const result = importStoryFromJsonData(mockData);

    // Проверяем что функция вернула undefined
    expect(result).toBeUndefined();

    // Проверяем что refreshAppState не вызывался
    expect(refreshAppState).not.toHaveBeenCalled();
  });

  it('должен вернуть undefined если формат данных не содержит timelines', () => {
    // Создаем данные без timelines
    const invalidData = {
      title: 'Тестовая история',
      data: {}
    };

    // Вызываем тестируемую функцию
    const result = importStoryFromJsonData(invalidData);

    // Проверяем что функция вернула undefined
    expect(result).toBeUndefined();

    // Проверяем что refreshAppState не вызывался
    expect(refreshAppState).not.toHaveBeenCalled();
  });

  it('должен корректно обработать случай с пустыми variables', () => {
    // Создаем данные без variables
    const dataWithoutVariables = {
      ...mockData,
      data: {
        timelines: {
          'base-timeline': {
            ...mockData.data.timelines['base-timeline'],
            variables: undefined
          }
        }
      }
    };

    // Вызываем тестируемую функцию
    const result = importStoryFromJsonData(dataWithoutVariables);

    // Проверяем что refreshAppState вызван с пустым массивом variables
    expect(refreshAppState).toHaveBeenCalledWith(
      'Тестовая история',
      mockData.data.timelines['base-timeline'].layers,
      1,
      [] // Пустой массив variables
    );

    // Проверяем что функция вернула правильный результат с пустым массивом variables
    expect(result).toEqual({
      projectTitle: 'Тестовая история',
      projectLayers: mockData.data.timelines['base-timeline'].layers,
      lastLayerNumber: 1,
      variables: []
    });
  });

  it('должен корректно обработать случай с пустым lastLayerNumber', () => {
    // Создаем данные без lastLayerNumber
    const dataWithoutLastLayerNumber = {
      ...mockData,
      data: {
        timelines: {
          'base-timeline': {
            ...mockData.data.timelines['base-timeline'],
            lastLayerNumber: undefined
          }
        }
      }
    };

    // Вызываем тестируемую функцию
    const result = importStoryFromJsonData(dataWithoutLastLayerNumber);

    // Проверяем что refreshAppState вызван с lastLayerNumber = 0
    expect(refreshAppState).toHaveBeenCalledWith(
      'Тестовая история',
      mockData.data.timelines['base-timeline'].layers,
      0, // Значение по умолчанию
      [{id: '1', name: 'testVar', value: '10', type: 'number'}]
    );

    // Проверяем что функция вернула правильный результат с lastLayerNumber = 0
    expect(result).toEqual({
      projectTitle: 'Тестовая история',
      projectLayers: mockData.data.timelines['base-timeline'].layers,
      lastLayerNumber: 0, // Значение по умолчанию
      variables: [{id: '1', name: 'testVar', value: '10', type: 'number'}]
    });
  });
});
