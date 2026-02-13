/**
 * Глобальный реестр для активной WebSocket системы
 */

let activeWebSocketSystem: any = null;

export function setActiveWebSocketSystem(system: any): void {
  activeWebSocketSystem = system;
  console.log('🔄 [WebSocketRegistry] Active WebSocket system set:', system.constructor.name);
}

export function getActiveWebSocketSystem(): any {
  if (!activeWebSocketSystem) {
    console.warn('⚠️ [WebSocketRegistry] No active WebSocket system found!');
    return null;
  }
  return activeWebSocketSystem;
}

export function clearActiveWebSocketSystem(): void {
  activeWebSocketSystem = null;
  console.log('🧹 [WebSocketRegistry] Active WebSocket system cleared');
}
