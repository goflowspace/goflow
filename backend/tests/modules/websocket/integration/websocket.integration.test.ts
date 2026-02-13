// Мокаем nanoid перед импортами
jest.mock('nanoid', () => ({
  nanoid: () => `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}));

import 'reflect-metadata';
import { Container } from 'inversify';
import { Server as HTTPServer, createServer } from 'http';
const ioClient = require('socket.io-client');
import { WebSocketManager } from '../../../../src/modules/websocket/websocket.manager.inversify';
import { WebSocketController } from '../../../../src/modules/websocket/websocket.controller.inversify';
import { CollaborationService } from '../../../../src/modules/websocket/collaboration.service.inversify';
import { AwarenessEventHandler } from '../../../../src/modules/websocket/event-handlers/awareness.handler';
import { OperationEventHandler } from '../../../../src/modules/websocket/event-handlers/operation.handler';
import { WEBSOCKET_TYPES, EVENT_HANDLER_TYPES } from '../../../../src/modules/websocket/di.types';
import { CollaborationEventType } from '../../../../src/types/websocket.types';
import jwt from 'jsonwebtoken';

// Импортируем sync зависимости
import { TYPES as SYNC_TYPES } from '../../../../src/modules/sync/di.types';
import { ISyncRepository, ISyncService, ISyncController } from '../../../../src/modules/sync/interfaces/sync.interfaces';
import { SyncRepository } from '../../../../src/modules/sync/sync.repository';
import { SyncService } from '../../../../src/modules/sync/sync.service';
import { SyncController } from '../../../../src/modules/sync/sync.controller.inversify';

describe('WebSocket Integration Tests', () => {
  let httpServer: HTTPServer;
  let container: Container;
  let wsController: WebSocketController;
  let wsManager: WebSocketManager;
  let clientSocket: any;
  let clientSocket2: any;
  let port: number;
  const testToken = jwt.sign({ id: 'user1', name: 'Test User', email: 'test@example.com' }, 'test-jwt-secret-that-is-at-least-32-characters-long');
  const testToken2 = jwt.sign({ id: 'user2', name: 'Test User 2', email: 'test2@example.com' }, 'test-jwt-secret-that-is-at-least-32-characters-long');

  beforeAll((done) => {
    // Создаем HTTP сервер
    httpServer = createServer();
    
    // Настраиваем DI контейнер
    container = new Container();
    
    // Регистрируем sync зависимости
    container.bind<ISyncRepository>(SYNC_TYPES.SyncRepository).to(SyncRepository).inSingletonScope();
    container.bind<ISyncService>(SYNC_TYPES.SyncService).to(SyncService).inSingletonScope();
    container.bind<ISyncController>(SYNC_TYPES.SyncController).to(SyncController).inSingletonScope();
    
    // Регистрируем websocket сервисы
    container.bind<WebSocketManager>(WEBSOCKET_TYPES.WebSocketManager).to(WebSocketManager).inSingletonScope();
    container.bind<CollaborationService>(WEBSOCKET_TYPES.CollaborationService).to(CollaborationService).inSingletonScope();
    container.bind<WebSocketController>(WEBSOCKET_TYPES.WebSocketController).to(WebSocketController).inSingletonScope();
    container.bind<AwarenessEventHandler>(EVENT_HANDLER_TYPES.AwarenessEventHandler).to(AwarenessEventHandler);
    container.bind<OperationEventHandler>(EVENT_HANDLER_TYPES.OperationEventHandler).to(OperationEventHandler);
    container.bind<Container>('Container').toConstantValue(container);
    
    // Получаем экземпляры
    wsManager = container.get<WebSocketManager>(WEBSOCKET_TYPES.WebSocketManager);
    wsController = container.get<WebSocketController>(WEBSOCKET_TYPES.WebSocketController);
    
    // Инициализируем WebSocket сервер
    wsManager.initialize(httpServer);
    wsController.setupConnectionHandlers();
    
    // Запускаем сервер на случайном порту
    httpServer.listen(0, () => {
      const address = httpServer.address();
      port = typeof address === 'object' && address !== null ? address.port : 3001;
      done();
    });
  });

  afterAll((done) => {
    // Останавливаем cleanup job
    wsController.stopCleanupJob();
    
    // Закрываем сервер
    httpServer.close(done);
  });

  beforeEach((done) => {
    // Создаем клиентский сокет с аутентификацией
    clientSocket = ioClient(`http://localhost:${port}`, {
      transports: ['websocket'],
      auth: {
        token: testToken
      }
    });

    clientSocket.on('connect', done);
  });

  afterEach(() => {
    // Отключаем клиентские сокеты
    if (clientSocket?.connected) {
      clientSocket.disconnect();
    }
    if (clientSocket2?.connected) {
      clientSocket2.disconnect();
    }
  });

  describe('Connection and Authentication', () => {
    it('должен успешно подключаться с валидным токеном', (done) => {
      expect(clientSocket.connected).toBe(true);
      done();
    });

    it('должен отклонять подключение без токена', (done) => {
      const unauthorizedSocket = ioClient(`http://localhost:${port}`, {
        transports: ['websocket']
      });

      unauthorizedSocket.on('connect_error', (error: any) => {
        expect(error.message).toContain('Authentication token required');
        unauthorizedSocket.disconnect();
        done();
      });
    });

    it('должен отклонять подключение с невалидным токеном', (done) => {
      const invalidSocket = ioClient(`http://localhost:${port}`, {
        transports: ['websocket'],
        auth: {
          token: 'invalid-token'
        }
      });

      invalidSocket.on('connect_error', (error: any) => {
        expect(error.message).toContain('Invalid authentication token');
        invalidSocket.disconnect();
        done();
      });
    });
  });

  describe('Project Room Management', () => {
    it('должен успешно присоединяться к проекту', (done) => {
      const projectId = 'test-project-1';

      clientSocket.on('project_users', (data: any) => {
        expect(data.users).toBeInstanceOf(Array);
        expect(data.users.length).toBeGreaterThanOrEqual(1);
        expect(data.users[0]).toMatchObject({
          userId: 'user1',
          userName: 'Test User'
        });
        done();
      });

      clientSocket.emit('join_project', { projectId });
    });

    it('должен уведомлять других пользователей о присоединении', (done) => {
      const projectId = 'test-project-2';
      
      // Создаем второй клиент
      clientSocket2 = ioClient(`http://localhost:${port}`, {
        transports: ['websocket'],
        auth: {
          token: testToken2
        }
      });

      clientSocket2.on('connect', () => {
        // Первый клиент присоединяется к проекту
        clientSocket.emit('join_project', { projectId });

        // Первый клиент слушает событие о присоединении второго
        clientSocket.on(CollaborationEventType.USER_JOIN, (event: any) => {
          expect(event.type).toBe(CollaborationEventType.USER_JOIN);
          expect(event.payload.user.userId).toBe('user2');
          expect(event.payload.user.userName).toBe('Test User 2');
          done();
        });

        // Второй клиент присоединяется к проекту
        setTimeout(() => {
          clientSocket2.emit('join_project', { projectId });
        }, 100);
      });
    });

    it('должен успешно покидать проект', (done) => {
      const projectId = 'test-project-3';

      clientSocket.emit('join_project', { projectId });

      setTimeout(() => {
        clientSocket.emit('leave_project', { projectId });
        // Проверяем, что не получаем ошибку
        setTimeout(done, 100);
      }, 100);
    });
  });

  describe('Collaboration Events', () => {
    beforeEach((done) => {
      // Присоединяемся к проекту перед каждым тестом
      clientSocket.emit('join_project', { projectId: 'test-project' });
      setTimeout(done, 100);
    });

    it('должен обрабатывать событие перемещения курсора', (done) => {
      const cursorEvent = {
        type: CollaborationEventType.CURSOR_MOVE,
        payload: {
          cursor: {
            x: 100,
            y: 200,
            timelineId: 'timeline1',
            layerId: 'layer1'
          }
        },
        userId: 'user1',
        projectId: 'test-project',
        timestamp: Date.now()
      };

      // Создаем второй клиент для получения события
      clientSocket2 = ioClient(`http://localhost:${port}`, {
        transports: ['websocket'],
        auth: {
          token: testToken2
        }
      });

      clientSocket2.on('connect', () => {
        clientSocket2.emit('join_project', { projectId: 'test-project' });

        clientSocket2.on(CollaborationEventType.AWARENESS_UPDATE, (event: any) => {
          expect(event.type).toBe(CollaborationEventType.AWARENESS_UPDATE);
          expect(event.payload.awareness.cursor).toEqual(cursorEvent.payload.cursor);
          done();
        });

        setTimeout(() => {
          clientSocket.emit(CollaborationEventType.CURSOR_MOVE, cursorEvent);
        }, 100);
      });
    });

    it('должен обрабатывать событие изменения выделения', (done) => {
      const selectionEvent = {
        type: CollaborationEventType.SELECTION_CHANGE,
        payload: {
          selection: {
            nodeIds: ['node1', 'node2'],
            timelineId: 'timeline1',
            layerId: 'layer1'
          }
        },
        userId: 'user1',
        projectId: 'test-project',
        timestamp: Date.now()
      };

      // Создаем второй клиент для получения события
      clientSocket2 = ioClient(`http://localhost:${port}`, {
        transports: ['websocket'],
        auth: {
          token: testToken2
        }
      });

      clientSocket2.on('connect', () => {
        clientSocket2.emit('join_project', { projectId: 'test-project' });

        clientSocket2.on(CollaborationEventType.AWARENESS_UPDATE, (event: any) => {
          expect(event.type).toBe(CollaborationEventType.AWARENESS_UPDATE);
          expect(event.payload.awareness.selection).toEqual(selectionEvent.payload.selection);
          done();
        });

        setTimeout(() => {
          clientSocket.emit(CollaborationEventType.SELECTION_CHANGE, selectionEvent);
        }, 100);
      });
    });

    it('должен обрабатывать ошибки валидации событий', (done) => {
      const invalidEvent = {
        type: CollaborationEventType.CURSOR_MOVE,
        // отсутствует payload
        userId: 'user1',
        projectId: 'test-project',
        timestamp: Date.now()
      };

      clientSocket.on('error', (error: any) => {
        expect(error.message).toContain('Event must have payload');
        expect(error.eventType).toBe(CollaborationEventType.CURSOR_MOVE);
        done();
      });

      clientSocket.emit(CollaborationEventType.CURSOR_MOVE, invalidEvent);
    });
  });

  describe('Disconnection Handling', () => {
    it('должен уведомлять других пользователей об отключении', (done) => {
      const projectId = 'test-project-disconnect';

      // Создаем второй клиент
      clientSocket2 = ioClient(`http://localhost:${port}`, {
        transports: ['websocket'],
        auth: {
          token: testToken2
        }
      });

      clientSocket2.on('connect', () => {
        // Оба клиента присоединяются к проекту
        clientSocket.emit('join_project', { projectId });
        clientSocket2.emit('join_project', { projectId });

        // Второй клиент слушает событие об отключении первого
        clientSocket2.on(CollaborationEventType.USER_LEAVE, (event: any) => {
          expect(event.type).toBe(CollaborationEventType.USER_LEAVE);
          expect(event.payload.userId).toBe('user1');
          done();
        });

        // Отключаем первого клиента
        setTimeout(() => {
          clientSocket.disconnect();
        }, 200);
      });
    });
  });
}); 