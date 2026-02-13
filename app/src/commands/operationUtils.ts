import {SyncServiceRegistry} from '@services/syncServiceFactory';

import {addOperation} from '../services/dbService';
import {getCommandHistory} from './CommandInterface';

// Интерфейс для операции
export interface Operation {
  type: string; // e.g., 'node.added', 'node.moved', 'node.deleted', 'edge.added', etc.
  projectId: string; // Current project ID
  timelineId: string; // Current timeline ID
  payload: object; // The actual data needed to reproduce this change on another client
  timestamp: number; // Date.now() when the operation was created
  layerId?: string; // Optional: which layer this operation affects
  deviceId: string; // Device ID for tracking operation source
}

/**
 * Получает или создает уникальный deviceId для этого устройства
 */
// TODO: move to utils and improve algorithm
function getOrCreateDeviceId(): string {
  const DEVICE_ID_KEY = 'flow_device_id';

  // Пытаемся получить существующий ID
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);

  if (!deviceId) {
    // Создаем новый ID если его нет
    deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }

  return deviceId;
}

/**
 * Создает правильно отформатированный объект операции
 */
export function generateOperation(type: string, payload: object, projectId: string, timelineId: string, layerId: string = 'root'): Operation {
  if (!projectId) {
    console.warn('Operation generation: No projectId provided, skipping operation generation');
    throw new Error('No projectId provided for operation generation');
  }

  if (!timelineId) {
    console.warn('Operation generation: No timelineId provided, skipping operation generation');
    throw new Error('No timelineId provided for operation generation');
  }

  return {
    type,
    projectId,
    timelineId,
    payload,
    timestamp: Date.now(),
    layerId,
    deviceId: getOrCreateDeviceId()
  };
}

/**
 * Сохраняет операцию в очередь IndexedDB
 * Выполняется асинхронно без блокирования выполнения команды
 */
export async function saveOperationToQueue(operation: Operation): Promise<void> {
  try {
    await addOperation(operation);
    console.log('Operation saved to queue:', operation.type);
  } catch (error) {
    console.error('Failed to save operation to queue:', error);
  }

  // После сохранения операции, пытаемся запустить синхронизацию
  // Это "разбудит" сервис, если он был в состоянии ошибки
  // Пытаемся сначала получить WebSocket версию, затем REST fallback
  let syncService = SyncServiceRegistry.getAll().find((s) => (s as any).dependencies?.projectId === operation.projectId);

  if (!syncService) {
    // Fallback на REST версию если WebSocket не найден
    syncService = SyncServiceRegistry.getOrCreate(operation.projectId);
  }

  if (syncService) {
    syncService.triggerSync();
  }
}

/**
 * Convenience функция для генерации и сохранения операции в один вызов
 * Используется в командах для неблокирующего сохранения операций
 *
 * @param type - тип операции
 * @param payload - данные операции
 * @param projectId - ID проекта
 * @param timelineId - ID таймлайна
 * @param layerId - ID слоя (по умолчанию 'root')
 */
export function generateAndSaveOperation(type: string, payload: object, projectId: string, timelineId: string, layerId: string = 'root'): void {
  try {
    const operation = generateOperation(type, payload, projectId, timelineId, layerId);
    // Сохраняем асинхронно без ожидания
    saveOperationToQueue(operation).catch((error) => {
      console.error('Background operation save failed:', error);
    });
  } catch (error) {
    console.warn('Operation generation failed:', error);
  }
}
