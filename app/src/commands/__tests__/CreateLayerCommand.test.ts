import {useGraphStore} from '../../store/useGraphStore';
import {createEmptyProjectState} from '../../utils/projectStateHelpers';
import {CreateLayerCommand} from '../LayerCommands';
import {generateAndSaveOperation} from '../operationUtils';

// Мокаем generateAndSaveOperation для проверки вызовов
jest.mock('../operationUtils', () => ({
  generateAndSaveOperation: jest.fn()
}));

const mockGenerateAndSaveOperation = generateAndSaveOperation as jest.MockedFunction<typeof generateAndSaveOperation>;

describe('CreateLayerCommand', () => {
  beforeEach(() => {
    // Очищаем состояние перед каждым тестом
    useGraphStore.getState().initialize({
      ...createEmptyProjectState(),
      hasLoadedFromStorage: true
    });

    // Устанавливаем currentTimelineId для тестов
    useGraphStore.setState({
      currentTimelineId: 'test-timeline'
    });

    // Очищаем моки
    mockGenerateAndSaveOperation.mockClear();
  });

  test('should generate operation with auto-generated layer name', () => {
    const projectId = 'test-project-id';
    const position = {x: 100, y: 100};

    // Создаем команду с пустым именем (по умолчанию)
    const command = new CreateLayerCommand(position, '', projectId);

    // Выполняем команду
    command.execute();

    // Проверяем, что операция была сгенерирована
    expect(mockGenerateAndSaveOperation).toHaveBeenCalledWith(
      'layer.added',
      expect.objectContaining({
        layerId: expect.any(String),
        layerNode: expect.objectContaining({
          name: 'Layer 1', // Должно быть сгенерировано автоматически
          coordinates: position,
          type: 'layer',
          parentLayerId: 'root'
        }),
        parentLayerId: 'root'
      }),
      projectId,
      'test-timeline',
      'root'
    );
  });

  test('should generate operation with provided layer name', () => {
    const projectId = 'test-project-id';
    const position = {x: 200, y: 200};
    const customName = 'My Custom Layer';

    // Создаем команду с указанным именем
    const command = new CreateLayerCommand(position, customName, projectId);

    // Выполняем команду
    command.execute();

    // Проверяем, что операция была сгенерирована с указанным именем
    expect(mockGenerateAndSaveOperation).toHaveBeenCalledWith(
      'layer.added',
      expect.objectContaining({
        layerId: expect.any(String),
        layerNode: expect.objectContaining({
          name: customName, // Должно остаться указанное имя
          coordinates: position,
          type: 'layer',
          parentLayerId: 'root'
        }),
        parentLayerId: 'root'
      }),
      projectId,
      'test-timeline',
      'root'
    );
  });

  test('should create layer in store with generated name', () => {
    const position = {x: 150, y: 150};

    // Получаем текущий номер слоя
    const currentLayerNumber = useGraphStore.getState().lastLayerNumber;

    // Создаем команду без projectId (без генерации операции)
    const command = new CreateLayerCommand(position);

    // Выполняем команду
    command.execute();

    // Проверяем, что слой создался в store с правильным именем
    const state = useGraphStore.getState();
    const expectedLayerName = `Layer ${currentLayerNumber + 1}`;
    const layers = Object.values(state.layers).filter((layer) => layer.name === expectedLayerName);
    expect(layers).toHaveLength(1);
    expect(layers[0].name).toBe(expectedLayerName);
  });

  test('should NOT generate operation when projectId is not provided', () => {
    const position = {x: 300, y: 300};

    // Создаем команду без projectId
    const command = new CreateLayerCommand(position);

    // Выполняем команду
    command.execute();

    // Проверяем, что операция НЕ была сгенерирована
    expect(mockGenerateAndSaveOperation).not.toHaveBeenCalled();
  });
});
