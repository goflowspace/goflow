import {EngineEventEmitter, EngineEventListener, PlaybackEngineEvent} from './EngineEvents';

/**
 * Простая реализация EventEmitter для движка
 */
export class SimpleEventEmitter implements EngineEventEmitter {
  private listeners: Set<EngineEventListener> = new Set();

  on(listener: EngineEventListener): void {
    this.listeners.add(listener);
  }

  off(listener: EngineEventListener): void {
    this.listeners.delete(listener);
  }

  emit(event: PlaybackEngineEvent): void {
    // Добавляем timestamp если его нет
    const eventWithTimestamp = {
      ...event,
      timestamp: event.timestamp || Date.now()
    };

    // Уведомляем всех слушателей
    this.listeners.forEach((listener) => {
      try {
        listener(eventWithTimestamp);
      } catch (error) {
        console.error('Error in event listener:', error);
      }
    });
  }

  /**
   * Удаляет всех слушателей
   */
  removeAllListeners(): void {
    this.listeners.clear();
  }
}
