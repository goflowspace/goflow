import {createEmptyProjectState} from '../../utils/projectStateHelpers';
import {useGraphStore} from '../useGraphStore';

describe('useGraphStore - addLayer', () => {
  beforeEach(() => {
    // Очищаем состояние перед каждым тестом
    useGraphStore.getState().initialize({
      ...createEmptyProjectState(),
      hasLoadedFromStorage: true
    });
  });

  test('should create layer in root layer when root layer exists', () => {
    const store = useGraphStore.getState();

    // Проверяем, что корневой слой существует
    expect(store.layers['root']).toBeDefined();

    // Создаем новый слой
    const newLayerNode = {
      id: 'test-layer-1',
      type: 'layer' as const,
      coordinates: {x: 100, y: 100},
      name: 'Test Layer',
      startingNodes: [],
      endingNodes: []
    };

    // Добавляем слой
    store.addLayer(newLayerNode);

    // Проверяем, что слой был создан
    const updatedState = useGraphStore.getState();
    expect(updatedState.layers['test-layer-1']).toBeDefined();
    expect(updatedState.layers['test-layer-1'].name).toBe('Test Layer');
    expect(updatedState.layers['test-layer-1'].parentLayerId).toBe('root');

    // Проверяем, что узел слоя был добавлен в корневой слой
    expect(updatedState.layers['root'].nodes['test-layer-1']).toBeDefined();
    expect(updatedState.layers['root'].nodeIds).toContain('test-layer-1');
  });

  test('should create root layer if it does not exist', () => {
    // Удаляем корневой слой из состояния
    useGraphStore.setState({
      layers: {},
      currentGraphId: 'root'
    });

    const store = useGraphStore.getState();

    // Проверяем, что корневого слоя нет
    expect(store.layers['root']).toBeUndefined();

    // Создаем новый слой
    const newLayerNode = {
      id: 'test-layer-1',
      type: 'layer' as const,
      coordinates: {x: 100, y: 100},
      name: 'Test Layer',
      startingNodes: [],
      endingNodes: []
    };

    // Добавляем слой - это должно создать корневой слой автоматически
    store.addLayer(newLayerNode);

    // Проверяем, что корневой слой был создан
    const updatedState = useGraphStore.getState();
    expect(updatedState.layers['root']).toBeDefined();
    expect(updatedState.layers['root'].type).toBe('layer');
    expect(updatedState.layers['root'].id).toBe('root');

    // Проверяем, что новый слой был создан
    expect(updatedState.layers['test-layer-1']).toBeDefined();
    expect(updatedState.layers['test-layer-1'].name).toBe('Test Layer');
    expect(updatedState.layers['test-layer-1'].parentLayerId).toBe('root');

    // Проверяем, что узел слоя был добавлен в корневой слой
    expect(updatedState.layers['root'].nodes['test-layer-1']).toBeDefined();
    expect(updatedState.layers['root'].nodeIds).toContain('test-layer-1');
  });

  test('should generate layer name and number when not provided', () => {
    const store = useGraphStore.getState();

    // Получаем текущий lastLayerNumber
    const currentLayerNumber = store.lastLayerNumber;

    // Создаем новый слой без имени
    const newLayerNode = {
      id: 'test-layer-1',
      type: 'layer' as const,
      coordinates: {x: 100, y: 100},
      name: '', // Пустое имя
      startingNodes: [],
      endingNodes: []
    };

    // Добавляем слой
    store.addLayer(newLayerNode);

    // Проверяем, что было сгенерировано имя и номер слоя
    const updatedState = useGraphStore.getState();
    expect(updatedState.layers['test-layer-1'].name).toBe(`Layer ${currentLayerNumber + 1}`);
    expect(updatedState.lastLayerNumber).toBe(currentLayerNumber + 1);
  });
});
