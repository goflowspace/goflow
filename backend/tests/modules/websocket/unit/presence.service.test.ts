import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PresenceService } from '../../../../src/modules/websocket/services/presence.service';
import { CursorPosition } from '../../../../src/types/websocket.types';
import { IWebSocketManager } from '../../../../src/modules/websocket/interfaces/websocket.interfaces';

// Mock WebSocketManager
const mockWebSocketManager: jest.Mocked<IWebSocketManager> = {
  initialize: vi.fn(),
  getIO: vi.fn(),
  registerConnection: vi.fn(),
  unregisterConnection: vi.fn(),
  emitToSocket: vi.fn(),
  emitToProject: vi.fn(),
  joinProjectRoom: vi.fn(),
  leaveProjectRoom: vi.fn(),
  getProjectClientsCount: vi.fn(),
};

describe('PresenceService', () => {
  let presenceService: PresenceService;
  
  beforeEach(() => {
    vi.clearAllMocks();
    presenceService = new PresenceService(mockWebSocketManager);
  });

  afterEach(() => {
    presenceService.stop();
  });

  describe('getUserColor', () => {
    it('должен генерировать стабильный цвет для пользователя', () => {
      const userId = 'user123';
      const color1 = presenceService.getUserColor(userId);
      const color2 = presenceService.getUserColor(userId);
      
      expect(color1).toBe(color2);
      expect(color1).toMatch(/^#[0-9A-F]{6}$/);
    });

    it('должен генерировать разные цвета для разных пользователей', () => {
      const user1Color = presenceService.getUserColor('user1');
      const user2Color = presenceService.getUserColor('user2');
      
      expect(user1Color).not.toBe(user2Color);
    });
  });

  describe('updateCursor', () => {
    it('должен обновлять курсор пользователя в слое', async () => {
      const cursor: CursorPosition = {
        x: 100,
        y: 200,
        timelineId: 'timeline1',
        layerId: 'layer1',
        timestamp: Date.now()
      };

      await presenceService.updateCursor(
        'user1',
        'User One',
        'project1',
        'timeline1',
        'layer1',
        cursor,
        'session1'
      );

      const layerPresence = presenceService.getLayerPresence('project1', 'timeline1', 'layer1');
      
      expect(layerPresence).toHaveLength(1);
      expect(layerPresence[0].userId).toBe('user1');
      expect(layerPresence[0].userName).toBe('User One');
      expect(layerPresence[0].cursor.x).toBe(100);
      expect(layerPresence[0].cursor.y).toBe(200);
    });

    it('должен broadcast событие при обновлении курсора', async () => {
      const cursor: CursorPosition = {
        x: 150,
        y: 250,
        timelineId: 'timeline1',
        layerId: 'layer1',
        timestamp: Date.now()
      };

      await presenceService.updateCursor(
        'user1',
        'User One',
        'project1',
        'timeline1',
        'layer1',
        cursor,
        'session1'
      );

      expect(mockWebSocketManager.emitToProject).toHaveBeenCalledWith(
        'project1',
        expect.objectContaining({
          type: 'LAYER_CURSOR_ENTER',
          projectId: 'project1'
        }),
        'session1'
      );
    });
  });

  describe('getLayerPresence', () => {
    it('должен возвращать пустой массив для пустого слоя', () => {
      const presence = presenceService.getLayerPresence('project1', 'timeline1', 'layer1');
      expect(presence).toEqual([]);
    });

    it('должен возвращать всех присутствующих в слое', async () => {
      const cursor1: CursorPosition = { x: 100, y: 200, timelineId: 'timeline1', layerId: 'layer1', timestamp: Date.now() };
      const cursor2: CursorPosition = { x: 300, y: 400, timelineId: 'timeline1', layerId: 'layer1', timestamp: Date.now() };

      await presenceService.updateCursor('user1', 'User One', 'project1', 'timeline1', 'layer1', cursor1, 'session1');
      await presenceService.updateCursor('user2', 'User Two', 'project1', 'timeline1', 'layer1', cursor2, 'session2');

      const presence = presenceService.getLayerPresence('project1', 'timeline1', 'layer1');
      
      expect(presence).toHaveLength(2);
      expect(presence.map(p => p.userId)).toEqual(expect.arrayContaining(['user1', 'user2']));
    });

    it('не должен возвращать присутствующих из других слоев', async () => {
      const cursor: CursorPosition = { x: 100, y: 200, timelineId: 'timeline1', layerId: 'layer1', timestamp: Date.now() };

      await presenceService.updateCursor('user1', 'User One', 'project1', 'timeline1', 'layer1', cursor, 'session1');

      const layer1Presence = presenceService.getLayerPresence('project1', 'timeline1', 'layer1');
      const layer2Presence = presenceService.getLayerPresence('project1', 'timeline1', 'layer2');
      
      expect(layer1Presence).toHaveLength(1);
      expect(layer2Presence).toHaveLength(0);
    });
  });

  describe('leaveLayer', () => {
    it('должен удалять пользователя из слоя', async () => {
      const cursor: CursorPosition = { x: 100, y: 200, timelineId: 'timeline1', layerId: 'layer1', timestamp: Date.now() };

      await presenceService.updateCursor('user1', 'User One', 'project1', 'timeline1', 'layer1', cursor, 'session1');
      
      let presence = presenceService.getLayerPresence('project1', 'timeline1', 'layer1');
      expect(presence).toHaveLength(1);

      await presenceService.leaveLayer('user1', 'project1', 'timeline1', 'layer1');
      
      presence = presenceService.getLayerPresence('project1', 'timeline1', 'layer1');
      expect(presence).toHaveLength(0);
    });

    it('должен broadcast событие при выходе из слоя', async () => {
      const cursor: CursorPosition = { x: 100, y: 200, timelineId: 'timeline1', layerId: 'layer1', timestamp: Date.now() };

      await presenceService.updateCursor('user1', 'User One', 'project1', 'timeline1', 'layer1', cursor, 'session1');
      
      // Очищаем предыдущие вызовы
      mockWebSocketManager.emitToProject.mockClear();
      
      await presenceService.leaveLayer('user1', 'project1', 'timeline1', 'layer1');

      expect(mockWebSocketManager.emitToProject).toHaveBeenCalledWith(
        'project1',
        expect.objectContaining({
          type: 'LAYER_CURSOR_LEAVE'
        }),
        'session1'
      );
    });
  });

  describe('cleanup', () => {
    it('должен удалять неактивные присутствия', async () => {
      // Мокаем Date.now() чтобы контролировать время
      const originalDateNow = Date.now;
      const mockTime = 1000000;
      Date.now = vi.fn(() => mockTime);

      const cursor: CursorPosition = { 
        x: 100, 
        y: 200, 
        timelineId: 'timeline1', 
        layerId: 'layer1', 
        timestamp: mockTime 
      };

      await presenceService.updateCursor('user1', 'User One', 'project1', 'timeline1', 'layer1', cursor, 'session1');
      
      let presence = presenceService.getLayerPresence('project1', 'timeline1', 'layer1');
      expect(presence).toHaveLength(1);

      // Перематываем время на 31 секунду вперед (больше timeout'а в 30 секунд)
      Date.now = vi.fn(() => mockTime + 31000);

      presenceService.cleanup();
      
      presence = presenceService.getLayerPresence('project1', 'timeline1', 'layer1');
      expect(presence).toHaveLength(0);

      // Восстанавливаем Date.now()
      Date.now = originalDateNow;
    });
  });
});
