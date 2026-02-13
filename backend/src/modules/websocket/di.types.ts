/**
 * Символы для Inversify DI контейнера
 */
export const WEBSOCKET_TYPES = {
  WebSocketManager: Symbol.for('WebSocketManager'),
  CollaborationService: Symbol.for('CollaborationService'),
  WebSocketController: Symbol.for('WebSocketController'),
  EventHandler: Symbol.for('EventHandler'),
  AwarenessEventHandler: Symbol.for('AwarenessEventHandler'),
  OperationEventHandler: Symbol.for('OperationEventHandler'),
  AIEventHandler: Symbol.for('AIEventHandler'),
  EventOrderingService: Symbol.for('EventOrderingService'),
  PresenceService: Symbol.for('PresenceService'),
} as const;

/**
 * Перечисление типов для event handlers
 */
export const EVENT_HANDLER_TYPES = {
  AwarenessEventHandler: Symbol.for('AwarenessEventHandler'),
  OperationEventHandler: Symbol.for('OperationEventHandler'),
  AIEventHandler: Symbol.for('AIEventHandler'),
} as const; 