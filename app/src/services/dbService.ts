import Dexie, {type Table} from 'dexie';

// Интерфейс для данных проекта
export interface ProjectData {
  projectId: string;
  timelines: {
    [timelineId: string]: {
      layers: any;
      metadata: any;
      variables: any;
      lastLayerNumber: number;
    };
  };
  timelinesMetadata?: any[]; // Метаданные таймлайнов (названия, даты создания и т.д.)
  projectName: string;
  _lastModified: number;
}

// Интерфейс для операции в очереди
export interface OperationQueueItem {
  id?: number; // auto-generated primary key
  projectId: string;
  operation: object;
  timestamp: number;
}

// Интерфейс для данных локализации в playback
export interface PlaybackLocalizationData {
  baseLanguage: string;
  targetLanguages: string[];
  localizations: Array<{
    nodeId: string;
    layerId: string;
    fieldPath: string;
    targetLanguage: string;
    originalText: string;
    translatedText?: string;
    status: 'PENDING' | 'TRANSLATING' | 'TRANSLATED' | 'REVIEWED' | 'APPROVED' | 'REJECTED' | 'OUTDATED' | 'ARCHIVED';
  }>;
}

// Интерфейс для данных воспроизведения
export interface PlaybackData {
  id: string; // уникальный ID (например, projectId + timelineId)
  projectId: string;
  teamId: string; // Добавляем teamId для корректной работы GCS изображений
  timelineId: string;
  projectName: string;
  data: {
    nodes: any[];
    edges: any[];
    variables: any[];
  };
  localization?: PlaybackLocalizationData; // Данные локализации
  metadata: {
    timestamp: string;
    version: string;
    startNodeId?: string;
  };
  _lastModified: number;
}

// Класс базы данных
export class FlowAppDatabase extends Dexie {
  projects!: Table<ProjectData>;
  operationQueue!: Table<OperationQueueItem>;
  playbackData!: Table<PlaybackData>;

  constructor() {
    super('FlowAppDB');

    // Версия 3 - добавляем таблицу playbackData
    this.version(3).stores({
      projects: 'projectId, _lastModified',
      operationQueue: '++id, projectId, timestamp',
      playbackData: 'id, projectId, timelineId, _lastModified'
    });

    // Версия 2 - добавляем таблицу operationQueue
    this.version(2).stores({
      projects: 'projectId, _lastModified',
      operationQueue: '++id, projectId, timestamp'
    });
  }
}

// Создаем экземпляр базы данных
const db = new FlowAppDatabase();

// Функция для сохранения проекта
export async function saveProject(projectData: ProjectData): Promise<void> {
  try {
    await db.projects.put(projectData);
    console.log('Project saved to IndexedDB:', projectData.projectId);
  } catch (error) {
    console.error('Failed to save project to IndexedDB:', error);
    throw error;
  }
}

// Функция для загрузки проекта
export async function loadProject(projectId: string): Promise<ProjectData | undefined> {
  try {
    const projectData = await db.projects.get(projectId);
    console.log('Project loaded from IndexedDB:', projectId, projectData ? 'found' : 'not found');
    return projectData;
  } catch (error) {
    console.error('Failed to load project from IndexedDB:', error);
    throw error;
  }
}

// Функция для удаления проекта из IndexedDB
export async function deleteProject(projectId: string): Promise<void> {
  try {
    // Удаляем проект
    await db.projects.delete(projectId);
    console.log('Project deleted from IndexedDB:', projectId);

    // Также удаляем все связанные операции
    await clearOperations(projectId);
    console.log('Related operations cleared for project:', projectId);
  } catch (error) {
    console.error('Failed to delete project from IndexedDB:', error);
    throw error;
  }
}

// Функция для добавления операции в очередь
export async function addOperation(operation: object): Promise<void> {
  try {
    const queueItem: OperationQueueItem = {
      projectId: (operation as any).projectId || 'unknown',
      operation,
      timestamp: Date.now()
    };
    await db.operationQueue.add(queueItem);
    console.log('Operation added to queue:', queueItem);
  } catch (error) {
    console.error('Failed to add operation to queue:', error);
    throw error;
  }
}

// Функция для получения ожидающих операций
export async function getPendingOperations(limit: number = 100): Promise<object[]> {
  try {
    const operations = await db.operationQueue.orderBy('id').limit(limit).toArray();
    console.log(`Retrieved ${operations.length} pending operations`);
    return operations.map((item) => ({id: item.id, ...item.operation}));
  } catch (error) {
    console.error('Failed to get pending operations:', error);
    throw error;
  }
}

// Функция для удаления операций по их ID
export async function deleteOperations(operationIds: number[]): Promise<void> {
  try {
    await db.operationQueue.bulkDelete(operationIds);
    console.log(`Deleted ${operationIds.length} operations from queue`);
  } catch (error) {
    console.error('Failed to delete operations from queue:', error);
    throw error;
  }
}

// Функция для очистки всех операций конкретного проекта
export async function clearOperations(projectId: string): Promise<void> {
  try {
    const deletedCount = await db.operationQueue.where('projectId').equals(projectId).delete();
    console.log(`Cleared ${deletedCount} operations for project: ${projectId}`);
  } catch (error) {
    console.error('Failed to clear operations for project:', error);
    throw error;
  }
}

// Функция для сохранения данных воспроизведения
export async function savePlaybackData(data: PlaybackData): Promise<void> {
  try {
    data._lastModified = Date.now();
    await db.playbackData.put(data);
    console.log('Playback data saved to IndexedDB:', data.id);
  } catch (error) {
    console.error('Failed to save playback data to IndexedDB:', error);
    throw error;
  }
}

// Функция для загрузки данных воспроизведения
export async function loadPlaybackData(playbackId: string): Promise<PlaybackData | undefined> {
  try {
    const data = await db.playbackData.get(playbackId);
    console.log('Playback data loaded from IndexedDB:', playbackId, data ? 'found' : 'not found');
    return data;
  } catch (error) {
    console.error('Failed to load playback data from IndexedDB:', error);
    throw error;
  }
}

// Функция для удаления данных воспроизведения
export async function deletePlaybackData(playbackId: string): Promise<void> {
  try {
    await db.playbackData.delete(playbackId);
    console.log('Playback data deleted from IndexedDB:', playbackId);
  } catch (error) {
    console.error('Failed to delete playback data from IndexedDB:', error);
    throw error;
  }
}

// Функция для удаления данных воспроизведения конкретного таймлайна
export async function deleteTimelinePlaybackData(projectId: string, timelineId: string): Promise<void> {
  try {
    const deletedCount = await db.playbackData
      .where('projectId')
      .equals(projectId)
      .and((item) => item.timelineId === timelineId)
      .delete();
    console.log(`Deleted ${deletedCount} playback data entries for timeline ${timelineId} in project ${projectId}`);
  } catch (error) {
    console.error('Failed to delete timeline playback data:', error);
    throw error;
  }
}

// Функция для очистки старых данных воспроизведения (старше 24 часов)
export async function cleanupOldPlaybackData(): Promise<void> {
  try {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const deletedCount = await db.playbackData.where('_lastModified').below(oneDayAgo).delete();
    console.log(`Cleaned up ${deletedCount} old playback data entries`);
  } catch (error) {
    console.error('Failed to cleanup old playback data:', error);
  }
}

// Экспортируем экземпляр базы данных для дополнительных операций при необходимости
export {db};
