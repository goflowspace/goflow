import "reflect-metadata";
import { Container } from "inversify";
import { Server as HTTPServer } from "http";
import { WEBSOCKET_TYPES, EVENT_HANDLER_TYPES } from "./di.types";
import { WebSocketManager } from "./websocket.manager.inversify";
import { CollaborationService } from "./collaboration.service.inversify";
import { WebSocketController } from "./websocket.controller.inversify";
import { AwarenessEventHandler } from "./event-handlers/awareness.handler";
import { OperationEventHandler } from "./event-handlers/operation.handler";
import { AIEventHandler } from "./event-handlers/ai.handler";
import { IWebSocketManager, ICollaborationService, IWebSocketController, IPresenceService } from "./interfaces/websocket.interfaces";
import { IEventOrderingService } from "./interfaces/event-ordering.interfaces";
import { EventOrderingService } from "./services/event-ordering.service";
import { PresenceService } from "./services/presence.service";
import { EventHandler } from "./event-handlers/base.handler";

// Импортируем sync модуль
import { TYPES as SYNC_TYPES } from "../sync/di.types";
import { ISyncRepository, ISyncService, ISyncController } from "../sync/interfaces/sync.interfaces";
import { SyncRepository } from "../sync/sync.repository";
import { SyncService } from "../sync/sync.service";
import { SyncController } from "../sync/sync.controller.inversify";

// Функция для создания контейнера с HTTP сервером
export function createWebSocketContainer(httpServer: HTTPServer): Container {
  const container = new Container();
  
  // Регистрируем HTTP сервер
  container.bind<HTTPServer>("HTTPServer").toConstantValue(httpServer);
  
  // Регистрируем sync зависимости
  container.bind<ISyncRepository>(SYNC_TYPES.SyncRepository).to(SyncRepository).inSingletonScope();
  container.bind<ISyncService>(SYNC_TYPES.SyncService).to(SyncService).inSingletonScope();
  container.bind<ISyncController>(SYNC_TYPES.SyncController).to(SyncController).inSingletonScope();

  // Регистрируем websocket зависимости
  container.bind<IWebSocketManager>(WEBSOCKET_TYPES.WebSocketManager).to(WebSocketManager).inSingletonScope();
  container.bind<ICollaborationService>(WEBSOCKET_TYPES.CollaborationService).to(CollaborationService).inSingletonScope();
  container.bind<IWebSocketController>(WEBSOCKET_TYPES.WebSocketController).to(WebSocketController).inSingletonScope();
  container.bind<IEventOrderingService>(WEBSOCKET_TYPES.EventOrderingService).to(EventOrderingService).inSingletonScope();
  container.bind<IPresenceService>(WEBSOCKET_TYPES.PresenceService).to(PresenceService).inSingletonScope();

  // Регистрируем event handlers
  container.bind<EventHandler>(EVENT_HANDLER_TYPES.AwarenessEventHandler).to(AwarenessEventHandler);
  container.bind<EventHandler>(EVENT_HANDLER_TYPES.OperationEventHandler).to(OperationEventHandler);
  container.bind<EventHandler>(EVENT_HANDLER_TYPES.AIEventHandler).to(AIEventHandler);
  
  // Регистрируем сам контейнер для инжекции в контроллер
  container.bind<Container>('Container').toConstantValue(container);
  
  return container;
}

// Создаем базовый контейнер для тестов
const websocketContainer = new Container();

// Регистрируем sync зависимости
websocketContainer.bind<ISyncRepository>(SYNC_TYPES.SyncRepository).to(SyncRepository).inSingletonScope();
websocketContainer.bind<ISyncService>(SYNC_TYPES.SyncService).to(SyncService).inSingletonScope();
websocketContainer.bind<ISyncController>(SYNC_TYPES.SyncController).to(SyncController).inSingletonScope();

// Регистрируем websocket зависимости
websocketContainer.bind<IWebSocketManager>(WEBSOCKET_TYPES.WebSocketManager).to(WebSocketManager).inSingletonScope();
websocketContainer.bind<ICollaborationService>(WEBSOCKET_TYPES.CollaborationService).to(CollaborationService).inSingletonScope();
websocketContainer.bind<IWebSocketController>(WEBSOCKET_TYPES.WebSocketController).to(WebSocketController).inSingletonScope();
websocketContainer.bind<IEventOrderingService>(WEBSOCKET_TYPES.EventOrderingService).to(EventOrderingService).inSingletonScope();
websocketContainer.bind<IPresenceService>(WEBSOCKET_TYPES.PresenceService).to(PresenceService).inSingletonScope();

// Регистрируем event handlers
websocketContainer.bind<EventHandler>(EVENT_HANDLER_TYPES.AwarenessEventHandler).to(AwarenessEventHandler);
websocketContainer.bind<EventHandler>(EVENT_HANDLER_TYPES.OperationEventHandler).to(OperationEventHandler);
websocketContainer.bind<EventHandler>(EVENT_HANDLER_TYPES.AIEventHandler).to(AIEventHandler);

// Регистрируем сам контейнер для инжекции в контроллер
websocketContainer.bind<Container>('Container').toConstantValue(websocketContainer);

export { websocketContainer };

/**
 * Класс для управления WebSocket системой через Inversify
 */
export class WebSocketSystem {
  private container: Container;
  private static instance: WebSocketSystem | null = null;

  constructor() {
    // Используем базовый контейнер без HTTP сервера
    this.container = websocketContainer;
  }

  /**
   * Получить синглтон экземпляр WebSocketSystem
   */
  static getInstance(): WebSocketSystem {
    if (!WebSocketSystem.instance) {
      WebSocketSystem.instance = new WebSocketSystem();
    }
    return WebSocketSystem.instance;
  }

  /**
   * Инициализация WebSocket системы
   */
  initializeWebSocket(httpServer: HTTPServer): IWebSocketController {
    // Создаем новый контейнер с HTTP сервером
    this.container = createWebSocketContainer(httpServer);
    
    // Получаем WebSocketManager и инициализируем его
    const wsManager = this.container.get<IWebSocketManager>(WEBSOCKET_TYPES.WebSocketManager);
    wsManager.initialize(httpServer);

    // Получаем контроллер и настраиваем обработчики
    const controller = this.container.get<IWebSocketController>(WEBSOCKET_TYPES.WebSocketController);
    controller.setupConnectionHandlers();

    return controller;
  }

  /**
   * Получение сервиса из контейнера
   */
  get<T>(serviceIdentifier: symbol): T {
    return this.container.get<T>(serviceIdentifier);
  }

  /**
   * Очистка ресурсов
   */
  dispose(): void {
    // Останавливаем периодические задачи
    const controller = this.container.get<IWebSocketController>(WEBSOCKET_TYPES.WebSocketController);
    controller.stopCleanupJob();

    // Unbind всех сервисов
    this.container.unbindAll();
  }

  /**
   * Получение контейнера (для тестирования или расширения)
   */
  getContainer(): Container {
    return this.container;
  }
} 