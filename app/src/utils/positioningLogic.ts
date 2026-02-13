import {ChoiceNode, LayerNode, NarrativeNode, NoteNode, SkeletonNode} from '../types/nodes';
import {NODE_HEIGHTS, NODE_WIDTHS, PIN_CONSTANTS, POSITIONING_CONSTANTS} from './constants';

export interface NodePosition {
  x: number;
  y: number;
}

export type NodeType = ChoiceNode | NarrativeNode | NoteNode | LayerNode | SkeletonNode;

/**
 * Базовая функция для получения размеров узла
 * @param nodeType Тип узла
 * @param nodeData Данные узла (опционально, для получения динамической высоты)
 * @param includePins Включать ли пины в расчет ширины
 * @returns Объект с шириной и высотой
 */
function getBaseDimensions(nodeType: string, nodeData?: any, includePins: boolean = true): {width: number; height: number} {
  // Ширина = базовая ширина
  let width = NODE_WIDTHS[nodeType as keyof typeof NODE_WIDTHS] || NODE_WIDTHS.narrative;

  // Добавляем ширину пинов для узлов, которые их имеют (все кроме note)
  if (includePins && nodeType !== 'note') {
    width = width + (PIN_CONSTANTS.PIN_OFFSET + PIN_CONSTANTS.PIN_WIDTH) * 2;
  }

  // Высота: пытаемся получить реальную, иначе из констант
  let height = NODE_HEIGHTS[nodeType as keyof typeof NODE_HEIGHTS] || NODE_HEIGHTS.narrative;

  // Для choice узлов проверяем data.height
  if (nodeType === 'choice' && nodeData?.height) {
    height = nodeData.height;
  }

  // Для narrative узлов проверяем data.height
  if (nodeType === 'narrative' && nodeData?.height) {
    height = nodeData.height;
  }

  return {width, height};
}

/**
 * Получает реальные размеры узла (включая пины)
 * @param node Узел для получения размеров
 * @returns Объект с шириной и высотой
 */
function getNodeDimensions(node: NodeType): {width: number; height: number} {
  return getBaseDimensions(node.type, (node as any).data, true);
}

/**
 * Получает визуальные размеры узла (без пинов) - для позиционирования при вставке
 * @param node Узел для получения размеров
 * @returns Объект с шириной и высотой без учета пинов
 */
function getVisualNodeDimensions(node: NodeType): {width: number; height: number} {
  return getBaseDimensions(node.type, (node as any).data, false);
}

/**
 * Получает размеры по типу узла (для новых узлов без data)
 * @param nodeType Тип узла
 * @returns Объект с шириной и высотой
 */
function getNodeDimensionsByType(nodeType: string): {width: number; height: number} {
  return getBaseDimensions(nodeType, undefined, true);
}

/**
 * Проверяет, совпадают ли координаты любого из вставляемых объектов с существующими
 * @param newNodes Массив новых объектов с позициями
 * @param existingNodes Существующие объекты на холсте
 * @returns true если есть точное совпадение координат
 */
function checkExactCoordinateCollision(newNodes: NodeType[], existingNodes: NodeType[]): boolean {
  return newNodes.some((newNode) => existingNodes.some((existingNode) => newNode.coordinates.x === existingNode.coordinates.x && newNode.coordinates.y === existingNode.coordinates.y));
}

/**
 * Рассчитывает позиции для группы объектов при вставке
 * @param nodes Массив объектов для вставки
 * @param basePosition Базовая позиция (позиция курсора)
 * @param existingNodes Существующие узлы в слое
 * @returns Массив объектов с новыми позициями
 */
export function calculateGroupPastePositions(nodes: NodeType[], basePosition: NodePosition | null, existingNodes: NodeType[]): NodeType[] {
  if (nodes.length === 0) return [];

  // Определяем позицию курсора (или дефолтную позицию)
  const cursorPosition = basePosition || {
    x: POSITIONING_CONSTANTS.DEFAULT_PASTE_X,
    y: POSITIONING_CONSTANTS.DEFAULT_PASTE_Y
  };

  // Находим границы группы объектов (используем визуальные размеры без пинов)
  const minX = Math.min(...nodes.map((node) => node.coordinates.x));
  const maxX = Math.max(
    ...nodes.map((node) => {
      const {width} = getVisualNodeDimensions(node);
      return node.coordinates.x + width;
    })
  );
  const minY = Math.min(...nodes.map((node) => node.coordinates.y));
  const maxY = Math.max(
    ...nodes.map((node) => {
      const {height} = getVisualNodeDimensions(node);
      return node.coordinates.y + height;
    })
  );

  // Размеры группы
  const groupWidth = maxX - minX;
  const groupHeight = maxY - minY;

  // Центр оригинальной группы
  const originalCenterX = minX + groupWidth / 2;
  const originalCenterY = minY + groupHeight / 2;

  // Вычисляем смещение так, чтобы центр группы оказался в позиции курсора
  const offsetX = cursorPosition.x - originalCenterX;
  const offsetY = cursorPosition.y - originalCenterY;

  // Применяем смещение к каждому объекту, сохраняя относительные позиции
  let centeredNodes = nodes.map((node) => ({
    ...node,
    coordinates: {
      x: node.coordinates.x + offsetX,
      y: node.coordinates.y + offsetY
    }
  }));

  // Итеративно проверяем коллизии и увеличиваем смещение при необходимости
  let collisionMultiplier = 0;
  const maxAttempts = 10; // Максимальное количество попыток

  while (collisionMultiplier < maxAttempts) {
    // Проверяем, есть ли точное совпадение координат с существующими объектами
    if (!checkExactCoordinateCollision(centeredNodes, existingNodes)) {
      // Если коллизий нет, возвращаем текущие позиции
      break;
    }

    // Увеличиваем множитель смещения
    collisionMultiplier++;

    // Применяем увеличенное смещение ко всем объектам
    const currentOffsetX = POSITIONING_CONSTANTS.COLLISION_OFFSET_X * collisionMultiplier;
    const currentOffsetY = POSITIONING_CONSTANTS.COLLISION_OFFSET_Y * collisionMultiplier;

    centeredNodes = nodes.map((node) => ({
      ...node,
      coordinates: {
        x: node.coordinates.x + offsetX + currentOffsetX,
        y: node.coordinates.y + offsetY + currentOffsetY
      }
    }));
  }

  return centeredNodes;
}

/**
 * Рассчитывает позиции для дублирования узлов с сохранением относительных позиций
 * Работает как с одиночными узлами, так и с группами
 * @param nodes Массив объектов для дублирования
 * @param existingNodes Существующие узлы для проверки коллизий
 * @returns Массив объектов с новыми позициями
 */
export function calculateDuplicatePositions(nodes: NodeType[], existingNodes: NodeType[] = []): NodeType[] {
  if (nodes.length === 0) return [];

  // Для одиночных объектов используем стандартную логику дублирования
  if (nodes.length === 1) {
    const node = nodes[0];
    const newPosition = findOptimalDuplicatePosition(node.coordinates, node.type, existingNodes);

    return [
      {
        ...node,
        coordinates: newPosition
      }
    ];
  }

  // Для групп - находим границы группы
  const minX = Math.min(...nodes.map((node) => node.coordinates.x));
  const maxX = Math.max(
    ...nodes.map((node) => {
      const {width} = getNodeDimensions(node);
      return node.coordinates.x + width;
    })
  );
  const minY = Math.min(...nodes.map((node) => node.coordinates.y));
  const maxY = Math.max(
    ...nodes.map((node) => {
      const {height} = getNodeDimensions(node);
      return node.coordinates.y + height;
    })
  );

  // Размеры группы
  const groupWidth = maxX - minX;
  const groupHeight = maxY - minY;

  // Левая верхняя точка группы
  const groupTopLeft = {x: minX, y: minY};

  // Находим оптимальную позицию для размещения левой верхней точки дублированной группы
  const newGroupTopLeft = findOptimalGroupDuplicatePosition(groupTopLeft, groupWidth, groupHeight, existingNodes);

  // Вычисляем смещение группы
  const offsetX = newGroupTopLeft.x - groupTopLeft.x;
  const offsetY = newGroupTopLeft.y - groupTopLeft.y;

  // Применяем смещение ко всем объектам в группе, сохраняя их относительные позиции
  return nodes.map((node) => ({
    ...node,
    coordinates: {
      x: node.coordinates.x + offsetX,
      y: node.coordinates.y + offsetY
    }
  }));
}

/**
 * Находит оптимальную позицию для дублированной группы объектов
 */
function findOptimalGroupDuplicatePosition(originalTopLeft: NodePosition, groupWidth: number, groupHeight: number, existingNodes: NodeType[]): NodePosition {
  const baseOffset = POSITIONING_CONSTANTS.DUPLICATE_OFFSET;

  // Пытаемся найти место с увеличивающимся отступом
  for (let multiplier = 1; multiplier <= POSITIONING_CONSTANTS.MAX_PLACEMENT_ATTEMPTS; multiplier++) {
    const currentOffset = baseOffset * multiplier;

    // Для каждого уровня отступа пробуем все направления
    for (const direction of POSITIONING_CONSTANTS.DUPLICATE_DIRECTIONS) {
      let testPosition: NodePosition;

      if (direction.name === 'right') {
        // Вправо: исходная_x + ширина_группы + отступ
        testPosition = {
          x: originalTopLeft.x + groupWidth + currentOffset,
          y: originalTopLeft.y
        };
      } else if (direction.name === 'left') {
        // Влево: исходная_x - ширина_группы - отступ
        testPosition = {
          x: originalTopLeft.x - groupWidth - currentOffset,
          y: originalTopLeft.y
        };
      } else if (direction.name === 'down') {
        // Вниз: исходная_y + высота_группы + отступ
        testPosition = {
          x: originalTopLeft.x,
          y: originalTopLeft.y + groupHeight + currentOffset
        };
      } else {
        // up
        // Вверх: исходная_y - высота_группы - отступ
        testPosition = {
          x: originalTopLeft.x,
          y: originalTopLeft.y - groupHeight - currentOffset
        };
      }

      // Проверяем, не пересекается ли группа с существующими объектами
      if (!checkGroupCollision(testPosition, groupWidth, groupHeight, existingNodes)) {
        return testPosition;
      }
    }
  }

  // Если не нашли место в основных направлениях, используем спиральный поиск
  return findNearestFreeGroupPosition(originalTopLeft, groupWidth, groupHeight, existingNodes);
}

/**
 * Базовая функция для проверки коллизий прямоугольников
 * @param newLeft Левая граница нового объекта
 * @param newRight Правая граница нового объекта
 * @param newTop Верхняя граница нового объекта
 * @param newBottom Нижняя граница нового объекта
 * @param existingNodes Существующие узлы для проверки
 * @returns true если есть коллизия, false если нет
 */
function checkCollisionBase(newLeft: number, newRight: number, newTop: number, newBottom: number, existingNodes: NodeType[]): boolean {
  return existingNodes.some((existingNode) => {
    const {width: existingWidth, height: existingHeight} = getNodeDimensions(existingNode);

    const existingLeft = existingNode.coordinates.x;
    const existingRight = existingNode.coordinates.x + existingWidth;
    const existingTop = existingNode.coordinates.y;
    const existingBottom = existingNode.coordinates.y + existingHeight;

    // Проверяем пересечение прямоугольников
    return !(newRight <= existingLeft || newLeft >= existingRight || newBottom <= existingTop || newTop >= existingBottom);
  });
}

/**
 * Проверяет, пересекается ли группа объектов с существующими объектами
 */
function checkGroupCollision(position: NodePosition, groupWidth: number, groupHeight: number, existingNodes: NodeType[]): boolean {
  const buffer = POSITIONING_CONSTANTS.COLLISION_BUFFER;

  const newGroupLeft = position.x - buffer;
  const newGroupRight = position.x + groupWidth + buffer;
  const newGroupTop = position.y - buffer;
  const newGroupBottom = position.y + groupHeight + buffer;

  return checkCollisionBase(newGroupLeft, newGroupRight, newGroupTop, newGroupBottom, existingNodes);
}

/**
 * Базовая функция для спирального поиска свободного места
 * @param originalPosition Исходная позиция
 * @param checkCollisionFn Функция проверки коллизий
 * @param fallbackOffset Множитель для fallback позиции
 * @returns Ближайшая свободная позиция
 */
function findNearestFreePositionBase(originalPosition: NodePosition, checkCollisionFn: (testPosition: NodePosition) => boolean, fallbackOffset: number = 3): NodePosition {
  const step = 40; // Шаг поиска в спирали
  const maxRadius = 400; // Максимальный радиус поиска

  // Поиск в спирали от центра
  for (let radius = step; radius <= maxRadius; radius += step) {
    // Количество точек на текущем радиусе (примерно)
    const pointsOnRadius = Math.max(8, Math.floor((2 * Math.PI * radius) / step));

    for (let i = 0; i < pointsOnRadius; i++) {
      const angle = (2 * Math.PI * i) / pointsOnRadius;
      const testPosition: NodePosition = {
        x: originalPosition.x + radius * Math.cos(angle),
        y: originalPosition.y + radius * Math.sin(angle)
      };

      // Проверяем, свободна ли эта позиция
      if (!checkCollisionFn(testPosition)) {
        return testPosition;
      }
    }
  }

  // Если даже в спирали не нашли место, используем fallback
  return {
    x: originalPosition.x + POSITIONING_CONSTANTS.DUPLICATE_OFFSET * fallbackOffset,
    y: originalPosition.y + POSITIONING_CONSTANTS.DUPLICATE_OFFSET * 2
  };
}

/**
 * Находит ближайшее свободное место в спирали для группы объектов
 */
function findNearestFreeGroupPosition(originalTopLeft: NodePosition, groupWidth: number, groupHeight: number, existingNodes: NodeType[]): NodePosition {
  return findNearestFreePositionBase(originalTopLeft, (testPosition) => checkGroupCollision(testPosition, groupWidth, groupHeight, existingNodes));
}

/**
 * Проверяет, пересекается ли объект с существующими объектами
 */
function checkCollision(position: NodePosition, nodeType: string, existingNodes: NodeType[]): boolean {
  const {width: nodeWidth, height: nodeHeight} = getNodeDimensionsByType(nodeType);
  const buffer = POSITIONING_CONSTANTS.COLLISION_BUFFER;

  const newNodeLeft = position.x - buffer;
  const newNodeRight = position.x + nodeWidth + buffer;
  const newNodeTop = position.y - buffer;
  const newNodeBottom = position.y + nodeHeight + buffer;

  return checkCollisionBase(newNodeLeft, newNodeRight, newNodeTop, newNodeBottom, existingNodes);
}

/**
 * Находит оптимальную позицию для дублированного объекта
 */
function findOptimalDuplicatePosition(originalPosition: NodePosition, nodeType: string, existingNodes: NodeType[]): NodePosition {
  const {width: nodeWidth, height: nodeHeight} = getNodeDimensionsByType(nodeType);
  const baseOffset = POSITIONING_CONSTANTS.DUPLICATE_OFFSET;

  // Пытаемся найти место с увеличивающимся отступом
  for (let multiplier = 1; multiplier <= POSITIONING_CONSTANTS.MAX_PLACEMENT_ATTEMPTS; multiplier++) {
    const currentOffset = baseOffset * multiplier;

    // Для каждого уровня отступа пробуем все направления
    for (const direction of POSITIONING_CONSTANTS.DUPLICATE_DIRECTIONS) {
      let testPosition: NodePosition;

      if (direction.name === 'right') {
        // Вправо: исходная_x + ширина_узла + отступ
        testPosition = {
          x: originalPosition.x + nodeWidth + currentOffset,
          y: originalPosition.y
        };
      } else if (direction.name === 'left') {
        // Влево: исходная_x - ширина_узла - отступ
        testPosition = {
          x: originalPosition.x - nodeWidth - currentOffset,
          y: originalPosition.y
        };
      } else if (direction.name === 'down') {
        // Вниз: исходная_y + высота_узла + отступ
        testPosition = {
          x: originalPosition.x,
          y: originalPosition.y + nodeHeight + currentOffset
        };
      } else {
        // up
        // Вверх: исходная_y - высота_узла - отступ
        testPosition = {
          x: originalPosition.x,
          y: originalPosition.y - nodeHeight - currentOffset
        };
      }

      // Проверяем, не пересекается ли с существующими объектами
      if (!checkCollision(testPosition, nodeType, existingNodes)) {
        return testPosition;
      }
    }
  }

  // НОВЫЙ 6-й шаг: поиск ближайшего свободного места
  return findNearestFreePosition(originalPosition, nodeType, existingNodes);
}

/**
 * Находит ближайшее свободное место в спирали от исходной позиции
 * @param originalPosition Исходная позиция объекта
 * @param nodeType Тип узла для определения размеров
 * @param existingNodes Существующие узлы для проверки коллизий
 * @returns Ближайшая свободная позиция
 */
function findNearestFreePosition(originalPosition: NodePosition, nodeType: string, existingNodes: NodeType[]): NodePosition {
  return findNearestFreePositionBase(originalPosition, (testPosition) => checkCollision(testPosition, nodeType, existingNodes));
}
