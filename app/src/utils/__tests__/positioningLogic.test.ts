import {NodeType, calculateDuplicatePositions, calculateGroupPastePositions} from '../positioningLogic';

// Мок данные для тестирования
const createMockNode = (id: string, x: number, y: number, type: string = 'narrative'): NodeType =>
  ({
    id,
    type,
    coordinates: {x, y},
    // Добавляем обязательные поля в зависимости от типа
    ...(type === 'narrative' && {
      title: 'Test Node',
      text: 'Test text',
      selected: false,
      color: '#ffffff'
    }),
    ...(type === 'choice' && {
      text: 'Test Choice',
      selected: false,
      color: '#ffffff'
    }),
    ...(type === 'note' && {
      text: 'Test Note',
      selected: false,
      color: '#ffffff'
    }),
    ...(type === 'layer' && {
      name: 'Test Layer',
      selected: false,
      depth: 1
    })
  }) as NodeType;

describe('positioningLogic', () => {
  describe('calculateGroupPastePositions', () => {
    it('should return empty array for empty input', () => {
      const result = calculateGroupPastePositions([], {x: 100, y: 100}, []);
      expect(result).toEqual([]);
    });

    it('should center single node at cursor position', () => {
      const nodes = [createMockNode('node1', 0, 0)];
      const cursorPosition = {x: 100, y: 100};
      const existingNodes: NodeType[] = [];

      const result = calculateGroupPastePositions(nodes, cursorPosition, existingNodes);

      expect(result).toHaveLength(1);

      // Для narrative узла: визуальная ширина = 200, высота = 200 (без пинов)
      // Если оригинальный узел в (0,0), то его центр в (100, 100)
      // Нужно сместить так, чтобы центр был в (100, 100)
      // Значит смещение: (100-100, 100-100) = (0, 0)
      // Новая позиция: (0+0, 0+0) = (0, 0)
      const node = result[0];

      expect(node.coordinates.x).toBe(0);
      expect(node.coordinates.y).toBe(0);
    });

    it('should center group at cursor position while preserving relative positions', () => {
      const nodes = [
        createMockNode('node1', 0, 0),
        createMockNode('node2', 250, 0), // Визуальная ширина narrative = 200, поэтому 250 для зазора
        createMockNode('node3', 125, 250) // Визуальная высота narrative = 200, поэтому 250 для зазора
      ];
      const cursorPosition = {x: 200, y: 200};
      const existingNodes: NodeType[] = [];

      const result = calculateGroupPastePositions(nodes, cursorPosition, existingNodes);

      expect(result).toHaveLength(3);

      // Проверяем сохранение относительных позиций
      const node1 = result.find((n) => n.id === 'node1')!;
      const node2 = result.find((n) => n.id === 'node2')!;
      const node3 = result.find((n) => n.id === 'node3')!;

      // Относительные позиции должны сохраниться
      expect(node2.coordinates.x - node1.coordinates.x).toBe(250);
      expect(node2.coordinates.y - node1.coordinates.y).toBe(0);
      expect(node3.coordinates.x - node1.coordinates.x).toBe(125);
      expect(node3.coordinates.y - node1.coordinates.y).toBe(250);

      // Границы оригинальной группы: от (0,0) до (250+200, 250+200) = (450, 450)
      // Размеры группы: 450x450
      // Центр оригинальной группы: (225, 225)
      // Смещение для центрирования в (200, 200): (200-225, 200-225) = (-25, -25)
      // Новая позиция node1: (0-25, 0-25) = (-25, -25)
      expect(node1.coordinates.x).toBe(-25);
      expect(node1.coordinates.y).toBe(-25);
    });

    it('should handle null cursor position with default position', () => {
      const nodes = [createMockNode('node1', 0, 0)];
      const result = calculateGroupPastePositions(nodes, null, []);

      expect(result).toHaveLength(1);
      // При null позиции используется DEFAULT_PASTE_X=100, DEFAULT_PASTE_Y=100
      // Центр narrative узла (200x200) в позиции (0,0) находится в (100, 100)
      // Смещение для центрирования в (100, 100): (100-100, 100-100) = (0, 0)
      expect(result[0].coordinates.x).toBe(0);
      expect(result[0].coordinates.y).toBe(0);
    });

    it('should offset when coordinates exactly match existing objects', () => {
      const nodes = [createMockNode('node1', 0, 0)];
      const existingNodes = [createMockNode('existing1', 0, 0)]; // Точно те же координаты
      const cursorPosition = {x: 100, y: 100};

      const result = calculateGroupPastePositions(nodes, cursorPosition, existingNodes);

      expect(result).toHaveLength(1);
      // При точном совпадении координат должно быть смещение на -10px по X и +10px по Y
      // Центрирование: narrative узел (200x200) в позиции (0,0) имеет центр в (100, 100)
      // Смещение для центрирования в (100, 100): (100-100, 100-100) = (0, 0)
      // Новая позиция после центрирования: (0+0, 0+0) = (0, 0) - точно совпадает с existing!
      // Поэтому применяется смещение коллизии: (0-10, 0+10) = (-10, 10)
      expect(result[0].coordinates.x).toBe(-10);
      expect(result[0].coordinates.y).toBe(10);
    });

    it('should not offset when coordinates do not exactly match existing objects', () => {
      const nodes = [createMockNode('node1', 0, 0)];
      const existingNodes = [createMockNode('existing1', 5, 5)]; // Немного другие координаты
      const cursorPosition = {x: 100, y: 100};

      const result = calculateGroupPastePositions(nodes, cursorPosition, existingNodes);

      expect(result).toHaveLength(1);
      // При отсутствии точного совпадения координат смещение коллизии не применяется
      // Только центрирование: (0, 0) -> (0, 0)
      expect(result[0].coordinates.x).toBe(0);
      expect(result[0].coordinates.y).toBe(0);
    });

    it('should apply progressive offset for multiple pastes at same position', () => {
      const nodes = [createMockNode('node1', 0, 0)];
      const cursorPosition = {x: 100, y: 100};

      // Первая вставка - без коллизий
      const existingNodes1: NodeType[] = [];
      const result1 = calculateGroupPastePositions(nodes, cursorPosition, existingNodes1);
      expect(result1[0].coordinates.x).toBe(0);
      expect(result1[0].coordinates.y).toBe(0);

      // Вторая вставка - коллизия с первой вставкой, смещение x1
      const existingNodes2 = [createMockNode('existing1', 0, 0)];
      const result2 = calculateGroupPastePositions(nodes, cursorPosition, existingNodes2);
      expect(result2[0].coordinates.x).toBe(-10); // COLLISION_OFFSET_X * 1
      expect(result2[0].coordinates.y).toBe(10); // COLLISION_OFFSET_Y * 1

      // Третья вставка - коллизия со второй вставкой, смещение x2
      const existingNodes3 = [createMockNode('existing1', 0, 0), createMockNode('existing2', -10, 10)];
      const result3 = calculateGroupPastePositions(nodes, cursorPosition, existingNodes3);
      expect(result3[0].coordinates.x).toBe(-20); // COLLISION_OFFSET_X * 2
      expect(result3[0].coordinates.y).toBe(20); // COLLISION_OFFSET_Y * 2

      // Четвертая вставка - коллизия с третьей вставкой, смещение x3
      const existingNodes4 = [createMockNode('existing1', 0, 0), createMockNode('existing2', -10, 10), createMockNode('existing3', -20, 20)];
      const result4 = calculateGroupPastePositions(nodes, cursorPosition, existingNodes4);
      expect(result4[0].coordinates.x).toBe(-30); // COLLISION_OFFSET_X * 3
      expect(result4[0].coordinates.y).toBe(30); // COLLISION_OFFSET_Y * 3
    });
  });

  describe('calculateDuplicatePositions', () => {
    it('should return empty array for empty input', () => {
      const result = calculateDuplicatePositions([], []);
      expect(result).toEqual([]);
    });

    it('should handle single node correctly', () => {
      const nodes = [createMockNode('node1', 100, 100)];
      const existingNodes = [createMockNode('existing1', 200, 200)];

      const result = calculateDuplicatePositions(nodes, existingNodes);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('node1');
      // Позиция должна измениться для избежания коллизий
      expect(result[0].coordinates.x !== 100 || result[0].coordinates.y !== 100).toBe(true);
    });

    it('should preserve relative positions for multiple nodes', () => {
      const nodes = [createMockNode('node1', 100, 100), createMockNode('node2', 150, 120), createMockNode('node3', 80, 140)];
      const existingNodes = [createMockNode('existing1', 300, 300)];

      const result = calculateDuplicatePositions(nodes, existingNodes);

      // Проверяем, что результат содержит все узлы
      expect(result).toHaveLength(3);

      // Проверяем, что относительные позиции сохраняются
      const node1 = result.find((n) => n.id === 'node1')!;
      const node2 = result.find((n) => n.id === 'node2')!;
      const node3 = result.find((n) => n.id === 'node3')!;

      // Относительные расстояния должны остаться теми же
      const originalDx12 = 150 - 100; // 50
      const originalDy12 = 120 - 100; // 20
      const newDx12 = node2.coordinates.x - node1.coordinates.x;
      const newDy12 = node2.coordinates.y - node1.coordinates.y;

      expect(newDx12).toBe(originalDx12);
      expect(newDy12).toBe(originalDy12);

      const originalDx13 = 80 - 100; // -20
      const originalDy13 = 140 - 100; // 40
      const newDx13 = node3.coordinates.x - node1.coordinates.x;
      const newDy13 = node3.coordinates.y - node1.coordinates.y;

      expect(newDx13).toBe(originalDx13);
      expect(newDy13).toBe(originalDy13);
    });

    it('should move group away from existing nodes', () => {
      const nodes = [createMockNode('node1', 100, 100), createMockNode('node2', 150, 100)];
      const existingNodes = [
        createMockNode('existing1', 100, 100), // Конфликтует с node1
        createMockNode('existing2', 150, 100) // Конфликтует с node2
      ];

      const result = calculateDuplicatePositions(nodes, existingNodes);

      // Группа должна быть перемещена, чтобы избежать коллизий
      const newNode1 = result.find((n) => n.id === 'node1')!;
      const newNode2 = result.find((n) => n.id === 'node2')!;

      // Новые позиции не должны совпадать с оригинальными
      expect(newNode1.coordinates.x !== 100 || newNode1.coordinates.y !== 100).toBe(true);
      expect(newNode2.coordinates.x !== 150 || newNode2.coordinates.y !== 100).toBe(true);

      // Относительное расположение должно сохраниться
      const originalDx = 150 - 100; // 50
      const newDx = newNode2.coordinates.x - newNode1.coordinates.x;
      expect(newDx).toBe(originalDx);
    });

    it('should work with different node types', () => {
      const nodes = [createMockNode('narrative1', 100, 100, 'narrative'), createMockNode('choice1', 150, 100, 'choice'), createMockNode('note1', 200, 100, 'note')];
      const existingNodes: NodeType[] = [];

      const result = calculateDuplicatePositions(nodes, existingNodes);

      expect(result).toHaveLength(3);
      expect(result.find((n) => n.id === 'narrative1')?.type).toBe('narrative');
      expect(result.find((n) => n.id === 'choice1')?.type).toBe('choice');
      expect(result.find((n) => n.id === 'note1')?.type).toBe('note');
    });

    it('should avoid overlapping with existing nodes when duplicating horizontally', () => {
      const nodes = [createMockNode('node1', 100, 100), createMockNode('node2', 200, 100)];
      const existingNodes = [
        // Размещаем препятствие справа от группы
        createMockNode('existing1', 350, 100)
      ];

      const result = calculateDuplicatePositions(nodes, existingNodes);

      // Проверяем, что группа была перемещена и не пересекается с существующими узлами
      const newNode1 = result.find((n) => n.id === 'node1')!;
      const newNode2 = result.find((n) => n.id === 'node2')!;

      // Новые позиции должны отличаться от оригинальных
      expect(newNode1.coordinates.x !== 100 || newNode1.coordinates.y !== 100).toBe(true);

      // Относительные позиции должны сохраниться
      const originalDx = 200 - 100; // 100
      const newDx = newNode2.coordinates.x - newNode1.coordinates.x;
      expect(newDx).toBe(originalDx);
    });
  });
});
