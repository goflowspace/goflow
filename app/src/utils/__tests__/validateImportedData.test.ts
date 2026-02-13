import {validateImportedData} from '../validateImportedData';

describe('validateImportedData', () => {
  // Создаем правильные тестовые данные
  const validData = {
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
              nodes: {},
              edges: {},
              nodeIds: []
            }
          }
        }
      }
    }
  };

  // Тест на правильные данные
  it('должен вернуть true для правильных данных', () => {
    const result = validateImportedData(validData);
    expect(result).toBe(true);
  });

  // Тест на отсутствие заголовка
  it('должен вернуть false если отсутствует заголовок', () => {
    const invalidData = {
      ...validData,
      title: undefined
    };
    const result = validateImportedData(invalidData);
    expect(result).toBe(false);
  });

  // Тест на отсутствие таймлайнов
  it('должен вернуть false если отсутствуют таймлайны', () => {
    const invalidData = {
      ...validData,
      data: {}
    };
    const result = validateImportedData(invalidData);
    expect(result).toBe(false);
  });

  // Тест на пустой список таймлайнов
  it('должен вернуть false если список таймлайнов пуст', () => {
    const invalidData = {
      ...validData,
      data: {
        timelines: {}
      }
    };
    const result = validateImportedData(invalidData);
    expect(result).toBe(false);
  });

  // Тест на отсутствие слоев в таймлайне
  it('должен вернуть false если в таймлайне отсутствуют слои', () => {
    const invalidData = {
      ...validData,
      data: {
        timelines: {
          'base-timeline': {}
        }
      }
    };
    const result = validateImportedData(invalidData);
    expect(result).toBe(false);
  });

  // Тест на отсутствие корневого слоя
  it('должен вернуть false если отсутствует корневой слой', () => {
    const invalidData = {
      ...validData,
      data: {
        timelines: {
          'base-timeline': {
            layers: {}
          }
        }
      }
    };
    const result = validateImportedData(invalidData);
    expect(result).toBe(false);
  });

  // Мокаем console.error для тестов, которые его вызывают
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // Тест на вызов console.error при отсутствии таймлайнов
  it('должен вызвать console.error если отсутствуют таймлайны', () => {
    const invalidData = {
      ...validData,
      data: {}
    };
    validateImportedData(invalidData);
    expect(console.error).toHaveBeenCalledWith('Invalid data format. Make sure this is a Go Flow JSON export file');
  });

  // Проверим что все условия проверки работают вместе
  it('должен вернуть false если все условия некорректны', () => {
    const invalidData = {
      data: {
        timelines: {}
      }
    };
    const result = validateImportedData(invalidData);
    expect(result).toBe(false);
  });
});
