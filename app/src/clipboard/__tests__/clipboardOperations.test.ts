import {getCommandManager} from '../../commands/CommandManager';
import {getNotificationManager} from '../../components/Notifications/index';
import {useCanvasStore} from '../../store/useCanvasStore';
import {useGraphStore} from '../../store/useGraphStore';
import {refreshSpecificLayers} from '../../utils/syncGraphToCanvas';
import {copyNodes, cutNodes, duplicateNodes, pasteNodes} from '../clipboardOperations';

// Мокаем внешние зависимости
jest.mock('../../commands/CommandManager', () => ({
  getCommandManager: jest.fn()
}));

jest.mock('../../store/useCanvasStore', () => ({
  useCanvasStore: {
    getState: jest.fn()
  }
}));

jest.mock('../../store/useGraphStore', () => ({
  useGraphStore: {
    getState: jest.fn()
  }
}));

jest.mock('../../components/Notifications/index', () => ({
  getNotificationManager: jest.fn()
}));

jest.mock('../../utils/syncGraphToCanvas', () => ({
  refreshSpecificLayers: jest.fn()
}));

jest.mock('i18next', () => ({
  t: (key: string, params?: any) => {
    // Простая имитация перевода для тестов
    if (key === 'clipboard.nothing_to_copy') return 'Nothing to copy';
    if (key === 'clipboard.nothing_to_duplicate') return 'Nothing to duplicate';
    if (key === 'errors.layer_not_found') return 'Ошибка: не найден текущий слой';
    if (key === 'clipboard.node_copied') return 'Node copied';
    if (key === 'clipboard.nodes_copied') return `${params?.count} nodes copied`;
    if (key === 'clipboard.node_duplicated') return 'Node duplicated';
    if (key === 'clipboard.nodes_duplicated') return `${params?.count} nodes duplicated`;
    return key;
  }
}));

describe('Clipboard Operations', () => {
  let mockCommandManager: any;
  let mockGraphStore: any;
  let mockCanvasStore: any;
  let mockNotificationManager: any;

  beforeEach(() => {
    // Сбрасываем все моки перед каждым тестом
    jest.clearAllMocks();

    // Настраиваем моки
    mockCommandManager = {
      cutNodes: jest.fn(),
      pasteNodes: jest.fn(),
      duplicateSelectedNodes: jest.fn()
    };
    (getCommandManager as jest.Mock).mockReturnValue(mockCommandManager);

    mockNotificationManager = {
      showError: jest.fn(),
      showSuccess: jest.fn()
    };
    (getNotificationManager as jest.Mock).mockReturnValue(mockNotificationManager);

    mockGraphStore = {
      currentGraphId: 'graph1',
      layers: {
        graph1: {
          nodes: {},
          edges: {},
          nodeIds: []
        }
      },
      setCopiedNodes: jest.fn(),
      _layerContentsForPaste: {}
    };
    (useGraphStore.getState as jest.Mock).mockReturnValue(mockGraphStore);

    mockCanvasStore = {
      nodes: []
    };
    (useCanvasStore.getState as jest.Mock).mockReturnValue(mockCanvasStore);
  });

  describe('copyNodes', () => {
    it('should show error when no nodes are selected', () => {
      copyNodes();
      expect(mockNotificationManager.showError).toHaveBeenCalledWith('Nothing to copy', true, 3000);
      expect(mockGraphStore.setCopiedNodes).not.toHaveBeenCalled();
    });

    it('should copy a single selected node', () => {
      // Настраиваем один выбранный узел
      const mockNode = {
        id: 'node1',
        type: 'narrative',
        title: 'Test node',
        text: 'Test content'
      };

      mockCanvasStore.nodes = [{id: 'node1', selected: true}];
      mockGraphStore.layers.graph1.nodes = {node1: mockNode};

      copyNodes();

      expect(mockGraphStore.setCopiedNodes).toHaveBeenCalled();
      expect(mockNotificationManager.showSuccess).toHaveBeenCalledWith('Node copied', true, 2000);
    });

    it('should copy multiple selected nodes and their edges', () => {
      // Настраиваем несколько выбранных узлов
      const mockNode1 = {id: 'node1', type: 'narrative'};
      const mockNode2 = {id: 'node2', type: 'choice'};
      const mockEdge = {
        id: 'edge1',
        startNodeId: 'node1',
        endNodeId: 'node2',
        conditions: []
      };

      mockCanvasStore.nodes = [
        {id: 'node1', selected: true},
        {id: 'node2', selected: true}
      ];

      mockGraphStore.layers.graph1.nodes = {
        node1: mockNode1,
        node2: mockNode2
      };

      mockGraphStore.layers.graph1.edges = {edge1: mockEdge};

      copyNodes();

      expect(mockGraphStore.setCopiedNodes).toHaveBeenCalled();
      expect(mockGraphStore.setCopiedNodes.mock.calls[0][1]).toHaveLength(1); // Одно ребро
      expect(mockNotificationManager.showSuccess).toHaveBeenCalledWith('2 nodes copied', true, 2000);
    });

    it('should handle layer nodes and copy their structure', () => {
      // Настраиваем слой и его содержимое
      const mockLayerNode = {
        id: 'layer1',
        type: 'layer',
        name: 'Test Layer'
      };

      const nestedLayerContent = {
        nodes: {nestedNode1: {id: 'nestedNode1', type: 'narrative'}},
        edges: {},
        nodeIds: ['nestedNode1'],
        depth: 1
      };

      mockCanvasStore.nodes = [{id: 'layer1', selected: true}];
      mockGraphStore.layers = {
        graph1: {
          nodes: {layer1: mockLayerNode},
          edges: {},
          nodeIds: ['layer1']
        },
        layer1: nestedLayerContent
      };

      copyNodes();

      expect(mockGraphStore.setCopiedNodes).toHaveBeenCalled();
      // При копировании (не дублировании) имя слоя не изменяется
      expect(mockGraphStore.setCopiedNodes.mock.calls[0][0][0].name).toBe('Test Layer');
      expect(mockNotificationManager.showSuccess).toHaveBeenCalledWith('Node copied', true, 2000);
    });
  });

  describe('cutNodes', () => {
    it('should call the CommandManager cutNodes method and refresh specific layers', () => {
      cutNodes();
      expect(mockCommandManager.cutNodes).toHaveBeenCalled();
      expect(refreshSpecificLayers).toHaveBeenCalledWith(['graph1'], false);
    });
  });

  describe('pasteNodes', () => {
    it('should call the CommandManager pasteNodes method and refresh current layer', () => {
      // Тест для случая, когда в буфере нет слоев
      mockGraphStore._layerContentsForPaste = {};

      pasteNodes();

      expect(mockCommandManager.pasteNodes).toHaveBeenCalled();
      expect(refreshSpecificLayers).toHaveBeenCalledWith(['graph1'], false);
    });

    it('should refresh all affected layers when pasting layer nodes', () => {
      // Тест для случая, когда в буфере есть слои
      mockGraphStore._layerContentsForPaste = {
        layer1: {},
        layer2: {}
      };

      pasteNodes();

      expect(mockCommandManager.pasteNodes).toHaveBeenCalled();
      expect(refreshSpecificLayers).toHaveBeenCalledWith(['graph1', 'layer1', 'layer2'], true);
    });
  });

  describe('duplicateNodes', () => {
    it('should call CommandManager duplicateSelectedNodes when no nodes are selected', () => {
      mockCanvasStore.nodes = [];

      duplicateNodes();

      // duplicateNodes всегда вызывает CommandManager.duplicateSelectedNodes
      // Проверки ошибок происходят внутри CommandManager
      expect(mockCommandManager.duplicateSelectedNodes).toHaveBeenCalled();
    });

    it('should call CommandManager duplicateSelectedNodes when the current layer is not found', () => {
      mockCanvasStore.nodes = [{id: 'node1', selected: true}];
      mockGraphStore.layers = {}; // Пустой объект layers

      duplicateNodes();

      // duplicateNodes всегда вызывает CommandManager.duplicateSelectedNodes
      // Проверки ошибок происходят внутри CommandManager
      expect(mockCommandManager.duplicateSelectedNodes).toHaveBeenCalled();
    });

    it('should duplicate a single selected node and refresh current layer', () => {
      // Настраиваем один выбранный узел
      const mockNode = {id: 'node1', type: 'narrative'};

      mockCanvasStore.nodes = [{id: 'node1', selected: true}];
      mockGraphStore.layers.graph1.nodes = {node1: mockNode};

      duplicateNodes();

      expect(mockCommandManager.duplicateSelectedNodes).toHaveBeenCalled();
      // Для одного узла не вызывается setCopiedNodes
      expect(mockGraphStore.setCopiedNodes).not.toHaveBeenCalled();
      // Проверяем, что обновляется только текущий слой
      expect(refreshSpecificLayers).toHaveBeenCalledWith(['graph1'], false);
    });

    it('should duplicate multiple selected nodes and refresh current layer', () => {
      // Настраиваем несколько выбранных узлов
      const mockNode1 = {id: 'node1', type: 'narrative'};
      const mockNode2 = {id: 'node2', type: 'choice'};
      const mockEdge = {
        id: 'edge1',
        startNodeId: 'node1',
        endNodeId: 'node2',
        conditions: []
      };

      mockCanvasStore.nodes = [
        {id: 'node1', selected: true},
        {id: 'node2', selected: true}
      ];

      mockGraphStore.layers.graph1.nodes = {
        node1: mockNode1,
        node2: mockNode2
      };

      mockGraphStore.layers.graph1.edges = {edge1: mockEdge};

      duplicateNodes();

      expect(mockGraphStore.setCopiedNodes).toHaveBeenCalled(); // Для нескольких узлов нужно setCopiedNodes
      expect(mockCommandManager.duplicateSelectedNodes).toHaveBeenCalled();
      // Проверяем, что обновляется только текущий слой
      expect(refreshSpecificLayers).toHaveBeenCalledWith(['graph1'], false);
    });

    it('should duplicate layer nodes and refresh all affected layers', () => {
      // Настраиваем слой и его содержимое
      const mockNode1 = {id: 'node1', type: 'narrative'};
      const mockLayerNode = {id: 'layer1', type: 'layer'};

      mockCanvasStore.nodes = [
        {id: 'node1', selected: true},
        {id: 'layer1', selected: true}
      ];

      mockGraphStore.layers.graph1.nodes = {
        node1: mockNode1,
        layer1: mockLayerNode
      };

      duplicateNodes();

      expect(mockGraphStore.setCopiedNodes).toHaveBeenCalled();
      expect(mockCommandManager.duplicateSelectedNodes).toHaveBeenCalled();
      // Проверяем, что обновляются затронутые слои с дочерними
      expect(refreshSpecificLayers).toHaveBeenCalledWith(['graph1', 'layer1'], true);
    });

    it('should call CommandManager duplicateSelectedNodes even when nodes do not exist in the current layer', () => {
      // Выбранный узел, но его нет в слое
      mockCanvasStore.nodes = [{id: 'nonexistent', selected: true}];
      mockGraphStore.layers.graph1.nodes = {}; // Пустые узлы в слое

      duplicateNodes();

      // duplicateNodes всегда вызывает CommandManager.duplicateSelectedNodes
      // Проверки существования узлов происходят внутри CommandManager
      expect(mockCommandManager.duplicateSelectedNodes).toHaveBeenCalled();
    });
  });
});
